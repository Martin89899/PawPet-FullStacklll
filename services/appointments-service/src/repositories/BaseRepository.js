/**
 * Repositorio Base para el Appointments Service
 * @class BaseRepository
 * @description Proporciona operaciones CRUD genéricas y funcionalidades adicionales
 */
class BaseRepository {
  /**
   * Constructor del BaseRepository
   * @param {Object} pool - Pool de conexiones a PostgreSQL
   * @param {string} tableName - Nombre de la tabla
   */
  constructor(pool, tableName) {
    this.pool = pool;
    this.tableName = tableName;
  }

  /**
   * Crea un nuevo registro
   * @param {Object} data - Datos del registro
   * @returns {Promise<Object>} Registro creado
   */
  async create(data) {
    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${this.tableName} (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error al crear registro en ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Busca un registro por ID
   * @param {number} id - ID del registro
   * @returns {Promise<Object|null>} Registro encontrado o null
   */
  async findById(id) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
      const result = await this.pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error al buscar registro en ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Obtiene todos los registros
   * @param {Object} options - Opciones de consulta
   * @param {number} options.limit - Límite de resultados
   * @param {number} options.offset - Offset para paginación
   * @param {string} options.orderBy - Campo de ordenamiento
   * @param {string} options.orderDirection - Dirección de ordenamiento (ASC/DESC)
   * @returns {Promise<Array>} Array de registros
   */
  async findAll(options = {}) {
    try {
      const { limit, offset, orderBy = 'id', orderDirection = 'ASC' } = options;
      
      let query = `SELECT * FROM ${this.tableName}`;
      const params = [];
      
      if (limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);
      }
      
      if (offset) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(offset);
      }
      
      query += ` ORDER BY ${orderBy} ${orderDirection}`;
      
      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener registros de ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Actualiza un registro por ID
   * @param {number} id - ID del registro
   * @param {Object} data - Datos a actualizar
   * @returns {Promise<Object|null>} Registro actualizado o null
   */
  async updateById(id, data) {
    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      
      if (columns.length === 0) {
        return await this.findById(id);
      }
      
      const setClause = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');
      const query = `
        UPDATE ${this.tableName}
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await this.pool.query(query, [id, ...values]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error al actualizar registro en ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Elimina un registro por ID
   * @param {number} id - ID del registro
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  async deleteById(id) {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
      const result = await this.pool.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Error al eliminar registro de ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Busca registros con filtros personalizados
   * @param {Object} filters - Filtros de búsqueda
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Array>} Array de registros
   */
  async findWithFilters(filters = {}, options = {}) {
    try {
      const { limit, offset, orderBy = 'id', orderDirection = 'ASC' } = options;
      
      const whereConditions = [];
      const params = [];
      let paramIndex = 1;
      
      // Construir condiciones WHERE
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            whereConditions.push(`${key} = ANY($${paramIndex})`);
            params.push(value);
          } else if (typeof value === 'object' && value.operator) {
            whereConditions.push(`${key} ${value.operator} $${paramIndex}`);
            params.push(value.value);
          } else {
            whereConditions.push(`${key} = $${paramIndex}`);
            params.push(value);
          }
          paramIndex++;
        }
      });
      
      let query = `SELECT * FROM ${this.tableName}`;
      
      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }
      
      if (limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(limit);
        paramIndex++;
      }
      
      if (offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(offset);
      }
      
      query += ` ORDER BY ${orderBy} ${orderDirection}`;
      
      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al buscar con filtros en ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Cuenta registros con filtros
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<number>} Número de registros
   */
  async count(filters = {}) {
    try {
      const whereConditions = [];
      const params = [];
      let paramIndex = 1;
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            whereConditions.push(`${key} = ANY($${paramIndex})`);
            params.push(value);
          } else {
            whereConditions.push(`${key} = $${paramIndex}`);
            params.push(value);
          }
          paramIndex++;
        }
      });
      
      let query = `SELECT COUNT(*) FROM ${this.tableName}`;
      
      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }
      
      const result = await this.pool.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Error al contar registros en ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Ejecuta una consulta SQL personalizada
   * @param {string} query - Consulta SQL
   * @param {Array} params - Parámetros de la consulta
   * @returns {Promise<Array>} Resultados de la consulta
   */
  async query(query, params = []) {
    try {
      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al ejecutar consulta en ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Ejecuta una transacción
   * @param {Function} callback - Función a ejecutar en la transacción
   * @returns {Promise<any>} Resultado de la transacción
   */
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

  /**
   * Verifica si existe un registro
   * @param {Object} filters - Filtros para verificar existencia
   * @returns {Promise<boolean>} True si existe
   */
  async exists(filters) {
    try {
      const count = await this.count(filters);
      return count > 0;
    } catch (error) {
      throw new Error(`Error al verificar existencia en ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Obtiene el primer registro que cumple los filtros
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<Object|null>} Primer registro o null
   */
  async findOne(filters) {
    try {
      const results = await this.findWithFilters(filters, { limit: 1 });
      return results[0] || null;
    } catch (error) {
      throw new Error(`Error al buscar primer registro en ${this.tableName}: ${error.message}`);
    }
  }
}

module.exports = BaseRepository;
