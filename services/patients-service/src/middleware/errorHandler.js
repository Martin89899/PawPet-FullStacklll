const { publishEvent } = require('../utils/rabbitmq');

/**
 * Manejador centralizado de errores para el Patients Service
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
  console.error('Error en Patients Service:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user
  });

  // Publicar evento de error para monitoreo
  try {
    await publishEvent('error.occurred', {
      service: 'patients-service',
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

  // Errores de base de datos PostgreSQL
  if (err.code === '23505') {
    // Violación de constraint unique
    const constraint = err.constraint;
    let field = '';
    let message = 'Registro duplicado';

    if (constraint.includes('email')) {
      field = 'email';
      message = 'El email ya está registrado';
    } else if (constraint.includes('identification_number')) {
      field = 'identificationNumber';
      message = 'El número de identificación ya está registrado';
    } else if (constraint.includes('microchip_number')) {
      field = 'microchipNumber';
      message = 'El número de microchip ya está registrado';
    }

    return res.status(409).json({
      success: false,
      error: 'Duplicate Entry',
      message,
      details: field ? [{ field, message }] : []
    });
  }

  if (err.code === '23503') {
    // Violación de foreign key
    const table = err.table;
    let message = 'Referencia inválida';

    if (table === 'tutors') {
      message = 'El tutor especificado no existe';
    } else if (table === 'patients') {
      message = 'El paciente especificado no existe';
    } else if (table === 'users') {
      message = 'El veterinario especificado no existe';
    }

    return res.status(400).json({
      success: false,
      error: 'Foreign Key Violation',
      message
    });
  }

  if (err.code === '23502') {
    // Violación de not null
    return res.status(400).json({
      success: false,
      error: 'Required Field Missing',
      message: 'Campo requerido faltante'
    });
  }

  // Errores de conexión a base de datos
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    return res.status(503).json({
      success: false,
      error: 'Database Connection Error',
      message: 'Error de conexión a la base de datos'
    });
  }

  // Errores de autenticación (si se implementa middleware de auth)
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

  // Errores de archivos (multer)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File Size Error',
      message: 'El archivo excede el tamaño máximo permitido'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(413).json({
      success: false,
      error: 'File Count Error',
      message: 'Se excedió el número máximo de archivos permitidos'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'File Field Error',
      message: 'Campo de archivo inesperado'
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
