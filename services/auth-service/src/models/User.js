const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(userData) {
    const { email, password, firstName, lastName, role = 'client', phone } = userData;
    
    // Hash del password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, role, phone)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, first_name, last_name, role, phone, is_active, created_at
    `;

    try {
      const result = await pool.query(query, [email, passwordHash, firstName, lastName, role, phone]);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  static async findByEmail(email) {
    const query = `
      SELECT id, email, password_hash, first_name, last_name, role, phone, is_active, created_at, last_login
      FROM users
      WHERE email = $1
    `;

    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT id, email, first_name, last_name, role, phone, is_active, created_at, last_login
      FROM users
      WHERE id = $1 AND is_active = true
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async updateLastLogin(userId) {
    const query = `
      UPDATE users
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING last_login
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0].last_login;
  }

  static async updateProfile(userId, userData) {
    const { firstName, lastName, phone } = userData;
    
    const query = `
      UPDATE users
      SET first_name = $1, last_name = $2, phone = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, email, first_name, last_name, role, phone, updated_at
    `;

    const result = await pool.query(query, [firstName, lastName, phone, userId]);
    return result.rows[0];
  }

  static async changePassword(userId, newPassword) {
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    const query = `
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await pool.query(query, [passwordHash, userId]);
  }

  static async deactivateUser(userId) {
    const query = `
      UPDATE users
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await pool.query(query, [userId]);
  }

  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async getAllUsers(limit = 50, offset = 0) {
    const query = `
      SELECT id, email, first_name, last_name, role, phone, is_active, created_at, last_login
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  static async getUsersByRole(role) {
    const query = `
      SELECT id, email, first_name, last_name, role, phone, is_active, created_at, last_login
      FROM users
      WHERE role = $1 AND is_active = true
      ORDER BY first_name, last_name
    `;

    const result = await pool.query(query, [role]);
    return result.rows;
  }

  static async searchUsers(searchTerm) {
    const query = `
      SELECT id, email, first_name, last_name, role, phone, is_active, created_at, last_login
      FROM users
      WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1)
      AND is_active = true
      ORDER BY first_name, last_name
      LIMIT 20
    `;

    const result = await pool.query(query, [`%${searchTerm}%`]);
    return result.rows;
  }
}

module.exports = User;
