/**
 * Modelo de Factura para el sistema de facturación
 */
class Invoice {
  constructor(data = {}) {
    this.id = data.id;
    this.invoiceNumber = data.invoice_number;
    this.patientId = data.patient_id;
    this.clientId = data.client_id;
    this.veterinarianId = data.veterinarian_id;
    this.subtotal = data.subtotal;
    this.taxAmount = data.tax_amount || 0;
    this.totalAmount = data.total_amount;
    this.status = data.status || 'pending'; // 'pending', 'paid', 'cancelled', 'refunded'
    this.dueDate = data.due_date;
    this.paidDate = data.paid_date;
    this.notes = data.notes;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.items = data.items || []; // Array de InvoiceItem
  }

  /**
   * Validar datos de la factura
   */
  validate() {
    const errors = [];

    if (!this.patientId) {
      errors.push('El ID del paciente es requerido');
    }

    if (!this.clientId) {
      errors.push('El ID del cliente es requerido');
    }

    if (!this.subtotal || this.subtotal < 0) {
      errors.push('El subtotal debe ser mayor o igual a 0');
    }

    if (!this.totalAmount || this.totalAmount < 0) {
      errors.push('El total debe ser mayor o igual a 0');
    }

    if (!this.status || !['pending', 'paid', 'cancelled', 'refunded'].includes(this.status)) {
      errors.push('El estado debe ser uno de: pending, paid, cancelled, refunded');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calcular totales basado en los items
   */
  calculateTotals() {
    if (!this.items || this.items.length === 0) {
      this.subtotal = 0;
      this.totalAmount = this.taxAmount;
      return;
    }

    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    this.totalAmount = this.subtotal + this.taxAmount;
  }

  /**
   * Marcar como pagada
   */
  markAsPaid() {
    this.status = 'paid';
    this.paidDate = new Date();
  }

  /**
   * Marcar como cancelada
   */
  markAsCancelled() {
    this.status = 'cancelled';
  }

  /**
   * Verificar si está vencida
   */
  isOverdue() {
    if (!this.dueDate || this.status === 'paid' || this.status === 'cancelled') {
      return false;
    }
    return new Date() > new Date(this.dueDate);
  }

  /**
   * Convertir a formato de base de datos
   */
  toDatabase() {
    return {
      invoice_number: this.invoiceNumber,
      patient_id: this.patientId,
      client_id: this.clientId,
      veterinarian_id: this.veterinarianId,
      subtotal: this.subtotal,
      tax_amount: this.taxAmount,
      total_amount: this.totalAmount,
      status: this.status,
      due_date: this.dueDate,
      paid_date: this.paidDate,
      notes: this.notes
    };
  }

  /**
   * Convertir a formato JSON para API
   */
  toJSON() {
    return {
      id: this.id,
      invoiceNumber: this.invoiceNumber,
      patientId: this.patientId,
      clientId: this.clientId,
      veterinarianId: this.veterinarianId,
      subtotal: parseFloat(this.subtotal),
      taxAmount: parseFloat(this.taxAmount),
      totalAmount: parseFloat(this.totalAmount),
      status: this.status,
      dueDate: this.dueDate,
      paidDate: this.paidDate,
      notes: this.notes,
      isOverdue: this.isOverdue(),
      items: this.items.map(item => item.toJSON()),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Crear instancia desde datos de base de datos
   */
  static fromDatabase(data) {
    return new Invoice(data);
  }
}

module.exports = Invoice;
