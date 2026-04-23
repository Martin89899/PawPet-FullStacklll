const { pool } = require('../config/database');
const Invoice = require('../models/Invoice');
const InvoiceItem = require('../models/InvoiceItem');

/**
 * Repositorio para manejar operaciones de facturas
 */
class InvoiceRepository {
  /**
   * Generar número de factura único
   */
  async generateInvoiceNumber() {
    const query = `
      UPDATE billing_config 
      SET next_invoice_number = next_invoice_number + 1 
      RETURNING invoice_prefix || LPAD(next_invoice_number::text, 6, '0') as invoice_number
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows[0].invoice_number;
    } catch (error) {
      throw new Error(`Error generating invoice number: ${error.message}`);
    }
  }

  /**
   * Crear una nueva factura con sus items
   */
  async create(invoiceData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Generar número de factura
      const invoiceNumber = await this.generateInvoiceNumber();
      
      // Crear factura
      const invoice = new Invoice({ ...invoiceData, invoiceNumber });
      const validation = invoice.validate();
      
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const invoiceQuery = `
        INSERT INTO invoices (invoice_number, patient_id, client_id, veterinarian_id, subtotal, tax_amount, total_amount, status, due_date, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const invoiceValues = [
        invoice.invoiceNumber,
        invoice.patientId,
        invoice.clientId,
        invoice.veterinarianId,
        invoice.subtotal,
        invoice.taxAmount,
        invoice.totalAmount,
        invoice.status,
        invoice.dueDate,
        invoice.notes
      ];

      const invoiceResult = await client.query(invoiceQuery, invoiceValues);
      const createdInvoice = Invoice.fromDatabase(invoiceResult.rows[0]);

      // Crear items de la factura
      if (invoiceData.items && invoiceData.items.length > 0) {
        const itemsQuery = `
          INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;

        for (const itemData of invoiceData.items) {
          const item = new InvoiceItem({ ...itemData, invoiceId: createdInvoice.id });
          item.calculateTotal();
          
          const itemValidation = item.validate();
          if (!itemValidation.isValid) {
            throw new Error(`Item validation failed: ${itemValidation.errors.join(', ')}`);
          }

          const itemValues = [
            createdInvoice.id,
            item.productId,
            item.description,
            item.quantity,
            item.unitPrice,
            item.totalPrice
          ];

          const itemResult = await client.query(itemsQuery, itemValues);
          createdInvoice.items.push(InvoiceItem.fromDatabase(itemResult.rows[0]));
        }
      }

      await client.query('COMMIT');
      return createdInvoice;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Error creating invoice: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Obtener factura por ID con sus items
   */
  async findById(id) {
    const query = 'SELECT * FROM invoices WHERE id = $1';
    
    try {
      const invoiceResult = await pool.query(query, [id]);
      if (invoiceResult.rows.length === 0) {
        return null;
      }

      const invoice = Invoice.fromDatabase(invoiceResult.rows[0]);

      // Obtener items de la factura
      const itemsQuery = 'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id';
      const itemsResult = await pool.query(itemsQuery, [id]);
      invoice.items = itemsResult.rows.map(row => InvoiceItem.fromDatabase(row));

      return invoice;
    } catch (error) {
      throw new Error(`Error fetching invoice by ID: ${error.message}`);
    }
  }

  /**
   * Obtener todas las facturas
   */
  async findAll(options = {}) {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      clientId, 
      patientId,
      startDate,
      endDate 
    } = options;

    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND status = $${paramIndex++}`;
      values.push(status);
    }

    if (clientId) {
      whereClause += ` AND client_id = $${paramIndex++}`;
      values.push(clientId);
    }

    if (patientId) {
      whereClause += ` AND patient_id = $${paramIndex++}`;
      values.push(patientId);
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
      SELECT * FROM invoices 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM invoices ${whereClause}
    `;

    try {
      const [result, countResult] = await Promise.all([
        pool.query(query, [...values, limit, offset]),
        pool.query(countQuery, values)
      ]);

      const invoices = await Promise.all(
        result.rows.map(async (row) => {
          const invoice = Invoice.fromDatabase(row);
          
          // Obtener items
          const itemsQuery = 'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id';
          const itemsResult = await pool.query(itemsQuery, [invoice.id]);
          invoice.items = itemsResult.rows.map(row => InvoiceItem.fromDatabase(row));
          
          return invoice;
        })
      );

      return {
        invoices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(countResult.rows[0].total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error fetching invoices: ${error.message}`);
    }
  }

  /**
   * Actualizar estado de factura
   */
  async updateStatus(id, status) {
    const query = `
      UPDATE invoices 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [status, id]);
      if (result.rows.length === 0) {
        throw new Error('Invoice not found');
      }
      return Invoice.fromDatabase(result.rows[0]);
    } catch (error) {
      throw new Error(`Error updating invoice status: ${error.message}`);
    }
  }

  /**
   * Marcar factura como pagada
   */
  async markAsPaid(id) {
    const query = `
      UPDATE invoices 
      SET status = 'paid', paid_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) {
        throw new Error('Invoice not found');
      }
      return Invoice.fromDatabase(result.rows[0]);
    } catch (error) {
      throw new Error(`Error marking invoice as paid: ${error.message}`);
    }
  }

  /**
   * Cancelar factura
   */
  async cancel(id, reason = null) {
    const query = `
      UPDATE invoices 
      SET status = 'cancelled', notes = COALESCE(notes, '') || $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [reason ? ` | Cancelled: ${reason}` : ' | Cancelled', id]);
      if (result.rows.length === 0) {
        throw new Error('Invoice not found');
      }
      return Invoice.fromDatabase(result.rows[0]);
    } catch (error) {
      throw new Error(`Error cancelling invoice: ${error.message}`);
    }
  }

  /**
   * Obtener facturas vencidas
   */
  async findOverdue() {
    const query = `
      SELECT * FROM invoices 
      WHERE status = 'pending' 
      AND due_date < CURRENT_DATE
      ORDER BY due_date ASC
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows.map(row => Invoice.fromDatabase(row));
    } catch (error) {
      throw new Error(`Error fetching overdue invoices: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de facturación
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
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invoices,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_invoices,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN total_amount END), 0) as pending_amount
      FROM invoices ${whereClause}
    `;
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error fetching invoice stats: ${error.message}`);
    }
  }
}

module.exports = new InvoiceRepository();
