const BaseRepository = require('./BaseRepository');
const bcrypt = require('bcryptjs');

class SessionRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'sessions');
  }

  async create(userId, token, ipAddress, userAgent, expiresIn = '24h') {
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + this.parseExpiration(expiresIn));

    const data = {
      user_id: userId,
      token_hash: tokenHash,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt
    };

    return this.create(data);
  }

  async findByToken(token) {
    const query = `
      SELECT s.*, u.email, u.role, u.is_active
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.expires_at > CURRENT_TIMESTAMP AND s.is_active = true
    `;

    const result = await this.pool.query(query);
    
    // Validar el token contra todos los hashes
    for (const row of result.rows) {
      if (await bcrypt.compare(token, row.token_hash)) {
        return row;
      }
    }
    
    return null;
  }

  async deactivateSession(sessionId) {
    const data = {
      is_active: false
    };

    return this.update(sessionId, data);
  }

  async deactivateAllUserSessions(userId) {
    const query = `
      UPDATE sessions
      SET is_active = false
      WHERE user_id = $1 AND is_active = true
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rowCount;
  }

  async cleanupExpiredSessions() {
    const query = `
      DELETE FROM sessions
      WHERE expires_at <= CURRENT_TIMESTAMP OR is_active = false
    `;

    const result = await this.pool.query(query);
    return result.rowCount;
  }

  async getUserActiveSessions(userId) {
    const query = `
      SELECT id, ip_address, user_agent, created_at, expires_at
      FROM sessions
      WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP AND is_active = true
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async getSessionHistory(userId, limit = 10) {
    return this.findMany(
      { user_id: userId },
      { 
        orderBy: 'created_at DESC',
        limit
      }
    );
  }

  async getSessionsByIp(ipAddress) {
    return this.findMany(
      { ip_address: ipAddress, is_active: true },
      { orderBy: 'created_at DESC' }
    );
  }

  async getSessionsByUserAgent(userAgent) {
    return this.findMany(
      { user_agent: userAgent, is_active: true },
      { orderBy: 'created_at DESC' }
    );
  }

  async getActiveSessionsCount() {
    return this.count({
      is_active: true,
      expires_at: { $gt: new Date() }
    });
  }

  async getSessionsByTimeRange(startDate, endDate) {
    const query = `
      SELECT id, user_id, ip_address, user_agent, created_at, expires_at, is_active
      FROM sessions
      WHERE created_at BETWEEN $1 AND $2
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  async getSessionStats() {
    const query = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN is_active = true AND expires_at > CURRENT_TIMESTAMP THEN 1 END) as active_sessions,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_sessions,
        COUNT(CASE WHEN expires_at <= CURRENT_TIMESTAMP THEN 1 END) as expired_sessions,
        COUNT(DISTINCT user_id) as unique_users
      FROM sessions
    `;

    const result = await this.pool.query(query);
    return result.rows[0];
  }

  async getSessionsByHour() {
    const query = `
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as session_count
      FROM sessions
      WHERE created_at >= CURRENT_DATE
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getTopUserAgents(limit = 10) {
    const query = `
      SELECT 
        user_agent,
        COUNT(*) as count
      FROM sessions
      GROUP BY user_agent
      ORDER BY count DESC
      LIMIT $1
    `;

    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }

  async getTopIpAddresses(limit = 10) {
    const query = `
      SELECT 
        ip_address,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
      FROM sessions
      GROUP BY ip_address
      ORDER BY count DESC
      LIMIT $1
    `;

    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }

  async bulkDeactivateSessions(sessionIds) {
    const query = `
      UPDATE sessions
      SET is_active = false
      WHERE id = ANY($1)
      RETURNING id, user_id, is_active
    `;

    const result = await this.pool.query(query, [sessionIds]);
    return result.rows;
  }

  parseExpiration(expiresIn) {
    const timeUnits = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000
    };

    const match = expiresIn.match(/^(\d+)([smhdw])$/);
    if (!match) {
      throw new Error('Invalid expiration format. Use format like "7d", "24h", "30m"');
    }

    const [, amount, unit] = match;
    return parseInt(amount) * timeUnits[unit];
  }
}

module.exports = SessionRepository;
