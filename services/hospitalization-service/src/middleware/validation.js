const Joi = require('joi');

/**
 * Esquemas de validación para el Hospitalization Service
 */

// Esquema para crear hospitalización
const createHospitalizationSchema = Joi.object({
  patientId: Joi.number().integer().positive().required(),
  admissionDate: Joi.date().iso().default(() => new Date()),
  admissionReason: Joi.string().min(5).max(500).required(),
  admissionDiagnosis: Joi.string().min(5).max(1000).required(),
  location: Joi.string().min(2).max(100).required(),
  attendingVeterinarianId: Joi.number().integer().positive().required(),
  primaryTechnicianId: Joi.number().integer().positive().optional(),
  emergencyContact: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    phone: Joi.string().min(10).max(20).required(),
    relationship: Joi.string().min(2).max(50).required()
  }).required(),
  insuranceInfo: Joi.object({
    provider: Joi.string().min(2).max(100).optional(),
    policyNumber: Joi.string().min(5).max(50).optional(),
    hasCoverage: Joi.boolean().default(false)
  }).optional(),
  specialInstructions: Joi.string().max(1000).optional(),
  expectedStayDays: Joi.number().integer().positive().optional(),
  initialNotes: Joi.string().max(2000).optional()
});

// Esquema para registrar signos vitales
const vitalSignsSchema = Joi.object({
  temperature: Joi.number().precision(1).min(35.0).max(42.0).required(),
  heartRate: Joi.number().integer().min(40).max(200).required(),
  respiratoryRate: Joi.number().integer().min(10).max(60).required(),
  bloodPressure: Joi.object({
    systolic: Joi.number().integer().min(60).max(250).required(),
    diastolic: Joi.number().integer().min(40).max(150).required()
  }).required(),
  oxygenSaturation: Joi.number().precision(1).min(70).max(100).required(),
  weight: Joi.number().precision(2).min(0.1).max(200).optional(),
  glucose: Joi.number().precision(1).min(20).max(600).optional(),
  painScore: Joi.number().integer().min(0).max(10).optional(),
  consciousnessLevel: Joi.string().valid('alert', 'drowsy', 'stupor', 'coma').optional(),
  gumColor: Joi.string().valid('pink', 'pale', 'blue', 'red', 'yellow').optional(),
  capillaryRefillTime: Joi.number().precision(1).min(0).max(5).optional(),
  notes: Joi.string().max(500).optional()
});

// Esquema para administración de medicamentos
const medicationAdministrationSchema = Joi.object({
  medicationId: Joi.number().integer().positive().required(),
  medicationName: Joi.string().min(2).max(100).required(),
  dosage: Joi.string().min(1).max(50).required(),
  route: Joi.string().valid('IV', 'IM', 'SC', 'PO', 'TOPICAL', 'INHALATION', 'OTHER').required(),
  batchNumber: Joi.string().min(5).max(50).required(),
  expirationDate: Joi.date().iso().required(),
  administeredBy: Joi.number().integer().positive().optional(),
  administrationNotes: Joi.string().max(500).optional(),
  prescribedBy: Joi.number().integer().positive().required(),
  prescriptionDate: Joi.date().iso().required(),
  frequency: Joi.string().min(2).max(50).optional(),
  nextDoseDue: Joi.date().iso().optional(),
  isControlledSubstance: Joi.boolean().default(false),
  controlledSubstanceLog: Joi.object({
    witnessId: Joi.number().integer().positive().required(),
    witnessName: Joi.string().min(2).max(100).required(),
    wasteAmount: Joi.number().precision(2).min(0).optional(),
    wasteReason: Joi.string().max(200).optional()
  }).when('isControlledSubstance', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

// Esquema para actualizar hospitalización
const updateHospitalizationSchema = Joi.object({
  location: Joi.string().min(2).max(100).optional(),
  attendingVeterinarianId: Joi.number().integer().positive().optional(),
  primaryTechnicianId: Joi.number().integer().positive().optional(),
  currentStatus: Joi.string().valid('stable', 'critical', 'improving', 'deteriorating').optional(),
  treatmentPlan: Joi.string().max(2000).optional(),
  progressNotes: Joi.string().max(2000).optional(),
  expectedDischargeDate: Joi.date().iso().optional(),
  diet: Joi.string().max(500).optional(),
  activityLevel: Joi.string().valid('cage_rest', 'restricted', 'normal').optional(),
  ivFluids: Joi.object({
    type: Joi.string().min(2).max(50).required(),
    rate: Joi.string().min(1).max(20).required(),
    volume: Joi.number().precision(1).min(0).required()
  }).optional(),
  oxygenTherapy: Joi.object({
    flowRate: Joi.number().precision(1).min(0).required(),
    deliveryMethod: Joi.string().valid('mask', 'nasal', 'cage').required(),
    concentration: Joi.number().precision(1).min(21).max(100).optional()
  }).optional()
});

// Middleware de validación
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');
      
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        error: 'VALIDATION_ERROR',
        details: errorMessage
      });
    }

    req[property] = value;
    next();
  };
};

// Validaciones específicas
const validateHospitalization = validate(createHospitalizationSchema);
const validateVitalSigns = validate(vitalSignsSchema);
const validateMedication = validate(medicationAdministrationSchema);
const validateHospitalizationUpdate = validate(updateHospitalizationSchema);

module.exports = {
  validateHospitalization,
  validateVitalSigns,
  validateMedication,
  validateHospitalizationUpdate,
  createHospitalizationSchema,
  vitalSignsSchema,
  medicationAdministrationSchema,
  updateHospitalizationSchema
};
