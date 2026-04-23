const InventoryService = require('../services/inventoryService');
const { asyncHandler } = require('../middleware/errorHandler');
const { pool } = require('../config/database');

/**
 * Controladores de Inventario para el Inventory Service
 * @class InventoryController
 * @description Maneja las solicitudes HTTP de gestión de inventario y farmacia
 */
class InventoryController {
  /**
   * Crea un nuevo item de inventario
   * @swagger
   * /api/inventory/items:
   *   post:
   *     summary: Crea un nuevo item de inventario
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateInventoryItemRequest'
   *     responses:
   *       201:
   *         description: Item de inventario creado exitosamente
   */
  static createItem = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.createItem(req.body, {
      createdBy: req.user?.id
    });

    res.status(201).json(result);
  });

  /**
   * Obtiene items de inventario con filtros
   * @swagger
   * /api/inventory/items:
   *   get:
   *     summary: Obtiene lista de items de inventario
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *         description: Categoría del item
   *       - in: query
   *         name: isControlledSubstance
   *         schema:
   *           type: boolean
   *         description: Filtrar sustancias controladas
   *       - in: query
   *         name: lowStock
   *         schema:
   *           type: boolean
   *         description: Filtrar items con bajo stock
   *     responses:
   *       200:
   *         description: Items de inventario obtenidos exitosamente
   */
  static getItems = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    
    const filters = {
      category: req.query.category,
      isControlledSubstance: req.query.isControlledSubstance === 'true',
      lowStock: req.query.lowStock === 'true',
      search: req.query.search
    };

    const pagination = {
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 20
    };

    const result = await inventoryService.getItems(filters, pagination);
    res.status(200).json(result);
  });

  /**
   * Obtiene un item de inventario por ID
   * @swagger
   * /api/inventory/items/{id}:
   *   get:
   *     summary: Obtiene un item de inventario específico
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID del item de inventario
   *     responses:
   *       200:
   *         description: Item de inventario obtenido exitosamente
   */
  static getItemById = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.getItemById(parseInt(req.params.id));
    res.status(200).json(result);
  });

  /**
   * Actualiza un item de inventario
   * @swagger
   * /api/inventory/items/{id}:
   *   put:
   *     summary: Actualiza un item de inventario existente
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Item de inventario actualizado exitosamente
   */
  static updateItem = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.updateItem(
      parseInt(req.params.id),
      req.body,
      req.user?.id
    );
    res.status(200).json(result);
  });

  /**
   * Elimina un item de inventario
   * @swagger
   * /api/inventory/items/{id}:
   *   delete:
   *     summary: Elimina un item de inventario
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Item de inventario eliminado exitosamente
   */
  static deleteItem = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.deleteItem(
      parseInt(req.params.id),
      req.user?.id
    );
    res.status(200).json(result);
  });

  /**
   * Agrega un nuevo lote a un item de inventario
   * @swagger
   * /api/inventory/items/{itemId}/batches:
   *   post:
   *     summary: Agrega un nuevo lote a un item de inventario
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/BatchEntryRequest'
   *     responses:
   *       201:
   *         description: Lote agregado exitosamente
   */
  static addBatch = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.addBatch(
      parseInt(req.params.itemId),
      req.body,
      req.user?.id
    );
    res.status(201).json(result);
  });

  /**
   * Obtiene lotes de un item de inventario
   * @swagger
   * /api/inventory/items/{itemId}/batches:
   *   get:
   *     summary: Obtiene lotes de un item de inventario
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lotes obtenidos exitosamente
   */
  static getItemBatches = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.getItemBatches(parseInt(req.params.itemId));
    res.status(200).json(result);
  });

  /**
   * Obtiene un lote específico
   * @swagger
   * /api/inventory/batches/{batchId}:
   *   get:
   *     summary: Obtiene un lote específico
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lote obtenido exitosamente
   */
  static getBatchById = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.getBatchById(req.params.batchId);
    res.status(200).json(result);
  });

  /**
   * Actualiza un lote
   * @swagger
   * /api/inventory/batches/{batchId}:
   *   put:
   *     summary: Actualiza un lote existente
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lote actualizado exitosamente
   */
  static updateBatch = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.updateBatch(
      req.params.batchId,
      req.body,
      req.user?.id
    );
    res.status(200).json(result);
  });

  /**
   * Ajusta el stock de un lote
   * @swagger
   * /api/inventory/batches/{batchId}/adjust:
   *   patch:
   *     summary: Ajusta el stock de un lote
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/InventoryAdjustmentRequest'
   *     responses:
   *       200:
   *         description: Stock ajustado exitosamente
   */
  static adjustBatch = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.adjustBatch(
      req.params.batchId,
      req.body,
      req.user?.id
    );
    res.status(200).json(result);
  });

  /**
   * Obtiene items con bajo stock
   * @swagger
   * /api/inventory/stock/low:
   *   get:
   *     summary: Obtiene items con bajo stock
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Items con bajo stock obtenidos exitosamente
   */
  static getLowStockItems = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.getLowStockItems();
    res.status(200).json(result);
  });

  /**
   * Obtiene lotes próximos a vencer
   * @swagger
   * /api/inventory/stock/expiring:
   *   get:
   *     summary: Obtiene lotes próximos a vencer
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: days
   *         schema:
   *           type: integer
   *           default: 30
   *         description: Días antes del vencimiento
   *     responses:
   *       200:
   *         description: Lotes próximos a vencer obtenidos exitosamente
   */
  static getExpiringBatches = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const days = req.query.days ? parseInt(req.query.days) : 30;
    const result = await inventoryService.getExpiringBatches(days);
    res.status(200).json(result);
  });

  /**
   * Obtiene lotes vencidos
   * @swagger
   * /api/inventory/stock/expired:
   *   get:
   *     summary: Obtiene lotes vencidos
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lotes vencidos obtenidos exitosamente
   */
  static getExpiredBatches = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.getExpiredBatches();
    res.status(200).json(result);
  });

  /**
   * Obtiene vista general del stock
   * @swagger
   * /api/inventory/stock/overview:
   *   get:
   *     summary: Obtiene vista general del stock
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Vista general del stock obtenida exitosamente
   */
  static getStockOverview = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.getStockOverview();
    res.status(200).json(result);
  });

  /**
   * Confirma una transacción de inventario
   * @swagger
   * /api/inventory/transactions/commit:
   *   post:
   *     summary: Confirma una transacción de inventario
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/InventoryTransactionRequest'
   *     responses:
   *       201:
   *         description: Transacción confirmada exitosamente
   */
  static commitInventoryTransaction = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.commitInventoryTransaction(req.body, req.user?.id);
    res.status(201).json(result);
  });

  /**
   * Obtiene transacciones de inventario
   * @swagger
   * /api/inventory/transactions:
   *   get:
   *     summary: Obtiene transacciones de inventario
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Transacciones obtenidas exitosamente
   */
  static getTransactions = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    
    const filters = {
      transactionType: req.query.transactionType,
      startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate) : undefined
    };

    const pagination = {
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 20
    };

    const result = await inventoryService.getTransactions(filters, pagination);
    res.status(200).json(result);
  });

  /**
   * Obtiene una transacción específica
   * @swagger
   * /api/inventory/transactions/{id}:
   *   get:
   *     summary: Obtiene una transacción específica
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Transacción obtenida exitosamente
   */
  static getTransactionById = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.getTransactionById(req.params.id);
    res.status(200).json(result);
  });

  /**
   * Obtiene sustancias controladas
   * @swagger
   * /api/inventory/controlled-substances:
   *   get:
   *     summary: Obtiene sustancias controladas
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Sustancias controladas obtenidas exitosamente
   */
  static getControlledSubstances = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.getControlledSubstances();
    res.status(200).json(result);
  });

  /**
   * Obtiene trazabilidad de sustancias controladas
   * @swagger
   * /api/inventory/controlled-substances/tracking:
   *   get:
   *     summary: Obtiene trazabilidad de sustancias controladas
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Trazabilidad obtenida exitosamente
   */
  static getControlledSubstanceTracking = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.getControlledSubstanceTracking();
    res.status(200).json(result);
  });

  /**
   * Dispone de una sustancia controlada
   * @swagger
   * /api/inventory/controlled-substances/dispose:
   *   post:
   *     summary: Dispone de una sustancia controlada
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ControlledSubstanceDisposalRequest'
   *     responses:
   *       201:
   *         description: Sustancia controlada dispuesta exitosamente
   */
  static disposeControlledSubstance = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.disposeControlledSubstance(req.body, req.user?.id);
    res.status(201).json(result);
  });

  /**
   * Obtiene reporte de valor de inventario
   * @swagger
   * /api/inventory/reports/inventory-value:
   *   get:
   *     summary: Obtiene reporte de valor de inventario
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Reporte de valor de inventario obtenido exitosamente
   */
  static getInventoryValueReport = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.getInventoryValueReport();
    res.status(200).json(result);
  });

  /**
   * Obtiene reporte de analítica de uso
   * @swagger
   * /api/inventory/reports/usage-analytics:
   *   get:
   *     summary: Obtiene reporte de analítica de uso
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Reporte de analítica de uso obtenido exitosamente
   */
  static getUsageAnalyticsReport = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.getUsageAnalyticsReport();
    res.status(200).json(result);
  });

  /**
   * Obtiene reporte de vencimientos
   * @swagger
   * /api/inventory/reports/expiration-report:
   *   get:
   *     summary: Obtiene reporte de vencimientos
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Reporte de vencimientos obtenido exitosamente
   */
  static getExpirationReport = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.getExpirationReport();
    res.status(200).json(result);
  });

  /**
   * Obtiene alertas de inventario
   * @swagger
   * /api/inventory/alerts:
   *   get:
   *     summary: Obtiene alertas de inventario
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Alertas de inventario obtenidas exitosamente
   */
  static getInventoryAlerts = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.getInventoryAlerts();
    res.status(200).json(result);
  });

  /**
   * Resuelve una alerta de inventario
   * @swagger
   * /api/inventory/alerts/{alertId}/resolve:
   *   post:
   *     summary: Resuelve una alerta de inventario
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Alerta resuelta exitosamente
   */
  static resolveAlert = asyncHandler(async (req, res) => {
    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.resolveAlert(
      req.params.alertId,
      req.body,
      req.user?.id
    );
    res.status(200).json(result);
  });
}

module.exports = InventoryController;
