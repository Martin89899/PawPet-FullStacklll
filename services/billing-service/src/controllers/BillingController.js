const BillingService = require('../services/BillingService');

/**
 * Controlador para endpoints de facturación
 */
class BillingController {
  /**
   * Crear nueva factura
   */
  async createInvoice(req, res) {
    try {
      const invoice = await BillingService.createInvoice(req.body);
      res.status(201).json({
        success: true,
        message: 'Invoice created successfully',
        data: invoice.toJSON()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        error: 'CREATE_INVOICE_ERROR'
      });
    }
  }

  /**
   * Obtener factura por ID
   */
  async getInvoice(req, res) {
    try {
      const { id } = req.params;
      const invoice = await BillingService.getInvoiceById(id);
      
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Invoice not found',
          error: 'INVOICE_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: invoice.toJSON()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        error: 'GET_INVOICE_ERROR'
      });
    }
  }

  /**
   * Obtener lista de facturas
   */
  async getInvoices(req, res) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        status: req.query.status,
        clientId: req.query.clientId,
        patientId: req.query.patientId,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const result = await BillingService.getInvoices(options);
      
      res.json({
        success: true,
        data: {
          invoices: result.invoices.map(invoice => invoice.toJSON()),
          pagination: result.pagination
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        error: 'GET_INVOICES_ERROR'
      });
    }
  }

  /**
   * Cancelar factura
   */
  async cancelInvoice(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const invoice = await BillingService.cancelInvoice(id, reason);
      
      res.json({
        success: true,
        message: 'Invoice cancelled successfully',
        data: invoice.toJSON()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        error: 'CANCEL_INVOICE_ERROR'
      });
    }
  }

  /**
   * Generar PDF de factura
   */
  async generateInvoicePDF(req, res) {
    try {
      const { id } = req.params;
      const pdfBuffer = await BillingService.generateInvoicePDF(id);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        error: 'GENERATE_PDF_ERROR'
      });
    }
  }

  /**
   * Procesar pago con Stripe
   */
  async processStripePayment(req, res) {
    try {
      const { id } = req.params;
      const result = await BillingService.processStripePayment(id, req.body);
      
      res.json({
        success: true,
        message: 'Stripe payment initiated successfully',
        data: {
          payment: result.payment.toJSON(),
          clientSecret: result.clientSecret
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        error: 'PROCESS_STRIPE_PAYMENT_ERROR'
      });
    }
  }

  /**
   * Procesar pago manual (efectivo/transferencia)
   */
  async processManualPayment(req, res) {
    try {
      const { id } = req.params;
      const result = await BillingService.processManualPayment(id, req.body);
      
      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          payment: result.payment.toJSON(),
          invoice: result.invoice.toJSON()
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        error: 'PROCESS_MANUAL_PAYMENT_ERROR'
      });
    }
  }

  /**
   * Webhook de Stripe
   */
  async stripeWebhook(req, res) {
    try {
      const signature = req.headers['stripe-signature'];
      const StripeService = require('../services/StripeService');
      
      const event = StripeService.verifyWebhookSignature(req.body, signature);
      
      // Procesar eventos relevantes
      switch (event.type) {
        case 'payment_intent.succeeded':
          await BillingService.confirmStripePayment(
            event.data.object.id,
            'succeeded'
          );
          break;
        case 'payment_intent.payment_failed':
          await BillingService.confirmStripePayment(
            event.data.object.id,
            'failed'
          );
          break;
        default:
          console.log(`Unhandled Stripe event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Stripe webhook error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        error: 'WEBHOOK_ERROR'
      });
    }
  }

  /**
   * Obtener productos
   */
  async getProducts(req, res) {
    try {
      const options = {
        type: req.query.type,
        category: req.query.category,
        search: req.query.search
      };

      const products = await BillingService.getProducts(options);
      
      res.json({
        success: true,
        data: products.map(product => product.toJSON())
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        error: 'GET_PRODUCTS_ERROR'
      });
    }
  }

  /**
   * Crear producto
   */
  async createProduct(req, res) {
    try {
      const product = await BillingService.createProduct(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product.toJSON()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        error: 'CREATE_PRODUCT_ERROR'
      });
    }
  }

  /**
   * Obtener pagos
   */
  async getPayments(req, res) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        status: req.query.status,
        paymentMethod: req.query.paymentMethod,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const result = await BillingService.getPayments(options);
      
      res.json({
        success: true,
        data: {
          payments: result.payments.map(payment => payment.toJSON()),
          pagination: result.pagination
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        error: 'GET_PAYMENTS_ERROR'
      });
    }
  }

  /**
   * Obtener estadísticas de facturación
   */
  async getBillingStats(req, res) {
    try {
      const options = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const stats = await BillingService.getBillingStats(options);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        error: 'GET_BILLING_STATS_ERROR'
      });
    }
  }

  /**
   * Generar reporte de facturación
   */
  async generateBillingReport(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
          error: 'MISSING_DATES'
        });
      }

      const stats = await BillingService.getBillingStats({ startDate, endDate });
      const PDFService = require('../services/PDFService');
      
      const reportData = {
        startDate,
        endDate,
        stats: stats.invoices
      };

      const pdfBuffer = await PDFService.generateBillingReportPDF(reportData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="billing-report-${startDate}-${endDate}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        error: 'GENERATE_REPORT_ERROR'
      });
    }
  }

  /**
   * Obtener facturas vencidas
   */
  async getOverdueInvoices(req, res) {
    try {
      const InvoiceRepository = require('../repositories/InvoiceRepository');
      const overdueInvoices = await InvoiceRepository.findOverdue();
      
      res.json({
        success: true,
        data: overdueInvoices.map(invoice => invoice.toJSON())
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        error: 'GET_OVERDUE_INVOICES_ERROR'
      });
    }
  }

  /**
   * Enviar recordatorio de factura
   */
  async sendInvoiceReminder(req, res) {
    try {
      const { id } = req.params;
      const invoice = await BillingService.getInvoiceById(id);
      
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Invoice not found',
          error: 'INVOICE_NOT_FOUND'
        });
      }

      if (invoice.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Invoice is not pending',
          error: 'INVALID_INVOICE_STATUS'
        });
      }

      // Aquí se implementaría el envío de email/SMS
      // Por ahora solo simulamos el envío
      
      const { publishEvent } = require('../utils/rabbitmq');
      await publishEvent('billing.invoice.reminder', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientId: invoice.clientId,
        patientId: invoice.patientId,
        totalAmount: invoice.totalAmount,
        dueDate: invoice.dueDate
      });

      res.json({
        success: true,
        message: 'Invoice reminder sent successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        error: 'SEND_REMINDER_ERROR'
      });
    }
  }
}

module.exports = new BillingController();
