const BaseRepository = require('./BaseRepository');
const bcrypt = require('bcryptjs');

class UserRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'users');
  }

  async findByEmail(email) {
    return this.findOne({ email });
  }

  async create(userData) {
    const { email, password, firstName, lastName, role = 'client', phone } = userData;
    
    // Hash del password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const data = {
      email,
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      role,
      phone
    };

    return this.create(data);
  }

  async updateLastLogin(userId) {
    const query = `
      UPDATE users
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING last_login
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows[0]?.last_login;
  }

  async updateProfile(userId, userData) {
    const { firstName, lastName, phone } = userData;
    
    const data = {
      first_name: firstName,
      last_name: lastName,
      phone
    };

    return this.update(userId, data);
  }

  async changePassword(userId, newPassword) {
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    const data = {
      password_hash: passwordHash
    };

    return this.update(userId, data);
  }

  async deactivateUser(userId) {
    const data = {
      is_active: false
    };

    return this.update(userId, data);
  }

  async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  async getAllUsers(limit = 50, offset = 0) {
    return this.findMany(
      {},
      { 
        orderBy: 'created_at DESC',
        limit,
        offset
      }
    );
  }

  async getUsersByRole(role) {
    return this.findMany(
      { role, is_active: true },
      { orderBy: 'first_name, last_name' }
    );
  }

  async searchUsers(searchTerm) {
    const query = `
      SELECT id, email, first_name, last_name, role, phone, is_active, created_at, last_login
      FROM users
      WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1)
      AND is_active = true
      ORDER BY first_name, last_name
      LIMIT 20
    `;

    const result = await this.pool.query(query, [`%${searchTerm}%`]);
    return result.rows;
  }

  async getActiveUserById(id) {
    return this.findOne({ id, is_active: true });
  }

  async getTotalCount() {
    return this.count({ is_active: true });
  }

  async getUsersByRoleCount(role) {
    return this.count({ role, is_active: true });
  }

  async getUserStats() {
    const query = `
      SELECT 
        role,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_count,
        COUNT(CASE WHEN last_login > CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_login_count
      FROM users
      GROUP BY role
      ORDER BY count DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getUsersCreatedInPeriod(startDate, endDate) {
    const query = `
      SELECT id, email, first_name, last_name, role, created_at
      FROM users
      WHERE created_at BETWEEN $1 AND $2
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  async bulkUpdateStatus(userIds, isActive) {
    const query = `
      UPDATE users
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2)
      RETURNING id, email, is_active
    `;

    const result = await this.pool.query(query, [isActive, userIds]);
    return result.rows;
  }
}

module.exports = UserRepository;
