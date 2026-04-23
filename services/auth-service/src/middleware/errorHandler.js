const { publishEvent } = require('../utils/rabbitmq');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log del error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Publicar evento de error
  publishEvent('system.error', {
    service: 'auth-service',
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  }).catch(e => console.error('Failed to publish error event:', e));

  // Error de validación de Mongoose/Postgres
  if (err.name === 'ValidationError') {
    const message = 'Validation Error';
    const errors = Object.values(err.errors).map(val => val.message);
    error = { message, errors };
    return res.status(400).json({
      error: 'Validation Error',
      message,
      details: errors
    });
  }

  // Error de duplicado (unique constraint)
  if (err.code === '23505') {
    const message = 'Duplicate field value entered';
    error = { message };
    return res.status(400).json({
      error: 'Duplicate Error',
      message: 'A record with this value already exists'
    });
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message };
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid token'
    });
  }

  // Error de JWT expirado
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message };
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Token expired'
    });
  }

  // Error de cast de Mongoose
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message };
    return res.status(404).json({
      error: 'Not Found',
      message: 'Resource not found'
    });
  }

  // Error de conexión a base de datos
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    const message = 'Database connection error';
    error = { message };
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database service unavailable'
    });
  }

  // Error de RabbitMQ
  if (err.message && err.message.includes('RabbitMQ')) {
    const message = 'Message queue error';
    error = { message };
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Message queue service unavailable'
    });
  }

  // Error personalizado
  if (err.isOperational) {
    return res.status(err.statusCode || 500).json({
      error: err.name || 'Error',
      message: err.message
    });
  }

  // Error por defecto
  res.status(error.statusCode || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : error.message || 'Internal server error'
  });
};

// Manejador de errores asíncronos
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Manejador de rutas no encontradas
const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = errorHandler;

// Exportar funciones adicionales si se necesitan
module.exports.asyncHandler = asyncHandler;
module.exports.notFound = notFound;
