const express = require('express');
const AppointmentController = require('../controllers/appointmentController');
const { authMiddleware } = require('../middleware/auth');
const { validateAppointment, validateAppointmentUpdate, validateCalendarQuery } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Appointments
 *     description: Operaciones de gestión de citas
 *   - name: Calendar
 *     description: Operaciones de calendario
 */

// Rutas principales de citas
router.post('/', authMiddleware, validateAppointment, AppointmentController.createAppointment);
router.get('/', authMiddleware, AppointmentController.getAppointments);
router.get('/today', authMiddleware, AppointmentController.getTodayAppointments);
router.get('/stats', authMiddleware, AppointmentController.getAppointmentStats);

// Rutas específicas de cita por UUID
router.get('/:uuid', authMiddleware, AppointmentController.getAppointmentByUuid);
router.put('/:uuid', authMiddleware, validateAppointmentUpdate, AppointmentController.updateAppointment);
router.post('/:uuid/cancel', authMiddleware, AppointmentController.cancelAppointment);
router.post('/:uuid/confirm', authMiddleware, AppointmentController.confirmAppointment);
router.post('/:uuid/complete', authMiddleware, AppointmentController.completeAppointment);
router.post('/:uuid/reschedule', authMiddleware, AppointmentController.rescheduleAppointment);

// Rutas de calendario
router.get('/calendar/:veterinarianId', authMiddleware, validateCalendarQuery, AppointmentController.getVeterinarianCalendar);

module.exports = router;
