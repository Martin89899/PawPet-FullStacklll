const HospitalizationService = require('../services/hospitalizationService');
const { asyncHandler } = require('../middleware/errorHandler');
const { pool } = require('../config/database');

/**
 * Controladores de Hospitalización para el Hospitalization Service
 * @class HospitalizationController
 * @description Maneja las solicitudes HTTP de gestión de hospitalización
 */
class HospitalizationController {
  /**
   * Crea una nueva hospitalización
   * @swagger
   * /api/hospitalization:
   *   post:
   *     summary: Crea una nueva hospitalización
   *     tags: [Hospitalization]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateHospitalizationRequest'
   *     responses:
   *       201:
   *         description: Hospitalización creada exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   *       400:
   *         description: Error de validación
   *       409:
   *         description: El paciente ya está hospitalizado
   */
  static createHospitalization = asyncHandler(async (req, res) => {
    const hospitalizationService = new HospitalizationService(pool);
    const result = await hospitalizationService.createHospitalization(req.body, {
      createdBy: req.user?.id
    });

    res.status(201).json(result);
  });

  /**
   * Obtiene hospitalizaciones con filtros
   * @swagger
   * /api/hospitalization:
   *   get:
   *     summary: Obtiene lista de hospitalizaciones
   *     tags: [Hospitalization]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: patientId
   *         schema:
   *           type: integer
   *         description: ID del paciente
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [active, discharged, transferred]
   *         description: Estado de la hospitalización
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
   *         description: Lista de hospitalizaciones obtenida
   */
  static getHospitalizations = asyncHandler(async (req, res) => {
    const hospitalizationService = new HospitalizationService(pool);
    
    const filters = {
      patientId: req.query.patientId ? parseInt(req.query.patientId) : undefined,
      status: req.query.status,
      startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate) : undefined
    };

    const pagination = {
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 20
    };

    const result = await hospitalizationService.getHospitalizations(filters, pagination);
    res.status(200).json(result);
  });

  /**
   * Obtiene hospitalizaciones activas
   * @swagger
   * /api/hospitalization/active:
   *   get:
   *     summary: Obtiene hospitalizaciones activas
   *     tags: [Hospitalization]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Hospitalizaciones activas obtenidas
   */
  static getActiveHospitalizations = asyncHandler(async (req, res) => {
    const hospitalizationService = new HospitalizationService(pool);
    const result = await hospitalizationService.getActiveHospitalizations();
    res.status(200).json(result);
  });

  /**
   * Obtiene una hospitalización por ID
   * @swagger
   * /api/hospitalization/{id}:
   *   get:
   *     summary: Obtiene una hospitalización específica
   *     tags: [Hospitalization]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID de la hospitalización
   *     responses:
   *       200:
   *         description: Hospitalización obtenida exitosamente
   *       404:
   *         description: Hospitalización no encontrada
   */
  static getHospitalizationById = asyncHandler(async (req, res) => {
    const hospitalizationService = new HospitalizationService(pool);
    const result = await hospitalizationService.getHospitalizationById(parseInt(req.params.id));
    res.status(200).json(result);
  });

  /**
   * Actualiza una hospitalización
   * @swagger
   * /api/hospitalization/{id}:
   *   put:
   *     summary: Actualiza una hospitalización existente
   *     tags: [Hospitalization]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Hospitalización actualizada exitosamente
   *       404:
   *         description: Hospitalización no encontrada
   */
  static updateHospitalization = asyncHandler(async (req, res) => {
    const hospitalizationService = new HospitalizationService(pool);
    const result = await hospitalizationService.updateHospitalization(
      parseInt(req.params.id),
      req.body,
      req.user?.id
    );
    res.status(200).json(result);
  });

  /**
   * Da de alta a un paciente hospitalizado
   * @swagger
   * /api/hospitalization/{id}/discharge:
   *   post:
   *     summary: Da de alta a un paciente hospitalizado
   *     tags: [Hospitalization]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - dischargeReason
   *               - dischargeNotes
   *             properties:
   *               dischargeReason:
   *                 type: string
   *                 description: Motivo del alta
   *               dischargeNotes:
   *                 type: string
   *                 description: Notas del alta
   *               followUpInstructions:
   *                 type: string
   *                 description: Instrucciones de seguimiento
   *     responses:
   *       200:
   *         description: Paciente dado de alta exitosamente
   */
  static dischargePatient = asyncHandler(async (req, res) => {
    const hospitalizationService = new HospitalizationService(pool);
    const result = await hospitalizationService.dischargePatient(
      parseInt(req.params.id),
      req.body,
      req.user?.id
    );
    res.status(200).json(result);
  });

  /**
   * Transfiere a un paciente hospitalizado
   * @swagger
   * /api/hospitalization/{id}/transfer:
   *   post:
   *     summary: Transfiere a un paciente hospitalizado
   *     tags: [Hospitalization]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - transferReason
   *               - destinationLocation
   *             properties:
   *               transferReason:
   *                 type: string
   *                 description: Motivo de la transferencia
   *               destinationLocation:
   *                 type: string
   *                 description: Ubicación de destino
   *               transferNotes:
   *                 type: string
   *                 description: Notas de la transferencia
   *     responses:
   *       200:
   *         description: Paciente transferido exitosamente
   */
  static transferPatient = asyncHandler(async (req, res) => {
    const hospitalizationService = new HospitalizationService(pool);
    const result = await hospitalizationService.transferPatient(
      parseInt(req.params.id),
      req.body,
      req.user?.id
    );
    res.status(200).json(result);
  });

  /**
   * Registra signos vitales de un paciente hospitalizado
   * @swagger
   * /api/hospitalization/{id}/vital-signs:
   *   post:
   *     summary: Registra signos vitales de un paciente hospitalizado
   *     tags: [Hospitalization]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/VitalSignsRequest'
   *     responses:
   *       201:
   *         description: Signos vitales registrados exitosamente
   */
  static recordVitalSigns = asyncHandler(async (req, res) => {
    const hospitalizationService = new HospitalizationService(pool);
    const result = await hospitalizationService.recordVitalSigns(
      parseInt(req.params.id),
      req.body,
      req.user?.id
    );
    res.status(201).json(result);
  });

  /**
   * Obtiene signos vitales de un paciente hospitalizado
   * @swagger
   * /api/hospitalization/{id}/vital-signs:
   *   get:
   *     summary: Obtiene signos vitales de un paciente hospitalizado
   *     tags: [Hospitalization]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Fecha de inicio
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Fecha de fin
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 100
   *         description: Límite de registros
   *     responses:
   *       200:
   *         description: Signos vitales obtenidos exitosamente
   */
  static getVitalSigns = asyncHandler(async (req, res) => {
    const hospitalizationService = new HospitalizationService(pool);
    
    const filters = {
      startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };

    const result = await hospitalizationService.getVitalSigns(parseInt(req.params.id), filters);
    res.status(200).json(result);
  });

  /**
   * Obtiene los signos vitales más recientes de un paciente hospitalizado
   * @swagger
   * /api/hospitalization/{id}/vital-signs/latest:
   *   get:
   *     summary: Obtiene los signos vitales más recientes
   *     tags: [Hospitalization]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Últimos signos vitales obtenidos exitosamente
   */
  static getLatestVitalSigns = asyncHandler(async (req, res) => {
    const hospitalizationService = new HospitalizationService(pool);
    const result = await hospitalizationService.getLatestVitalSigns(parseInt(req.params.id));
    res.status(200).json(result);
  });

  /**
   * Administra medicación a un paciente hospitalizado
   * @swagger
   * /api/hospitalization/{id}/medications:
   *   post:
   *     summary: Administra medicación a un paciente hospitalizado
   *     tags: [Hospitalization]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/MedicationAdministrationRequest'
   *     responses:
   *       201:
   *         description: Medicación administrada exitosamente
   */
  static administerMedication = asyncHandler(async (req, res) => {
    const hospitalizationService = new HospitalizationService(pool);
    const result = await hospitalizationService.administerMedication(
      parseInt(req.params.id),
      req.body,
      req.user?.id
    );
    res.status(201).json(result);
  });

  /**
   * Obtiene registros de medicación de un paciente hospitalizado
   * @swagger
   * /api/hospitalization/{id}/medications:
   *   get:
   *     summary: Obtiene registros de medicación
   *     tags: [Hospitalization]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Registros de medicación obtenidos exitosamente
   */
  static getMedicationRecords = asyncHandler(async (req, res) => {
    const hospitalizationService = new HospitalizationService(pool);
    const result = await hospitalizationService.getMedicationRecords(parseInt(req.params.id));
    res.status(200).json(result);
  });

  /**
   * Obtiene medicaciones pendientes de un paciente hospitalizado
   * @swagger
   * /api/hospitalization/{id}/medications/pending:
   *   get:
   *     summary: Obtiene medicaciones pendientes
   *     tags: [Hospitalization]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Medicaciones pendientes obtenidas exitosamente
   */
  static getPendingMedications = asyncHandler(async (req, res) => {
    const hospitalizationService = new HospitalizationService(pool);
    const result = await hospitalizationService.getPendingMedications(parseInt(req.params.id));
    res.status(200).json(result);
  });

  /**
   * Obtiene la hoja de monitoreo de un paciente hospitalizado
   * @swagger
   * /api/hospitalization/{id}/monitoring-sheet:
   *   get:
   *     summary: Obtiene la hoja de monitoreo
   *     tags: [Hospitalization]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Hoja de monitoreo obtenida exitosamente
   */
  static getMonitoringSheet = asyncHandler(async (req, res) => {
    const hospitalizationService = new HospitalizationService(pool);
    const result = await hospitalizationService.getMonitoringSheet(parseInt(req.params.id));
    res.status(200).json(result);
  });

  /**
   * Crea una alerta para un paciente hospitalizado
   * @swagger
   * /api/hospitalization/{id}/alerts:
   *   post:
   *     summary: Crea una alerta para un paciente hospitalizado
   *     tags: [Hospitalization]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - alertType
   *               - message
   *             properties:
   *               alertType:
   *                 type: string
   *                 enum: [critical, warning, info]
   *                 description: Tipo de alerta
   *               message:
   *                 type: string
   *                 description: Mensaje de la alerta
   *               severity:
   *                 type: string
   *                 enum: [low, medium, high, critical]
   *                 description: Severidad de la alerta
   *     responses:
   *       201:
   *         description: Alerta creada exitosamente
   */
  static createAlert = asyncHandler(async (req, res) => {
    const hospitalizationService = new HospitalizationService(pool);
    const result = await hospitalizationService.createAlert(
      parseInt(req.params.id),
      req.body,
      req.user?.id
    );
    res.status(201).json(result);
  });

  /**
   * Obtiene alertas de un paciente hospitalizado
   * @swagger
   * /api/hospitalization/{id}/alerts:
   *   get:
   *     summary: Obtiene alertas de un paciente hospitalizado
   *     tags: [Hospitalization]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [active, resolved]
   *         description: Estado de las alertas
   *     responses:
   *       200:
   *         description: Alertas obtenidas exitosamente
   */
  static getAlerts = asyncHandler(async (req, res) => {
    const hospitalizationService = new HospitalizationService(pool);
    const filters = {
      status: req.query.status
    };
    const result = await hospitalizationService.getAlerts(parseInt(req.params.id), filters);
    res.status(200).json(result);
  });

  /**
   * Resuelve una alerta
   * @swagger
   * /api/hospitalization/{id}/alerts/{alertId}/resolve:
   *   put:
   *     summary: Resuelve una alerta
   *     tags: [Hospitalization]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - resolutionNotes
   *             properties:
   *               resolutionNotes:
   *                 type: string
   *                 description: Notas de resolución
   *     responses:
   *       200:
   *         description: Alerta resuelta exitosamente
   */
  static resolveAlert = asyncHandler(async (req, res) => {
    const hospitalizationService = new HospitalizationService(pool);
    const result = await hospitalizationService.resolveAlert(
      parseInt(req.params.id),
      parseInt(req.params.alertId),
      req.body,
      req.user?.id
    );
    res.status(200).json(result);
  });

  /**
   * Obtiene un resumen de hospitalización
   * @swagger
   * /api/hospitalization/{id}/summary:
   *   get:
   *     summary: Obtiene un resumen de hospitalización
   *     tags: [Hospitalization]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Resumen obtenido exitosamente
   */
  static getHospitalizationSummary = asyncHandler(async (req, res) => {
    const hospitalizationService = new HospitalizationService(pool);
    const result = await hospitalizationService.getHospitalizationSummary(parseInt(req.params.id));
    res.status(200).json(result);
  });

  /**
   * Obtiene estadísticas de hospitalización
   * @swagger
   * /api/hospitalization/stats/overview:
   *   get:
   *     summary: Obtiene estadísticas de hospitalización
   *     tags: [Hospitalization]
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
   *         description: Estadísticas obtenidas exitosamente
   */
  static getHospitalizationStats = asyncHandler(async (req, res) => {
    const hospitalizationService = new HospitalizationService(pool);
    
    const filters = {
      startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate) : undefined
    };

    const result = await hospitalizationService.getHospitalizationStats(filters);
    res.status(200).json(result);
  });
}

module.exports = HospitalizationController;
