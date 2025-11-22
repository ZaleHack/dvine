import database from '../config/database.js';
import { PassThrough } from 'stream';

const TABLE_NAME = '`di_autres`.`cdr_mtn__airtel_in_out`';

const RELEASE_CAUSE_MAP = {
  '1': 'Numéro non attribué',
  '2': 'Pas de route vers le réseau de transit spécifié',
  '3': 'Pas de route vers la destination',
  '4': 'Tonalité spéciale d’information',
  '5': 'Préfixe de faisceau mal composé',
  '6': 'Canal inacceptable',
  '7': 'Appel attribué et livré sur un canal établi',
  '8': 'Préemption',
  '9': 'Préemption – circuit réservé pour réutilisation',
  '16': 'Dégagement normal',
  '17': 'Utilisateur occupé',
  '18': 'Aucune réponse de l’utilisateur (sonnerie)',
  '19': 'Aucune réponse après alerte',
  '20': 'Utilisateur ou numéro absent',
  '21': 'Appel rejeté',
  '22': 'Numéro changé',
  '23': 'Redirection vers un autre numéro',
  '27': 'Destination hors service',
  '28': 'Adresse incomplète',
  '29': 'Facilité refusée',
  '30': 'Réponse à une requête de statut',
  '31': 'Dégagement normal non spécifié',
  '34': 'Aucun circuit ou canal disponible',
  '38': 'Réseau hors service',
  '41': 'Défaillance temporaire',
  '42': 'Congestion de l’équipement de commutation',
  '44': 'Circuit ou canal demandé indisponible',
  '47': 'Ressource indisponible non spécifiée',
  '50': 'Facilité demandée non souscrite',
  '55': 'Appels entrants interdits au sein du GCE',
  '57': 'Capacité porteuse non autorisée',
  '58': 'Capacité porteuse momentanément indisponible',
  '63': 'Service ou option indisponible non spécifiée',
  '65': 'Capacité porteuse non implémentée',
  '66': 'Type de canal non implémenté',
  '69': 'Facilité demandée non implémentée',
  '70': 'Seule l’information numérique restreinte est disponible',
  '79': 'Service ou option non implémenté non spécifié',
  '81': 'Valeur de référence d’appel invalide',
  '88': 'Destination incompatible',
  '90': 'Groupe fermé d’utilisateurs inexistant',
  '91': 'Sélection de réseau de transit invalide',
  '95': 'Message invalide non spécifié',
  '96': "Élément d’information obligatoire manquant",
  '97': 'Type de message inexistant ou non implémenté',
  '98': 'Message incompatible avec l’état de l’appel',
  '99': 'Élément ou paramètre non implémenté',
  '100': "Contenu d’élément d’information invalide",
  '101': 'Message incompatible avec l’état de l’appel',
  '102': 'Récupération sur expiration de minuterie',
  '111': 'Erreur de protocole non spécifiée',
  '127': 'Interopérabilité – cause non spécifiée'
};

const describeReleaseCause = (value) => {
  const code = (value ?? '').toString().trim();
  if (!code) return 'Non renseigné';
  return RELEASE_CAUSE_MAP[code] || `Code ${code}`;
};

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

    const processedCalls = calls.map((call) => ({
      ...call,
      release_cause: describeReleaseCause(call.release_cause)
    }));

    const totalRow = await database.queryOne(
      `SELECT COUNT(*) as total FROM ${TABLE_NAME} ${whereClause}`,
      queryParams
    );

    const callerHits = processedCalls.filter((call) => String(call.calling_id).includes(number));
    const calleeHits = processedCalls.filter((call) => String(call.called_id).includes(number));
    const totalDuration = processedCalls.reduce((acc, call) => acc + Number(call.duration || 0), 0);
    const averageDuration = processedCalls.length ? totalDuration / processedCalls.length : 0;
    const maxDuration = processedCalls.reduce((max, call) => Math.max(max, Number(call.duration || 0)), 0);

    const aggregateCounts = (field) => {
      const map = new Map();
      for (const call of processedCalls) {
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
      calls: processedCalls,
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

    const rawReleaseCauses = await database.query(
      `
        SELECT release_cause as label, COUNT(*) as count, AVG(duration) as averageDuration
        FROM ${TABLE_NAME}
        GROUP BY release_cause
        ORDER BY count DESC
        LIMIT 8
      `
    );

    const releaseCauses = rawReleaseCauses.map((entry) => ({
      ...entry,
      label: describeReleaseCause(entry.label)
    }));

    const hourExpression = "LPAD(HOUR(start_time), 2, '0')";

    const hourlyDistribution = await database.query(
      `
        SELECT
          ${hourExpression} AS hour,
          COUNT(*) as count,
          AVG(duration) as averageDuration
        FROM ${TABLE_NAME}
        GROUP BY ${hourExpression}
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

    const addDivider = () => {
      doc
        .moveDown(0.5)
        .strokeColor('#E2E8F0')
        .lineWidth(1)
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .stroke()
        .moveDown(0.8);
    };

    const drawHeader = (title, subtitle) => {
      const y = doc.y;
      const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      doc
        .save()
        .roundedRect(doc.page.margins.left, y, width, 64, 10)
        .fill('#0F172A')
        .fillColor('#E5E7EB')
        .fontSize(10)
        .text('Rapport Dvine', doc.page.margins.left + 16, y + 14)
        .fillColor('#FFFFFF')
        .fontSize(18)
        .text(title, doc.page.margins.left + 16, y + 28);

      if (subtitle) {
        doc
          .fillColor('#E5E7EB')
          .fontSize(10)
          .text(subtitle, doc.page.margins.left + 16, y + 48);
      }

      doc.restore();
      doc.moveDown(4);
    };

    const renderStatCards = (entries) => {
      const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const gutter = 12;
      const columns = 2;
      const cardWidth = (availableWidth - gutter * (columns - 1)) / columns;

      for (let i = 0; i < entries.length; i += columns) {
        const rowEntries = entries.slice(i, i + columns);
        const startY = doc.y;

        rowEntries.forEach((entry, colIndex) => {
          const x = doc.page.margins.left + colIndex * (cardWidth + gutter);
          doc
            .save()
            .roundedRect(x, startY, cardWidth, 66, 8)
            .fill('#F8FAFC')
            .fillColor('#475569')
            .fontSize(9)
            .text(entry.label, x + 12, startY + 12)
            .fontSize(16)
            .fillColor('#0F172A')
            .text(entry.value, x + 12, startY + 30)
            .restore();
        });

        doc.y = startY + 78;
      }
    };

    const renderPills = (items) => {
      items.forEach((item) => {
        const startY = doc.y;
        doc
          .save()
          .roundedRect(doc.page.margins.left, startY, doc.page.width - doc.page.margins.left - doc.page.margins.right, 40, 8)
          .fill('#F1F5F9');

        doc
          .fillColor('#0F172A')
          .fontSize(11)
          .text(item.title, doc.page.margins.left + 12, startY + 10)
          .fillColor('#475569')
          .fontSize(9)
          .text(item.subtitle, doc.page.margins.left + 12, startY + 26);

        doc.restore();
        doc.y = startY + 48;
      });
    };

    const buffer = await new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        drawHeader('Analyse des appels', `Généré le ${formatDateTime(new Date())}`);

        doc.fontSize(12).fillColor('#0F172A').text('Synthèse de la recherche');
        addDivider();

        renderStatCards([
          { label: 'Numéro analysé', value: result.number || 'Non précisé' },
          { label: 'Résultats inclus', value: `${result.calls.length} / ${result.limit}` },
          { label: 'Appels entrants', value: `${result.summary.asCallee}` },
          { label: 'Appels sortants', value: `${result.summary.asCaller}` },
          { label: 'Durée cumulée', value: formatDurationValue(result.summary.totalDuration) },
          { label: 'Durée moyenne', value: formatDurationValue(result.summary.averageDuration) },
          { label: 'Durée max', value: formatDurationValue(result.summary.maxDuration) },
          {
            label: 'Période filtrée',
            value: `${params.startDate || 'Non défini'} ${params.startTime || ''} → ${params.endDate || 'Non défini'} ${
              params.endTime || ''
            }`.trim()
          }
        ]);

        doc.moveDown(0.5);

        if (result.summary.providerBreakdown?.length) {
          doc.fontSize(12).fillColor('#0F172A').text('Top opérateurs');
          addDivider();
          renderPills(
            result.summary.providerBreakdown.slice(0, 5).map((entry) => ({
              title: entry.label || 'Non renseigné',
              subtitle: `${entry.count} appels` || '—'
            }))
          );
        }

        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#0F172A').text('Chronologie des appels');
        addDivider();

        renderPills(
          result.calls.map((call) => ({
            title: `${formatDateTime(call.start_time)} • ${call.calling_id} → ${call.called_id} (${formatDurationValue(
              call.duration
            )})`,
            subtitle: `Origine: ${call.org_pcip || 'N/A'} | Destination: ${call.dst_pcip || 'N/A'} | Cause: ${
              call.release_cause || '—'
            }`
          }))
        );

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
