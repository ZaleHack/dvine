import database from '../config/database.js';

const TABLE = 'di_autres.cdr_unified_records';

const baseColumns = [
  'calling_id',
  'called_id',
  'duration',
  'start_time',
  'end_time',
  'org_pcip',
  'dst_pcip',
  'release_cause',
  'client',
  'provider',
  'operator',
  'direction',
  'type_flux',
  'transaction_type',
  'transaction_status',
  'amount',
  'currency',
  'source_file',
  'raw_payload'
];

const buildPlaceholders = (columns, rows) =>
  rows
    .map(
      () =>
        `(${columns
          .map(() => '?')
          .concat(['?'])
          .join(',')})`
    )
    .join(',');

class UnifiedCdrRecord {
  static async bulkInsert(records = []) {
    if (!Array.isArray(records) || records.length === 0) {
      return;
    }

    const columns = [...baseColumns, 'created_at'];
    const values = [];

    for (const record of records) {
      for (const column of baseColumns) {
        if (column === 'raw_payload') {
          values.push(record.raw_payload ? JSON.stringify(record.raw_payload) : null);
        } else {
          values.push(record[column] ?? null);
        }
      }
      values.push(record.created_at || new Date());
    }

    const placeholders = buildPlaceholders(baseColumns, records);
    await database.query(
      `INSERT INTO ${TABLE} (${columns.join(',')}) VALUES ${placeholders}`,
      values
    );
  }

  static async search(filters = {}, options = {}) {
    const conditions = [];
    const params = [];

    if (filters.number) {
      conditions.push('(calling_id = ? OR called_id = ?)');
      params.push(filters.number, filters.number);
    }

    if (filters.operator) {
      conditions.push('operator = ?');
      params.push(filters.operator);
    }

    if (filters.direction) {
      conditions.push('direction = ?');
      params.push(filters.direction);
    }

    if (filters.type_flux) {
      conditions.push('type_flux = ?');
      params.push(filters.type_flux);
    }

    if (filters.client) {
      conditions.push('client = ?');
      params.push(filters.client);
    }

    if (filters.provider) {
      conditions.push('provider = ?');
      params.push(filters.provider);
    }

    if (filters.release_cause) {
      conditions.push('release_cause = ?');
      params.push(filters.release_cause);
    }

    if (filters.start_date) {
      conditions.push('start_time >= ?');
      params.push(`${filters.start_date} 00:00:00`);
    }

    if (filters.end_date) {
      conditions.push('start_time <= ?');
      params.push(`${filters.end_date} 23:59:59`);
    }

    if (filters.min_duration) {
      conditions.push('duration >= ?');
      params.push(Number(filters.min_duration));
    }

    if (filters.max_duration) {
      conditions.push('duration <= ?');
      params.push(Number(filters.max_duration));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Number(options.limit) > 0 ? Number(options.limit) : 200;
    const offset = Number(options.offset) > 0 ? Number(options.offset) : 0;

    const rows = await database.query(
      `SELECT * FROM ${TABLE} ${whereClause} ORDER BY start_time DESC LIMIT ? OFFSET ?`,
      params.concat([limit, offset])
    );

    return rows.map((row) => ({
      ...row,
      raw_payload: typeof row.raw_payload === 'string' ? JSON.parse(row.raw_payload) : row.raw_payload
    }));
  }

  static async timeline(msisdn, options = {}) {
    if (!msisdn) {
      return [];
    }
    const timeline = await this.search(
      { number: msisdn, start_date: options.start_date, end_date: options.end_date, operator: options.operator },
      { limit: options.limit || 500 }
    );
    return timeline.sort((a, b) => new Date(a.start_time || 0) - new Date(b.start_time || 0));
  }

  static async stats() {
    const [volumeByOperator, volumeByFlux, releaseCauses, topCalling, topCalled, money] = await Promise.all([
      database.query(`SELECT operator, COUNT(*) as total FROM ${TABLE} GROUP BY operator ORDER BY total DESC`),
      database.query(`SELECT type_flux, COUNT(*) as total FROM ${TABLE} GROUP BY type_flux ORDER BY total DESC`),
      database.query(
        `SELECT release_cause, COUNT(*) as total FROM ${TABLE} WHERE release_cause IS NOT NULL GROUP BY release_cause ORDER BY total DESC`
      ),
      database.query(
        `SELECT calling_id as number, COUNT(*) as total FROM ${TABLE} WHERE calling_id IS NOT NULL GROUP BY calling_id ORDER BY total DESC LIMIT 10`
      ),
      database.query(
        `SELECT called_id as number, COUNT(*) as total FROM ${TABLE} WHERE called_id IS NOT NULL GROUP BY called_id ORDER BY total DESC LIMIT 10`
      ),
      database.query(
        `SELECT operator, type_flux, COUNT(*) as total, SUM(amount) as amount FROM ${TABLE} WHERE amount IS NOT NULL GROUP BY operator, type_flux`
      )
    ]);

    return {
      volumeByOperator,
      volumeByFlux,
      releaseCauses,
      topCalling,
      topCalled,
      money
    };
  }
}

export default UnifiedCdrRecord;
