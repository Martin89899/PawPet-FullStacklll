const { publishEvent } = require('../utils/rabbitmq');

/**
 * Manejador centralizado de errores para el BFF Service
 * @class ErrorHandler
 * @description Procesa y formatea errores de manera consistente
 */

/**
 * Manejador asíncrono de errores para controladores
 * @param {Function} fn - Función asíncrona a ejecutar
 * @returns {Function} Middleware de Express
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Manejador principal de errores
 * @param {Error} err - Error capturado
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Next function de Express
 */
const errorHandler = async (err, req, res, next) => {
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

  // Publicar evento de error para monitoreo
  try {
    await publishEvent('error.occurred', {
      service: 'bff-service',
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  } catch (publishError) {
    console.error('Error al publicar evento de error:', publishError);
  }

  // Errores de validación de Joi
  if (err.name === 'ValidationError' && err.isJoi) {
    const message = 'Error de validación';
    const details = err.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message,
      details
    });
  }

  // Errores de conexión a servicios externos
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    return res.status(503).json({
      success: false,
      error: 'Service Unavailable',
      message: 'Servicio externo no disponible temporalmente'
    });
  }

  // Errores de autenticación
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: 'Token inválido'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: 'Token expirado'
    });
  }

  // Errores de autorización
  if (err.name === 'AuthorizationError') {
    return res.status(403).json({
      success: false,
      error: 'Authorization Error',
      message: 'No tienes permisos para realizar esta acción'
    });
  }

  // Errores de servicios externos
  if (err.response) {
    const statusCode = err.response.status || 500;
    const message = err.response.data?.message || 'Error en servicio externo';
    
    return res.status(statusCode).json({
      success: false,
      error: 'External Service Error',
      message,
      service: err.config?.url?.split('/')[2] || 'unknown'
    });
  }

  // Errores personalizados de negocio
  if (err.name === 'BusinessError') {
    return res.status(400).json({
      success: false,
      error: 'Business Logic Error',
      message: err.message
    });
  }

  // Errores de recursos no encontrados
  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      success: false,
      error: 'Resource Not Found',
      message: err.message || 'Recurso no encontrado'
    });
  }

  // Error por defecto
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Error interno del servidor' 
    : err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    success: false,
    error: 'Internal Server Error',
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

/**
 * Manejador de errores 404 (Not Found)
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Next function de Express
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Ruta ${req.method} ${req.originalUrl} no encontrada`
  });
};

/**
 * Clase personalizada para errores de negocio
 * @class BusinessError
 * @extends Error
 */
class BusinessError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'BusinessError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Clase personalizada para errores de recursos no encontrados
 * @class NotFoundError
 * @extends Error
 */
class NotFoundError extends Error {
  constructor(message = 'Recurso no encontrado') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Clase personalizada para errores de autorización
 * @class AuthorizationError
 * @extends Error
 */
class AuthorizationError extends Error {
  constructor(message = 'No autorizado') {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  asyncHandler,
  errorHandler,
  notFoundHandler,
  BusinessError,
  NotFoundError,
  AuthorizationError
};
