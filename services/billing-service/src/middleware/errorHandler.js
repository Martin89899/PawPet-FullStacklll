/**
 * Middleware para manejo de errores
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Error de validación de Joi
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      error: 'VALIDATION_ERROR',
      details: err.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  // Error de sintaxis JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON syntax',
      error: 'INVALID_JSON'
    });
  }

  // Error de base de datos
  if (err.code === '23505') { // Unique violation
    return res.status(409).json({
      success: false,
      message: 'Resource already exists',
      error: 'DUPLICATE_RESOURCE'
    });
  }

  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({
      success: false,
      message: 'Referenced resource does not exist',
      error: 'FOREIGN_KEY_VIOLATION'
    });
  }

  if (err.code === '23502') { // Not null violation
    return res.status(400).json({
      success: false,
      message: 'Required field is missing',
      error: 'REQUIRED_FIELD_MISSING'
    });
  }

  // Error de conexión a base de datos
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    return res.status(503).json({
      success: false,
      message: 'Database connection error',
      error: 'DATABASE_CONNECTION_ERROR'
    });
  }

  // Error de autenticación JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      error: 'TOKEN_EXPIRED'
    });
  }

  // Error de Stripe
  if (err.type && err.type.startsWith('Stripe')) {
    return res.status(400).json({
      success: false,
      message: 'Payment processing error',
      error: 'STRIPE_ERROR',
      details: err.message
    });
  }

  // Error de RabbitMQ
  if (err.message && err.message.includes('RabbitMQ')) {
    return res.status(503).json({
      success: false,
      message: 'Message queue error',
      error: 'RABBITMQ_ERROR'
    });
  }

  // Error personalizado con código de estado
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.code || 'CUSTOM_ERROR'
    });
  }

  // Error por defecto
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message || 'Something went wrong';

  res.status(statusCode).json({
    success: false,
    message: message,
    error: 'INTERNAL_SERVER_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = errorHandler;
