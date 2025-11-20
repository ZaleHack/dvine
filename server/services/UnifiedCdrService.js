import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import XLSX from 'xlsx';
import UnifiedCdrRecord from '../models/UnifiedCdrRecord.js';

const SUPPORTED_EXTENSIONS = new Set(['.csv', '.txt', '.xls', '.xlsx']);

const normalizeKey = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_');

const parseNumber = (value) => {
  if (value == null) return null;
  const numeric = String(value).replace(/[^0-9]/g, '');
  return numeric || null;
};

const parseDuration = (value) => {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return value;
  const text = String(value).trim();
  if (!text) return null;
  if (text.includes(':')) {
    const parts = text.split(':').map((p) => parseInt(p, 10));
    while (parts.length < 3) parts.unshift(0);
    if (parts.every((n) => !Number.isNaN(n))) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  }
  const parsed = parseInt(text, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseDateTime = (dateValue, timeValue) => {
  if (!dateValue && !timeValue) return null;
  const dateStr = dateValue ? String(dateValue).trim() : '';
  const timeStr = timeValue ? String(timeValue).trim() : '';
  if (!dateStr && !timeStr) return null;

  if (dateStr && !timeStr) {
    const parsed = new Date(dateStr);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const normalizedDate = dateStr
    .replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, '$3-$2-$1')
    .replace(/^(\d{2})-(\d{2})-(\d{4})$/, '$3-$2-$1');

  const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const combined = `${normalizedDate}T${normalizedTime}`;
  const parsed = new Date(combined);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const detectDelimiter = (sample = '') => {
  const candidates = [';', ',', '\t', '|'];
  let best = ',';
  let bestCount = 0;
  for (const delimiter of candidates) {
    const count = sample.split(delimiter).length;
    if (count > bestCount) {
      bestCount = count;
      best = delimiter === '\t' ? '\t' : delimiter;
    }
  }
  return best === '\t' ? '\t' : best;
};

const detectEncoding = (buffer) => {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return 'utf8';
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return 'utf16le';
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return 'utf16be';
  }
  return 'utf8';
};

const decodeBuffer = (buffer, encoding) => {
  if (encoding === 'utf16be') {
    const swapped = Buffer.alloc(buffer.length);
    for (let i = 0; i < buffer.length - 1; i += 2) {
      swapped[i] = buffer[i + 1];
      swapped[i + 1] = buffer[i];
    }
    return swapped.toString('utf16le');
  }
  return buffer.toString(encoding);
};

class UnifiedCdrService {
  async parseCsv(filePath, context) {
    const sampleBuffer = await fs.promises.readFile(filePath);
    const encoding = detectEncoding(sampleBuffer);
    const sampleString = decodeBuffer(sampleBuffer.slice(0, 2048), encoding);
    const delimiter = detectDelimiter(sampleString);
    const hasHeader = /[a-zA-Z]/.test(sampleString.split(/\r?\n/)[0] || '');

    const records = await new Promise((resolve, reject) => {
      const rows = [];
      fs.createReadStream(filePath)
        .pipe(csv({ separator: delimiter, headers: hasHeader ? undefined : false, mapHeaders: ({ header }) => header }))
        .on('data', (row) => rows.push(row))
        .on('end', () => resolve(rows))
        .on('error', (error) => reject(error));
    });

    return this.normalizeRows(records, context);
  }

  async parseExcel(filePath, context) {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    return this.normalizeRows(rows, context);
  }

  normalizeRows(rows, context) {
    const normalized = [];
    for (const row of rows) {
      const flat = {};
      for (const [key, value] of Object.entries(row || {})) {
        flat[normalizeKey(key)] = value;
      }

      const start =
        flat.start_time ||
        flat['starttime'] ||
        parseDateTime(flat.start_date || flat.date_debut, flat.start_hour || flat.heure_debut);
      const end =
        flat.end_time ||
        flat['endtime'] ||
        parseDateTime(flat.end_date || flat.date_fin, flat.end_hour || flat.heure_fin);

      const record = {
        calling_id: flat.calling_id || flat.calling_number || flat.numero_intl_appelant || parseNumber(flat.msisdn) || null,
        called_id: flat.called_id || flat.called_number || flat.numero_intl_appele || parseNumber(flat.msisdn_appele) || null,
        duration: parseDuration(flat.duration || flat.duree),
        start_time: start instanceof Date ? start : start ? new Date(start) : null,
        end_time: end instanceof Date ? end : end ? new Date(end) : null,
        org_pcip: flat.org_pcip || flat.source_pcip || null,
        dst_pcip: flat.dst_pcip || flat.destination_pcip || null,
        release_cause: flat.release_cause || flat.cause || null,
        client: flat.client || flat.customer || null,
        provider: flat.provider || flat.fournisseur || flat.operateur || null,
        operator: context.operator || flat.operator || flat.operateur || null,
        direction: context.direction || flat.direction || flat.sens || null,
        type_flux: context.type_flux || flat.type_flux || flat.flux || flat.type || null,
        transaction_type: flat.transaction_type || flat.transaction || flat.service || null,
        transaction_status: flat.status || flat.statut || flat.transaction_status || null,
        amount:
          flat.amount !== undefined && flat.amount !== null
            ? Number(String(flat.amount).replace(/[^0-9.-]/g, ''))
            : flat.montant !== undefined && flat.montant !== null
              ? Number(String(flat.montant).replace(/[^0-9.-]/g, ''))
              : null,
        currency: flat.currency || flat.devise || null,
        source_file: context.source_file,
        raw_payload: row
      };

      normalized.push(record);
    }

    return normalized;
  }

  async ingestFile(filePath, context = {}) {
    const extension = path.extname(filePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      throw new Error('Format de fichier non supporté pour les CDR unifiés');
    }

    const rows = extension === '.csv' || extension === '.txt'
      ? await this.parseCsv(filePath, context)
      : await this.parseExcel(filePath, context);

    await UnifiedCdrRecord.bulkInsert(rows);
    return { inserted: rows.length };
  }

  async search(filters = {}, options = {}) {
    return await UnifiedCdrRecord.search(filters, options);
  }

  async timeline(msisdn, options = {}) {
    return await UnifiedCdrRecord.timeline(msisdn, options);
  }

  async stats() {
    return await UnifiedCdrRecord.stats();
  }
}

export default UnifiedCdrService;
