const BaseRepository = require('./BaseRepository');
const bcrypt = require('bcryptjs');

class RefreshTokenRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'refresh_tokens');
  }

  async create(userId, token, expiresIn = '7d') {
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + this.parseExpiration(expiresIn));

    const data = {
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt
    };

    return this.create(data);
  }

  async findByToken(token) {
    // Primero obtenemos todos los tokens no expirados y no revocados
    const query = `
      SELECT rt.*, u.email, u.role, u.is_active
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.expires_at > CURRENT_TIMESTAMP AND rt.is_revoked = false
    `;

    const result = await this.pool.query(query);
    
    // Validamos el token contra todos los hashes
    for (const row of result.rows) {
      if (await bcrypt.compare(token, row.token_hash)) {
        return row;
      }
    }
    
    return null;
  }

  async revokeToken(tokenId) {
    const data = {
      is_revoked: true
    };

    return this.update(tokenId, data);
  }

  async revokeAllUserTokens(userId) {
    const query = `
      UPDATE refresh_tokens
      SET is_revoked = true
      WHERE user_id = $1 AND is_revoked = false
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rowCount;
  }

  async cleanupExpiredTokens() {
    const query = `
      DELETE FROM refresh_tokens
      WHERE expires_at <= CURRENT_TIMESTAMP OR is_revoked = true
    `;

    const result = await this.pool.query(query);
    return result.rowCount;
  }

  async getUserActiveTokens(userId) {
    const query = `
      SELECT id, expires_at, created_at
      FROM refresh_tokens
      WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP AND is_revoked = false
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async getTokenById(tokenId) {
    return this.findById(tokenId);
  }

  async getTokensByUser(userId, options = {}) {
    const conditions = { user_id: userId };
    
    if (!options.includeRevoked) {
      conditions.is_revoked = false;
    }

    return this.findMany(conditions, {
      orderBy: 'created_at DESC',
      limit: options.limit,
      offset: options.offset
    });
  }

  async countActiveTokensByUser(userId) {
    return this.count({
      user_id: userId,
      is_revoked: false
    });
  }

  async getExpiredTokensCount() {
    const query = `
      SELECT COUNT(*) as count
      FROM refresh_tokens
      WHERE expires_at <= CURRENT_TIMESTAMP
    `;

    const result = await this.pool.query(query);
    return parseInt(result.rows[0].count);
  }

  async getRevokedTokensCount() {
    return this.count({ is_revoked: true });
  }

  async getTokenStats() {
    const query = `
      SELECT 
        COUNT(*) as total_tokens,
        COUNT(CASE WHEN is_revoked = false AND expires_at > CURRENT_TIMESTAMP THEN 1 END) as active_tokens,
        COUNT(CASE WHEN is_revoked = true THEN 1 END) as revoked_tokens,
        COUNT(CASE WHEN expires_at <= CURRENT_TIMESTAMP THEN 1 END) as expired_tokens
      FROM refresh_tokens
    `;

    const result = await this.pool.query(query);
    return result.rows[0];
  }

  async bulkRevokeTokens(tokenIds) {
    const query = `
      UPDATE refresh_tokens
      SET is_revoked = true
      WHERE id = ANY($1)
      RETURNING id, user_id, is_revoked
    `;

    const result = await this.pool.query(query, [tokenIds]);
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

module.exports = RefreshTokenRepository;
