/**
 * Modelo de Producto/Servicio para el sistema de facturación
 */
class Product {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.price = data.price;
    this.type = data.type; // 'service', 'product', 'consultation', 'vaccine', 'procedure'
    this.category = data.category;
    this.isActive = data.is_active !== undefined ? data.is_active : true;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * Validar datos del producto
   */
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('El nombre del producto es requerido');
    }

    if (!this.price || this.price <= 0) {
      errors.push('El precio debe ser mayor a 0');
    }

    if (!this.type || !['service', 'product', 'consultation', 'vaccine', 'procedure'].includes(this.type)) {
      errors.push('El tipo de producto debe ser uno de: service, product, consultation, vaccine, procedure');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Convertir a formato de base de datos
   */
  toDatabase() {
    return {
      name: this.name,
      description: this.description,
      price: this.price,
      type: this.type,
      category: this.category,
      is_active: this.isActive
    };
  }

  /**
   * Convertir a formato JSON para API
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      price: parseFloat(this.price),
      type: this.type,
      category: this.category,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Crear instancia desde datos de base de datos
   */
  static fromDatabase(data) {
    return new Product(data);
  }
}

module.exports = Product;
