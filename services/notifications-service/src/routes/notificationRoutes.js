const express = require('express');
const NotificationController = require('../controllers/notificationController');
const { validateNotification, validateNotificationTemplate, validateNotificationPreferences } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Notifications
 *     description: Operaciones de gestión de notificaciones
 */

// Rutas principales de notificaciones
router.post('/send', validateNotification, NotificationController.sendNotification);
router.get('/', NotificationController.getNotifications);
router.get('/:id', NotificationController.getNotificationById);
router.put('/:id/read', NotificationController.markAsRead);
router.put('/:id/unread', NotificationController.markAsUnread);
router.delete('/:id', NotificationController.deleteNotification);

// Rutas de plantillas de notificaciones
router.post('/templates', validateNotificationTemplate, NotificationController.createTemplate);
router.get('/templates', NotificationController.getTemplates);
router.get('/templates/:id', NotificationController.getTemplateById);
router.put('/templates/:id', NotificationController.updateTemplate);
router.delete('/templates/:id', NotificationController.deleteTemplate);

// Rutas de preferencias de notificaciones
router.get('/users/:userId/preferences', NotificationController.getUserPreferences);
router.put('/users/:userId/preferences', validateNotificationPreferences, NotificationController.updateUserPreferences);
router.post('/users/:userId/preferences/test', NotificationController.testNotificationSettings);

// Rutas de campañas de notificaciones
router.post('/campaigns', NotificationController.createCampaign);
router.get('/campaigns', NotificationController.getCampaigns);
router.get('/campaigns/:id', NotificationController.getCampaignById);
router.post('/campaigns/:id/send', NotificationController.sendCampaign);
router.put('/campaigns/:id/pause', NotificationController.pauseCampaign);
router.put('/campaigns/:id/resume', NotificationController.resumeCampaign);

// Rutas de reportes y estadísticas
router.get('/reports/delivery-stats', NotificationController.getDeliveryStats);
router.get('/reports/engagement-analytics', NotificationController.getEngagementAnalytics);
router.get('/reports/user-activity', NotificationController.getUserActivityReport);

// Rutas de configuración del sistema
router.get('/channels/status', NotificationController.getChannelStatus);
router.post('/channels/test', NotificationController.testChannel);
router.get('/queues/status', NotificationController.getQueueStatus);

module.exports = router;
