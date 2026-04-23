const express = require('express');
const BillingController = require('../controllers/BillingController');
const authMiddleware = require('../middleware/auth');
const validateInvoice = require('../middleware/validateInvoice');
const validatePayment = require('../middleware/validatePayment');
const validateProduct = require('../middleware/validateProduct');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Invoice:
 *       type: object
 *       required:
 *         - patientId
 *         - clientId
 *         - items
 *       properties:
 *         id:
 *           type: integer
 *           description: ID auto-generado de la factura
 *         invoiceNumber:
 *           type: string
 *           description: Número único de factura
 *         patientId:
 *           type: integer
 *           description: ID del paciente
 *         clientId:
 *           type: integer
 *           description: ID del cliente
 *         veterinarianId:
 *           type: integer
 *           description: ID del veterinario
 *         subtotal:
 *           type: number
 *           description: Subtotal de la factura
 *         taxAmount:
 *           type: number
 *           description: Monto de impuestos
 *         totalAmount:
 *           type: number
 *           description: Total de la factura
 *         status:
 *           type: string
 *           enum: [pending, paid, cancelled, refunded]
 *           description: Estado de la factura
 *         dueDate:
 *           type: string
 *           format: date
 *           description: Fecha de vencimiento
 *         notes:
 *           type: string
 *           description: Notas adicionales
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InvoiceItem'
 *     
 *     InvoiceItem:
 *       type: object
 *       required:
 *         - description
 *         - quantity
 *         - unitPrice
 *       properties:
 *         id:
 *           type: integer
 *           description: ID auto-generado del item
 *         productId:
 *           type: integer
 *           description: ID del producto (opcional)
 *         description:
 *           type: string
 *           description: Descripción del item
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Cantidad
 *         unitPrice:
 *           type: number
 *           minimum: 0
 *           description: Precio unitario
 *         totalPrice:
 *           type: number
 *           description: Precio total (calculado automáticamente)
 *     
 *     Payment:
 *       type: object
 *       required:
 *         - invoiceId
 *         - amount
 *         - paymentMethod
 *       properties:
 *         id:
 *           type: integer
 *           description: ID auto-generado del pago
 *         invoiceId:
 *           type: integer
 *           description: ID de la factura
 *         amount:
 *           type: number
 *           minimum: 0
 *           description: Monto del pago
 *         paymentMethod:
 *           type: string
 *           enum: [cash, card, stripe, transfer, check]
 *           description: Método de pago
 *         paymentStatus:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *           description: Estado del pago
 *         transactionId:
 *           type: string
 *           description: ID de transacción
 *         notes:
 *           type: string
 *           description: Notas del pago
 *     
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - price
 *         - type
 *       properties:
 *         id:
 *           type: integer
 *           description: ID auto-generado del producto
 *         name:
 *           type: string
 *           description: Nombre del producto/servicio
 *         description:
 *           type: string
 *           description: Descripción del producto
 *         price:
 *           type: number
 *           minimum: 0
 *           description: Precio del producto
 *         type:
 *           type: string
 *           enum: [service, product, consultation, vaccine, procedure]
 *           description: Tipo de producto
 *         category:
 *           type: string
 *           description: Categoría del producto
 *         isActive:
 *           type: boolean
 *           description: Si el producto está activo
 */

/**
 * @swagger
 * /api/billing/invoices:
 *   post:
 *     summary: Crear nueva factura
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - clientId
 *               - items
 *             properties:
 *               patientId:
 *                 type: integer
 *               clientId:
 *                 type: integer
 *               veterinarianId:
 *                 type: integer
 *               dueDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/InvoiceItem'
 *     responses:
 *       201:
 *         description: Factura creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *       400:
 *         description: Error de validación
 */
router.post('/invoices', authMiddleware, validateInvoice, BillingController.createInvoice);

/**
 * @swagger
 * /api/billing/invoices:
 *   get:
 *     summary: Obtener lista de facturas
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Límite de resultados por página
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, paid, cancelled, refunded]
 *         description: Filtrar por estado
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de cliente
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de paciente
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin
 *     responses:
 *       200:
 *         description: Lista de facturas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     invoices:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Invoice'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 */
router.get('/invoices', authMiddleware, BillingController.getInvoices);

/**
 * @swagger
 * /api/billing/invoices/{id}:
 *   get:
 *     summary: Obtener factura por ID
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la factura
 *     responses:
 *       200:
 *         description: Factura encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *       404:
 *         description: Factura no encontrada
 */
router.get('/invoices/:id', authMiddleware, BillingController.getInvoice);

/**
 * @swagger
 * /api/billing/invoices/{id}/cancel:
 *   put:
 *     summary: Cancelar factura
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la factura
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Razón de cancelación
 *     responses:
 *       200:
 *         description: Factura cancelada exitosamente
 *       400:
 *         description: Error al cancelar factura
 */
router.put('/invoices/:id/cancel', authMiddleware, BillingController.cancelInvoice);

/**
 * @swagger
 * /api/billing/invoices/{id}/pdf:
 *   get:
 *     summary: Generar PDF de factura
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la factura
 *     responses:
 *       200:
 *         description: PDF generado exitosamente
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Factura no encontrada
 */
router.get('/invoices/:id/pdf', authMiddleware, BillingController.generateInvoicePDF);

/**
 * @swagger
 * /api/billing/invoices/{id}/payment/stripe:
 *   post:
 *     summary: Procesar pago con Stripe
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la factura
 *     responses:
 *       200:
 *         description: Pago con Stripe iniciado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       $ref: '#/components/schemas/Payment'
 *                     clientSecret:
 *                       type: string
 *       400:
 *         description: Error al procesar pago
 */
router.post('/invoices/:id/payment/stripe', authMiddleware, BillingController.processStripePayment);

/**
 * @swagger
 * /api/billing/invoices/{id}/payment/manual:
 *   post:
 *     summary: Procesar pago manual (efectivo/transferencia)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la factura
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - paymentMethod
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, card, transfer, check]
 *               transactionId:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pago procesado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       $ref: '#/components/schemas/Payment'
 *                     invoice:
 *                       $ref: '#/components/schemas/Invoice'
 */
router.post('/invoices/:id/payment/manual', authMiddleware, validatePayment, BillingController.processManualPayment);

/**
 * @swagger
 * /api/billing/webhook/stripe:
 *   post:
 *     summary: Webhook de Stripe
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: Webhook procesado
 */
router.post('/webhook/stripe', BillingController.stripeWebhook);

/**
 * @swagger
 * /api/billing/products:
 *   get:
 *     summary: Obtener productos
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [service, product, consultation, vaccine, procedure]
 *         description: Filtrar por tipo
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrar por categoría
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre o descripción
 *     responses:
 *       200:
 *         description: Lista de productos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */
router.get('/products', authMiddleware, BillingController.getProducts);

/**
 * @swagger
 * /api/billing/products:
 *   post:
 *     summary: Crear nuevo producto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 */
router.post('/products', authMiddleware, validateProduct, BillingController.createProduct);

/**
 * @swagger
 * /api/billing/payments:
 *   get:
 *     summary: Obtener pagos
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Límite de resultados por página
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *         description: Filtrar por estado
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [cash, card, stripe, transfer, check]
 *         description: Filtrar por método de pago
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin
 *     responses:
 *       200:
 *         description: Lista de pagos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     payments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Payment'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 */
router.get('/payments', authMiddleware, BillingController.getPayments);

/**
 * @swagger
 * /api/billing/stats:
 *   get:
 *     summary: Obtener estadísticas de facturación
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin
 *     responses:
 *       200:
 *         description: Estadísticas de facturación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     invoices:
 *                       type: object
 *                     payments:
 *                       type: object
 *                     products:
 *                       type: array
 */
router.get('/stats', authMiddleware, BillingController.getBillingStats);

/**
 * @swagger
 * /api/billing/report:
 *   get:
 *     summary: Generar reporte de facturación
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin
 *     responses:
 *       200:
 *         description: Reporte generado exitosamente
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/report', authMiddleware, BillingController.generateBillingReport);

/**
 * @swagger
 * /api/billing/overdue:
 *   get:
 *     summary: Obtener facturas vencidas
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de facturas vencidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Invoice'
 */
router.get('/overdue', authMiddleware, BillingController.getOverdueInvoices);

/**
 * @swagger
 * /api/billing/invoices/{id}/reminder:
 *   post:
 *     summary: Enviar recordatorio de factura
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la factura
 *     responses:
 *       200:
 *         description: Recordatorio enviado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.post('/invoices/:id/reminder', authMiddleware, BillingController.sendInvoiceReminder);

module.exports = router;
