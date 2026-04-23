const AppointmentService = require('../services/appointmentService');
const { asyncHandler } = require('../middleware/errorHandler');
const { pool } = require('../config/database');

/**
 * Controladores de Citas para el Appointments Service
 * @class AppointmentController
 * @description Maneja las solicitudes HTTP de gestión de citas
 */
class AppointmentController {
  constructor() {
    this.appointmentService = new AppointmentService(pool);
  }

  /**
   * Crea una nueva cita
   * @swagger
   * /api/appointments:
   *   post:
   *     summary: Crea una nueva cita
   *     tags: [Appointments]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateAppointmentRequest'
   *     responses:
   *       201:
   *         description: Cita creada exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   *       400:
   *         description: Error de validación
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       409:
   *         description: Conflicto de horario
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static createAppointment = asyncHandler(async (req, res) => {
    const appointmentService = new AppointmentService(pool);
    const result = await appointmentService.createAppointment(req.body, {
      createdBy: req.user?.id
    });

    res.status(201).json(result);
  });

  /**
   * Obtiene citas con filtros
   * @swagger
   * /api/appointments:
   *   get:
   *     summary: Obtiene lista de citas
   *     tags: [Appointments]
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
   *         description: Límite de resultados
   *       - in: query
   *         name: veterinarianId
   *         schema:
   *           type: integer
   *         description: ID del veterinario
   *       - in: query
   *         name: patientId
   *         schema:
   *           type: integer
   *         description: ID del paciente
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
  *           enum: [scheduled, confirmed, in_progress, completed, cancelled, no_show, rescheduled]
   *         description: Estado de la cita
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
   *         description: Lista de citas obtenida
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
  *                     appointments:
  *                       type: array
  *                       items:
  *                         $ref: '#/components/schemas/Appointment'
  *                     pagination:
  *                       $ref: '#/components/schemas/Pagination'
   */
  static getAppointments = asyncHandler(async (req, res) => {
    const appointmentService = new AppointmentService(pool);
    
    const filters = {
      veterinarianId: req.query.veterinarianId ? parseInt(req.query.veterinarianId) : undefined,
      patientId: req.query.patientId ? parseInt(req.query.patientId) : undefined,
      status: req.query.status,
      startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate) : undefined
    };

    const pagination = {
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 20
    };

    const result = await appointmentService.getAppointments(filters, pagination);
    res.status(200).json(result);
  });

  /**
   * Obtiene una cita por UUID
   * @swagger
   * /api/appointments/{uuid}:
   *   get:
   *     summary: Obtiene una cita específica
   *     tags: [Appointments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: uuid
   *         required: true
   *         schema:
  *           type: string
  *           format: uuid
   *         description: UUID de la cita
   *     responses:
  *       200:
   *         description: Cita obtenida exitosamente
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
  *                     appointment:
  *                       $ref: '#/components/schemas/Appointment'
  *       404:
  *         description: Cita no encontrada
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
   */
  static getAppointmentByUuid = asyncHandler(async (req, res) => {
    const appointmentService = new AppointmentService(pool);
    const result = await appointmentService.getAppointmentByUuid(req.params.uuid);
    res.status(200).json(result);
  });

  /**
   * Actualiza una cita
   * @swagger
   * /api/appointments/{uuid}:
   *   put:
   *     summary: Actualiza una cita existente
   *     tags: [Appointments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: uuid
  *         required: true
  *         schema:
  *           type: string
  *           format: uuid
  *         description: UUID de la cita
   *     requestBody:
   *       required: true
   *       content:
  *         application/json:
  *           schema:
  *             $ref: '#/components/schemas/UpdateAppointmentRequest'
   *     responses:
  *       200:
  *         description: Cita actualizada exitosamente
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Success'
  *       404:
  *         description: Cita no encontrada
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
  *       409:
  *         description: Conflicto de horario
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
   */
  static updateAppointment = asyncHandler(async (req, res) => {
    const appointmentService = new AppointmentService(pool);
    const result = await appointmentService.updateAppointment(
      req.params.uuid,
      req.body,
      req.user?.id
    );
    res.status(200).json(result);
  });

  /**
   * Cancela una cita
   * @swagger
   * /api/appointments/{uuid}/cancel:
   *   post:
   *     summary: Cancela una cita
   *     tags: [Appointments]
   *     security:
  *       - bearerAuth: []
  *     parameters:
  *       - in: path
  *         name: uuid
  *         required: true
  *         schema:
  *           type: string
  *           format: uuid
  *         description: UUID de la cita
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             required:
  *               - reason
  *             properties:
  *               reason:
  *                 type: string
  *                 description: Motivo de cancelación
  *     responses:
  *       200:
  *         description: Cita cancelada exitosamente
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Success'
  *       404:
  *         description: Cita no encontrada
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
  *       409:
  *         description: La cita ya está cancelada o completada
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
   */
  static cancelAppointment = asyncHandler(async (req, res) => {
    const appointmentService = new AppointmentService(pool);
    const result = await appointmentService.cancelAppointment(
      req.params.uuid,
      req.body.reason,
      req.user?.id
    );
    res.status(200).json(result);
  });

  /**
   * Confirma una cita
   * @swagger
   * /api/appointments/{uuid}/confirm:
  *   post:
  *     summary: Confirma una cita programada
  *     tags: [Appointments]
  *     security:
  *       - bearerAuth: []
  *     parameters:
  *       - in: path
  *         name: uuid
  *         required: true
  *         schema:
  *           type: string
  *           format: uuid
  *         description: UUID de la cita
  *     responses:
  *       200:
  *         description: Cita confirmada exitosamente
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Success'
  *       404:
  *         description: Cita no encontrada
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
  *       409:
  *         description: La cita no está en estado programado
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
   */
  static confirmAppointment = asyncHandler(async (req, res) => {
    const appointmentService = new AppointmentService(pool);
    const result = await appointmentService.confirmAppointment(
      req.params.uuid,
      req.user?.id
    );
    res.status(200).json(result);
  });

  /**
   * Completa una cita
   * @swagger
   * /api/appointments/{uuid}/complete:
  *   post:
  *     summary: Marca una cita como completada
  *     tags: [Appointments]
  *     security:
  *       - bearerAuth: []
  *     parameters:
  *       - in: path
  *         name: uuid
  *         required: true
  *         schema:
  *           type: string
  *           format: uuid
  *         description: UUID de la cita
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               actualDurationMinutes:
  *                 type: integer
  *                 description: Duración real en minutos
  *               notes:
  *                 type: string
  *                 description: Notas de la consulta
  *     responses:
  *       200:
  *         description: Cita completada exitosamente
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Success'
  *       404:
  *         description: Cita no encontrada
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
  *       409:
  *         description: La cita ya está completada
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
   */
  static completeAppointment = asyncHandler(async (req, res) => {
    const appointmentService = new AppointmentService(pool);
    const result = await appointmentService.completeAppointment(
      req.params.uuid,
      req.body,
      req.user?.id
    );
    res.status(200).json(result);
  });

  /**
   * Reagenda una cita
   * @swagger
   * /api/appointments/{uuid}/reschedule:
  *   post:
  *     summary: Reagenda una cita existente
  *     tags: [Appointments]
  *     security:
  *       - bearerAuth: []
  *     parameters:
  *       - in: path
  *         name: uuid
  *         required: true
  *         schema:
  *           type: string
  *           format: uuid
  *         description: UUID de la cita
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             required:
  *               - newScheduledDatetime
  *               - reason
  *             properties:
  *               newScheduledDatetime:
  *                 type: string
  *                 format: date-time
  *                 description: Nueva fecha y hora programada
  *               reason:
  *                 type: string
  *                 description: Motivo de reagendación
  *     responses:
  *       200:
  *         description: Cita reagendada exitosamente
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Success'
  *       404:
  *         description: Cita no encontrada
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
  *       409:
  *         description: Conflicto de horario o estado inválido
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
   */
  static rescheduleAppointment = asyncHandler(async (req, res) => {
    const appointmentService = new AppointmentService(pool);
    const result = await appointmentService.rescheduleAppointment(
      req.params.uuid,
      new Date(req.body.newScheduledDatetime),
      req.body.reason,
      req.user?.id
    );
    res.status(200).json(result);
  });

  /**
   * Obtiene el calendario de un veterinario
   * @swagger
   * /api/appointments/calendar/{veterinarianId}:
  *   get:
  *     summary: Obtiene el calendario de citas de un veterinario
  *     tags: [Calendar]
  *     security:
  *       - bearerAuth: []
  *     parameters:
  *       - in: path
  *         name: veterinarianId
  *         required: true
  *         schema:
  *           type: integer
  *         description: ID del veterinario
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
  *         description: Calendario obtenido exitosamente
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
  *                     veterinarian:
  *                       $ref: '#/components/schemas/Veterinarian'
  *                     appointments:
  *                       type: array
  *                       items:
  *                         $ref: '#/components/schemas/Appointment'
  *                     availabilitySlots:
  *                       type: array
  *                       items:
  *                         $ref: '#/components/schemas/AvailabilitySlot'
  *       404:
  *         description: Veterinario no encontrado
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
   */
  static getVeterinarianCalendar = asyncHandler(async (req, res) => {
    const appointmentService = new AppointmentService(pool);
    const result = await appointmentService.getVeterinarianCalendar(
      parseInt(req.params.veterinarianId),
      new Date(req.query.startDate),
      new Date(req.query.endDate)
    );
    res.status(200).json(result);
  });

  /**
   * Obtiene citas de hoy
   * @swagger
   * /api/appointments/today:
  *   get:
  *     summary: Obtiene las citas programadas para hoy
  *     tags: [Appointments]
  *     security:
  *       - bearerAuth: []
  *     parameters:
  *       - in: query
  *         name: veterinarianId
  *         schema:
  *           type: integer
  *         description: ID del veterinario (opcional)
  *     responses:
  *       200:
  *         description: Citas de hoy obtenidas exitosamente
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
  *                     appointments:
  *                       type: array
  *                       items:
  *                         $ref: '#/components/schemas/Appointment'
   */
  static getTodayAppointments = asyncHandler(async (req, res) => {
    const appointmentService = new AppointmentService(pool);
    const result = await appointmentService.getTodayAppointments(
      req.query.veterinarianId ? parseInt(req.query.veterinarianId) : null
    );
    res.status(200).json(result);
  });

  /**
   * Obtiene estadísticas de citas
   * @swagger
   * /api/appointments/stats:
  *   get:
  *     summary: Obtiene estadísticas de citas
  *     tags: [Appointments]
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
  *       - in: query
  *         name: veterinarianId
  *         schema:
  *           type: integer
  *         description: ID del veterinario
  *     responses:
  *       200:
  *         description: Estadísticas obtenidas exitosamente
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
  *                     stats:
  *                       type: object
  *                       properties:
  *                         total:
  *                           type: integer
  *                         completed:
  *                           type: integer
  *                         cancelled:
  *                           type: integer
  *                         noShow:
  *                           type: integer
  *                         scheduled:
  *                           type: integer
  *                         confirmed:
  *                           type: integer
  *                         emergencies:
  *                           type: integer
  *                         avgDuration:
  *                           type: number
  *                         totalRevenue:
  *                           type: number
  *                         completionRate:
  *                           type: number
  *                         cancellationRate:
  *                           type: number
   */
  static getAppointmentStats = asyncHandler(async (req, res) => {
    const appointmentService = new AppointmentService(pool);
    
    const filters = {
      startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
      veterinarianId: req.query.veterinarianId ? parseInt(req.query.veterinarianId) : undefined
    };

    const result = await appointmentService.getAppointmentStats(filters);
    res.status(200).json(result);
  });
}

module.exports = AppointmentController;
