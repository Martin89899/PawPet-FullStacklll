const Joi = require('joi');

/**
 * Middleware de validación para el Appointments Service
 * @class Validation
 * @description Proporciona validación de entrada para las solicitudes HTTP
 */

// Esquemas de validación
const schemas = {
  // Validación para crear cita
  createAppointment: Joi.object({
    patientId: Joi.number().integer().positive().required().messages({
      'number.base': 'El ID del paciente debe ser un número',
      'number.integer': 'El ID del paciente debe ser un entero',
      'number.positive': 'El ID del paciente debe ser positivo',
      'any.required': 'El ID del paciente es requerido'
    }),
    tutorId: Joi.number().integer().positive().required().messages({
      'number.base': 'El ID del tutor debe ser un número',
      'number.integer': 'El ID del tutor debe ser un entero',
      'number.positive': 'El ID del tutor debe ser positivo',
      'any.required': 'El ID del tutor es requerido'
    }),
    veterinarianId: Joi.number().integer().positive().optional().messages({
      'number.base': 'El ID del veterinario debe ser un número',
      'number.integer': 'El ID del veterinario debe ser un entero',
      'number.positive': 'El ID del veterinario debe ser positivo'
    }),
    appointmentTypeId: Joi.number().integer().positive().required().messages({
      'number.base': 'El ID del tipo de cita debe ser un número',
      'number.integer': 'El ID del tipo de cita debe ser un entero',
      'number.positive': 'El ID del tipo de cita debe ser positivo',
      'any.required': 'El ID del tipo de cita es requerido'
    }),
    scheduledDatetime: Joi.date().iso().min('now').required().messages({
      'date.base': 'La fecha programada debe ser una fecha válida',
      'date.format': 'La fecha programada debe tener formato ISO',
      'date.min': 'La fecha programada debe ser futura',
      'any.required': 'La fecha programada es requerida'
    }),
    notes: Joi.string().max(1000).optional().allow('').messages({
      'string.base': 'Las notas deben ser texto',
      'string.max': 'Las notas no pueden exceder 1000 caracteres'
    }),
    symptoms: Joi.string().max(500).optional().allow('').messages({
      'string.base': 'Los síntomas deben ser texto',
      'string.max': 'Los síntomas no pueden exceder 500 caracteres'
    }),
    urgencyLevel: Joi.string().valid('low', 'normal', 'high', 'emergency').default('normal').messages({
      'string.base': 'El nivel de urgencia debe ser texto',
      'any.only': 'El nivel de urgencia debe ser uno de: low, normal, high, emergency'
    })
  }),

  // Validación para actualizar cita
  updateAppointment: Joi.object({
    veterinarianId: Joi.number().integer().positive().optional().messages({
      'number.base': 'El ID del veterinario debe ser un número',
      'number.integer': 'El ID del veterinario debe ser un entero',
      'number.positive': 'El ID del veterinario debe ser positivo'
    }),
    appointmentTypeId: Joi.number().integer().positive().optional().messages({
      'number.base': 'El ID del tipo de cita debe ser un número',
      'number.integer': 'El ID del tipo de cita debe ser un entero',
      'number.positive': 'El ID del tipo de cita debe ser positivo'
    }),
    scheduledDatetime: Joi.date().iso().min('now').optional().messages({
      'date.base': 'La fecha programada debe ser una fecha válida',
      'date.format': 'La fecha programada debe tener formato ISO',
      'date.min': 'La fecha programada debe ser futura'
    }),
    status: Joi.string().valid('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled').optional().messages({
      'string.base': 'El estado debe ser texto',
      'any.only': 'El estado debe ser uno de: scheduled, confirmed, in_progress, completed, cancelled, no_show, rescheduled'
    }),
    notes: Joi.string().max(1000).optional().allow('').messages({
      'string.base': 'Las notas deben ser texto',
      'string.max': 'Las notas no pueden exceder 1000 caracteres'
    }),
    symptoms: Joi.string().max(500).optional().allow('').messages({
      'string.base': 'Los síntomas deben ser texto',
      'string.max': 'Los síntomas no pueden exceder 500 caracteres'
    }),
    urgencyLevel: Joi.string().valid('low', 'normal', 'high', 'emergency').optional().messages({
      'string.base': 'El nivel de urgencia debe ser texto',
      'any.only': 'El nivel de urgencia debe ser uno de: low, normal, high, emergency'
    }),
    actualDurationMinutes: Joi.number().integer().positive().optional().messages({
      'number.base': 'La duración real debe ser un número',
      'number.integer': 'La duración real debe ser un entero',
      'number.positive': 'La duración real debe ser positiva'
    }),
    price: Joi.number().positive().optional().messages({
      'number.base': 'El precio debe ser un número',
      'number.positive': 'El precio debe ser positivo'
    }),
    isPaid: Joi.boolean().optional().messages({
      'boolean.base': 'El estado de pago debe ser booleano'
    }),
    paymentMethod: Joi.string().max(50).optional().allow('').messages({
      'string.base': 'El método de pago debe ser texto',
      'string.max': 'El método de pago no puede exceder 50 caracteres'
    })
  }),

  // Validación para cancelar cita
  cancelAppointment: Joi.object({
    reason: Joi.string().min(5).max(500).required().messages({
      'string.base': 'El motivo debe ser texto',
      'string.min': 'El motivo debe tener al menos 5 caracteres',
      'string.max': 'El motivo no puede exceder 500 caracteres',
      'any.required': 'El motivo de cancelación es requerido'
    })
  }),

  // Validación para completar cita
  completeAppointment: Joi.object({
    actualDurationMinutes: Joi.number().integer().positive().required().messages({
      'number.base': 'La duración real debe ser un número',
      'number.integer': 'La duración real debe ser un entero',
      'number.positive': 'La duración real debe ser positiva',
      'any.required': 'La duración real es requerida'
    }),
    notes: Joi.string().max(1000).optional().allow('').messages({
      'string.base': 'Las notas deben ser texto',
      'string.max': 'Las notas no pueden exceder 1000 caracteres'
    })
  }),

  // Validación para reagendar cita
  rescheduleAppointment: Joi.object({
    newScheduledDatetime: Joi.date().iso().min('now').required().messages({
      'date.base': 'La nueva fecha programada debe ser una fecha válida',
      'date.format': 'La nueva fecha programada debe tener formato ISO',
      'date.min': 'La nueva fecha programada debe ser futura',
      'any.required': 'La nueva fecha programada es requerida'
    }),
    reason: Joi.string().min(5).max(500).required().messages({
      'string.base': 'El motivo debe ser texto',
      'string.min': 'El motivo debe tener al menos 5 caracteres',
      'string.max': 'El motivo no puede exceder 500 caracteres',
      'any.required': 'El motivo de reagendación es requerido'
    })
  }),

  // Validación para consulta de calendario
  calendarQuery: Joi.object({
    startDate: Joi.date().iso().required().messages({
      'date.base': 'La fecha de inicio debe ser una fecha válida',
      'date.format': 'La fecha de inicio debe tener formato ISO',
      'any.required': 'La fecha de inicio es requerida'
    }),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required().messages({
      'date.base': 'La fecha de fin debe ser una fecha válida',
      'date.format': 'La fecha de fin debe tener formato ISO',
      'date.min': 'La fecha de fin debe ser posterior a la fecha de inicio',
      'any.required': 'La fecha de fin es requerida'
    }),
    includeUnavailable: Joi.boolean().default(false).optional().messages({
      'boolean.base': 'includeUnavailable debe ser booleano'
    })
  }),

  // Validación para parámetros de ruta
  uuid: Joi.string().uuid().required().messages({
    'string.base': 'El UUID debe ser texto',
    'string.uuid': 'El UUID debe tener formato válido',
    'any.required': 'El UUID es requerido'
  }),

  veterinarianId: Joi.number().integer().positive().required().messages({
    'number.base': 'El ID del veterinario debe ser un número',
    'number.integer': 'El ID del veterinario debe ser un entero',
    'number.positive': 'El ID del veterinario debe ser positivo',
    'any.required': 'El ID del veterinario es requerido'
  }),

  // Validación para parámetros de consulta
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1).optional().messages({
      'number.base': 'La página debe ser un número',
      'number.integer': 'La página debe ser un entero',
      'number.min': 'La página debe ser al menos 1'
    }),
    limit: Joi.number().integer().min(1).max(100).default(20).optional().messages({
      'number.base': 'El límite debe ser un número',
      'number.integer': 'El límite debe ser un entero',
      'number.min': 'El límite debe ser al menos 1',
      'number.max': 'El límite no puede exceder 100'
    }),
    orderBy: Joi.string().valid('id', 'scheduledDatetime', 'createdAt', 'status', 'urgencyLevel').default('scheduledDatetime').optional().messages({
      'string.base': 'El campo de ordenamiento debe ser texto',
      'any.only': 'El campo de ordenamiento debe ser uno de: id, scheduledDatetime, createdAt, status, urgencyLevel'
    }),
    orderDirection: Joi.string().valid('ASC', 'DESC').default('ASC').optional().messages({
      'string.base': 'La dirección de ordenamiento debe ser texto',
      'any.only': 'La dirección de ordenamiento debe ser ASC o DESC'
    })
  }),

  // Validación para filtros de citas
  appointmentFilters: Joi.object({
    veterinarianId: Joi.number().integer().positive().optional().messages({
      'number.base': 'El ID del veterinario debe ser un número',
      'number.integer': 'El ID del veterinario debe ser un entero',
      'number.positive': 'El ID del veterinario debe ser positivo'
    }),
    patientId: Joi.number().integer().positive().optional().messages({
      'number.base': 'El ID del paciente debe ser un número',
      'number.integer': 'El ID del paciente debe ser un entero',
      'number.positive': 'El ID del paciente debe ser positivo'
    }),
    status: Joi.array().items(Joi.string().valid('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')).optional().messages({
      'array.base': 'El estado debe ser un array',
      'any.only': 'Los estados válidos son: scheduled, confirmed, in_progress, completed, cancelled, no_show, rescheduled'
    }),
    urgencyLevel: Joi.string().valid('low', 'normal', 'high', 'emergency').optional().messages({
      'string.base': 'El nivel de urgencia debe ser texto',
      'any.only': 'El nivel de urgencia debe ser uno de: low, normal, high, emergency'
    }),
    startDate: Joi.date().iso().optional().messages({
      'date.base': 'La fecha de inicio debe ser una fecha válida',
      'date.format': 'La fecha de inicio debe tener formato ISO'
    }),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional().messages({
      'date.base': 'La fecha de fin debe ser una fecha válida',
      'date.format': 'La fecha de fin debe tener formato ISO',
      'date.min': 'La fecha de fin debe ser posterior a la fecha de inicio'
    })
  })
};

/**
 * Middleware de validación genérico
 * @param {Object} schema - Esquema de validación de Joi
 * @param {string} source - Fuente de los datos ('body', 'query', 'params')
 * @returns {Function} Middleware de Express
 */
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
        message: 'Error de validación en los datos enviados',
        details
      });
    }

    req[source] = value;
    next();
  };
};

/**
 * Middleware de validación para parámetros de ruta
 * @param {string} param - Nombre del parámetro
 * @param {Object} schema - Esquema de validación
 * @returns {Function} Middleware de Express
 */
const validateParam = (param, schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params[param], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: `Error de validación en el parámetro ${param}`,
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    req.params[param] = value;
    next();
  };
};

// Middlewares específicos exportados
const validateAppointment = validate(schemas.createAppointment);
const validateAppointmentUpdate = validate(schemas.updateAppointment);
const validateCancelAppointment = validate(schemas.cancelAppointment);
const validateCompleteAppointment = validate(schemas.completeAppointment);
const validateRescheduleAppointment = validate(schemas.rescheduleAppointment);
const validateCalendarQuery = validate(schemas.calendarQuery, 'query');
const validatePagination = validate(schemas.pagination, 'query');
const validateAppointmentFilters = validate(schemas.appointmentFilters, 'query');

const validateUuid = validateParam('uuid', schemas.uuid);
const validateVeterinarianId = validateParam('veterinarianId', schemas.veterinarianId);

module.exports = {
  validate,
  validateParam,
  validateAppointment,
  validateAppointmentUpdate,
  validateCancelAppointment,
  validateCompleteAppointment,
  validateRescheduleAppointment,
  validateCalendarQuery,
  validatePagination,
  validateAppointmentFilters,
  validateUuid,
  validateVeterinarianId,
  schemas
};
