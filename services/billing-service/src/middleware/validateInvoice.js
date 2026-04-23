const Joi = require('joi');

/**
 * Schema de validación para facturas
 */
const invoiceSchema = Joi.object({
  patientId: Joi.number().integer().positive().required().messages({
    'number.base': 'Patient ID must be a number',
    'number.integer': 'Patient ID must be an integer',
    'number.positive': 'Patient ID must be positive',
    'any.required': 'Patient ID is required'
  }),
  clientId: Joi.number().integer().positive().required().messages({
    'number.base': 'Client ID must be a number',
    'number.integer': 'Client ID must be an integer',
    'number.positive': 'Client ID must be positive',
    'any.required': 'Client ID is required'
  }),
  veterinarianId: Joi.number().integer().positive().optional().messages({
    'number.base': 'Veterinarian ID must be a number',
    'number.integer': 'Veterinarian ID must be an integer',
    'number.positive': 'Veterinarian ID must be positive'
  }),
  dueDate: Joi.date().iso().optional().messages({
    'date.base': 'Due date must be a valid date',
    'date.format': 'Due date must be in ISO format'
  }),
  notes: Joi.string().max(1000).optional().messages({
    'string.base': 'Notes must be a string',
    'string.max': 'Notes cannot exceed 1000 characters'
  }),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.number().integer().positive().optional().messages({
        'number.base': 'Product ID must be a number',
        'number.integer': 'Product ID must be an integer',
        'number.positive': 'Product ID must be positive'
      }),
      description: Joi.string().required().max(255).messages({
        'string.base': 'Description must be a string',
        'string.empty': 'Description cannot be empty',
        'string.max': 'Description cannot exceed 255 characters',
        'any.required': 'Description is required'
      }),
      quantity: Joi.number().integer().positive().required().messages({
        'number.base': 'Quantity must be a number',
        'number.integer': 'Quantity must be an integer',
        'number.positive': 'Quantity must be positive',
        'any.required': 'Quantity is required'
      }),
      unitPrice: Joi.number().positive().required().messages({
        'number.base': 'Unit price must be a number',
        'number.positive': 'Unit price must be positive',
        'any.required': 'Unit price is required'
      })
    })
  ).min(1).required().messages({
    'array.base': 'Items must be an array',
    'array.min': 'Invoice must have at least one item',
    'any.required': 'Items are required'
  })
});

/**
 * Middleware de validación para facturas
 */
const validateInvoice = (req, res, next) => {
  const { error, value } = invoiceSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      error: 'VALIDATION_ERROR',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  // Agregar datos validados al request
  req.validatedBody = value;
  next();
};

module.exports = validateInvoice;
