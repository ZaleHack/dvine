import database from '../config/database.js';

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
}

export default CallAnalysisService;
