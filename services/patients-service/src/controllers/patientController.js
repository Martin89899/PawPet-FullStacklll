const PatientService = require('../services/patientService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Controladores para la gestión de pacientes y dominio clínico
 * @class PatientController
 * @description Maneja las solicitudes HTTP para el Patients Service
 */
class PatientController {
  // ==================== TUTORES ====================

  /**
   * Crea un nuevo tutor
   */
  static createTutor = asyncHandler(async (req, res) => {
    const tutor = await PatientService.createTutor(req.body);

    res.status(201).json({
      success: true,
      message: 'Tutor creado exitosamente',
      data: { tutor }
    });
  });

  /**
   * Obtiene un tutor con sus pacientes
   */
  static getTutorWithPatients = asyncHandler(async (req, res) => {
    const { tutorId } = req.params;
    const tutor = await PatientService.getTutorWithPatients(tutorId);

    res.status(200).json({
      success: true,
      message: 'Tutor obtenido exitosamente',
      data: { tutor }
    });
  });

  /**
   * Busca tutores por término de búsqueda
   */
  static searchTutors = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const tutors = await PatientService.searchTutors(q);

    res.status(200).json({
      success: true,
      message: 'Búsqueda de tutores completada',
      data: { tutors }
    });
  });

  // ==================== PACIENTES ====================

  /**
   * Crea un nuevo paciente
   */
  static createPatient = asyncHandler(async (req, res) => {
    const patient = await PatientService.createPatient(req.body);

    res.status(201).json({
      success: true,
      message: 'Paciente creado exitosamente',
      data: { patient }
    });
  });

  /**
   * Obtiene un paciente con todos sus detalles
   */
  static getPatientWithDetails = asyncHandler(async (req, res) => {
    const { patientId } = req.params;
    const patient = await PatientService.getPatientWithDetails(patientId);

    res.status(200).json({
      success: true,
      message: 'Paciente obtenido exitosamente',
      data: { patient }
    });
  });

  /**
   * Obtiene todos los pacientes (paginado)
   */
  static getAllPatients = asyncHandler(async (req, res) => {
    const { page, limit, offset } = req.query;
    const patients = await PatientService.getAllPatients(limit, offset);

    res.status(200).json({
      success: true,
      message: 'Pacientes obtenidos exitosamente',
      data: { 
        patients,
        pagination: { page, limit }
      }
    });
  });

  /**
   * Busca pacientes por término de búsqueda
   */
  static searchPatients = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const patients = await PatientService.searchPatients(q);

    res.status(200).json({
      success: true,
      message: 'Búsqueda de pacientes completada',
      data: { patients }
    });
  });

  /**
   * Obtiene pacientes de un tutor específico
   */
  static getTutorPatients = asyncHandler(async (req, res) => {
    const { tutorId } = req.params;
    const patients = await PatientService.getTutorPatients(tutorId);

    res.status(200).json({
      success: true,
      message: 'Pacientes del tutor obtenidos exitosamente',
      data: { patients }
    });
  });

  /**
   * Actualiza el peso de un paciente
   */
  static updatePatientWeight = asyncHandler(async (req, res) => {
    const { patientId } = req.params;
    const { weight } = req.body;

    const patient = await PatientService.updatePatientWeight(patientId, weight);

    res.status(200).json({
      success: true,
      message: 'Peso del paciente actualizado exitosamente',
      data: { patient }
    });
  });

  /**
   * Desactiva un paciente
   */
  static deactivatePatient = asyncHandler(async (req, res) => {
    const { patientId } = req.params;
    const patient = await PatientService.deactivatePatient(patientId);

    res.status(200).json({
      success: true,
      message: 'Paciente desactivado exitosamente',
      data: { patient }
    });
  });

  // ==================== HISTORIAL CLÍNICO ====================

  /**
   * Crea una nueva entrada en el historial clínico
   */
  static createClinicalHistory = asyncHandler(async (req, res) => {
    const history = await PatientService.createClinicalHistory(req.body);

    res.status(201).json({
      success: true,
      message: 'Historial clínico creado exitosamente',
      data: { history }
    });
  });

  /**
   * Obtiene el historial clínico completo de un paciente
   */
  static getPatientHistory = asyncHandler(async (req, res) => {
    const { patientId } = req.params;
    const { limit, offset } = req.query;

    const history = await PatientService.getPatientHistory(patientId, limit, offset);

    res.status(200).json({
      success: true,
      message: 'Historial clínico obtenido exitosamente',
      data: { history }
    });
  });

  /**
   * Obtiene historial clínico por tipo de consulta
   */
  static getHistoryByType = asyncHandler(async (req, res) => {
    const { patientId, consultationType } = req.params;
    const history = await PatientService.getHistoryByType(patientId, consultationType);

    res.status(200).json({
      success: true,
      message: 'Historial clínico por tipo obtenido exitosamente',
      data: { history }
    });
  });

  /**
   * Obtiene pacientes que necesitan seguimiento
   */
  static getPatientsNeedingFollowUp = asyncHandler(async (req, res) => {
    const followUps = await PatientService.getPatientsNeedingFollowUp();

    res.status(200).json({
      success: true,
      message: 'Pacientes con seguimiento pendiente obtenidos',
      data: { followUps }
    });
  });

  /**
   * Obtiene emergencias recientes
   */
  static getRecentEmergencies = asyncHandler(async (req, res) => {
    const emergencies = await PatientService.getRecentEmergencies();

    res.status(200).json({
      success: true,
      message: 'Emergencias recientes obtenidas',
      data: { emergencies }
    });
  });

  /**
   * Busca en el historial clínico
   */
  static searchClinicalHistory = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const history = await PatientService.searchClinicalHistory(q);

    res.status(200).json({
      success: true,
      message: 'Búsqueda en historial clínico completada',
      data: { history }
    });
  });

  // ==================== VACUNACIONES ====================

  /**
   * Crea una nueva vacunación
   */
  static createVaccination = asyncHandler(async (req, res) => {
    const vaccination = await PatientService.createVaccination(req.body);

    res.status(201).json({
      success: true,
      message: 'Vacunación creada exitosamente',
      data: { vaccination }
    });
  });

  /**
   * Obtiene las vacunaciones de un paciente
   */
  static getPatientVaccinations = asyncHandler(async (req, res) => {
    const { patientId } = req.params;
    const vaccinations = await PatientService.getPatientVaccinations(patientId);

    res.status(200).json({
      success: true,
      message: 'Vacunaciones del paciente obtenidas exitosamente',
      data: { vaccinations }
    });
  });

  /**
   * Obtiene vacunaciones próximas
   */
  static getUpcomingVaccinations = asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    const vaccinations = await PatientService.getUpcomingVaccinations(parseInt(days));

    res.status(200).json({
      success: true,
      message: 'Vacunaciones próximas obtenidas',
      data: { vaccinations }
    });
  });

  /**
   * Obtiene vacunaciones vencidas
   */
  static getOverdueVaccinations = asyncHandler(async (req, res) => {
    const vaccinations = await PatientService.getOverdueVaccinations();

    res.status(200).json({
      success: true,
      message: 'Vacunaciones vencidas obtenidas',
      data: { vaccinations }
    });
  });

  // ==================== DESPARASITACIONES ====================

  /**
   * Crea una nueva desparasitación
   */
  static createDeworming = asyncHandler(async (req, res) => {
    const deworming = await PatientService.createDeworming(req.body);

    res.status(201).json({
      success: true,
      message: 'Desparasitación creada exitosamente',
      data: { deworming }
    });
  });

  /**
   * Obtiene las desparasitaciones de un paciente
   */
  static getPatientDewormings = asyncHandler(async (req, res) => {
    const { patientId } = req.params;
    const dewormings = await PatientService.getPatientDewormings(patientId);

    res.status(200).json({
      success: true,
      message: 'Desparasitaciones del paciente obtenidas exitosamente',
      data: { dewormings }
    });
  });

  /**
   * Obtiene desparasitaciones próximas
   */
  static getUpcomingDewormings = asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    const dewormings = await PatientService.getUpcomingDewormings(parseInt(days));

    res.status(200).json({
      success: true,
      message: 'Desparasitaciones próximas obtenidas',
      data: { dewormings }
    });
  });

  // ==================== ALERGIAS ====================

  /**
   * Crea una nueva alergia
   */
  static createAllergy = asyncHandler(async (req, res) => {
    const allergy = await PatientService.createAllergy(req.body);

    res.status(201).json({
      success: true,
      message: 'Alergia creada exitosamente',
      data: { allergy }
    });
  });

  /**
   * Obtiene las alergias de un paciente
   */
  static getPatientAllergies = asyncHandler(async (req, res) => {
    const { patientId } = req.params;
    const allergies = await PatientService.getPatientAllergies(patientId);

    res.status(200).json({
      success: true,
      message: 'Alergias del paciente obtenidas exitosamente',
      data: { allergies }
    });
  });

  /**
   * Obtiene alergias severas
   */
  static getSevereAllergies = asyncHandler(async (req, res) => {
    const allergies = await PatientService.getSevereAllergies();

    res.status(200).json({
      success: true,
      message: 'Alergias severas obtenidas',
      data: { allergies }
    });
  });

  // ==================== ESTADÍSTICAS ====================

  /**
   * Obtiene estadísticas generales del servicio
   */
  static getServiceStats = asyncHandler(async (req, res) => {
    const stats = await PatientService.getServiceStats();

    res.status(200).json({
      success: true,
      message: 'Estadísticas del servicio obtenidas',
      data: { stats }
    });
  });

  /**
   * Obtiene estadísticas de pacientes
   */
  static getPatientStats = asyncHandler(async (req, res) => {
    const stats = await PatientService.getPatientStats();

    res.status(200).json({
      success: true,
      message: 'Estadísticas de pacientes obtenidas',
      data: { stats }
    });
  });

  /**
   * Obtiene estadísticas de historial clínico
   */
  static getClinicalHistoryStats = asyncHandler(async (req, res) => {
    const stats = await PatientService.getClinicalHistoryStats();

    res.status(200).json({
      success: true,
      message: 'Estadísticas de historial clínico obtenidas',
      data: { stats }
    });
  });

  /**
   * Obtiene estadísticas de vacunaciones
   */
  static getVaccinationStats = asyncHandler(async (req, res) => {
    const stats = await PatientService.getVaccinationStats();

    res.status(200).json({
      success: true,
      message: 'Estadísticas de vacunaciones obtenidas',
      data: { stats }
    });
  });

  // ==================== MÉTODOS DE ADMINISTRADOR ====================

  /**
   * Obtiene todos los tutores (solo administrador)
   */
  static getAllTutors = asyncHandler(async (req, res) => {
    const { page, limit, offset } = req.query;
    const tutors = await PatientService.getAllTutors(limit, offset);

    res.status(200).json({
      success: true,
      message: 'Tutores obtenidos exitosamente',
      data: { 
        tutors,
        pagination: { page, limit }
      }
    });
  });

  /**
   * Desactiva un tutor (solo administrador)
   */
  static deactivateTutor = asyncHandler(async (req, res) => {
    const { tutorId } = req.params;
    const tutor = await PatientService.deactivateTutor(tutorId);

    res.status(200).json({
      success: true,
      message: 'Tutor desactivado exitosamente',
      data: { tutor }
    });
  });

  /**
   * Obtiene historial clínico reciente
   */
  static getRecentHistory = asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    const history = await PatientService.getRecentHistory(parseInt(days));

    res.status(200).json({
      success: true,
      message: 'Historial clínico reciente obtenido',
      data: { history }
    });
  });

  /**
   * Obtiene pacientes recientes
   */
  static getRecentPatients = asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    const patients = await PatientService.getRecentPatients(parseInt(days));

    res.status(200).json({
      success: true,
      message: 'Pacientes recientes obtenidos',
      data: { patients }
    });
  });
}

module.exports = PatientController;
