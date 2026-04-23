const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class RefreshToken {
  static async create(userId, token, expiresIn = '7d') {
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + this.parseExpiration(expiresIn));

    const query = `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, expires_at, created_at
    `;

    const result = await pool.query(query, [userId, tokenHash, expiresAt]);
    return result.rows[0];
  }

  static async findByToken(token) {
    const query = `
      SELECT rt.*, u.email, u.role, u.is_active
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.expires_at > CURRENT_TIMESTAMP AND rt.is_revoked = false
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

  static async revokeToken(tokenId) {
    const query = `
      UPDATE refresh_tokens
      SET is_revoked = true
      WHERE id = $1
    `;

    await pool.query(query, [tokenId]);
  }

  static async revokeAllUserTokens(userId) {
    const query = `
      UPDATE refresh_tokens
      SET is_revoked = true
      WHERE user_id = $1 AND is_revoked = false
    `;

    await pool.query(query, [userId]);
  }

  static async cleanupExpiredTokens() {
    const query = `
      DELETE FROM refresh_tokens
      WHERE expires_at <= CURRENT_TIMESTAMP OR is_revoked = true
    `;

    const result = await pool.query(query);
    return result.rowCount;
  }

  static async getUserActiveTokens(userId) {
    const query = `
      SELECT id, expires_at, created_at
      FROM refresh_tokens
      WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP AND is_revoked = false
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [userId]);
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

module.exports = RefreshToken;
