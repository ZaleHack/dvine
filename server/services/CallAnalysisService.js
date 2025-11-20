import database from '../config/database.js';
import { PassThrough } from 'stream';

const TABLE_NAME = '`di_autres`.`cdr_mtn__airtel_in_out`';

const sanitizeNumber = (value = '') => {
  if (!value) return '';
  return String(value).replace(/[^0-9+]/g, '').replace(/^\+/, '');
};

const buildDateTime = (date, time, isEnd = false) => {
  if (!date) return null;

  let normalizedTime = (time || '').trim();
  if (!normalizedTime) {
    normalizedTime = isEnd ? '23:59:59' : '00:00:00';
  }

  if (/^\d{2}:\d{2}$/.test(normalizedTime)) {
    normalizedTime = `${normalizedTime}:00`;
  }

  if (!/^\d{2}:\d{2}:\d{2}$/.test(normalizedTime)) {
    return null;
  }

  return `${date} ${normalizedTime}`;
};

class CallAnalysisService {
  async searchCalls(params) {
    const number = sanitizeNumber(params.number || params.phone);
    if (!number) {
      throw new Error('NUMERO_REQUIS');
    }

    const conditions = [];
    const queryParams = [];

    const likeNumber = `%${number}%`;
    conditions.push('(calling_id LIKE ? OR called_id LIKE ?)');
    queryParams.push(likeNumber, likeNumber);

    const startDateTime = buildDateTime(params.startDate, params.startTime, false);
    const endDateTime = buildDateTime(params.endDate, params.endTime, true);

    if (startDateTime) {
      conditions.push('start_time >= ?');
      queryParams.push(startDateTime);
    }

    if (endDateTime) {
      conditions.push('start_time <= ?');
      queryParams.push(endDateTime);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Math.min(Math.max(parseInt(params.limit, 10) || 200, 1), 500);

    const calls = await database.query(
      `
        SELECT
          calling_id,
          called_id,
          duration,
          start_time,
          end_time,
          org_pcip,
          dst_pcip,
          release_cause,
          client,
          provider
        FROM ${TABLE_NAME}
        ${whereClause}
        ORDER BY start_time DESC
        LIMIT ?
      `,
      [...queryParams, limit]
    );

    const totalRow = await database.queryOne(
      `SELECT COUNT(*) as total FROM ${TABLE_NAME} ${whereClause}`,
      queryParams
    );

    const callerHits = calls.filter((call) => String(call.calling_id).includes(number));
    const calleeHits = calls.filter((call) => String(call.called_id).includes(number));
    const totalDuration = calls.reduce((acc, call) => acc + Number(call.duration || 0), 0);
    const averageDuration = calls.length ? totalDuration / calls.length : 0;
    const maxDuration = calls.reduce((max, call) => Math.max(max, Number(call.duration || 0)), 0);

    const aggregateCounts = (field) => {
      const map = new Map();
      for (const call of calls) {
        const key = (call[field] || 'Non renseigné').toString();
        map.set(key, (map.get(key) || 0) + 1);
      }
      return Array.from(map.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    };

    return {
      number,
      total: totalRow?.total || calls.length,
      limit,
      calls,
      summary: {
        totalDuration,
        averageDuration,
        maxDuration,
        asCaller: callerHits.length,
        asCallee: calleeHits.length,
        providerBreakdown: aggregateCounts('provider'),
        releaseCauses: aggregateCounts('release_cause')
      }
    };
  }

  async getGlobalStats() {
    const overview = await database.queryOne(
      `
        SELECT
          COUNT(*) as totalCalls,
          SUM(duration) as totalDuration,
          AVG(duration) as averageDuration,
          MAX(duration) as maxDuration,
          MAX(start_time) as lastCallAt
        FROM ${TABLE_NAME}
      `
    );

    const providers = await database.query(
      `
        SELECT provider as label, COUNT(*) as count, AVG(duration) as averageDuration
        FROM ${TABLE_NAME}
        GROUP BY provider
        ORDER BY count DESC
        LIMIT 8
      `
    );

    const clients = await database.query(
      `
        SELECT client as label, COUNT(*) as count, AVG(duration) as averageDuration
        FROM ${TABLE_NAME}
        GROUP BY client
        ORDER BY count DESC
        LIMIT 8
      `
    );

    const releaseCauses = await database.query(
      `
        SELECT release_cause as label, COUNT(*) as count, AVG(duration) as averageDuration
        FROM ${TABLE_NAME}
        GROUP BY release_cause
        ORDER BY count DESC
        LIMIT 8
      `
    );

    const hourlyDistribution = await database.query(
      `
        SELECT
          LPAD(HOUR(start_time), 2, '0') as hour,
          COUNT(*) as count,
          AVG(duration) as averageDuration
        FROM ${TABLE_NAME}
        GROUP BY HOUR(start_time)
        ORDER BY hour
      `
    );

    const recentVolume = await database.query(
      `
        SELECT DATE(start_time) as day, COUNT(*) as count, SUM(duration) as duration
        FROM ${TABLE_NAME}
        WHERE start_time >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        GROUP BY DATE(start_time)
        ORDER BY day DESC
      `
    );

    return {
      overview: overview || {
        totalCalls: 0,
        totalDuration: 0,
        averageDuration: 0,
        maxDuration: 0,
        lastCallAt: null
      },
      providers,
      clients,
      releaseCauses,
      hourlyDistribution,
      recentVolume
    };
  }

  async generateReport(params) {
    const result = await this.searchCalls(params);
    const { default: PDFDocument } = await import('pdfkit');

    const doc = new PDFDocument({ margin: 50, compress: false });
    const stream = new PassThrough();
    const chunks = [];
    doc.pipe(stream);

    const formatDateTime = (value) => {
      if (!value) return '—';
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const formatDurationValue = (seconds) => {
      const safeSeconds = Math.max(0, Math.round(Number(seconds || 0)));
      const minutes = Math.floor(safeSeconds / 60);
      const remainingSeconds = safeSeconds % 60;
      if (minutes === 0) return `${remainingSeconds}s`;
      return `${minutes}m ${remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds}s`;
    };

    const addKeyValue = (label, value) => {
      doc
        .fontSize(10)
        .fillColor('#0F172A')
        .text(`${label}: `, { continued: true })
        .fillColor('#374151')
        .text(value);
    };

    const buffer = await new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        doc
          .fontSize(18)
          .fillColor('#0F172A')
          .text('Analyse des appels', { align: 'left' })
          .moveDown(0.25);

        doc.fontSize(10).fillColor('#6B7280').text(`Généré le ${formatDateTime(new Date())}`);
        doc.moveDown();

        doc
          .fontSize(12)
          .fillColor('#0F172A')
          .text('Synthèse de la recherche', { underline: false })
          .moveDown(0.35);

        addKeyValue('Numéro analysé', result.number || 'Non précisé');
        addKeyValue('Résultats inclus', `${result.calls.length} / ${result.limit}`);
        addKeyValue('Appels entrants', `${result.summary.asCallee}`);
        addKeyValue('Appels sortants', `${result.summary.asCaller}`);
        addKeyValue('Durée cumulée', formatDurationValue(result.summary.totalDuration));
        addKeyValue('Durée moyenne', formatDurationValue(result.summary.averageDuration));
        addKeyValue('Durée max', formatDurationValue(result.summary.maxDuration));

        const periodLabel = `${params.startDate || 'Non défini'} ${params.startTime || ''} → ${params.endDate || 'Non défini'} ${
          params.endTime || ''
        }`;
        addKeyValue('Période filtrée', periodLabel.trim());

        doc.moveDown();

        if (result.summary.providerBreakdown?.length) {
          doc.fontSize(12).fillColor('#0F172A').text('Top opérateurs');
          doc.moveDown(0.25);
          result.summary.providerBreakdown.slice(0, 5).forEach((entry) => {
            addKeyValue(entry.label || 'Non renseigné', `${entry.count} appels`);
          });
          doc.moveDown();
        }

        doc.fontSize(12).fillColor('#0F172A').text('Chronologie des appels');
        doc.moveDown(0.35);

        result.calls.forEach((call) => {
          doc
            .fontSize(10)
            .fillColor('#111827')
            .text(
              `${formatDateTime(call.start_time)} • ${call.calling_id} → ${call.called_id} (${formatDurationValue(call.duration)})`
            );
          doc
            .fontSize(9)
            .fillColor('#6B7280')
            .text(`Origine: ${call.org_pcip || 'N/A'} | Destination: ${call.dst_pcip || 'N/A'} | Cause: ${
              call.release_cause || '—'
            }`)
            .moveDown(0.5);
        });

        doc.moveDown(1);
        doc
          .fontSize(10)
          .fillColor('#0F172A')
          .text('Signature : Dvine Intelligence', { align: 'right' });
      } catch (error) {
        reject(error);
        return;
      } finally {
        doc.end();
      }
    });

    const sanitizedNumber = result.number ? result.number.replace(/[^0-9+]/g, '') : 'analyse';
    const fileName = `analyse-appels-${sanitizedNumber || 'export'}.pdf`;

    return { buffer, fileName };
  }
}

export default CallAnalysisService;
