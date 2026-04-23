const Joi = require('joi');

/**
 * Schema de validación para pagos
 */
const paymentSchema = Joi.object({
  amount: Joi.number().positive().required().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be positive',
    'any.required': 'Amount is required'
  }),
  paymentMethod: Joi.string().valid('cash', 'card', 'transfer', 'check').required().messages({
    'string.base': 'Payment method must be a string',
    'any.only': 'Payment method must be one of: cash, card, transfer, check',
    'any.required': 'Payment method is required'
  }),
  transactionId: Joi.string().max(100).optional().messages({
    'string.base': 'Transaction ID must be a string',
    'string.max': 'Transaction ID cannot exceed 100 characters'
  }),
  notes: Joi.string().max(500).optional().messages({
    'string.base': 'Notes must be a string',
    'string.max': 'Notes cannot exceed 500 characters'
  })
});

/**
 * Middleware de validación para pagos
 */
const validatePayment = (req, res, next) => {
  const { error, value } = paymentSchema.validate(req.body, {
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

module.exports = validatePayment;
