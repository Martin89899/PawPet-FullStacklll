const express = require('express');
const InventoryController = require('../controllers/inventoryController');
const { validateInventoryItem, validateBatchEntry, validateInventoryAdjustment } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Inventory
 *     description: Operaciones de gestión de inventario y farmacia
 */

// Rutas principales de inventario
router.post('/items', validateInventoryItem, InventoryController.createItem);
router.get('/items', InventoryController.getItems);
router.get('/items/:id', InventoryController.getItemById);
router.put('/items/:id', InventoryController.updateItem);
router.delete('/items/:id', InventoryController.deleteItem);

// Rutas de gestión de lotes
router.post('/items/:itemId/batches', validateBatchEntry, InventoryController.addBatch);
router.get('/items/:itemId/batches', InventoryController.getItemBatches);
router.get('/batches/:batchId', InventoryController.getBatchById);
router.put('/batches/:batchId', InventoryController.updateBatch);
router.patch('/batches/:batchId/adjust', validateInventoryAdjustment, InventoryController.adjustBatch);

// Rutas de control de stock
router.get('/stock/low', InventoryController.getLowStockItems);
router.get('/stock/expiring', InventoryController.getExpiringBatches);
router.get('/stock/expired', InventoryController.getExpiredBatches);
router.get('/stock/overview', InventoryController.getStockOverview);

// Rutas de transacciones
router.post('/transactions/commit', InventoryController.commitInventoryTransaction);
router.get('/transactions', InventoryController.getTransactions);
router.get('/transactions/:id', InventoryController.getTransactionById);

// Rutas de trazabilidad de sustancias controladas
router.get('/controlled-substances', InventoryController.getControlledSubstances);
router.get('/controlled-substances/tracking', InventoryController.getControlledSubstanceTracking);
router.post('/controlled-substances/dispose', InventoryController.disposeControlledSubstance);

// Rutas de reportes y estadísticas
router.get('/reports/inventory-value', InventoryController.getInventoryValueReport);
router.get('/reports/usage-analytics', InventoryController.getUsageAnalyticsReport);
router.get('/reports/expiration-report', InventoryController.getExpirationReport);

// Rutas de alertas
router.get('/alerts', InventoryController.getInventoryAlerts);
router.post('/alerts/:alertId/resolve', InventoryController.resolveAlert);

module.exports = router;
