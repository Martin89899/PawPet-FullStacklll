/**
 * Modelo de Pago para el sistema de facturación
 */
class Payment {
  constructor(data = {}) {
    this.id = data.id;
    this.invoiceId = data.invoice_id;
    this.amount = data.amount;
    this.paymentMethod = data.payment_method; // 'cash', 'card', 'stripe', 'transfer', 'check'
    this.paymentStatus = data.payment_status || 'pending'; // 'pending', 'completed', 'failed', 'refunded'
    this.stripePaymentId = data.stripe_payment_id;
    this.transactionId = data.transaction_id;
    this.paymentDate = data.payment_date;
    this.notes = data.notes;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * Validar datos del pago
   */
  validate() {
    const errors = [];

    if (!this.invoiceId) {
      errors.push('El ID de la factura es requerido');
    }

    if (!this.amount || this.amount <= 0) {
      errors.push('El monto del pago debe ser mayor a 0');
    }

    if (!this.paymentMethod || !['cash', 'card', 'stripe', 'transfer', 'check'].includes(this.paymentMethod)) {
      errors.push('El método de pago debe ser uno de: cash, card, stripe, transfer, check');
    }

    if (!this.paymentStatus || !['pending', 'completed', 'failed', 'refunded'].includes(this.paymentStatus)) {
      errors.push('El estado del pago debe ser uno de: pending, completed, failed, refunded');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Marcar como completado
   */
  markAsCompleted(transactionId = null) {
    this.paymentStatus = 'completed';
    this.paymentDate = new Date();
    if (transactionId) {
      this.transactionId = transactionId;
    }
  }

  /**
   * Marcar como fallido
   */
  markAsFailed(reason = null) {
    this.paymentStatus = 'failed';
    if (reason) {
      this.notes = reason;
    }
  }

  /**
   * Marcar como reembolsado
   */
  markAsRefunded(reason = null) {
    this.paymentStatus = 'refunded';
    if (reason) {
      this.notes = reason;
    }
  }

  /**
   * Verificar si es pago con Stripe
   */
  isStripePayment() {
    return this.paymentMethod === 'stripe';
  }

  /**
   * Convertir a formato de base de datos
   */
  toDatabase() {
    return {
      invoice_id: this.invoiceId,
      amount: this.amount,
      payment_method: this.paymentMethod,
      payment_status: this.paymentStatus,
      stripe_payment_id: this.stripePaymentId,
      transaction_id: this.transactionId,
      payment_date: this.paymentDate,
      notes: this.notes
    };
  }

  /**
   * Convertir a formato JSON para API
   */
  toJSON() {
    return {
      id: this.id,
      invoiceId: this.invoiceId,
      amount: parseFloat(this.amount),
      paymentMethod: this.paymentMethod,
      paymentStatus: this.paymentStatus,
      stripePaymentId: this.stripePaymentId,
      transactionId: this.transactionId,
      paymentDate: this.paymentDate,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Crear instancia desde datos de base de datos
   */
  static fromDatabase(data) {
    return new Payment(data);
  }
}

module.exports = Payment;
