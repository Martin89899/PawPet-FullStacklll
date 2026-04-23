class BaseRepository {
  constructor(pool, tableName) {
    this.pool = pool;
    this.tableName = tableName;
  }

  async findById(id) {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findOne(conditions) {
    const whereClause = Object.keys(conditions).map((key, index) => `${key} = $${index + 1}`).join(' AND ');
    const values = Object.values(conditions);
    const query = `SELECT * FROM ${this.tableName} WHERE ${whereClause}`;
    const result = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  async findMany(conditions = {}, options = {}) {
    let query = `SELECT * FROM ${this.tableName}`;
    const values = [];
    let paramIndex = 1;

    // WHERE clause
    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions).map(key => {
        values.push(conditions[key]);
        return `${key} = $${paramIndex++}`;
      }).join(' AND ');
      query += ` WHERE ${whereClause}`;
    }

    // ORDER BY
    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    }

    // LIMIT and OFFSET
    if (options.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(options.limit);
    }
    if (options.offset) {
      query += ` OFFSET $${paramIndex++}`;
      values.push(options.offset);
    }

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async create(data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async update(id, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((column, index) => `${column} = $${index + 2}`).join(', ');
    
    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  async delete(id) {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async count(conditions = {}) {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const values = [];

    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions).map((key, index) => {
        values.push(conditions[key]);
        return `${key} = $${index + 1}`;
      }).join(' AND ');
      query += ` WHERE ${whereClause}`;
    }

    const result = await this.pool.query(query, values);
    return parseInt(result.rows[0].count);
  }

  async exists(conditions) {
    const count = await this.count(conditions);
    return count > 0;
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async search(searchTerm, searchFields = ['name'], options = {}) {
    const searchConditions = searchFields.map(field => `${field} ILIKE $1`);
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE ${searchConditions.join(' OR ')}
      ORDER BY ${options.orderBy || 'id'}
      LIMIT $2
    `;
    
    const result = await this.pool.query(query, [`%${searchTerm}%`, options.limit || 50]);
    return result.rows;
  }

  async softDelete(id) {
    const query = `
      UPDATE ${this.tableName}
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async restore(id) {
    const query = `
      UPDATE ${this.tableName}
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = BaseRepository;
