const express = require('express');
const PatientController = require('../controllers/patientController');
const { 
  authenticateToken, 
  authorizeRoles, 
  authorizeOwnership,
  requireVeterinarianOrAdmin,
  requireAdmin,
  optionalAuth
} = require('../middleware/auth');
const {
  validateTutor,
  validatePatient,
  validateClinicalHistory,
  validateVaccination,
  validateDeworming,
  validateAllergy,
  validatePatientId,
  validateTutorId,
  validateHistoryId,
  validatePagination,
  validateSearch
} = require('../middleware/validation');

const router = express.Router();

// ==================== TUTORES ====================

/**
 * @swagger
 * /api/patients/tutors:
 *   post:
 *     tags: [Tutors]
 *     summary: Crear un nuevo tutor
 *     description: Registra un nuevo tutor en el sistema
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTutorRequest'
 *     responses:
 *       201:
 *         description: Tutor creado exitosamente
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
 *         description: Email o identificación ya existen
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/tutors', 
  authenticateToken, 
  requireVeterinarianOrAdmin, 
  validateTutor, 
  PatientController.createTutor
);

/**
 * @swagger
 * /api/patients/tutors/search:
 *   get:
 *     tags: [Tutors]
 *     summary: Buscar tutores
 *     description: Busca tutores por nombre, apellido, email o teléfono
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Término de búsqueda
 *     responses:
 *       200:
 *         description: Búsqueda completada
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
 *                     tutors:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Tutor'
 *       400:
 *         description: Término de búsqueda inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/tutors/search', 
  authenticateToken, 
  validateSearch, 
  PatientController.searchTutors
);

/**
 * @swagger
 * /api/patients/tutors/{tutorId}:
 *   get:
 *     tags: [Tutors]
 *     summary: Obtener tutor con sus pacientes
 *     description: Obtiene los datos de un tutor y todos sus pacientes asociados
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tutorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del tutor
 *     responses:
 *       200:
 *         description: Tutor obtenido exitosamente
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
 *                     tutor:
 *                       $ref: '#/components/schemas/Tutor'
 *       404:
 *         description: Tutor no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/tutors/:tutorId', 
  authenticateToken, 
  validateTutorId, 
  authorizeOwnership('tutor'), 
  PatientController.getTutorWithPatients
);

// ==================== PACIENTES ====================

/**
 * @swagger
 * /api/patients:
 *   post:
 *     tags: [Patients]
 *     summary: Crear un nuevo paciente
 *     description: Registra un nuevo paciente (mascota) en el sistema
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePatientRequest'
 *     responses:
 *       201:
 *         description: Paciente creado exitosamente
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
 *         description: Microchip ya existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', 
  authenticateToken, 
  requireVeterinarianOrAdmin, 
  validatePatient, 
  PatientController.createPatient
);

/**
 * @swagger
 * /api/patients:
 *   get:
 *     tags: [Patients]
 *     summary: Obtener todos los pacientes
 *     description: Retorna una lista paginada de todos los pacientes activos
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
 *           default: 50
 *         description: Límite de pacientes por página
 *     responses:
 *       200:
 *         description: Pacientes obtenidos exitosamente
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
 *                     patients:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Patient'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *       403:
 *         description: Acceso denegado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', 
  authenticateToken, 
  validatePagination, 
  PatientController.getAllPatients
);

/**
 * @swagger
 * /api/patients/search:
 *   get:
 *     tags: [Patients]
 *     summary: Buscar pacientes
 *     description: Busca pacientes por nombre, apodo, microchip o datos del tutor
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Término de búsqueda
 *     responses:
 *       200:
 *         description: Búsqueda completada
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
 *                     patients:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Patient'
 *       400:
 *         description: Término de búsqueda inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/search', 
  authenticateToken, 
  validateSearch, 
  PatientController.searchPatients
);

/**
 * @swagger
 * /api/patients/{patientId}:
 *   get:
 *     tags: [Patients]
 *     summary: Obtener detalles de un paciente
 *     description: Obtiene todos los detalles de un paciente incluyendo información del tutor
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paciente
 *     responses:
 *       200:
 *         description: Paciente obtenido exitosamente
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
 *                     patient:
 *                       $ref: '#/components/schemas/Patient'
 *       404:
 *         description: Paciente no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Acceso denegado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:patientId', 
  authenticateToken, 
  validatePatientId, 
  authorizeOwnership('patient'), 
  PatientController.getPatientWithDetails
);

/**
 * @swagger
 * /api/patients/{patientId}/weight:
 *   put:
 *     tags: [Patients]
 *     summary: Actualizar peso del paciente
 *     description: Actualiza el peso de un paciente específico
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paciente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - weight
 *             properties:
 *               weight:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 999.99
 *                 description: Peso en kg
 *     responses:
 *       200:
 *         description: Peso actualizado exitosamente
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
 *       403:
 *         description: Acceso denegado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:patientId/weight', 
  authenticateToken, 
  validatePatientId, 
  authorizeOwnership('patient'), 
  PatientController.updatePatientWeight
);

/**
 * @swagger
 * /api/patients/{patientId}:
 *   delete:
 *     tags: [Patients]
 *     summary: Desactivar paciente
 *     description: Desactiva (no elimina) un paciente del sistema
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paciente
 *     responses:
 *       200:
 *         description: Paciente desactivado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Paciente no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Acceso denegado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:patientId', 
  authenticateToken, 
  validatePatientId, 
  requireVeterinarianOrAdmin, 
  PatientController.deactivatePatient
);

// ==================== HISTORIAL CLÍNICO ====================

/**
 * @swagger
 * /api/patients/{patientId}/history:
 *   post:
 *     tags: [Clinical History]
 *     summary: Crear entrada en historial clínico
 *     description: Crea una nueva entrada inmutable en el historial clínico de un paciente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paciente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateClinicalHistoryRequest'
 *     responses:
 *       201:
 *         description: Historial clínico creado exitosamente
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
 *       404:
 *         description: Paciente no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:patientId/history', 
  authenticateToken, 
  validatePatientId, 
  requireVeterinarianOrAdmin, 
  validateClinicalHistory, 
  PatientController.createClinicalHistory
);

/**
 * @swagger
 * /api/patients/{patientId}/history:
 *   get:
 *     tags: [Clinical History]
 *     summary: Obtener historial clínico del paciente
 *     description: Obtiene el historial clínico completo de un paciente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paciente
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Límite de resultados
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Desplazamiento para paginación
 *     responses:
 *       200:
 *         description: Historial clínico obtenido exitosamente
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
 *                     history:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ClinicalHistory'
 *       403:
 *         description: Acceso denegado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:patientId/history', 
  authenticateToken, 
  validatePatientId, 
  authorizeOwnership('patient'), 
  PatientController.getPatientHistory
);

/**
 * @swagger
 * /api/patients/{patientId}/history/{consultationType}:
 *   get:
 *     tags: [Clinical History]
 *     summary: Obtener historial por tipo de consulta
 *     description: Obtiene el historial clínico filtrado por tipo de consulta
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paciente
 *       - in: path
 *         name: consultationType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [emergency, checkup, surgery, hospitalization, vaccination, deworming, follow_up, other]
 *         description: Tipo de consulta
 *     responses:
 *       200:
 *         description: Historial clínico por tipo obtenido
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
 *                     history:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ClinicalHistory'
 *       403:
 *         description: Acceso denegado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:patientId/history/:consultationType', 
  authenticateToken, 
  validatePatientId, 
  authorizeOwnership('patient'), 
  PatientController.getHistoryByType
);

// ==================== VACUNACIONES ====================

/**
 * @swagger
 * /api/patients/{patientId}/vaccinations:
 *   post:
 *     tags: [Vaccinations]
 *     summary: Crear vacunación
 *     description: Registra una nueva vacunación para un paciente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paciente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vaccineName
 *               - applicationDate
 *             properties:
 *               vaccineName:
 *                 type: string
 *                 description: Nombre de la vacuna
 *               vaccineType:
 *                 type: string
 *                 description: Tipo de vacuna
 *               manufacturer:
 *                 type: string
 *                 description: Fabricante
 *               lotNumber:
 *                 type: string
 *                 description: Número de lote
 *               expirationDate:
 *                 type: string
 *                 format: date
 *                 description: Fecha de vencimiento
 *               applicationDate:
 *                 type: string
 *                 format: date
 *                 description: Fecha de aplicación
 *               nextApplicationDate:
 *                 type: string
 *                 format: date
 *                 description: Próxima fecha de aplicación
 *               doseNumber:
 *                 type: integer
 *                 description: Número de dosis
 *               totalDoses:
 *                 type: integer
 *                 description: Total de dosis
 *               applicationSite:
 *                 type: string
 *                 description: Sitio de aplicación
 *               adverseReactions:
 *                 type: string
 *                 description: Reacciones adversas
 *     responses:
 *       201:
 *         description: Vacunación creada exitosamente
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
 */
router.post('/:patientId/vaccinations', 
  authenticateToken, 
  validatePatientId, 
  requireVeterinarianOrAdmin, 
  validateVaccination, 
  PatientController.createVaccination
);

/**
 * @swagger
 * /api/patients/{patientId}/vaccinations:
 *   get:
 *     tags: [Vaccinations]
 *     summary: Obtener vacunaciones del paciente
 *     description: Obtiene todas las vacunaciones registradas para un paciente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paciente
 *     responses:
 *       200:
 *         description: Vacunaciones obtenidas exitosamente
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
 *                     vaccinations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           vaccineName:
 *                             type: string
 *                           applicationDate:
 *                             type: string
 *                           nextApplicationDate:
 *                             type: string
 *       403:
 *         description: Acceso denegado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:patientId/vaccinations', 
  authenticateToken, 
  validatePatientId, 
  authorizeOwnership('patient'), 
  PatientController.getPatientVaccinations
);

// ==================== DESPARASITACIONES ====================

/**
 * @swagger
 * /api/patients/{patientId}/dewormings:
 *   post:
 *     tags: [Dewormings]
 *     summary: Crear desparasitación
 *     description: Registra una nueva desparasitación para un paciente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paciente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productName
 *               - applicationDate
 *             properties:
 *               productName:
 *                 type: string
 *                 description: Nombre del producto
 *               activeIngredient:
 *                 type: string
 *                 description: Principio activo
 *               manufacturer:
 *                 type: string
 *                 description: Fabricante
 *               lotNumber:
 *                 type: string
 *                 description: Número de lote
 *               expirationDate:
 *                 type: string
 *                 format: date
 *                 description: Fecha de vencimiento
 *               applicationDate:
 *                 type: string
 *                 format: date
 *                 description: Fecha de aplicación
 *               nextApplicationDate:
 *                 type: string
 *                 format: date
 *                 description: Próxima fecha de aplicación
 *               dosage:
 *                 type: number
 *                 description: Dosis
 *               dosageUnit:
 *                 type: string
 *                 description: Unidad de dosis
 *               administrationRoute:
 *                 type: string
 *                 description: Vía de administración
 *               targetParasites:
 *                 type: string
 *                 description: Parásitos objetivo
 *               adverseReactions:
 *                 type: string
 *                 description: Reacciones adversas
 *     responses:
 *       201:
 *         description: Desparasitación creada exitosamente
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
 */
router.post('/:patientId/dewormings', 
  authenticateToken, 
  validatePatientId, 
  requireVeterinarianOrAdmin, 
  validateDeworming, 
  PatientController.createDeworming
);

/**
 * @swagger
 * /api/patients/{patientId}/dewormings:
 *   get:
 *     tags: [Dewormings]
 *     summary: Obtener desparasitaciones del paciente
 *     description: Obtiene todas las desparasitaciones registradas para un paciente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paciente
 *     responses:
 *       200:
 *         description: Desparasitaciones obtenidas exitosamente
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
 *                     dewormings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           productName:
 *                             type: string
 *                           applicationDate:
 *                             type: string
 *                           nextApplicationDate:
 *                             type: string
 *       403:
 *         description: Acceso denegado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:patientId/dewormings', 
  authenticateToken, 
  validatePatientId, 
  authorizeOwnership('patient'), 
  PatientController.getPatientDewormings
);

// ==================== ALERGIAS ====================

/**
 * @swagger
 * /api/patients/{patientId}/allergies:
 *   post:
 *     tags: [Allergies]
 *     summary: Crear alergia
 *     description: Registra una nueva alergia para un paciente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paciente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - allergen
 *               - allergyType
 *               - severity
 *             properties:
 *               allergen:
 *                 type: string
 *                 description: Alérgeno
 *               allergyType:
 *                 type: string
 *                 enum: [food, medication, environmental, other]
 *                 description: Tipo de alergia
 *               severity:
 *                 type: string
 *                 enum: [mild, moderate, severe, life_threatening]
 *                 description: Severidad
 *               symptoms:
 *                 type: string
 *                 description: Síntomas
 *               treatment:
 *                 type: string
 *                 description: Tratamiento
 *     responses:
 *       201:
 *         description: Alergia creada exitosamente
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
 */
router.post('/:patientId/allergies', 
  authenticateToken, 
  validatePatientId, 
  requireVeterinarianOrAdmin, 
  validateAllergy, 
  PatientController.createAllergy
);

/**
 * @swagger
 * /api/patients/{patientId}/allergies:
 *   get:
 *     tags: [Allergies]
 *     summary: Obtener alergias del paciente
 *     description: Obtiene todas las alergias registradas para un paciente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paciente
 *     responses:
 *       200:
 *         description: Alergias obtenidas exitosamente
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
 *                     allergies:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           allergen:
 *                             type: string
 *                           allergyType:
 *                             type: string
 *                           severity:
 *                             type: string
 *       403:
 *         description: Acceso denegado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:patientId/allergies', 
  authenticateToken, 
  validatePatientId, 
  authorizeOwnership('patient'), 
  PatientController.getPatientAllergies
);

// ==================== ESTADÍSTICAS ====================

/**
 * @swagger
 * /api/patients/stats:
 *   get:
 *     tags: [Statistics]
 *     summary: Obtener estadísticas del servicio
 *     description: Obtiene estadísticas generales de todos los módulos del servicio
 *     security:
 *       - bearerAuth: []
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
 *                         patients:
 *                           type: object
 *                         clinicalHistory:
 *                           type: object
 *                         vaccinations:
 *                           type: object
 *                         dewormings:
 *                           type: object
 *                         allergies:
 *                           type: object
 *       403:
 *         description: Acceso denegado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stats', 
  authenticateToken, 
  requireVeterinarianOrAdmin, 
  PatientController.getServiceStats
);

// ==================== ENDPOINTS DE ADMINISTRADOR ====================

// Rutas que requieren rol de administrador
router.use('/', requireAdmin);

/**
 * @swagger
 * /api/patients/tutors:
 *   get:
 *     tags: [Tutors]
 *     summary: Obtener todos los tutores (solo administrador)
 *     description: Retorna una lista paginada de todos los tutores del sistema
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
 *           default: 50
 *         description: Límite de tutores por página
 *     responses:
 *       200:
 *         description: Tutores obtenidos exitosamente
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
 *                     tutors:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Tutor'
 *                     pagination:
 *                       type: object
 *       403:
 *         description: Acceso denegado - se requiere rol de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/tutors', validatePagination, PatientController.getAllTutors);

/**
 * @swagger
 * /api/patients/follow-up:
 *   get:
 *     tags: [Clinical History]
 *     summary: Obtener pacientes que necesitan seguimiento
 *     description: Obtiene todos los pacientes que tienen seguimiento pendiente o vencido
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pacientes con seguimiento pendiente obtenidos
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
 *                     followUps:
 *                       type: array
 *       403:
 *         description: Acceso denegado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/follow-up', PatientController.getPatientsNeedingFollowUp);

/**
 * @swagger
 * /api/patients/vaccinations/upcoming:
 *   get:
 *     tags: [Vaccinations]
 *     summary: Obtener vacunaciones próximas
 *     description: Obtiene todas las vacunaciones próximas en los próximos días
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Días hacia el futuro
 *     responses:
 *       200:
 *         description: Vacunaciones próximas obtenidas
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
 *                     vaccinations:
 *                       type: array
 *       403:
 *         description: Acceso denegado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/vaccinations/upcoming', PatientController.getUpcomingVaccinations);

/**
 * @swagger
 * /api/patients/dewormings/upcoming:
 *   get:
 *     tags: [Dewormings]
 *     summary: Obtener desparasitaciones próximas
 *     description: Obtiene todas las desparasitaciones próximas en los próximos días
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Días hacia el futuro
 *     responses:
 *       200:
 *         description: Desparasitaciones próximas obtenidas
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
 *                     dewormings:
 *                       type: array
 *       403:
 *         description: Acceso denegado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/dewormings/upcoming', PatientController.getUpcomingDewormings);

/**
 * @swagger
 * /api/patients/allergies/severe:
 *   get:
 *     tags: [Allergies]
 *     summary: Obtener alergias severas
 *     description: Obtiene todas las alergias severas o que amenazan la vida
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alergias severas obtenidas
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
 *                     allergies:
 *                       type: array
 *       403:
 *         description: Acceso denegado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/allergies/severe', PatientController.getSevereAllergies);

module.exports = router;
