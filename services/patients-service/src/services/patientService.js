const TutorRepository = require('../repositories/TutorRepository');
const PatientRepository = require('../repositories/PatientRepository');
const ClinicalHistoryRepository = require('../repositories/ClinicalHistoryRepository');
const VaccinationRepository = require('../repositories/VaccinationRepository');
const DewormingRepository = require('../repositories/DewormingRepository');
const AllergyRepository = require('../repositories/AllergyRepository');
const { pool } = require('../config/database');
const { publishEvent } = require('../utils/rabbitmq');

// Instanciar repositories
const tutorRepository = new TutorRepository(pool);
const patientRepository = new PatientRepository(pool);
const clinicalHistoryRepository = new ClinicalHistoryRepository(pool);
const vaccinationRepository = new VaccinationRepository(pool);
const dewormingRepository = new DewormingRepository(pool);
const allergyRepository = new AllergyRepository(pool);

/**
 * Servicio de gestión clínica de pacientes para PawPet
 * @class PatientService
 * @description Proporciona funcionalidades completas para la gestión de pacientes, historial clínico, vacunaciones y alergias
 */
class PatientService {
  /**
   * Registra un nuevo tutor en el sistema
   * @param {Object} tutorData - Datos del tutor
   * @param {string} tutorData.firstName - Nombre del tutor
   * @param {string} tutorData.lastName - Apellido del tutor
   * @param {string} [tutorData.email] - Correo electrónico
   * @param {string} [tutorData.phone] - Teléfono
   * @param {string} [tutorData.address] - Dirección
   * @param {string} [tutorData.city] - Ciudad
   * @param {string} [tutorData.country] - País
   * @param {string} [tutorData.postalCode] - Código postal
   * @param {string} [tutorData.identificationNumber] - Número de identificación
   * @returns {Promise<Object>} Datos del tutor creado
   * @throws {Error} Si el email o número de identificación ya existe
   * @example
   * const tutor = await PatientService.createTutor({
   *   firstName: 'Juan',
   *   lastName: 'Pérez',
   *   email: 'juan@example.com',
   *   phone: '+1234567890'
   * });
   */
  static async createTutor(tutorData) {
    // Validar que el email no exista si se proporciona
    if (tutorData.email) {
      const existingTutor = await tutorRepository.findByEmail(tutorData.email);
      if (existingTutor) {
        throw new Error('Email already exists');
      }
    }

    // Validar que el número de identificación no exista si se proporciona
    if (tutorData.identificationNumber) {
      const existingTutor = await tutorRepository.findByIdentificationNumber(tutorData.identificationNumber);
      if (existingTutor) {
        throw new Error('Identification number already exists');
      }
    }

    // Crear tutor
    const tutor = await tutorRepository.create(tutorData);

    // Publicar evento de tutor creado
    await publishEvent('tutor.created', {
      tutorId: tutor.id,
      firstName: tutor.first_name,
      lastName: tutor.last_name,
      email: tutor.email,
      phone: tutor.phone,
      createdAt: tutor.created_at
    });

    return {
      id: tutor.id,
      firstName: tutor.first_name,
      lastName: tutor.last_name,
      email: tutor.email,
      phone: tutor.phone,
      address: tutor.address,
      city: tutor.city,
      country: tutor.country,
      postalCode: tutor.postal_code,
      identificationNumber: tutor.identification_number,
      isActive: tutor.is_active,
      createdAt: tutor.created_at
    };
  }

  /**
   * Registra un nuevo paciente (mascota)
   * @param {Object} patientData - Datos del paciente
   * @param {number} patientData.tutorId - ID del tutor
   * @param {number} [patientData.speciesId] - ID de la especie
   * @param {number} [patientData.breedId] - ID de la raza
   * @param {string} patientData.name - Nombre del paciente
   * @param {string} [patientData.nickname] - Apodo
   * @param {Date} [patientData.birthDate] - Fecha de nacimiento
   * @param {string} [patientData.gender] - Género (male, female, unknown)
   * @param {string} [patientData.color] - Color
   * @param {number} [patientData.weight] - Peso en kg
   * @param {string} [patientData.microchipNumber] - Número de microchip
   * @param {string} [patientData.tattooNumber] - Número de tatuaje
   * @param {string} [patientData.specialMarks] - Marcas especiales
   * @param {string} [patientData.allergies] - Alergias
   * @param {string} [patientData.chronicDiseases] - Enfermedades crónicas
   * @param {string} [patientData.currentMedications] - Medicamentos actuales
   * @param {string} [patientData.dietaryRestrictions] - Restricciones dietéticas
   * @param {string} [patientData.behaviorNotes] - Notas de comportamiento
   * @returns {Promise<Object>} Datos del paciente creado
   * @throws {Error} Si el tutor no existe o el microchip ya está registrado
   * @example
   * const patient = await PatientService.createPatient({
   *   tutorId: 1,
   *   name: 'Firulais',
   *   speciesId: 1,
   *   breedId: 2,
   *   gender: 'male',
   *   weight: 15.5
   * });
   */
  static async createPatient(patientData) {
    // Validar que el tutor exista y esté activo
    const tutor = await tutorRepository.findById(patientData.tutorId);
    if (!tutor || !tutor.is_active) {
      throw new Error('Tutor not found or inactive');
    }

    // Validar que el microchip no exista si se proporciona
    if (patientData.microchipNumber) {
      const existingPatient = await patientRepository.findByMicrochipNumber(patientData.microchipNumber);
      if (existingPatient) {
        throw new Error('Microchip number already exists');
      }
    }

    // Crear paciente
    const patient = await patientRepository.create(patientData);

    // Publicar evento de paciente creado
    await publishEvent('patient.created', {
      patientId: patient.id,
      tutorId: patient.tutor_id,
      name: patient.name,
      speciesId: patient.species_id,
      breedId: patient.breed_id,
      gender: patient.gender,
      microchipNumber: patient.microchip_number,
      createdAt: patient.created_at
    });

    return {
      id: patient.id,
      tutorId: patient.tutor_id,
      speciesId: patient.species_id,
      breedId: patient.breed_id,
      name: patient.name,
      nickname: patient.nickname,
      birthDate: patient.birth_date,
      gender: patient.gender,
      color: patient.color,
      weight: patient.weight,
      microchipNumber: patient.microchip_number,
      tattooNumber: patient.tattoo_number,
      specialMarks: patient.special_marks,
      allergies: patient.allergies,
      chronicDiseases: patient.chronic_diseases,
      currentMedications: patient.current_medications,
      dietaryRestrictions: patient.dietary_restrictions,
      behaviorNotes: patient.behavior_notes,
      isActive: patient.is_active,
      createdAt: patient.created_at
    };
  }

  /**
   * Crea una nueva entrada en el historial clínico (inmutable)
   * @param {Object} historyData - Datos del historial clínico
   * @param {number} historyData.patientId - ID del paciente
   * @param {number} historyData.veterinarianId - ID del veterinario
   * @param {string} historyData.consultationType - Tipo de consulta
   * @param {string} [historyData.chiefComplaint] - Motivo de consulta
   * @param {string} [historyData.history] - Historia clínica
   * @param {string} [historyData.physicalExamination] - Examen físico
   * @param {string} [historyData.diagnosis] - Diagnóstico
   * @param {string} [historyData.treatment] - Tratamiento
   * @param {string} [historyData.medications] - Medicamentos
   * @param {string} [historyData.recommendations] - Recomendaciones
   * @param {boolean} [historyData.followUpRequired] - Requiere seguimiento
   * @param {number} [historyData.followUpDays] - Días para seguimiento
   * @param {number} [historyData.temperature] - Temperatura corporal
   * @param {number} [historyData.heartRate] - Frecuencia cardíaca
   * @param {number} [historyData.respiratoryRate] - Frecuencia respiratoria
   * @param {number} [historyData.weight] - Peso
   * @param {number} [historyData.bloodPressureSystolic] - Presión arterial sistólica
   * @param {number} [historyData.bloodPressureDiastolic] - Presión arterial diastólica
   * @param {number} [historyData.oxygenSaturation] - Saturación de oxígeno
   * @param {Object} [historyData.files] - Archivos adjuntos
   * @param {boolean} [historyData.isEmergency] - Es emergencia
   * @returns {Promise<Object>} Datos del historial clínico creado
   * @throws {Error} Si el paciente no existe
   * @example
   * const history = await PatientService.createClinicalHistory({
   *   patientId: 1,
   *   veterinarianId: 2,
   *   consultationType: 'checkup',
   *   chiefComplaint: 'Revisión general',
   *   diagnosis: 'Paciente saludable',
   *   temperature: 38.5,
   *   weight: 16.2
   * });
   */
  static async createClinicalHistory(historyData) {
    // Validar que el paciente exista y esté activo
    const patient = await patientRepository.findById(historyData.patientId);
    if (!patient || !patient.is_active) {
      throw new Error('Patient not found or inactive');
    }

    // Crear historial clínico
    const history = await clinicalHistoryRepository.create(historyData);

    // Publicar evento de historial clínico creado
    await publishEvent('clinical_history.created', {
      historyId: history.id,
      patientId: history.patient_id,
      veterinarianId: history.veterinarian_id,
      consultationType: history.consultation_type,
      diagnosis: history.diagnosis,
      isEmergency: history.is_emergency,
      createdAt: history.created_at
    });

    // Si requiere seguimiento, publicar evento de seguimiento pendiente
    if (history.follow_up_required && history.follow_up_days) {
      await publishEvent('follow_up.required', {
        historyId: history.id,
        patientId: history.patient_id,
        followUpDate: new Date(Date.now() + history.follow_up_days * 24 * 60 * 60 * 1000),
        createdAt: history.created_at
      });
    }

    return {
      id: history.id,
      patientId: history.patient_id,
      veterinarianId: history.veterinarian_id,
      consultationType: history.consultation_type,
      chiefComplaint: history.chief_complaint,
      history: history.history,
      physicalExamination: history.physical_examination,
      diagnosis: history.diagnosis,
      treatment: history.treatment,
      medications: history.medications,
      recommendations: history.recommendations,
      followUpRequired: history.follow_up_required,
      followUpDays: history.follow_up_days,
      temperature: history.temperature,
      heartRate: history.heart_rate,
      respiratoryRate: history.respiratory_rate,
      weight: history.weight,
      bloodPressureSystolic: history.blood_pressure_systolic,
      bloodPressureDiastolic: history.blood_pressure_diastolic,
      oxygenSaturation: history.oxygen_saturation,
      files: history.files,
      isEmergency: history.is_emergency,
      createdAt: history.created_at
    };
  }

  /**
   * Registra una nueva vacunación
   * @param {Object} vaccinationData - Datos de la vacunación
   * @param {number} vaccinationData.patientId - ID del paciente
   * @param {number} vaccinationData.veterinarianId - ID del veterinario
   * @param {string} vaccinationData.vaccineName - Nombre de la vacuna
   * @param {string} [vaccinationData.vaccineType] - Tipo de vacuna
   * @param {string} [vaccinationData.manufacturer] - Fabricante
   * @param {string} [vaccinationData.lotNumber] - Número de lote
   * @param {Date} [vaccinationData.expirationDate] - Fecha de vencimiento
   * @param {Date} vaccinationData.applicationDate - Fecha de aplicación
   * @param {Date} [vaccinationData.nextApplicationDate] - Próxima aplicación
   * @param {number} [vaccinationData.doseNumber] - Número de dosis
   * @param {number} [vaccinationData.totalDoses] - Total de dosis
   * @param {string} [vaccinationData.applicationSite] - Sitio de aplicación
   * @param {string} [vaccinationData.adverseReactions] - Reacciones adversas
   * @returns {Promise<Object>} Datos de la vacunación creada
   * @throws {Error} Si el paciente no existe
   * @example
   * const vaccination = await PatientService.createVaccination({
   *   patientId: 1,
   *   veterinarianId: 2,
   *   vaccineName: 'Rabia',
   *   vaccineType: 'Antirrábica',
   *   applicationDate: new Date(),
   *   nextApplicationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
   * });
   */
  static async createVaccination(vaccinationData) {
    // Validar que el paciente exista y esté activo
    const patient = await patientRepository.findById(vaccinationData.patientId);
    if (!patient || !patient.is_active) {
      throw new Error('Patient not found or inactive');
    }

    // Crear vacunación
    const vaccination = await vaccinationRepository.create(vaccinationData);

    // Publicar evento de vacunación creada
    await publishEvent('vaccination.created', {
      vaccinationId: vaccination.id,
      patientId: vaccination.patient_id,
      veterinarianId: vaccination.veterinarian_id,
      vaccineName: vaccination.vaccine_name,
      vaccineType: vaccination.vaccine_type,
      applicationDate: vaccination.application_date,
      nextApplicationDate: vaccination.next_application_date,
      createdAt: vaccination.created_at
    });

    // Si hay próxima aplicación, publicar evento de recordatorio
    if (vaccination.next_application_date) {
      await publishEvent('vaccination.reminder', {
        vaccinationId: vaccination.id,
        patientId: vaccination.patient_id,
        nextApplicationDate: vaccination.next_application_date,
        vaccineName: vaccination.vaccine_name,
        createdAt: vaccination.created_at
      });
    }

    return {
      id: vaccination.id,
      patientId: vaccination.patient_id,
      veterinarianId: vaccination.veterinarian_id,
      vaccineName: vaccination.vaccine_name,
      vaccineType: vaccination.vaccine_type,
      manufacturer: vaccination.manufacturer,
      lotNumber: vaccination.lot_number,
      expirationDate: vaccination.expiration_date,
      applicationDate: vaccination.application_date,
      nextApplicationDate: vaccination.next_application_date,
      doseNumber: vaccination.dose_number,
      totalDoses: vaccination.total_doses,
      applicationSite: vaccination.application_site,
      adverseReactions: vaccination.adverse_reactions,
      createdAt: vaccination.created_at
    };
  }

  /**
   * Registra una nueva desparasitación
   * @param {Object} dewormingData - Datos de la desparasitación
   * @param {number} dewormingData.patientId - ID del paciente
   * @param {number} dewormingData.veterinarianId - ID del veterinario
   * @param {string} dewormingData.productName - Nombre del producto
   * @param {string} [dewormingData.activeIngredient] - Principio activo
   * @param {string} [dewormingData.manufacturer] - Fabricante
   * @param {string} [dewormingData.lotNumber] - Número de lote
   * @param {Date} [dewormingData.expirationDate] - Fecha de vencimiento
   * @param {Date} dewormingData.applicationDate - Fecha de aplicación
   * @param {Date} [dewormingData.nextApplicationDate] - Próxima aplicación
   * @param {number} [dewormingData.dosage] - Dosis
   * @param {string} [dewormingData.dosageUnit] - Unidad de dosis
   * @param {string} [dewormingData.administrationRoute] - Vía de administración
   * @param {string} [dewormingData.targetParasites] - Parásitos objetivo
   * @param {string} [dewormingData.adverseReactions] - Reacciones adversas
   * @returns {Promise<Object>} Datos de la desparasitación creada
   * @throws {Error} Si el paciente no existe
   * @example
   * const deworming = await PatientService.createDeworming({
   *   patientId: 1,
   *   veterinarianId: 2,
   *   productName: 'Ivermectina',
   *   activeIngredient: 'Ivermectina',
   *   dosage: 0.1,
   *   dosageUnit: 'mg/kg',
   *   applicationDate: new Date()
   * });
   */
  static async createDeworming(dewormingData) {
    // Validar que el paciente exista y esté activo
    const patient = await patientRepository.findById(dewormingData.patientId);
    if (!patient || !patient.is_active) {
      throw new Error('Patient not found or inactive');
    }

    // Crear desparasitación
    const deworming = await dewormingRepository.create(dewormingData);

    // Publicar evento de desparasitación creada
    await publishEvent('deworming.created', {
      dewormingId: deworming.id,
      patientId: deworming.patient_id,
      veterinarianId: deworming.veterinarian_id,
      productName: deworming.product_name,
      activeIngredient: deworming.active_ingredient,
      applicationDate: deworming.application_date,
      nextApplicationDate: deworming.next_application_date,
      createdAt: deworming.created_at
    });

    // Si hay próxima aplicación, publicar evento de recordatorio
    if (deworming.next_application_date) {
      await publishEvent('deworming.reminder', {
        dewormingId: deworming.id,
        patientId: deworming.patient_id,
        nextApplicationDate: deworming.next_application_date,
        productName: deworming.product_name,
        createdAt: deworming.created_at
      });
    }

    return {
      id: deworming.id,
      patientId: deworming.patient_id,
      veterinarianId: deworming.veterinarian_id,
      productName: deworming.product_name,
      activeIngredient: deworming.active_ingredient,
      manufacturer: deworming.manufacturer,
      lotNumber: deworming.lot_number,
      expirationDate: deworming.expiration_date,
      applicationDate: deworming.application_date,
      nextApplicationDate: deworming.next_application_date,
      dosage: deworming.dosage,
      dosageUnit: deworming.dosage_unit,
      administrationRoute: deworming.administration_route,
      targetParasites: deworming.target_parasites,
      adverseReactions: deworming.adverse_reactions,
      createdAt: deworming.created_at
    };
  }

  /**
   * Registra una nueva alergia
   * @param {Object} allergyData - Datos de la alergia
   * @param {number} allergyData.patientId - ID del paciente
   * @param {number} allergyData.veterinarianId - ID del veterinario
   * @param {string} allergyData.allergen - Alérgeno
   * @param {string} allergyData.allergyType - Tipo de alergia (food, medication, environmental, other)
   * @param {string} allergyData.severity - Severidad (mild, moderate, severe, life_threatening)
   * @param {string} [allergyData.symptoms] - Síntomas
   * @param {string} [allergyData.treatment] - Tratamiento
   * @returns {Promise<Object>} Datos de la alergia creada
   * @throws {Error} Si el paciente no existe
   * @example
   * const allergy = await PatientService.createAllergy({
   *   patientId: 1,
   *   veterinarianId: 2,
   *   allergen: 'Polen',
   *   allergyType: 'environmental',
   *   severity: 'moderate',
   *   symptoms: 'Estornudos, picazón ocular'
   * });
   */
  static async createAllergy(allergyData) {
    // Validar que el paciente exista y esté activo
    const patient = await patientRepository.findById(allergyData.patientId);
    if (!patient || !patient.is_active) {
      throw new Error('Patient not found or inactive');
    }

    // Crear alergia
    const allergy = await allergyRepository.create(allergyData);

    // Publicar evento de alergia creada
    await publishEvent('allergy.created', {
      allergyId: allergy.id,
      patientId: allergy.patient_id,
      veterinarianId: allergy.veterinarian_id,
      allergen: allergy.allergen,
      allergyType: allergy.allergy_type,
      severity: allergy.severity,
      createdAt: allergy.created_at
    });

    // Si es una alergia severa, publicar evento de alerta
    if (allergy.severity === 'severe' || allergy.severity === 'life_threatening') {
      await publishEvent('allergy.severe', {
        allergyId: allergy.id,
        patientId: allergy.patient_id,
        allergen: allergy.allergen,
        severity: allergy.severity,
        createdAt: allergy.created_at
      });
    }

    return {
      id: allergy.id,
      patientId: allergy.patient_id,
      veterinarianId: allergy.veterinarian_id,
      allergen: allergy.allergen,
      allergyType: allergy.allergy_type,
      severity: allergy.severity,
      symptoms: allergy.symptoms,
      treatment: allergy.treatment,
      createdAt: allergy.created_at
    };
  }

  /**
   * Obtiene el historial clínico completo de un paciente
   * @param {number} patientId - ID del paciente
   * @param {number} [limit=50] - Límite de resultados
   * @param {number} [offset=0] - Desplazamiento
   * @returns {Promise<Array>} Historial clínico del paciente
   * @throws {Error} Si el paciente no existe
   * @example
   * const history = await PatientService.getPatientHistory(1, 20, 0);
   */
  static async getPatientHistory(patientId, limit = 50, offset = 0) {
    // Validar que el paciente exista y esté activo
    const patient = await patientRepository.findById(patientId);
    if (!patient || !patient.is_active) {
      throw new Error('Patient not found or inactive');
    }

    const history = await clinicalHistoryRepository.getPatientHistory(patientId, limit, offset);
    
    return history.map(h => ({
      id: h.id,
      patientId: h.patient_id,
      veterinarianId: h.veterinarian_id,
      veterinarianFirstName: h.veterinarian_first_name,
      veterinarianLastName: h.veterinarian_last_name,
      consultationType: h.consultation_type,
      chiefComplaint: h.chief_complaint,
      history: h.history,
      physicalExamination: h.physical_examination,
      diagnosis: h.diagnosis,
      treatment: h.treatment,
      medications: h.medications,
      recommendations: h.recommendations,
      followUpRequired: h.follow_up_required,
      followUpDays: h.follow_up_days,
      temperature: h.temperature,
      heartRate: h.heart_rate,
      respiratoryRate: h.respiratory_rate,
      weight: h.weight,
      bloodPressureSystolic: h.blood_pressure_systolic,
      bloodPressureDiastolic: h.blood_pressure_diastolic,
      oxygenSaturation: h.oxygen_saturation,
      files: h.files,
      isEmergency: h.is_emergency,
      createdAt: h.created_at
    }));
  }

  /**
   * Obtiene las vacunaciones de un paciente
   * @param {number} patientId - ID del paciente
   * @returns {Promise<Array>} Vacunaciones del paciente
   * @throws {Error} Si el paciente no existe
   * @example
   * const vaccinations = await PatientService.getPatientVaccinations(1);
   */
  static async getPatientVaccinations(patientId) {
    // Validar que el paciente exista y esté activo
    const patient = await patientRepository.findById(patientId);
    if (!patient || !patient.is_active) {
      throw new Error('Patient not found or inactive');
    }

    const vaccinations = await vaccinationRepository.getPatientVaccinations(patientId);
    
    return vaccinations.map(v => ({
      id: v.id,
      patientId: v.patient_id,
      veterinarianId: v.veterinarian_id,
      veterinarianFirstName: v.veterinarian_first_name,
      veterinarianLastName: v.veterinarian_last_name,
      vaccineName: v.vaccine_name,
      vaccineType: v.vaccine_type,
      manufacturer: v.manufacturer,
      lotNumber: v.lot_number,
      expirationDate: v.expiration_date,
      applicationDate: v.application_date,
      nextApplicationDate: v.next_application_date,
      doseNumber: v.dose_number,
      totalDoses: v.total_doses,
      applicationSite: v.application_site,
      adverseReactions: v.adverse_reactions,
      createdAt: v.created_at
    }));
  }

  /**
   * Obtiene las desparasitaciones de un paciente
   * @param {number} patientId - ID del paciente
   * @returns {Promise<Array>} Desparasitaciones del paciente
   * @throws {Error} Si el paciente no existe
   * @example
   * const dewormings = await PatientService.getPatientDewormings(1);
   */
  static async getPatientDewormings(patientId) {
    // Validar que el paciente exista y esté activo
    const patient = await patientRepository.findById(patientId);
    if (!patient || !patient.is_active) {
      throw new Error('Patient not found or inactive');
    }

    const dewormings = await dewormingRepository.getPatientDewormings(patientId);
    
    return dewormings.map(d => ({
      id: d.id,
      patientId: d.patient_id,
      veterinarianId: d.veterinarian_id,
      veterinarianFirstName: d.veterinarian_first_name,
      veterinarianLastName: d.veterinarian_last_name,
      productName: d.product_name,
      activeIngredient: d.active_ingredient,
      manufacturer: d.manufacturer,
      lotNumber: d.lot_number,
      expirationDate: d.expiration_date,
      applicationDate: d.application_date,
      nextApplicationDate: d.next_application_date,
      dosage: d.dosage,
      dosageUnit: d.dosage_unit,
      administrationRoute: d.administration_route,
      targetParasites: d.target_parasites,
      adverseReactions: d.adverse_reactions,
      createdAt: d.created_at
    }));
  }

  /**
   * Obtiene las alergias de un paciente
   * @param {number} patientId - ID del paciente
   * @returns {Promise<Array>} Alergias del paciente
   * @throws {Error} Si el paciente no existe
   * @example
   * const allergies = await PatientService.getPatientAllergies(1);
   */
  static async getPatientAllergies(patientId) {
    // Validar que el paciente exista y esté activo
    const patient = await patientRepository.findById(patientId);
    if (!patient || !patient.is_active) {
      throw new Error('Patient not found or inactive');
    }

    const allergies = await allergyRepository.getPatientAllergies(patientId);
    
    return allergies.map(a => ({
      id: a.id,
      patientId: a.patient_id,
      veterinarianId: a.veterinarian_id,
      veterinarianFirstName: a.veterinarian_first_name,
      veterinarianLastName: a.veterinarian_last_name,
      allergen: a.allergen,
      allergyType: a.allergy_type,
      severity: a.severity,
      symptoms: a.symptoms,
      treatment: a.treatment,
      createdAt: a.created_at
    }));
  }

  /**
   * Obtiene un paciente con todos sus detalles
   * @param {number} patientId - ID del paciente
   * @returns {Promise<Object>} Datos completos del paciente
   * @throws {Error} Si el paciente no existe
   * @example
   * const patient = await PatientService.getPatientWithDetails(1);
   */
  static async getPatientWithDetails(patientId) {
    const patient = await patientRepository.getPatientWithDetails(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    return {
      id: patient.id,
      tutorId: patient.tutor_id,
      tutorFirstName: patient.tutor_first_name,
      tutorLastName: patient.tutor_last_name,
      tutorEmail: patient.tutor_email,
      tutorPhone: patient.tutor_phone,
      speciesId: patient.species_id,
      speciesName: patient.species_name,
      breedId: patient.breed_id,
      breedName: patient.breed_name,
      name: patient.name,
      nickname: patient.nickname,
      birthDate: patient.birth_date,
      gender: patient.gender,
      color: patient.color,
      weight: patient.weight,
      microchipNumber: patient.microchip_number,
      tattooNumber: patient.tattoo_number,
      specialMarks: patient.special_marks,
      allergies: patient.allergies,
      chronicDiseases: patient.chronic_diseases,
      currentMedications: patient.current_medications,
      dietaryRestrictions: patient.dietary_restrictions,
      behaviorNotes: patient.behavior_notes,
      isActive: patient.is_active,
      createdAt: patient.created_at
    };
  }

  /**
   * Busca pacientes por término de búsqueda
   * @param {string} searchTerm - Término de búsqueda
   * @returns {Promise<Array>} Pacientes que coinciden con la búsqueda
   * @example
   * const patients = await PatientService.searchPatients('Firulais');
   */
  static async searchPatients(searchTerm) {
    const patients = await patientRepository.searchPatients(searchTerm);
    
    return patients.map(p => ({
      id: p.id,
      name: p.name,
      nickname: p.nickname,
      gender: p.gender,
      weight: p.weight,
      microchipNumber: p.microchip_number,
      tutorFirstName: p.tutor_first_name,
      tutorLastName: p.tutor_last_name,
      tutorEmail: p.tutor_email,
      tutorPhone: p.tutor_phone,
      speciesName: p.species_name,
      breedName: p.breed_name,
      createdAt: p.created_at
    }));
  }

  /**
   * Obtiene pacientes que necesitan seguimiento
   * @returns {Promise<Array>} Pacientes con seguimiento pendiente
   * @example
   * const followUps = await PatientService.getPatientsNeedingFollowUp();
   */
  static async getPatientsNeedingFollowUp() {
    const followUps = await clinicalHistoryRepository.getHistoryNeedingFollowUp();
    
    return followUps.map(f => ({
      historyId: f.id,
      patientId: f.patient_id,
      patientName: f.patient_name,
      patientNickname: f.patient_nickname,
      tutorFirstName: f.tutor_first_name,
      tutorLastName: f.tutor_last_name,
      tutorEmail: f.tutor_email,
      tutorPhone: f.tutor_phone,
      veterinarianFirstName: f.veterinarian_first_name,
      veterinarianLastName: f.veterinarian_last_name,
      followUpDate: f.follow_up_date,
      daysOverdue: f.days_overdue
    }));
  }

  /**
   * Obtiene pacientes con vacunaciones próximas
   * @param {number} [days=30] - Días hacia el futuro
   * @returns {Promise<Array>} Pacientes con vacunaciones próximas
   * @example
   * const upcoming = await PatientService.getUpcomingVaccinations(30);
   */
  static async getUpcomingVaccinations(days = 30) {
    const vaccinations = await vaccinationRepository.getUpcomingVaccinations(days);
    
    return vaccinations.map(v => ({
      id: v.id,
      patientId: v.patient_id,
      vaccineName: v.vaccine_name,
      vaccineType: v.vaccine_type,
      applicationDate: v.application_date,
      nextApplicationDate: v.next_application_date,
      doseNumber: v.dose_number,
      totalDoses: v.total_doses,
      patientName: v.patient_name,
      patientNickname: v.patient_nickname,
      tutorFirstName: v.tutor_first_name,
      tutorLastName: v.tutor_last_name,
      tutorEmail: v.tutor_email,
      tutorPhone: v.tutor_phone,
      veterinarianFirstName: v.veterinarian_first_name,
      veterinarianLastName: v.veterinarian_last_name
    }));
  }

  /**
   * Obtiene pacientes con desparasitaciones próximas
   * @param {number} [days=30] - Días hacia el futuro
   * @returns {Promise<Array>} Pacientes con desparasitaciones próximas
   * @example
   * const upcoming = await PatientService.getUpcomingDewormings(30);
   */
  static async getUpcomingDewormings(days = 30) {
    const dewormings = await dewormingRepository.getUpcomingDewormings(days);
    
    return dewormings.map(d => ({
      id: d.id,
      patientId: d.patient_id,
      productName: d.product_name,
      activeIngredient: d.active_ingredient,
      applicationDate: d.application_date,
      nextApplicationDate: d.next_application_date,
      dosage: d.dosage,
      dosageUnit: d.dosage_unit,
      patientName: d.patient_name,
      patientNickname: d.patient_nickname,
      tutorFirstName: d.tutor_first_name,
      tutorLastName: d.tutor_last_name,
      tutorEmail: d.tutor_email,
      tutorPhone: d.tutor_phone,
      veterinarianFirstName: d.veterinarian_first_name,
      veterinarianLastName: d.veterinarian_last_name
    }));
  }

  /**
   * Obtiene estadísticas generales del servicio
   * @returns {Promise<Object>} Estadísticas del servicio
   * @example
   * const stats = await PatientService.getServiceStats();
   */
  static async getServiceStats() {
    const [patientStats, historyStats, vaccinationStats, dewormingStats, allergyStats] = await Promise.all([
      patientRepository.getPatientStats(),
      clinicalHistoryRepository.getHistoryStats(),
      vaccinationRepository.getVaccinationStats(),
      dewormingRepository.getDewormingStats(),
      allergyRepository.getAllergyStats()
    ]);

    return {
      patients: patientStats,
      clinicalHistory: historyStats,
      vaccinations: vaccinationStats,
      dewormings: dewormingStats,
      allergies: allergyStats
    };
  }
}

module.exports = PatientService;
