/**
 * Modelo de Item de Factura para el sistema de facturación
 */
class InvoiceItem {
  constructor(data = {}) {
    this.id = data.id;
    this.invoiceId = data.invoice_id;
    this.productId = data.product_id;
    this.description = data.description;
    this.quantity = data.quantity || 1;
    this.unitPrice = data.unit_price;
    this.totalPrice = data.total_price;
    this.createdAt = data.created_at;
  }

  /**
   * Validar datos del item de factura
   */
  validate() {
    const errors = [];

    if (!this.description || this.description.trim().length === 0) {
      errors.push('La descripción del item es requerida');
    }

    if (!this.quantity || this.quantity <= 0) {
      errors.push('La cantidad debe ser mayor a 0');
    }

    if (!this.unitPrice || this.unitPrice <= 0) {
      errors.push('El precio unitario debe ser mayor a 0');
    }

    if (!this.totalPrice || this.totalPrice <= 0) {
      errors.push('El precio total debe ser mayor a 0');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calcular precio total
   */
  calculateTotal() {
    this.totalPrice = this.quantity * this.unitPrice;
  }

  /**
   * Convertir a formato de base de datos
   */
  toDatabase() {
    return {
      invoice_id: this.invoiceId,
      product_id: this.productId,
      description: this.description,
      quantity: this.quantity,
      unit_price: this.unitPrice,
      total_price: this.totalPrice
    };
  }

  /**
   * Convertir a formato JSON para API
   */
  toJSON() {
    return {
      id: this.id,
      invoiceId: this.invoiceId,
      productId: this.productId,
      description: this.description,
      quantity: parseInt(this.quantity),
      unitPrice: parseFloat(this.unitPrice),
      totalPrice: parseFloat(this.totalPrice),
      createdAt: this.createdAt
    };
  }

  /**
   * Crear instancia desde datos de base de datos
   */
  static fromDatabase(data) {
    return new InvoiceItem(data);
  }
}

module.exports = InvoiceItem;
