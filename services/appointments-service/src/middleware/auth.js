const jwt = require('jsonwebtoken');
const { AuthorizationError } = require('./errorHandler');

/**
 * Middleware de autenticación y autorización para el Appointments Service
 * @class AuthMiddleware
 * @description Gestiona la validación de tokens JWT y control de acceso
 */

/**
 * Middleware de autenticación JWT
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Next function de Express
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new AuthorizationError('Token de autenticación no proporcionado');
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new AuthorizationError('Formato de token inválido');
    }

    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Agregar información del usuario al request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      firstName: decoded.firstName,
      lastName: decoded.lastName
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Authentication Error',
        message: 'Token inválido'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Authentication Error',
        message: 'Token expirado'
      });
    }

    if (error instanceof AuthorizationError) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Error',
        message: error.message
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: 'Error de autenticación'
    });
  }
};

/**
 * Middleware de autorización por roles
 * @param {Array<string>} allowedRoles - Roles permitidos
 * @returns {Function} Middleware de Express
 */
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authorization Error',
        message: 'Usuario no autenticado'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Authorization Error',
        message: 'No tienes permisos para realizar esta acción'
      });
    }

    next();
  };
};

/**
 * Middleware para verificar si el usuario es veterinario
 * @returns {Function} Middleware de Express
 */
const requireVeterinarian = authorize(['veterinarian', 'admin']);

/**
 * Middleware para verificar si el usuario es administrador
 * @returns {Function} Middleware de Express
 */
const requireAdmin = authorize(['admin']);

/**
 * Middleware para verificar si el usuario es cliente
 * @returns {Function} Middleware de Express
 */
const requireClient = authorize(['client', 'admin']);

/**
 * Middleware para verificar si el usuario puede ver sus propias citas
 * @returns {Function} Middleware de Express
 */
const requireOwnAppointmentAccess = async (req, res, next) => {
  try {
    // Aquí se podría verificar si el usuario tiene acceso a la cita específica
    // Por ahora, permitimos acceso a veterinarios y administradores
    if (['veterinarian', 'admin'].includes(req.user.role)) {
      return next();
    }

    // Para clientes, verificaría que la cita pertenezca a sus pacientes
    // Esta lógica se implementaría en el servicio
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Authorization Error',
      message: 'No tienes permisos para acceder a esta cita'
    });
  }
};

/**
 * Middleware para verificar si el usuario puede gestionar el calendario de un veterinario específico
 * @returns {Function} Middleware de Express
 */
const requireCalendarAccess = async (req, res, next) => {
  try {
    const veterinarianId = parseInt(req.params.veterinarianId);
    
    // Si es administrador, tiene acceso a todo
    if (req.user.role === 'admin') {
      return next();
    }

    // Si es veterinario, solo puede ver su propio calendario
    if (req.user.role === 'veterinarian') {
      // Aquí se debería verificar que veterinarianId corresponda al usuario
      // Por ahora, permitimos acceso
      return next();
    }

    // Los clientes no tienen acceso a calendarios de veterinarios
    return res.status(403).json({
      success: false,
      error: 'Authorization Error',
      message: 'No tienes permisos para acceder a este calendario'
    });
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Authorization Error',
      message: 'Error de autorización'
    });
  }
};

/**
 * Middleware para verificar si el usuario puede crear citas
 * @returns {Function} Middleware de Express
 */
const requireAppointmentCreation = (req, res, next) => {
  try {
    // Veterinarios y administradores pueden crear citas
    if (['veterinarian', 'admin'].includes(req.user.role)) {
      return next();
    }

    // Los clientes pueden crear citas pero solo para sus propios pacientes
    if (req.user.role === 'client') {
      // Aquí se verificaría que el paciente pertenezca al cliente
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Authorization Error',
      message: 'No tienes permisos para crear citas'
    });
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Authorization Error',
      message: 'Error de autorización'
    });
  }
};

/**
 * Middleware opcional de autenticación (no lanza error si no hay token)
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Next function de Express
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      firstName: decoded.firstName,
      lastName: decoded.lastName
    };

    next();
  } catch (error) {
    // En auth opcional, si el token es inválido, simplemente continuamos sin usuario
    next();
  }
};

module.exports = {
  authMiddleware,
  authorize,
  requireVeterinarian,
  requireAdmin,
  requireClient,
  requireOwnAppointmentAccess,
  requireCalendarAccess,
  requireAppointmentCreation,
  optionalAuth
};
