const InvoiceRepository = require('../repositories/InvoiceRepository');
const PaymentRepository = require('../repositories/PaymentRepository');
const ProductRepository = require('../repositories/ProductRepository');
const StripeService = require('./StripeService');
const PDFService = require('./PDFService');
const { publishEvent } = require('../utils/rabbitmq');

/**
 * Servicio de lógica de negocio para facturación
 */
class BillingService {
  /**
   * Crear una nueva factura
   */
  async createInvoice(invoiceData) {
    try {
      // Validar y calcular totales
      const invoice = await this._validateAndCalculateInvoice(invoiceData);
      
      // Crear factura en la base de datos
      const createdInvoice = await InvoiceRepository.create(invoice);
      
      // Publicar evento de factura creada
      await publishEvent('billing.invoice.created', {
        invoiceId: createdInvoice.id,
        invoiceNumber: createdInvoice.invoiceNumber,
        clientId: createdInvoice.clientId,
        patientId: createdInvoice.patientId,
        totalAmount: createdInvoice.totalAmount,
        status: createdInvoice.status
      });
      
      return createdInvoice;
    } catch (error) {
      throw new Error(`Error creating invoice: ${error.message}`);
    }
  }

  /**
   * Procesar pago con Stripe
   */
  async processStripePayment(invoiceId, paymentData) {
    try {
      // Obtener factura
      const invoice = await InvoiceRepository.findById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status === 'paid') {
        throw new Error('Invoice is already paid');
      }

      // Crear pago con Stripe
      const stripePayment = await StripeService.createPaymentIntent({
        amount: Math.round(invoice.totalAmount * 100), // Convertir a centavos
        currency: 'usd',
        metadata: {
          invoiceId: invoice.id.toString(),
          invoiceNumber: invoice.invoiceNumber
        }
      });

      // Crear registro de pago
      const payment = await PaymentRepository.create({
        invoiceId: invoice.id,
        amount: invoice.totalAmount,
        paymentMethod: 'stripe',
        paymentStatus: 'pending',
        stripePaymentId: stripePayment.id
      });

      return {
        payment: payment.toJSON(),
        clientSecret: stripePayment.client_secret
      };
    } catch (error) {
      throw new Error(`Error processing Stripe payment: ${error.message}`);
    }
  }

  /**
   * Confirmar pago de Stripe (webhook)
   */
  async confirmStripePayment(stripePaymentId, status) {
    try {
      // Buscar pago por ID de Stripe
      const payment = await PaymentRepository.findByStripePaymentId(stripePaymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (status === 'succeeded') {
        // Marcar pago como completado
        await PaymentRepository.markAsCompleted(payment.id, stripePaymentId);
        
        // Marcar factura como pagada
        const invoice = await InvoiceRepository.markAsPaid(payment.invoiceId);
        
        // Publicar evento de pago completado
        await publishEvent('billing.payment.completed', {
          paymentId: payment.id,
          invoiceId: payment.invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod
        });

        return { success: true, invoice };
      } else {
        // Marcar pago como fallido
        await PaymentRepository.markAsFailed(payment.id, `Stripe payment failed: ${status}`);
        
        return { success: false, payment };
      }
    } catch (error) {
      throw new Error(`Error confirming Stripe payment: ${error.message}`);
    }
  }

  /**
   * Procesar pago en efectivo/transferencia
   */
  async processManualPayment(invoiceId, paymentData) {
    try {
      // Obtener factura
      const invoice = await InvoiceRepository.findById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status === 'paid') {
        throw new Error('Invoice is already paid');
      }

      // Crear pago
      const payment = await PaymentRepository.create({
        invoiceId: invoice.id,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        paymentStatus: 'completed',
        transactionId: paymentData.transactionId,
        notes: paymentData.notes
      });

      // Marcar factura como pagada
      const updatedInvoice = await InvoiceRepository.markAsPaid(invoiceId);
      
      // Publicar evento de pago completado
      await publishEvent('billing.payment.completed', {
        paymentId: payment.id,
        invoiceId: invoice.id,
        invoiceNumber: updatedInvoice.invoiceNumber,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod
      });

      return { payment, invoice: updatedInvoice };
    } catch (error) {
      throw new Error(`Error processing manual payment: ${error.message}`);
    }
  }

  /**
   * Generar PDF de factura
   */
  async generateInvoicePDF(invoiceId) {
    try {
      // Obtener factura completa
      const invoice = await InvoiceRepository.findById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Generar PDF
      const pdfBuffer = await PDFService.generateInvoicePDF(invoice);
      
      return pdfBuffer;
    } catch (error) {
      throw new Error(`Error generating invoice PDF: ${error.message}`);
    }
  }

  /**
   * Obtener facturas con filtros
   */
  async getInvoices(options = {}) {
    try {
      return await InvoiceRepository.findAll(options);
    } catch (error) {
      throw new Error(`Error fetching invoices: ${error.message}`);
    }
  }

  /**
   * Obtener factura por ID
   */
  async getInvoiceById(id) {
    try {
      return await InvoiceRepository.findById(id);
    } catch (error) {
      throw new Error(`Error fetching invoice: ${error.message}`);
    }
  }

  /**
   * Cancelar factura
   */
  async cancelInvoice(id, reason = null) {
    try {
      const invoice = await InvoiceRepository.cancel(id, reason);
      
      // Publicar evento de factura cancelada
      await publishEvent('billing.invoice.cancelled', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        reason: reason
      });

      return invoice;
    } catch (error) {
      throw new Error(`Error cancelling invoice: ${error.message}`);
    }
  }

  /**
   * Obtener productos disponibles
   */
  async getProducts(options = {}) {
    try {
      if (options.type) {
        return await ProductRepository.findByType(options.type);
      } else if (options.category) {
        return await ProductRepository.findByCategory(options.category);
      } else if (options.search) {
        return await ProductRepository.search(options.search);
      } else {
        return await ProductRepository.findAllActive();
      }
    } catch (error) {
      throw new Error(`Error fetching products: ${error.message}`);
    }
  }

  /**
   * Crear nuevo producto
   */
  async createProduct(productData) {
    try {
      const product = await ProductRepository.create(productData);
      
      // Publicar evento de producto creado
      await publishEvent('billing.product.created', {
        productId: product.id,
        name: product.name,
        type: product.type,
        price: product.price
      });

      return product;
    } catch (error) {
      throw new Error(`Error creating product: ${error.message}`);
    }
  }

  /**
   * Obtener pagos con filtros
   */
  async getPayments(options = {}) {
    try {
      return await PaymentRepository.findAll(options);
    } catch (error) {
      throw new Error(`Error fetching payments: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de facturación
   */
  async getBillingStats(options = {}) {
    try {
      const [invoiceStats, paymentStats, productStats] = await Promise.all([
        InvoiceRepository.getStats(options),
        PaymentRepository.getStats(options),
        ProductRepository.getStats()
      ]);

      return {
        invoices: invoiceStats,
        payments: paymentStats,
        products: productStats
      };
    } catch (error) {
      throw new Error(`Error fetching billing stats: ${error.message}`);
    }
  }

  /**
   * Validar y calcular totales de factura
   */
  async _validateAndCalculateInvoice(invoiceData) {
    // Validar items
    if (!invoiceData.items || invoiceData.items.length === 0) {
      throw new Error('Invoice must have at least one item');
    }

    // Calcular subtotal
    let subtotal = 0;
    for (const item of invoiceData.items) {
      if (!item.unitPrice || !item.quantity) {
        throw new Error('Each item must have unit price and quantity');
      }
      
      item.totalPrice = item.unitPrice * item.quantity;
      subtotal += item.totalPrice;
    }

    // Obtener configuración de impuestos
    const taxRate = await this._getTaxRate();
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    return {
      ...invoiceData,
      subtotal,
      taxAmount,
      totalAmount
    };
  }

  /**
   * Obtener tasa de impuestos configurada
   */
  async _getTaxRate() {
    try {
      const { pool } = require('../config/database');
      const result = await pool.query('SELECT tax_rate FROM billing_config LIMIT 1');
      return parseFloat(result.rows[0]?.tax_rate || 0);
    } catch (error) {
      console.warn('Error fetching tax rate, using 0:', error.message);
      return 0;
    }
  }
}

module.exports = new BillingService();
