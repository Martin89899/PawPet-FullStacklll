const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const HospitalizationRepository = require('../repositories/HospitalizationRepository');
const VitalSignsRepository = require('../repositories/VitalSignsRepository');
const MedicationAdministrationRepository = require('../repositories/MedicationAdministrationRepository');
const AlertRepository = require('../repositories/AlertRepository');
const { events } = require('../utils/rabbitmq');
const { NotFoundError, ConflictError, ValidationError } = require('../middleware/errorHandler');

/**
 * Servicio de Hospitalización para el Hospitalization Service
 * @class HospitalizationService
 * @description Gestiona la lógica de negocio del dominio de hospitalización
 */
class HospitalizationService {
  /**
   * Constructor del HospitalizationService
   * @param {Object} pool - Pool de conexiones a PostgreSQL
   */
  constructor(pool) {
    this.hospitalizationRepository = new HospitalizationRepository(pool);
    this.vitalSignsRepository = new VitalSignsRepository(pool);
    this.medicationAdministrationRepository = new MedicationAdministrationRepository(pool);
    this.alertRepository = new AlertRepository(pool);
  }

  /**
   * Crea una nueva hospitalización
   * @param {Object} hospitalizationData - Datos de la hospitalización
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} Hospitalización creada
   */
  async createHospitalization(hospitalizationData, options = {}) {
    try {
      const { createdBy } = options;

      // Verificar que el paciente no esté actualmente hospitalizado
      const activeHospitalization = await this.hospitalizationRepository.findActiveByPatientId(hospitalizationData.patientId);
      if (activeHospitalization) {
        throw new ConflictError('El paciente ya está hospitalizado actualmente');
      }

      // Preparar datos de la hospitalización
      const hospitalizationDataToCreate = {
        uuid: uuidv4(),
        patientId: hospitalizationData.patientId,
        admissionDate: hospitalizationData.admissionDate || new Date(),
        admissionReason: hospitalizationData.admissionReason,
        admissionDiagnosis: hospitalizationData.admissionDiagnosis,
        location: hospitalizationData.location,
        attendingVeterinarianId: hospitalizationData.attendingVeterinarianId,
        primaryTechnicianId: hospitalizationData.primaryTechnicianId,
        emergencyContact: hospitalizationData.emergencyContact,
        insuranceInfo: hospitalizationData.insuranceInfo,
        specialInstructions: hospitalizationData.specialInstructions,
        expectedStayDays: hospitalizationData.expectedStayDays,
        initialNotes: hospitalizationData.initialNotes,
        status: 'active',
        createdBy
      };

      // Crear la hospitalización
      const hospitalization = await this.hospitalizationRepository.create(hospitalizationDataToCreate);

      // Publicar evento de hospitalización creada
      await events.hospitalizationCreated({
        hospitalizationId: hospitalization.id,
        uuid: hospitalization.uuid,
        patientId: hospitalization.patientId,
        attendingVeterinarianId: hospitalization.attendingVeterinarianId,
        admissionDate: hospitalization.admissionDate,
        admissionReason: hospitalization.admissionReason,
        location: hospitalization.location
      });

      return {
        success: true,
        message: 'Hospitalización creada exitosamente',
        data: { hospitalization }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtiene hospitalizaciones con filtros avanzados
   * @param {Object} filters - Filtros de búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Hospitalizaciones encontradas
   */
  async getHospitalizations(filters = {}, pagination = {}) {
    try {
      const result = await this.hospitalizationRepository.getHospitalizationsWithFilters(filters, pagination);

      return {
        success: true,
        message: 'Hospitalizaciones obtenidas exitosamente',
        data: result
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtiene una hospitalización por su ID
   * @param {number} id - ID de la hospitalización
   * @returns {Promise<Object>} Hospitalización encontrada
   */
  async getHospitalizationById(id) {
    try {
      const hospitalization = await this.hospitalizationRepository.findById(id);
      
      if (!hospitalization) {
        throw new NotFoundError('Hospitalización no encontrada');
      }

      // Obtener signos vitales recientes
      const vitalSigns = await this.vitalSignsRepository.findByHospitalizationId(id, 10);
      
      // Obtener medicamentos administrados recientes
      const medications = await this.medicationAdministrationRepository.findByHospitalizationId(id, 10);

      // Obtener alertas activas
      const activeAlerts = await this.alertRepository.findActiveByHospitalizationId(id);

      return {
        success: true,
        message: 'Hospitalización obtenida exitosamente',
        data: {
          hospitalization,
          vitalSigns,
          medications,
          activeAlerts
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtiene hospitalizaciones activas
   * @returns {Promise<Object>} Hospitalizaciones activas
   */
  async getActiveHospitalizations() {
    try {
      const hospitalizations = await this.hospitalizationRepository.findActive();
      
      // Obtener detalles adicionales para cada hospitalización activa
      const detailedHospitalizations = await Promise.all(
        hospitalizations.map(async (hosp) => {
          const vitalSigns = await this.vitalSignsRepository.findByHospitalizationId(hosp.id, 1);
          const medications = await this.medicationAdministrationRepository.findByHospitalizationId(hosp.id, 5);
          const activeAlerts = await this.alertRepository.findActiveByHospitalizationId(hosp.id);
          
          return {
            ...hosp,
            latestVitalSigns: vitalSigns.length > 0 ? vitalSigns[0] : null,
            recentMedications: medications,
            activeAlertsCount: activeAlerts.length
          };
        })
      );

      return {
        success: true,
        message: 'Hospitalizaciones activas obtenidas exitosamente',
        data: { hospitalizations: detailedHospitalizations }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Registra signos vitales de un paciente hospitalizado
   * @param {number} hospitalizationId - ID de la hospitalización
   * @param {Object} vitalSignsData - Datos de los signos vitales
   * @param {number} recordedBy - ID del usuario que registra
   * @returns {Promise<Object>} Signos vitales registrados
   */
  async recordVitalSigns(hospitalizationId, vitalSignsData, recordedBy) {
    try {
      // Verificar que la hospitalización exista y esté activa
      const hospitalization = await this.hospitalizationRepository.findById(hospitalizationId);
      if (!hospitalization) {
        throw new NotFoundError('Hospitalización no encontrada');
      }
      
      if (hospitalization.status !== 'active') {
        throw new ConflictError('No se pueden registrar signos vitales para una hospitalización inactiva');
      }

      // Preparar datos de los signos vitales
      const vitalSignsDataToCreate = {
        hospitalizationId,
        temperature: vitalSignsData.temperature,
        heartRate: vitalSignsData.heartRate,
        respiratoryRate: vitalSignsData.respiratoryRate,
        bloodPressureSystolic: vitalSignsData.bloodPressure.systolic,
        bloodPressureDiastolic: vitalSignsData.bloodPressure.diastolic,
        oxygenSaturation: vitalSignsData.oxygenSaturation,
        weight: vitalSignsData.weight,
        glucose: vitalSignsData.glucose,
        painScore: vitalSignsData.painScore,
        consciousnessLevel: vitalSignsData.consciousnessLevel,
        gumColor: vitalSignsData.gumColor,
        capillaryRefillTime: vitalSignsData.capillaryRefillTime,
        notes: vitalSignsData.notes,
        recordedBy
      };

      // Registrar signos vitales
      const vitalSigns = await this.vitalSignsRepository.create(vitalSignsDataToCreate);

      // Verificar alertas críticas basadas en los signos vitales
      const alertLevel = this.calculateAlertLevel(vitalSignsData);
      
      if (alertLevel === 'critical') {
        // Crear alerta crítica automáticamente
        await this.createAlert(hospitalizationId, {
          alertType: 'critical',
          message: 'Signos vitales críticos detectados',
          severity: 'critical',
          details: vitalSignsData
        }, recordedBy);

        // Publicar evento de alerta crítica
        await events.criticalVitalSigns({
          hospitalizationId,
          patientId: hospitalization.patientId,
          attendingVeterinarianId: hospitalization.attendingVeterinarianId,
          vitalSigns: vitalSignsData,
          alertLevel,
          timestamp: new Date().toISOString()
        });
      }

      // Publicar evento de signos vitales registrados
      await events.vitalSignsRecorded({
        hospitalizationId,
        patientId: hospitalization.patientId,
        vitalSigns: vitalSignsData,
        alertLevel
      });

      return {
        success: true,
        message: 'Signos vitales registrados exitosamente',
        data: { vitalSigns }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtiene signos vitales de un paciente hospitalizado
   * @param {number} hospitalizationId - ID de la hospitalización
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<Object>} Signos vitales obtenidos
   */
  async getVitalSigns(hospitalizationId, filters = {}) {
    try {
      const vitalSigns = await this.vitalSignsRepository.findByHospitalizationIdWithFilters(
        hospitalizationId, 
        filters
      );

      return {
        success: true,
        message: 'Signos vitales obtenidos exitosamente',
        data: { vitalSigns }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtiene los signos vitales más recientes de un paciente hospitalizado
   * @param {number} hospitalizationId - ID de la hospitalización
   * @returns {Promise<Object>} Últimos signos vitales
   */
  async getLatestVitalSigns(hospitalizationId) {
    try {
      const vitalSigns = await this.vitalSignsRepository.findLatestByHospitalizationId(hospitalizationId);

      return {
        success: true,
        message: 'Últimos signos vitales obtenidos exitosamente',
        data: { vitalSigns }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Administra medicación a un paciente hospitalizado
   * @param {number} hospitalizationId - ID de la hospitalización
   * @param {Object} medicationData - Datos de la medicación
   * @param {number} administeredBy - ID del usuario que administra
   * @returns {Promise<Object>} Medicación administrada
   */
  async administerMedication(hospitalizationId, medicationData, administeredBy) {
    try {
      // Verificar que la hospitalización exista y esté activa
      const hospitalization = await this.hospitalizationRepository.findById(hospitalizationId);
      if (!hospitalization) {
        throw new NotFoundError('Hospitalización no encontrada');
      }
      
      if (hospitalization.status !== 'active') {
        throw new ConflictError('No se puede administrar medicación a una hospitalización inactiva');
      }

      // Preparar datos de administración de medicación
      const medicationDataToCreate = {
        hospitalizationId,
        medicationId: medicationData.medicationId,
        medicationName: medicationData.medicationName,
        dosage: medicationData.dosage,
        route: medicationData.route,
        batchNumber: medicationData.batchNumber,
        expirationDate: medicationData.expirationDate,
        administeredBy,
        administrationNotes: medicationData.administrationNotes,
        prescribedBy: medicationData.prescribedBy,
        prescriptionDate: medicationData.prescriptionDate,
        frequency: medicationData.frequency,
        nextDoseDue: medicationData.nextDoseDue,
        isControlledSubstance: medicationData.isControlledSubstance || false
      };

      // Si es sustancia controlada, agregar información de trazabilidad
      if (medicationData.isControlledSubstance && medicationData.controlledSubstanceLog) {
        medicationDataToCreate.witnessId = medicationData.controlledSubstanceLog.witnessId;
        medicationDataToCreate.witnessName = medicationData.controlledSubstanceLog.witnessName;
        medicationDataToCreate.wasteAmount = medicationData.controlledSubstanceLog.wasteAmount;
        medicationDataToCreate.wasteReason = medicationData.controlledSubstanceLog.wasteReason;
      }

      // Administrar medicamento
      const medication = await this.medicationAdministrationRepository.create(medicationDataToCreate);

      // Publicar eventos específicos según tipo de medicamento
      if (medicationData.isControlledSubstance) {
        // Evento de sustancia controlada administrada
        await events.controlledSubstanceAdministered({
          hospitalizationId,
          patientId: hospitalization.patientId,
          attendingVeterinarianId: hospitalization.attendingVeterinarianId,
          medication: {
            medicationId: medicationData.medicationId,
            medicationName: medicationData.medicationName,
            batchNumber: medicationData.batchNumber,
            dosage: medicationData.dosage,
            administeredBy,
            witnessId: medicationData.controlledSubstanceLog?.witnessId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Evento general de medicamento administrado
      await events.medicationAdministered({
        hospitalizationId,
        patientId: hospitalization.patientId,
        medication: medicationDataToCreate,
        isControlled: medicationData.isControlledSubstance
      });

      // Publicar evento para billing (cargo automático)
      await events.medicationChargeGenerated({
        hospitalizationId,
        patientId: hospitalization.patientId,
        chargeType: 'medication',
        description: `Medicación: ${medicationData.medicationName}`,
        amount: this.calculateMedicationCost(medicationData),
        metadata: {
          medicationId: medicationData.medicationId,
          administeredBy,
          batchNumber: medicationData.batchNumber,
          dosage: medicationData.dosage
        }
      });

      return {
        success: true,
        message: 'Medicación administrada exitosamente',
        data: { medication }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calcula el nivel de alerta basado en signos vitales
   * @param {Object} vitalSigns - Datos de signos vitales
   * @returns {string} Nivel de alerta (normal, warning, critical)
   */
  calculateAlertLevel(vitalSigns) {
    let criticalCount = 0;
    let warningCount = 0;

    // Temperatura
    if (vitalSigns.temperature < 36.0 || vitalSigns.temperature > 40.5) {
      criticalCount++;
    } else if (vitalSigns.temperature < 37.5 || vitalSigns.temperature > 39.5) {
      warningCount++;
    }

    // Frecuencia cardíaca
    if (vitalSigns.heartRate < 60 || vitalSigns.heartRate > 180) {
      criticalCount++;
    } else if (vitalSigns.heartRate < 80 || vitalSigns.heartRate > 140) {
      warningCount++;
    }

    // Saturación de oxígeno
    if (vitalSigns.oxygenSaturation < 90) {
      criticalCount++;
    } else if (vitalSigns.oxygenSaturation < 95) {
      warningCount++;
    }

    // Presión arterial
    const systolic = vitalSigns.bloodPressure?.systolic;
    const diastolic = vitalSigns.bloodPressure?.diastolic;
    
    if (systolic < 80 || systolic > 200 || diastolic < 40 || diastolic > 130) {
      criticalCount++;
    } else if (systolic < 90 || systolic > 160 || diastolic < 50 || diastolic > 100) {
      warningCount++;
    }

    // Nivel de conciencia
    if (vitalSigns.consciousnessLevel === 'coma' || vitalSigns.consciousnessLevel === 'stupor') {
      criticalCount++;
    } else if (vitalSigns.consciousnessLevel === 'drowsy') {
      warningCount++;
    }

    // Color de encías
    if (vitalSigns.gumColor === 'blue' || vitalSigns.gumColor === 'white') {
      criticalCount++;
    } else if (vitalSigns.gumColor === 'pale' || vitalSigns.gumColor === 'red') {
      warningCount++;
    }

    if (criticalCount > 0) {
      return 'critical';
    } else if (warningCount > 1) {
      return 'warning';
    }
    
    return 'normal';
  }

  /**
   * Calcula el costo de un medicamento (simplificado)
   * @param {Object} medicationData - Datos del medicamento
   * @returns {number} Costo del medicamento
   */
  calculateMedicationCost(medicationData) {
    // Lógica simplificada - en producción esto debería consultar con MS-InvFarm
    const baseCosts = {
      'ketamina': 15.50,
      'morfina': 25.00,
      'antibiotico': 8.75,
      'analgesico': 12.30,
      'sedativo': 18.90,
      'antiinflamatorio': 10.50,
      'default': 10.00
    };

    const medicationName = medicationData.medicationName.toLowerCase();
    const cost = Object.keys(baseCosts).find(key => medicationName.includes(key)) || 'default';
    
    return baseCosts[cost];
  }

  /**
   * Crea una alerta para un paciente hospitalizado
   * @param {number} hospitalizationId - ID de la hospitalización
   * @param {Object} alertData - Datos de la alerta
   * @param {number} createdBy - ID del usuario que crea la alerta
   * @returns {Promise<Object>} Alerta creada
   */
  async createAlert(hospitalizationId, alertData, createdBy) {
    try {
      // Verificar que la hospitalización exista
      const hospitalization = await this.hospitalizationRepository.findById(hospitalizationId);
      if (!hospitalization) {
        throw new NotFoundError('Hospitalización no encontrada');
      }

      // Preparar datos de la alerta
      const alertDataToCreate = {
        hospitalizationId,
        alertType: alertData.alertType,
        message: alertData.message,
        severity: alertData.severity || 'medium',
        details: alertData.details,
        status: 'active',
        createdBy
      };

      // Crear alerta
      const alert = await this.alertRepository.create(alertDataToCreate);

      // Publicar evento de alerta creada
      await events.alertCreated({
        hospitalizationId,
        patientId: hospitalization.patientId,
        attendingVeterinarianId: hospitalization.attendingVeterinarianId,
        alert: alertDataToCreate
      });

      return {
        success: true,
        message: 'Alerta creada exitosamente',
        data: { alert }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtiene alertas de un paciente hospitalizado
   * @param {number} hospitalizationId - ID de la hospitalización
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<Object>} Alertas obtenidas
   */
  async getAlerts(hospitalizationId, filters = {}) {
    try {
      const alerts = await this.alertRepository.findByHospitalizationIdWithFilters(hospitalizationId, filters);

      return {
        success: true,
        message: 'Alertas obtenidas exitosamente',
        data: { alerts }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Resuelve una alerta
   * @param {number} hospitalizationId - ID de la hospitalización
   * @param {number} alertId - ID de la alerta
   * @param {Object} resolutionData - Datos de resolución
   * @param {number} resolvedBy - ID del usuario que resuelve
   * @returns {Promise<Object>} Alerta resuelta
   */
  async resolveAlert(hospitalizationId, alertId, resolutionData, resolvedBy) {
    try {
      // Verificar que la alerta exista y pertenezca a la hospitalización
      const alert = await this.alertRepository.findById(alertId);
      if (!alert || alert.hospitalizationId !== hospitalizationId) {
        throw new NotFoundError('Alerta no encontrada');
      }

      // Actualizar alerta como resuelta
      const updatedAlert = await this.alertRepository.updateStatus(alertId, 'resolved', resolutionData.resolutionNotes, resolvedBy);

      // Publicar evento de alerta resuelta
      await events.alertResolved({
        hospitalizationId,
        alertId,
        resolutionData,
        resolvedBy
      });

      return {
        success: true,
        message: 'Alerta resuelta exitosamente',
        data: { alert: updatedAlert }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Da de alta a un paciente hospitalizado
   * @param {number} hospitalizationId - ID de la hospitalización
   * @param {Object} dischargeData - Datos del alta
   * @param {number} dischargedBy - ID del usuario que da el alta
   * @returns {Promise<Object>} Paciente dado de alta
   */
  async dischargePatient(hospitalizationId, dischargeData, dischargedBy) {
    try {
      const hospitalization = await this.hospitalizationRepository.findById(hospitalizationId);
      if (!hospitalization) {
        throw new NotFoundError('Hospitalización no encontrada');
      }
      
      if (hospitalization.status !== 'active') {
        throw new ConflictError('La hospitalización ya no está activa');
      }

      // Actualizar hospitalización como dada de alta
      const updatedHospitalization = await this.hospitalizationRepository.updateStatus(
        hospitalizationId, 
        'discharged',
        {
          dischargeDate: new Date(),
          dischargeReason: dischargeData.dischargeReason,
          dischargeNotes: dischargeData.dischargeNotes,
          followUpInstructions: dischargeData.followUpInstructions,
          dischargedBy
        }
      );

      // Publicar evento de alta
      await events.patientDischarged({
        hospitalizationId,
        patientId: hospitalization.patientId,
        attendingVeterinarianId: hospitalization.attendingVeterinarianId,
        admissionDate: hospitalization.admissionDate,
        dischargeDate: new Date(),
        dischargeData,
        dischargedBy
      });

      return {
        success: true,
        message: 'Paciente dado de alta exitosamente',
        data: { hospitalization: updatedHospitalization }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtiene la hoja de monitoreo de un paciente hospitalizado
   * @param {number} hospitalizationId - ID de la hospitalización
   * @returns {Promise<Object>} Hoja de monitoreo
   */
  async getMonitoringSheet(hospitalizationId) {
    try {
      const hospitalization = await this.hospitalizationRepository.findById(hospitalizationId);
      if (!hospitalization) {
        throw new NotFoundError('Hospitalización no encontrada');
      }

      // Obtener signos vitales de las últimas 24 horas
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const vitalSigns = await this.vitalSignsRepository.findByHospitalizationIdWithFilters(
        hospitalizationId,
        { startDate: twentyFourHoursAgo }
      );

      // Obtener medicamentos de las últimas 24 horas
      const medications = await this.medicationAdministrationRepository.findByHospitalizationIdWithFilters(
        hospitalizationId,
        { startDate: twentyFourHoursAgo }
      );

      // Obtener alertas activas
      const activeAlerts = await this.alertRepository.findActiveByHospitalizationId(hospitalizationId);

      return {
        success: true,
        message: 'Hoja de monitoreo obtenida exitosamente',
        data: {
          hospitalization,
          vitalSigns,
          medications,
          activeAlerts,
          monitoringPeriod: {
            startDate: twentyFourHoursAgo,
            endDate: new Date()
          }
        }
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = HospitalizationService;
      // Verificar que la hospitalización exista y esté activa
      const hospitalization = await HospitalizationRepository.findById(hospitalizationId);
      if (!hospitalization) {
        throw new Error('Hospitalization not found');
      }
      
      if (!hospitalization.isActive()) {
        throw new Error('Cannot record vital signs for inactive hospitalization');
      }

      // Agregar información de quién registra
      vitalSignsData.hospitalizationId = hospitalizationId;
      vitalSignsData.recordedBy = recordedBy;

      // Registrar signos vitales
      const vitalSigns = await VitalSignsRepository.create(vitalSignsData);

      // Verificar alertas críticas
      const alertLevel = vitalSigns.getAlertLevel();
      
      if (alertLevel === 'critical') {
        // Publicar evento de alerta crítica
        await publishEvent('hospitalization.critical_alert', {
          hospitalizationId,
          patientId: hospitalization.patientId,
          veterinarianId: hospitalization.veterinarianId,
          vitalSigns: vitalSigns.toJSON(),
          alertLevel,
          timestamp: new Date().toISOString()
        });
      }

      // Publicar evento de signos vitales registrados
      await publishEvent('hospitalization.vital_signs_recorded', {
        hospitalizationId,
        patientId: hospitalization.patientId,
        vitalSigns: vitalSigns.toJSON(),
        alertLevel
      });

      return vitalSigns;
    } catch (error) {
      throw new Error(`Error recording vital signs: ${error.message}`);
    }
  }

  /**
   * Administrar medicamento
   */
  async administerMedication(hospitalizationId, medicationData, administeredBy) {
    try {
      // Verificar que la hospitalización exista y esté activa
      const hospitalization = await HospitalizationRepository.findById(hospitalizationId);
      if (!hospitalization) {
        throw new Error('Hospitalization not found');
      }
      
      if (!hospitalization.isActive()) {
        throw new Error('Cannot administer medication to inactive hospitalization');
      }

      // Agregar información de quién administra
      medicationData.hospitalizationId = hospitalizationId;
      medicationData.administeredBy = administeredBy;

      // Administrar medicamento
      const medication = await MedicationAdministrationRepository.create(medicationData);

      // Verificar si es sustancia controlada
      if (medication.isControlledSubstance()) {
        // Publicar evento de sustancia controlada administrada
        await publishEvent('hospitalization.controlled_substance_administered', {
          hospitalizationId,
          patientId: hospitalization.patientId,
          veterinarianId: hospitalization.veterinarianId,
          medication: medication.getTraceabilityInfo(),
          timestamp: new Date().toISOString()
        });
      }

      // Publicar evento de medicamento administrado
      await publishEvent('hospitalization.medication_administered', {
        hospitalizationId,
        patientId: hospitalization.patientId,
        medication: medication.toJSON(),
        isControlled: medication.isControlledSubstance()
      });

      // Publicar evento para billing (cargo automático)
      await publishEvent('billing.charge_generated', {
        hospitalizationId,
        patientId: hospitalization.patientId,
        clientId: hospitalization.patientId, // Asumimos que patientId es clientId
        chargeType: 'medication',
        description: `Medication: ${medication.medicationName}`,
        amount: this.calculateMedicationCost(medication),
        metadata: {
          medicationId: medication.id,
          administeredBy: administeredBy,
          batchNumber: medication.batchNumber
        }
      });

      return medication;
    } catch (error) {
      throw new Error(`Error administering medication: ${error.message}`);
    }
  }

  /**
   * Dar de alta hospitalización
   */
  async dischargeHospitalization(id, dischargeData) {
    try {
      const hospitalization = await HospitalizationRepository.findById(id);
      if (!hospitalization) {
        throw new Error('Hospitalization not found');
      }
      
      if (!hospitalization.isActive()) {
        throw new Error('Hospitalization is already inactive');
      }

      // Dar de alta
      const dischargedHospitalization = await HospitalizationRepository.discharge(
        id, 
        dischargeData.dischargeNotes
      );

      // Calcular estadísticas de la hospitalización
      const stayDays = dischargedHospitalization.calculateDays();
      
      // Publicar evento de alta
      await publishEvent('hospitalization.discharged', {
        hospitalizationId: id,
        patientId: hospitalization.patientId,
        veterinarianId: hospitalization.veterinarianId,
        admissionDate: hospitalization.admissionDate,
        dischargeDate: dischargedHospitalization.dischargeDate,
        stayDays,
        dischargeNotes: dischargeData.dischargeNotes
      });

      return dischargedHospitalization;
    } catch (error) {
      throw new Error(`Error discharging hospitalization: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de hospitalización
   */
  async getHospitalizationStatistics(options = {}) {
    try {
      const stats = await HospitalizationRepository.getStatistics(options);
      const occupancy = await HospitalizationRepository.getOccupancyByRoom();
      
      return {
        ...stats,
        occupancyByRoom: occupancy,
        totalRooms: occupancy.length,
        occupiedRooms: occupancy.filter(room => room.current_occupancy > 0).length,
        availableSpaces: occupancy.reduce((sum, room) => sum + room.available_spaces, 0)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener pacientes que necesitan monitoreo
   */
  async getPatientsNeedingMonitoring() {
    try {
      const activeHospitalizations = await HospitalizationRepository.findActive();
      const patientsNeedingMonitoring = [];

      for (const hosp of activeHospitalizations) {
        // Obtener signos vitales más recientes
        const latestVitalSigns = await VitalSignsRepository.findByHospitalizationId(hosp.id, 1);
        
        // Verificar si necesita monitoreo basado en tiempo o alertas
        const needsMonitoring = this.shouldMonitorPatient(hosp, latestVitalSigns[0]);
        
        if (needsMonitoring) {
          patientsNeedingMonitoring.push({
            hospitalization: hosp.toJSON(),
            latestVitalSigns: latestVitalSigns.length > 0 ? latestVitalSigns[0].toJSON() : null,
            monitoringReason: needsMonitoring.reason,
            urgency: needsMonitoring.urgency
          });
        }
      }

      return patientsNeedingMonitoring.sort((a, b) => {
        const urgencyOrder = { 'critical': 3, 'high': 2, 'normal': 1 };
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Determinar si un paciente necesita monitoreo
   */
  shouldMonitorPatient(hospitalization, latestVitalSigns) {
    const now = new Date();
    const monitoringInterval = parseInt(process.env.DEFAULT_MONITORING_INTERVAL_MINUTES) || 30;
    
    // Si no hay signos vitales recientes, necesita monitoreo
    if (!latestVitalSigns) {
      return { reason: 'No vital signs recorded', urgency: 'high' };
    }

    const timeSinceLastVitals = (now - new Date(latestVitalSigns.recordedAt)) / (1000 * 60);
    
    // Verificar si ha pasado el intervalo de monitoreo
    if (timeSinceLastVitals > monitoringInterval) {
      return { reason: 'Monitoring interval exceeded', urgency: 'normal' };
    }

    // Verificar alertas en signos vitales
    if (latestVitalSigns.getAlertLevel() === 'critical') {
      return { reason: 'Critical vital signs', urgency: 'critical' };
    }

    return null;
  }

  /**
   * Calcular costo de medicamento (simplificado)
   */
  calculateMedicationCost(medication) {
    // Lógica simplificada - en producción esto debería consultar con MS-InvFarm
    const baseCosts = {
      'ketamina': 15.50,
      'morfina': 25.00,
      'antibiotico': 8.75,
      'analgesico': 12.30,
      'default': 10.00
    };

    const medicationName = medication.medicationName.toLowerCase();
    const cost = Object.keys(baseCosts).find(key => medicationName.includes(key)) || 'default';
    
    return baseCosts[cost];
  }

  /**
   * Configurar manejadores de eventos
   */
  static async setupEventHandlers() {
    try {
      // Escuchar eventos de appointments-service
      await subscribeToEvent('appointments.*', async (event) => {
        console.log('Received appointment event:', event.eventType);
        
        switch (event.eventType) {
          case 'appointments.emergency_admission':
            await this.handleEmergencyAdmission(event.data);
            break;
          case 'appointments.surgery_scheduled':
            await this.handleSurgeryScheduled(event.data);
            break;
          default:
            console.log(`Unhandled appointment event: ${event.eventType}`);
        }
      });

      // Escuchar eventos de patients-service
      await subscribeToEvent('patients.*', async (event) => {
        console.log('Received patient event:', event.eventType);
        
        switch (event.eventType) {
          case 'patient.emergency':
            await this.handlePatientEmergency(event.data);
            break;
          default:
            console.log(`Unhandled patient event: ${event.eventType}`);
        }
      });

      console.log('Hospitalization event handlers configured');
    } catch (error) {
      console.error('Error setting up hospitalization event handlers:', error);
      throw error;
    }
  }

  /**
   * Manejar admisión de emergencia
   */
  static async handleEmergencyAdmission(data) {
    try {
      console.log('Handling emergency admission:', data);
      
      // Lógica para crear hospitalización de emergencia
      await publishEvent('hospitalization.emergency_processed', {
        appointmentId: data.appointmentId,
        patientId: data.patientId,
        status: 'processed'
      });
    } catch (error) {
      console.error('Error handling emergency admission:', error);
    }
  }

  /**
   * Manejar cirugía programada
   */
  static async handleSurgeryScheduled(data) {
    try {
      console.log('Handling surgery scheduled:', data);
      
      // Lógica para preparar hospitalización para cirugía
      await publishEvent('hospitalization.surgery_prepared', {
        appointmentId: data.appointmentId,
        patientId: data.patientId,
        surgeryType: data.surgeryType,
        status: 'prepared'
      });
    } catch (error) {
      console.error('Error handling surgery scheduled:', error);
    }
  }

  /**
   * Manejar emergencia de paciente
   */
  static async handlePatientEmergency(data) {
    try {
      console.log('Handling patient emergency:', data);
      
      // Lógica para manejar emergencia de paciente
      await publishEvent('hospitalization.emergency_handled', {
        patientId: data.patientId,
        emergencyType: data.emergencyType,
        status: 'handled'
      });
    } catch (error) {
      console.error('Error handling patient emergency:', error);
    }
  }
}

module.exports = new HospitalizationService();
