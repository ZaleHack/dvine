import database from '../config/database.js';
import { PassThrough } from 'stream';
import { sanitizeLimit } from '../utils/number-utils.js';

const TABLE_NAME = '`di_autres`.`transactions`';

const sanitizeMsisdn = (value = '') => {
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

class TransactionAnalysisService {
  #buildFilters(params = {}) {
    const msisdn = sanitizeMsisdn(params.msisdn || params.phone || params.number || '');
    const conditions = [];
    const queryParams = [];

    if (msisdn) {
      const like = `%${msisdn}%`;
      conditions.push('(FromMSISDN LIKE ? OR ToMSISDN LIKE ?)');
      queryParams.push(like, like);
    }

    const startDateTime = buildDateTime(params.startDate, params.startTime, false);
    const endDateTime = buildDateTime(params.endDate, params.endTime, true);

    if (startDateTime) {
      conditions.push('DateTime >= ?');
      queryParams.push(startDateTime);
    }

    if (endDateTime) {
      conditions.push('DateTime <= ?');
      queryParams.push(endDateTime);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    return { msisdn, whereClause, queryParams, startDateTime, endDateTime };
  }

  async #computeStats(whereClause = '', queryParams = []) {
    const totals =
      (await database.queryOne(
        `
        SELECT
          COUNT(*) AS totalTransactions,
          COALESCE(SUM(Amount), 0) AS totalAmount,
          COALESCE(AVG(Amount), 0) AS averageAmount,
          COALESCE(MAX(Amount), 0) AS maxAmount
        FROM ${TABLE_NAME}
        ${whereClause}
      `,
        queryParams
      )) || {};

    const groupedQuery = async (field, limit = 8) => {
      const safeLimit = sanitizeLimit(limit, { defaultValue: 8, min: 1, max: 100 });

      return database.query(
        `
        SELECT
          ${field} AS label,
          COUNT(*) AS count,
          COALESCE(SUM(Amount), 0) AS totalAmount,
          COALESCE(AVG(Amount), 0) AS averageAmount
        FROM ${TABLE_NAME}
        ${whereClause}
        GROUP BY ${field}
        ORDER BY count DESC
        LIMIT ${safeLimit}
      `,
        queryParams
      );
    };

    const dailyVolume = await database.query(
      `
        SELECT
          DATE(DateTime) AS day,
          COUNT(*) AS count,
          COALESCE(SUM(Amount), 0) AS totalAmount
        FROM ${TABLE_NAME}
        ${whereClause}
        GROUP BY DATE(DateTime)
        ORDER BY day DESC
        LIMIT 30
      `,
      queryParams
    );

    return {
      totals: {
        totalTransactions: Number(totals.totalTransactions || 0),
        totalAmount: Number(totals.totalAmount || 0),
        averageAmount: Number(totals.averageAmount || 0),
        maxAmount: Number(totals.maxAmount || 0)
      },
      currencyBreakdown: await groupedQuery('Currency'),
      typeBreakdown: await groupedQuery('TransactionType'),
      statusBreakdown: await groupedQuery('TransactionStatus'),
      providerBreakdown: await groupedQuery('ProviderCategory'),
      dailyVolume
    };
  }

  async searchTransactions(params = {}) {
    const { msisdn, whereClause, queryParams, startDateTime, endDateTime } = this.#buildFilters(params);

    if (!msisdn) {
      throw new Error('MSISDN_REQUIS');
    }

    const limit = sanitizeLimit(params.limit, { defaultValue: 120, min: 1, max: 300 });
    const safeLimit = Number(limit);

    const transactions = await database.query(
      `
        SELECT
          TransactionID AS transactionId,
          FinancialTransactionID AS financialTransactionId,
          ExternalTransactionID AS externalTransactionId,
          DateTime AS dateTime,
          InitiatingUser AS initiatingUser,
          RealUser AS realUser,
          FromID AS fromId,
          FromMSISDN AS fromMsisdn,
          FromUsername AS fromUsername,
          FromProfile AS fromProfile,
          FromAccount AS fromAccount,
          FromFee AS fromFee,
          FromLoyaltyReward AS fromLoyaltyReward,
          FromLoyaltyFee AS fromLoyaltyFee,
          FromBankDomain AS fromBankDomain,
          ToID AS toId,
          ToMSISDN AS toMsisdn,
          ToUsername AS toUsername,
          ToProfile AS toProfile,
          ToAccount AS toAccount,
          ToFee AS toFee,
          ToLoyaltyReward AS toLoyaltyReward,
          ToLoyaltyFee AS toLoyaltyFee,
          ToBankDomain AS toBankDomain,
          TransactionType AS transactionType,
          Amount AS amount,
          Currency AS currency,
          TransactionStatus AS transactionStatus,
          Context AS context,
          ProviderCategory AS providerCategory,
          Comment AS comment,
          Version AS version
        FROM ${TABLE_NAME}
        ${whereClause}
        ORDER BY DateTime DESC
        LIMIT ${safeLimit}
      `,
      queryParams
    );

    const totalRow = await database.queryOne(`SELECT COUNT(*) AS total FROM ${TABLE_NAME} ${whereClause}`, queryParams);

    const stats = await this.#computeStats(whereClause, queryParams);
    const globalStats = await this.getGlobalStats();

    return {
      filters: {
        msisdn,
        startDateTime,
        endDateTime
      },
      total: Number(totalRow?.total || transactions.length || 0),
      limit,
      transactions,
      stats,
      globalStats
    };
  }

  async getGlobalStats() {
    return this.#computeStats('', []);
  }

  async generateReport(params = {}) {
    const { transactions, stats, filters } = await this.searchTransactions(params);
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

    const formatAmount = (amount, currency) => {
      const numeric = Number(amount || 0);
      return `${numeric.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency || ''}`.trim();
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
          .roundedRect(doc.page.margins.left, startY, doc.page.width - doc.page.margins.left - doc.page.margins.right, 42, 8)
          .fill('#F1F5F9');

        doc
          .fillColor('#0F172A')
          .fontSize(11)
          .text(item.title, doc.page.margins.left + 12, startY + 10)
          .fillColor('#475569')
          .fontSize(9)
          .text(item.subtitle, doc.page.margins.left + 12, startY + 26);

        doc.restore();
        doc.y = startY + 52;
      });
    };

    const buffer = await new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        drawHeader('Analyse des Transactions', `Généré le ${formatDateTime(new Date())}`);

        doc.fontSize(12).fillColor('#0F172A').text('Synthèse des filtres');
        addDivider();

        renderStatCards([
          { label: 'Numéro recherché', value: filters.msisdn || '—' },
          { label: 'Début', value: formatDateTime(filters.startDateTime) },
          { label: 'Fin', value: formatDateTime(filters.endDateTime) },
          { label: 'Transactions extraites', value: `${transactions.length} / ${stats.totals.totalTransactions}` },
          { label: 'Montant total filtré', value: formatAmount(stats.totals.totalAmount, 'XAF') },
          { label: 'Montant moyen', value: formatAmount(stats.totals.averageAmount, 'XAF') },
          { label: 'Plus haut montant', value: formatAmount(stats.totals.maxAmount, 'XAF') },
          { label: 'Taux de réussite', value: `${stats.successRate ?? 0}%` }
        ]);

        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#0F172A').text('Transactions récentes');
        addDivider();

        renderPills(
          transactions.slice(0, 60).map((tx) => ({
            title: `${formatDateTime(tx.dateTime)} • ${tx.fromMsisdn || 'N/A'} → ${tx.toMsisdn || 'N/A'} (${tx.transactionType || '—'})`,
            subtitle: `Montant: ${formatAmount(tx.amount, tx.currency)} | Statut: ${tx.transactionStatus || '—'} | Contexte: ${
              tx.context || '—'
            }`
          }))
        );

        doc.moveDown(1);
        doc.fontSize(10).fillColor('#0F172A').text('Signature : Dvine Intelligence', { align: 'right' });
      } catch (error) {
        reject(error);
        return;
      } finally {
        doc.end();
      }
    });

    const suffix = filters.msisdn ? filters.msisdn.replace(/[^0-9+]/g, '') : 'export';
    const fileName = `analyse-transactions-${suffix || 'export'}.pdf`;

    return { buffer, fileName };
  }
}

export default TransactionAnalysisService;
