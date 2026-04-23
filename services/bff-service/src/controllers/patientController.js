const PatientService = require('../services/patientService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Controladores de pacientes para el BFF
 * @class PatientController
 * @description Maneja las solicitudes HTTP de pacientes con agregación de datos
 */
class PatientController {
  /**
   * Obtiene pacientes del usuario autenticado
   */
  static getMyPatients = asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    const { page, limit, search } = req.query;

    const result = await PatientService.getMyPatients(token, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search
    });

    res.status(200).json(result);
  });

  /**
   * Obtiene detalles completos de un paciente
   */
  static getPatientDetails = asyncHandler(async (req, res) => {
    const { patientId } = req.params;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    const result = await PatientService.getPatientDetails(token, parseInt(patientId));

    res.status(200).json(result);
  });

  /**
   * Busca pacientes con filtros avanzados
   */
  static searchPatients = asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    const { name, species, breed, microchip, tutorName, page, limit } = req.query;

    const result = await PatientService.searchPatients(token, {
      name,
      species,
      breed,
      microchip,
      tutorName,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined
    });

    res.status(200).json(result);
  });

  /**
   * Obtiene estadísticas de pacientes para el dashboard
   */
  static getStats = asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    const result = await PatientService.getStats(token);

    res.status(200).json(result);
  });
}

module.exports = PatientController;
