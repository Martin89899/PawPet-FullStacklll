const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class Session {
  static async create(userId, token, ipAddress, userAgent, expiresIn = '24h') {
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + this.parseExpiration(expiresIn));

    const query = `
      INSERT INTO sessions (user_id, token_hash, ip_address, user_agent, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, ip_address, created_at, expires_at
    `;

    const result = await pool.query(query, [userId, tokenHash, ipAddress, userAgent, expiresAt]);
    return result.rows[0];
  }

  static async findByToken(token) {
    const query = `
      SELECT s.*, u.email, u.role, u.is_active
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.expires_at > CURRENT_TIMESTAMP AND s.is_active = true
    `;

    const result = await pool.query(query);
    
    // Validar el token contra todos los hashes
    for (const row of result.rows) {
      if (await bcrypt.compare(token, row.token_hash)) {
        return row;
      }
    }
    
    return null;
  }

  static async deactivateSession(sessionId) {
    const query = `
      UPDATE sessions
      SET is_active = false
      WHERE id = $1
    `;

    await pool.query(query, [sessionId]);
  }

  static async deactivateAllUserSessions(userId) {
    const query = `
      UPDATE sessions
      SET is_active = false
      WHERE user_id = $1 AND is_active = true
    `;

    await pool.query(query, [userId]);
  }

  static async cleanupExpiredSessions() {
    const query = `
      DELETE FROM sessions
      WHERE expires_at <= CURRENT_TIMESTAMP OR is_active = false
    `;

    const result = await pool.query(query);
    return result.rowCount;
  }

  static async getUserActiveSessions(userId) {
    const query = `
      SELECT id, ip_address, user_agent, created_at, expires_at
      FROM sessions
      WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP AND is_active = true
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async getSessionHistory(userId, limit = 10) {
    const query = `
      SELECT id, ip_address, user_agent, created_at, expires_at, is_active
      FROM sessions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  static parseExpiration(expiresIn) {
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

module.exports = Session;
