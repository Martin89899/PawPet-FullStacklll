const Joi = require('joi');

// Esquemas de validación para el dominio clínico

const tutorSchema = Joi.object({
  firstName: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'El nombre es requerido',
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede exceder 100 caracteres',
    'any.required': 'El nombre es requerido'
  }),
  lastName: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'El apellido es requerido',
    'string.min': 'El apellido debe tener al menos 2 caracteres',
    'string.max': 'El apellido no puede exceder 100 caracteres',
    'any.required': 'El apellido es requerido'
  }),
  email: Joi.string().email().optional().messages({
    'string.email': 'El email debe ser válido'
  }),
  phone: Joi.string().pattern(/^[+]?[\d\s\-\(\)]+$/).optional().messages({
    'string.pattern.base': 'El teléfono solo puede contener números, espacios, guiones y paréntesis'
  }),
  address: Joi.string().max(500).optional(),
  city: Joi.string().max(100).optional(),
  country: Joi.string().max(100).optional(),
  postalCode: Joi.string().max(20).optional(),
  identificationNumber: Joi.string().max(50).optional()
});

const patientSchema = Joi.object({
  tutorId: Joi.number().integer().positive().required().messages({
    'number.base': 'El ID del tutor debe ser un número',
    'number.integer': 'El ID del tutor debe ser un número entero',
    'number.positive': 'El ID del tutor debe ser positivo',
    'any.required': 'El ID del tutor es requerido'
  }),
  speciesId: Joi.number().integer().positive().optional(),
  breedId: Joi.number().integer().positive().optional(),
  name: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'El nombre del paciente es requerido',
    'string.min': 'El nombre del paciente debe tener al menos 1 carácter',
    'string.max': 'El nombre del paciente no puede exceder 100 caracteres',
    'any.required': 'El nombre del paciente es requerido'
  }),
  nickname: Joi.string().max(100).optional(),
  birthDate: Joi.date().optional().messages({
    'date.base': 'La fecha de nacimiento debe ser una fecha válida'
  }),
  gender: Joi.string().valid('male', 'female', 'unknown').optional().messages({
    'any.only': 'El género debe ser male, female o unknown'
  }),
  color: Joi.string().max(100).optional(),
  weight: Joi.number().positive().max(999.99).optional().messages({
    'number.base': 'El peso debe ser un número',
    'number.positive': 'El peso debe ser positivo',
    'number.max': 'El peso no puede exceder 999.99 kg'
  }),
  microchipNumber: Joi.string().max(50).optional(),
  tattooNumber: Joi.string().max(50).optional(),
  specialMarks: Joi.string().max(1000).optional(),
  allergies: Joi.string().max(1000).optional(),
  chronicDiseases: Joi.string().max(1000).optional(),
  currentMedications: Joi.string().max(1000).optional(),
  dietaryRestrictions: Joi.string().max(1000).optional(),
  behaviorNotes: Joi.string().max(1000).optional()
});

const clinicalHistorySchema = Joi.object({
  patientId: Joi.number().integer().positive().required().messages({
    'number.base': 'El ID del paciente debe ser un número',
    'number.integer': 'El ID del paciente debe ser un número entero',
    'number.positive': 'El ID del paciente debe ser positivo',
    'any.required': 'El ID del paciente es requerido'
  }),
  veterinarianId: Joi.number().integer().positive().required().messages({
    'number.base': 'El ID del veterinario debe ser un número',
    'number.integer': 'El ID del veterinario debe ser un número entero',
    'number.positive': 'El ID del veterinario debe ser positivo',
    'any.required': 'El ID del veterinario es requerido'
  }),
  consultationType: Joi.string().valid('emergency', 'checkup', 'surgery', 'hospitalization', 'vaccination', 'deworming', 'follow_up', 'other').required().messages({
    'any.only': 'El tipo de consulta debe ser uno de: emergency, checkup, surgery, hospitalization, vaccination, deworming, follow_up, other',
    'any.required': 'El tipo de consulta es requerido'
  }),
  chiefComplaint: Joi.string().max(2000).optional(),
  history: Joi.string().max(5000).optional(),
  physicalExamination: Joi.string().max(5000).optional(),
  diagnosis: Joi.string().max(2000).optional(),
  treatment: Joi.string().max(5000).optional(),
  medications: Joi.string().max(5000).optional(),
  recommendations: Joi.string().max(2000).optional(),
  followUpRequired: Joi.boolean().optional(),
  followUpDays: Joi.number().integer().positive().optional().messages({
    'number.base': 'Los días de seguimiento deben ser un número',
    'number.integer': 'Los días de seguimiento deben ser un número entero',
    'number.positive': 'Los días de seguimiento deben ser positivos'
  }),
  temperature: Joi.number().min(30).max(45).optional().messages({
    'number.base': 'La temperatura debe ser un número',
    'number.min': 'La temperatura debe ser al menos 30°C',
    'number.max': 'La temperatura no puede exceder 45°C'
  }),
  heartRate: Joi.number().integer().min(0).max(300).optional().messages({
    'number.base': 'La frecuencia cardíaca debe ser un número',
    'number.integer': 'La frecuencia cardíaca debe ser un número entero',
    'number.min': 'La frecuencia cardíaca no puede ser negativa',
    'number.max': 'La frecuencia cardíaca no puede exceder 300 bpm'
  }),
  respiratoryRate: Joi.number().integer().min(0).max(100).optional().messages({
    'number.base': 'La frecuencia respiratoria debe ser un número',
    'number.integer': 'La frecuencia respiratoria debe ser un número entero',
    'number.min': 'La frecuencia respiratoria no puede ser negativa',
    'number.max': 'La frecuencia respiratoria no puede exceder 100 rpm'
  }),
  weight: Joi.number().positive().max(999.99).optional().messages({
    'number.base': 'El peso debe ser un número',
    'number.positive': 'El peso debe ser positivo',
    'number.max': 'El peso no puede exceder 999.99 kg'
  }),
  bloodPressureSystolic: Joi.number().integer().min(0).max(300).optional().messages({
    'number.base': 'La presión arterial sistólica debe ser un número',
    'number.integer': 'La presión arterial sistólica debe ser un número entero',
    'number.min': 'La presión arterial sistólica no puede ser negativa',
    'number.max': 'La presión arterial sistólica no puede exceder 300 mmHg'
  }),
  bloodPressureDiastolic: Joi.number().integer().min(0).max(200).optional().messages({
    'number.base': 'La presión arterial diastólica debe ser un número',
    'number.integer': 'La presión arterial diastólica debe ser un número entero',
    'number.min': 'La presión arterial diastólica no puede ser negativa',
    'number.max': 'La presión arterial diastólica no puede exceder 200 mmHg'
  }),
  oxygenSaturation: Joi.number().min(0).max(100).optional().messages({
    'number.base': 'La saturación de oxígeno debe ser un número',
    'number.min': 'La saturación de oxígeno no puede ser negativa',
    'number.max': 'La saturación de oxígeno no puede exceder 100%'
  }),
  files: Joi.object().optional(),
  isEmergency: Joi.boolean().optional()
});

const vaccinationSchema = Joi.object({
  patientId: Joi.number().integer().positive().required().messages({
    'number.base': 'El ID del paciente debe ser un número',
    'number.integer': 'El ID del paciente debe ser un número entero',
    'number.positive': 'El ID del paciente debe ser positivo',
    'any.required': 'El ID del paciente es requerido'
  }),
  veterinarianId: Joi.number().integer().positive().required().messages({
    'number.base': 'El ID del veterinario debe ser un número',
    'number.integer': 'El ID del veterinario debe ser un número entero',
    'number.positive': 'El ID del veterinario debe ser positivo',
    'any.required': 'El ID del veterinario es requerido'
  }),
  vaccineName: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'El nombre de la vacuna es requerido',
    'string.min': 'El nombre de la vacuna debe tener al menos 1 carácter',
    'string.max': 'El nombre de la vacuna no puede exceder 100 caracteres',
    'any.required': 'El nombre de la vacuna es requerido'
  }),
  vaccineType: Joi.string().max(50).optional(),
  manufacturer: Joi.string().max(100).optional(),
  lotNumber: Joi.string().max(50).optional(),
  expirationDate: Joi.date().optional().messages({
    'date.base': 'La fecha de vencimiento debe ser una fecha válida'
  }),
  applicationDate: Joi.date().required().messages({
    'date.base': 'La fecha de aplicación debe ser una fecha válida',
    'any.required': 'La fecha de aplicación es requerida'
  }),
  nextApplicationDate: Joi.date().optional().messages({
    'date.base': 'La próxima fecha de aplicación debe ser una fecha válida'
  }),
  doseNumber: Joi.number().integer().positive().optional().messages({
    'number.base': 'El número de dosis debe ser un número',
    'number.integer': 'El número de dosis debe ser un número entero',
    'number.positive': 'El número de dosis debe ser positivo'
  }),
  totalDoses: Joi.number().integer().positive().optional().messages({
    'number.base': 'El total de dosis debe ser un número',
    'number.integer': 'El total de dosis debe ser un número entero',
    'number.positive': 'El total de dosis debe ser positivo'
  }),
  applicationSite: Joi.string().max(50).optional(),
  adverseReactions: Joi.string().max(1000).optional()
});

const dewormingSchema = Joi.object({
  patientId: Joi.number().integer().positive().required().messages({
    'number.base': 'El ID del paciente debe ser un número',
    'number.integer': 'El ID del paciente debe ser un número entero',
    'number.positive': 'El ID del paciente debe ser positivo',
    'any.required': 'El ID del paciente es requerido'
  }),
  veterinarianId: Joi.number().integer().positive().required().messages({
    'number.base': 'El ID del veterinario debe ser un número',
    'number.integer': 'El ID del veterinario debe ser un número entero',
    'number.positive': 'El ID del veterinario debe ser positivo',
    'any.required': 'El ID del veterinario es requerido'
  }),
  productName: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'El nombre del producto es requerido',
    'string.min': 'El nombre del producto debe tener al menos 1 carácter',
    'string.max': 'El nombre del producto no puede exceder 100 caracteres',
    'any.required': 'El nombre del producto es requerido'
  }),
  activeIngredient: Joi.string().max(100).optional(),
  manufacturer: Joi.string().max(100).optional(),
  lotNumber: Joi.string().max(50).optional(),
  expirationDate: Joi.date().optional().messages({
    'date.base': 'La fecha de vencimiento debe ser una fecha válida'
  }),
  applicationDate: Joi.date().required().messages({
    'date.base': 'La fecha de aplicación debe ser una fecha válida',
    'any.required': 'La fecha de aplicación es requerida'
  }),
  nextApplicationDate: Joi.date().optional().messages({
    'date.base': 'La próxima fecha de aplicación debe ser una fecha válida'
  }),
  dosage: Joi.number().positive().max(9999.99).optional().messages({
    'number.base': 'La dosis debe ser un número',
    'number.positive': 'La dosis debe ser positiva',
    'number.max': 'La dosis no puede exceder 9999.99'
  }),
  dosageUnit: Joi.string().max(20).optional(),
  administrationRoute: Joi.string().max(50).optional(),
  targetParasites: Joi.string().max(500).optional(),
  adverseReactions: Joi.string().max(1000).optional()
});

const allergySchema = Joi.object({
  patientId: Joi.number().integer().positive().required().messages({
    'number.base': 'El ID del paciente debe ser un número',
    'number.integer': 'El ID del paciente debe ser un número entero',
    'number.positive': 'El ID del paciente debe ser positivo',
    'any.required': 'El ID del paciente es requerido'
  }),
  veterinarianId: Joi.number().integer().positive().required().messages({
    'number.base': 'El ID del veterinario debe ser un número',
    'number.integer': 'El ID del veterinario debe ser un número entero',
    'number.positive': 'El ID del veterinario debe ser positivo',
    'any.required': 'El ID del veterinario es requerido'
  }),
  allergen: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'El alérgeno es requerido',
    'string.min': 'El alérgeno debe tener al menos 1 carácter',
    'string.max': 'El alérgeno no puede exceder 100 caracteres',
    'any.required': 'El alérgeno es requerido'
  }),
  allergyType: Joi.string().valid('food', 'medication', 'environmental', 'other').required().messages({
    'any.only': 'El tipo de alergia debe ser uno de: food, medication, environmental, other',
    'any.required': 'El tipo de alergia es requerido'
  }),
  severity: Joi.string().valid('mild', 'moderate', 'severe', 'life_threatening').required().messages({
    'any.only': 'La severidad debe ser uno de: mild, moderate, severe, life_threatening',
    'any.required': 'La severidad es requerida'
  }),
  symptoms: Joi.string().max(1000).optional(),
  treatment: Joi.string().max(1000).optional()
});

// Middleware de validación
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Error en la validación de datos',
        details
      });
    }

    req[source] = value;
    next();
  };
};

// Validaciones específicas
const validateTutor = validate(tutorSchema);
const validatePatient = validate(patientSchema);
const validateClinicalHistory = validate(clinicalHistorySchema);
const validateVaccination = validate(vaccinationSchema);
const validateDeworming = validate(dewormingSchema);
const validateAllergy = validate(allergySchema);

// Validación de parámetros de ruta
const validateId = (req, res, next) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID',
      message: 'El ID debe ser un número entero positivo'
    });
  }

  req.params.id = id;
  next();
};

const validatePatientId = validateId;
const validateTutorId = validateId;
const validateHistoryId = validateId;
const validateVaccinationId = validateId;
const validateDewormingId = validateId;
const validateAllergyId = validateId;

// Validación de parámetros de query
const validatePagination = (req, res, next) => {
  const { page = 1, limit = 50 } = req.query;
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Page',
      message: 'El número de página debe ser un entero positivo'
    });
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Limit',
      message: 'El límite debe ser un entero entre 1 y 100'
    });
  }

  req.query.page = pageNum;
  req.query.limit = limitNum;
  req.query.offset = (pageNum - 1) * limitNum;

  next();
};

const validateSearch = (req, res, next) => {
  const { q } = req.query;
  
  if (!q || typeof q !== 'string' || q.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Search',
      message: 'El término de búsqueda debe tener al menos 2 caracteres'
    });
  }

  req.query.q = q.trim();
  next();
};

const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (startDate && !isValidDate(startDate)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Start Date',
      message: 'La fecha de inicio no es válida'
    });
  }

  if (endDate && !isValidDate(endDate)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid End Date',
      message: 'La fecha de fin no es válida'
    });
  }

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Date Range',
      message: 'La fecha de inicio no puede ser posterior a la fecha de fin'
    });
  }

  next();
};

// Función auxiliar para validar fechas
function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

module.exports = {
  // Esquemas
  tutorSchema,
  patientSchema,
  clinicalHistorySchema,
  vaccinationSchema,
  dewormingSchema,
  allergySchema,
  
  // Middleware de validación
  validate,
  validateTutor,
  validatePatient,
  validateClinicalHistory,
  validateVaccination,
  validateDeworming,
  validateAllergy,
  
  // Validación de parámetros
  validatePatientId,
  validateTutorId,
  validateHistoryId,
  validateVaccinationId,
  validateDewormingId,
  validateAllergyId,
  
  // Validación de query parameters
  validatePagination,
  validateSearch,
  validateDateRange
};
