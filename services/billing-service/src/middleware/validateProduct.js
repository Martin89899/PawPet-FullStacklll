const Joi = require('joi');

/**
 * Schema de validación para productos
 */
const productSchema = Joi.object({
  name: Joi.string().required().max(255).messages({
    'string.base': 'Name must be a string',
    'string.empty': 'Name cannot be empty',
    'string.max': 'Name cannot exceed 255 characters',
    'any.required': 'Name is required'
  }),
  description: Joi.string().optional().max(1000).messages({
    'string.base': 'Description must be a string',
    'string.max': 'Description cannot exceed 1000 characters'
  }),
  price: Joi.number().positive().required().messages({
    'number.base': 'Price must be a number',
    'number.positive': 'Price must be positive',
    'any.required': 'Price is required'
  }),
  type: Joi.string().valid('service', 'product', 'consultation', 'vaccine', 'procedure').required().messages({
    'string.base': 'Type must be a string',
    'any.only': 'Type must be one of: service, product, consultation, vaccine, procedure',
    'any.required': 'Type is required'
  }),
  category: Joi.string().optional().max(100).messages({
    'string.base': 'Category must be a string',
    'string.max': 'Category cannot exceed 100 characters'
  }),
  isActive: Joi.boolean().optional().messages({
    'boolean.base': 'isActive must be a boolean'
  })
});

/**
 * Middleware de validación para productos
 */
const validateProduct = (req, res, next) => {
  const { error, value } = productSchema.validate(req.body, {
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

module.exports = validateProduct;
