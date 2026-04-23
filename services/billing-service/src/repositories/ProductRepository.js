const { pool } = require('../config/database');
const Product = require('../models/Product');

/**
 * Repositorio para manejar operaciones de productos/servicios
 */
class ProductRepository {
  /**
   * Crear un nuevo producto
   */
  async create(productData) {
    const product = new Product(productData);
    const validation = product.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const query = `
      INSERT INTO products (name, description, price, type, category, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      product.name,
      product.description,
      product.price,
      product.type,
      product.category,
      product.isActive
    ];

    try {
      const result = await pool.query(query, values);
      return Product.fromDatabase(result.rows[0]);
    } catch (error) {
      throw new Error(`Error creating product: ${error.message}`);
    }
  }

  /**
   * Obtener todos los productos activos
   */
  async findAllActive() {
    const query = 'SELECT * FROM products WHERE is_active = true ORDER BY name';
    
    try {
      const result = await pool.query(query);
      return result.rows.map(row => Product.fromDatabase(row));
    } catch (error) {
      throw new Error(`Error fetching products: ${error.message}`);
    }
  }

  /**
   * Obtener todos los productos (incluyendo inactivos)
   */
  async findAll() {
    const query = 'SELECT * FROM products ORDER BY name';
    
    try {
      const result = await pool.query(query);
      return result.rows.map(row => Product.fromDatabase(row));
    } catch (error) {
      throw new Error(`Error fetching all products: ${error.message}`);
    }
  }

  /**
   * Obtener producto por ID
   */
  async findById(id) {
    const query = 'SELECT * FROM products WHERE id = $1';
    
    try {
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      return Product.fromDatabase(result.rows[0]);
    } catch (error) {
      throw new Error(`Error fetching product by ID: ${error.message}`);
    }
  }

  /**
   * Obtener productos por tipo
   */
  async findByType(type) {
    const query = 'SELECT * FROM products WHERE type = $1 AND is_active = true ORDER BY name';
    
    try {
      const result = await pool.query(query, [type]);
      return result.rows.map(row => Product.fromDatabase(row));
    } catch (error) {
      throw new Error(`Error fetching products by type: ${error.message}`);
    }
  }

  /**
   * Obtener productos por categoría
   */
  async findByCategory(category) {
    const query = 'SELECT * FROM products WHERE category = $1 AND is_active = true ORDER BY name';
    
    try {
      const result = await pool.query(query, [category]);
      return result.rows.map(row => Product.fromDatabase(row));
    } catch (error) {
      throw new Error(`Error fetching products by category: ${error.message}`);
    }
  }

  /**
   * Buscar productos por nombre o descripción
   */
  async search(searchTerm) {
    const query = `
      SELECT * FROM products 
      WHERE is_active = true 
      AND (name ILIKE $1 OR description ILIKE $1)
      ORDER BY name
    `;
    
    try {
      const result = await pool.query(query, [`%${searchTerm}%`]);
      return result.rows.map(row => Product.fromDatabase(row));
    } catch (error) {
      throw new Error(`Error searching products: ${error.message}`);
    }
  }

  /**
   * Actualizar un producto
   */
  async update(id, productData) {
    const product = new Product({ ...productData, id });
    const validation = product.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const query = `
      UPDATE products 
      SET name = $1, description = $2, price = $3, type = $4, category = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    
    const values = [
      product.name,
      product.description,
      product.price,
      product.type,
      product.category,
      product.isActive,
      id
    ];

    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Product not found');
      }
      return Product.fromDatabase(result.rows[0]);
    } catch (error) {
      throw new Error(`Error updating product: ${error.message}`);
    }
  }

  /**
   * Desactivar un producto (soft delete)
   */
  async deactivate(id) {
    const query = `
      UPDATE products 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) {
        throw new Error('Product not found');
      }
      return Product.fromDatabase(result.rows[0]);
    } catch (error) {
      throw new Error(`Error deactivating product: ${error.message}`);
    }
  }

  /**
   * Activar un producto
   */
  async activate(id) {
    const query = `
      UPDATE products 
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) {
        throw new Error('Product not found');
      }
      return Product.fromDatabase(result.rows[0]);
    } catch (error) {
      throw new Error(`Error activating product: ${error.message}`);
    }
  }

  /**
   * Eliminar un producto (hard delete)
   */
  async delete(id) {
    const query = 'DELETE FROM products WHERE id = $1 RETURNING *';
    
    try {
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) {
        throw new Error('Product not found');
      }
      return Product.fromDatabase(result.rows[0]);
    } catch (error) {
      throw new Error(`Error deleting product: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de productos
   */
  async getStats() {
    const query = `
      SELECT 
        type,
        COUNT(*) as count,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM products 
      WHERE is_active = true
      GROUP BY type
      ORDER BY type
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching product stats: ${error.message}`);
    }
  }
}

module.exports = new ProductRepository();
