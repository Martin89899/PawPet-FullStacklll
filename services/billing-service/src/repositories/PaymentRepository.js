const { pool } = require('../config/database');
const Payment = require('../models/Payment');

/**
 * Repositorio para manejar operaciones de pagos
 */
class PaymentRepository {
  /**
   * Crear un nuevo pago
   */
  async create(paymentData) {
    const payment = new Payment(paymentData);
    const validation = payment.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const query = `
      INSERT INTO payments (invoice_id, amount, payment_method, payment_status, stripe_payment_id, transaction_id, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      payment.invoiceId,
      payment.amount,
      payment.paymentMethod,
      payment.paymentStatus,
      payment.stripePaymentId,
      payment.transactionId,
      payment.notes
    ];

    try {
      const result = await pool.query(query, values);
      return Payment.fromDatabase(result.rows[0]);
    } catch (error) {
      throw new Error(`Error creating payment: ${error.message}`);
    }
  }

  /**
   * Obtener pago por ID
   */
  async findById(id) {
    const query = 'SELECT * FROM payments WHERE id = $1';
    
    try {
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      return Payment.fromDatabase(result.rows[0]);
    } catch (error) {
      throw new Error(`Error fetching payment by ID: ${error.message}`);
    }
  }

  /**
   * Obtener todos los pagos de una factura
   */
  async findByInvoiceId(invoiceId) {
    const query = 'SELECT * FROM payments WHERE invoice_id = $1 ORDER BY created_at DESC';
    
    try {
      const result = await pool.query(query, [invoiceId]);
      return result.rows.map(row => Payment.fromDatabase(row));
    } catch (error) {
      throw new Error(`Error fetching payments by invoice ID: ${error.message}`);
    }
  }

  /**
   * Obtener todos los pagos con paginación
   */
  async findAll(options = {}) {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      paymentMethod,
      startDate,
      endDate 
    } = options;

    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND payment_status = $${paramIndex++}`;
      values.push(status);
    }

    if (paymentMethod) {
      whereClause += ` AND payment_method = $${paramIndex++}`;
      values.push(paymentMethod);
    }

    if (startDate) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      values.push(startDate);
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      values.push(endDate);
    }

    const offset = (page - 1) * limit;

    const query = `
      SELECT * FROM payments 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM payments ${whereClause}
    `;

    try {
      const [result, countResult] = await Promise.all([
        pool.query(query, [...values, limit, offset]),
        pool.query(countQuery, values)
      ]);

      const payments = result.rows.map(row => Payment.fromDatabase(row));

      return {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(countResult.rows[0].total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error fetching payments: ${error.message}`);
    }
  }

  /**
   * Actualizar estado de pago
   */
  async updateStatus(id, status, transactionId = null, notes = null) {
    const query = `
      UPDATE payments 
      SET payment_status = $1, 
          transaction_id = COALESCE($2, transaction_id),
          notes = COALESCE($3, notes),
          payment_date = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE payment_date END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [status, transactionId, notes, id]);
      if (result.rows.length === 0) {
        throw new Error('Payment not found');
      }
      return Payment.fromDatabase(result.rows[0]);
    } catch (error) {
      throw new Error(`Error updating payment status: ${error.message}`);
    }
  }

  /**
   * Marcar pago como completado
   */
  async markAsCompleted(id, transactionId = null) {
    const query = `
      UPDATE payments 
      SET payment_status = 'completed', 
          payment_date = CURRENT_TIMESTAMP,
          transaction_id = COALESCE($2, transaction_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [id, transactionId]);
      if (result.rows.length === 0) {
        throw new Error('Payment not found');
      }
      return Payment.fromDatabase(result.rows[0]);
    } catch (error) {
      throw new Error(`Error marking payment as completed: ${error.message}`);
    }
  }

  /**
   * Marcar pago como fallido
   */
  async markAsFailed(id, reason = null) {
    const query = `
      UPDATE payments 
      SET payment_status = 'failed', 
          notes = COALESCE(notes, '') || $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [id, reason ? ` | Failed: ${reason}` : ' | Failed']);
      if (result.rows.length === 0) {
        throw new Error('Payment not found');
      }
      return Payment.fromDatabase(result.rows[0]);
    } catch (error) {
      throw new Error(`Error marking payment as failed: ${error.message}`);
    }
  }

  /**
   * Marcar pago como reembolsado
   */
  async markAsRefunded(id, reason = null) {
    const query = `
      UPDATE payments 
      SET payment_status = 'refunded', 
          notes = COALESCE(notes, '') || $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [id, reason ? ` | Refunded: ${reason}` : ' | Refunded']);
      if (result.rows.length === 0) {
        throw new Error('Payment not found');
      }
      return Payment.fromDatabase(result.rows[0]);
    } catch (error) {
      throw new Error(`Error marking payment as refunded: ${error.message}`);
    }
  }

  /**
   * Buscar pago por ID de transacción Stripe
   */
  async findByStripePaymentId(stripePaymentId) {
    const query = 'SELECT * FROM payments WHERE stripe_payment_id = $1';
    
    try {
      const result = await pool.query(query, [stripePaymentId]);
      if (result.rows.length === 0) {
        return null;
      }
      return Payment.fromDatabase(result.rows[0]);
    } catch (error) {
      throw new Error(`Error fetching payment by Stripe ID: ${error.message}`);
    }
  }

  /**
   * Buscar pago por ID de transacción
   */
  async findByTransactionId(transactionId) {
    const query = 'SELECT * FROM payments WHERE transaction_id = $1';
    
    try {
      const result = await pool.query(query, [transactionId]);
      if (result.rows.length === 0) {
        return null;
      }
      return Payment.fromDatabase(result.rows[0]);
    } catch (error) {
      throw new Error(`Error fetching payment by transaction ID: ${error.message}`);
    }
  }

  /**
   * Obtener pagos pendientes
   */
  async findPending() {
    const query = 'SELECT * FROM payments WHERE payment_status = \'pending\' ORDER BY created_at ASC';
    
    try {
      const result = await pool.query(query);
      return result.rows.map(row => Payment.fromDatabase(row));
    } catch (error) {
      throw new Error(`Error fetching pending payments: ${error.message}`);
    }
  }

  /**
   * Obtener pagos fallidos
   */
  async findFailed() {
    const query = 'SELECT * FROM payments WHERE payment_status = \'failed\' ORDER BY created_at DESC';
    
    try {
      const result = await pool.query(query);
      return result.rows.map(row => Payment.fromDatabase(row));
    } catch (error) {
      throw new Error(`Error fetching failed payments: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de pagos
   */
  async getStats(options = {}) {
    const { startDate, endDate } = options;
    
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (startDate) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      values.push(startDate);
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      values.push(endDate);
    }

    const query = `
      SELECT 
        COUNT(*) as total_payments,
        COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as completed_payments,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments,
        COUNT(CASE WHEN payment_status = 'failed' THEN 1 END) as failed_payments,
        COUNT(CASE WHEN payment_status = 'refunded' THEN 1 END) as refunded_payments,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN payment_status = 'completed' THEN amount END), 0) as completed_amount,
        COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN amount END), 0) as pending_amount
      FROM payments ${whereClause}
    `;
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error fetching payment stats: ${error.message}`);
    }
  }

  /**
   * Obtener resumen de pagos por método
   */
  async getStatsByMethod(options = {}) {
    const { startDate, endDate } = options;
    
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (startDate) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      values.push(startDate);
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      values.push(endDate);
    }

    const query = `
      SELECT 
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN payment_status = 'completed' THEN amount END), 0) as completed_amount
      FROM payments ${whereClause}
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `;
    
    try {
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching payment stats by method: ${error.message}`);
    }
  }
}

module.exports = new PaymentRepository();
