const express = require('express');
const HospitalizationController = require('../controllers/hospitalizationController');
const { validateHospitalization, validateVitalSigns, validateMedication } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Hospitalization
 *     description: Operaciones de hospitalización y monitoreo
 */

// Rutas principales de hospitalización
router.post('/', validateHospitalization, HospitalizationController.createHospitalization);
router.get('/', HospitalizationController.getHospitalizations);
router.get('/active', HospitalizationController.getActiveHospitalizations);
router.get('/:id', HospitalizationController.getHospitalizationById);

// Rutas de gestión de hospitalización
router.put('/:id', HospitalizationController.updateHospitalization);
router.post('/:id/discharge', HospitalizationController.dischargePatient);
router.post('/:id/transfer', HospitalizationController.transferPatient);

// Rutas de monitoreo de signos vitales
router.post('/:id/vital-signs', validateVitalSigns, HospitalizationController.recordVitalSigns);
router.get('/:id/vital-signs', HospitalizationController.getVitalSigns);
router.get('/:id/vital-signs/latest', HospitalizationController.getLatestVitalSigns);

// Rutas de administración de medicamentos
router.post('/:id/medications', validateMedication, HospitalizationController.administerMedication);
router.get('/:id/medications', HospitalizationController.getMedicationRecords);
router.get('/:id/medications/pending', HospitalizationController.getPendingMedications);

// Rutas de monitoreo y alertas
router.get('/:id/monitoring-sheet', HospitalizationController.getMonitoringSheet);
router.post('/:id/alerts', HospitalizationController.createAlert);
router.get('/:id/alerts', HospitalizationController.getAlerts);
router.put('/:id/alerts/:alertId/resolve', HospitalizationController.resolveAlert);

// Rutas de reportes
router.get('/:id/summary', HospitalizationController.getHospitalizationSummary);
router.get('/stats/overview', HospitalizationController.getHospitalizationStats);

module.exports = router;
