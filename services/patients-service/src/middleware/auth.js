const jwt = require('jsonwebtoken');
const { AuthorizationError, NotFoundError } = require('./errorHandler');

/**
 * Middleware de autenticación para el Patients Service
 * @class AuthMiddleware
 * @description Valida tokens JWT y gestiona la autorización basada en roles
 */

/**
 * Valida el token JWT del usuario
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Next function de Express
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new AuthorizationError('Token de autenticación requerido');
    }

    // Validar el token con el auth service
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

    // Aquí podríamos hacer una llamada al auth service para validar el token
    // y obtener información actualizada del usuario
    
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

    return res.status(500).json({
      success: false,
      error: 'Authentication Error',
      message: 'Error en la autenticación'
    });
  }
};

/**
 * Verifica si el usuario tiene los roles requeridos
 * @param {Array<string>} roles - Roles permitidos
 * @returns {Function} Middleware de Express
 */
const authorizeRoles = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Error',
        message: 'Usuario no autenticado'
      });
    }

    if (!roles.includes(req.user.role)) {
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
 * Verifica si el usuario puede acceder a un recurso específico
 * @param {string} resourceType - Tipo de recurso (patient, tutor, etc.)
 * @returns {Function} Middleware de Express
 */
const authorizeOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication Error',
          message: 'Usuario no autenticado'
        });
      }

      // Los administradores pueden acceder a todo
      if (req.user.role === 'admin') {
        return next();
      }

      const resourceId = req.params.id || req.params.patientId || req.params.tutorId;

      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'ID del recurso requerido'
        });
      }

      // Aquí se implementaría la lógica específica según el tipo de recurso
      // Por ahora, permitimos acceso a veterinarios y clientes con ciertas restricciones
      switch (resourceType) {
        case 'patient':
          await authorizePatientAccess(req, resourceId);
          break;
        case 'tutor':
          await authorizeTutorAccess(req, resourceId);
          break;
        case 'clinical_history':
          await authorizeClinicalHistoryAccess(req, resourceId);
          break;
        default:
          throw new AuthorizationError('Tipo de recurso no válido');
      }

      next();
    } catch (error) {
      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return res.status(error.statusCode || 403).json({
          success: false,
          error: error.constructor.name.replace('Error', ' Error'),
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Authorization Error',
        message: 'Error en la autorización'
      });
    }
  };
};

/**
 * Autoriza el acceso a pacientes
 * @param {Object} req - Request de Express
 * @param {number} patientId - ID del paciente
 */
async function authorizePatientAccess(req, patientId) {
  const { pool } = require('../config/database');
  
  // Veterinarios pueden acceder a todos los pacientes
  if (req.user.role === 'veterinarian') {
    return;
  }

  // Clientes solo pueden acceder a sus propios pacientes
  if (req.user.role === 'client') {
    const query = `
      SELECT p.id 
      FROM patients p
      JOIN tutors t ON p.tutor_id = t.id
      WHERE p.id = $1 AND t.email = $2 AND p.is_active = true AND t.is_active = true
    `;
    
    const result = await pool.query(query, [patientId, req.user.email]);
    
    if (result.rows.length === 0) {
      throw new AuthorizationError('No tienes permisos para acceder a este paciente');
    }
    return;
  }

  throw new AuthorizationError('Rol no válido para acceder a pacientes');
}

/**
 * Autoriza el acceso a tutores
 * @param {Object} req - Request de Express
 * @param {number} tutorId - ID del tutor
 */
async function authorizeTutorAccess(req, tutorId) {
  const { pool } = require('../config/database');
  
  // Veterinarios y administradores pueden acceder a todos los tutores
  if (['veterinarian', 'admin'].includes(req.user.role)) {
    return;
  }

  // Clientes solo pueden acceder a su propio tutor
  if (req.user.role === 'client') {
    const query = `
      SELECT id FROM tutors 
      WHERE id = $1 AND email = $2 AND is_active = true
    `;
    
    const result = await pool.query(query, [tutorId, req.user.email]);
    
    if (result.rows.length === 0) {
      throw new AuthorizationError('No tienes permisos para acceder a este tutor');
    }
    return;
  }

  throw new AuthorizationError('Rol no válido para acceder a tutores');
}

/**
 * Autoriza el acceso al historial clínico
 * @param {Object} req - Request de Express
 * @param {number} historyId - ID del historial clínico
 */
async function authorizeClinicalHistoryAccess(req, historyId) {
  const { pool } = require('../config/database');
  
  // Veterinarios pueden acceder a todo el historial clínico
  if (req.user.role === 'veterinarian') {
    return;
  }

  // Clientes solo pueden acceder al historial de sus propios pacientes
  if (req.user.role === 'client') {
    const query = `
      SELECT ch.id 
      FROM clinical_history ch
      JOIN patients p ON ch.patient_id = p.id
      JOIN tutors t ON p.tutor_id = t.id
      WHERE ch.id = $1 AND t.email = $2 AND p.is_active = true AND t.is_active = true
    `;
    
    const result = await pool.query(query, [historyId, req.user.email]);
    
    if (result.rows.length === 0) {
      throw new AuthorizationError('No tienes permisos para acceder a este historial clínico');
    }
    return;
  }

  throw new AuthorizationError('Rol no válido para acceder al historial clínico');
}

/**
 * Middleware para verificar si el usuario es veterinario o administrador
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Next function de Express
 */
const requireVeterinarianOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: 'Usuario no autenticado'
    });
  }

  if (!['veterinarian', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Authorization Error',
      message: 'Esta acción requiere rol de veterinario o administrador'
    });
  }

  next();
};

/**
 * Middleware para verificar si el usuario es administrador
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Next function de Express
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: 'Usuario no autenticado'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Authorization Error',
      message: 'Esta acción requiere rol de administrador'
    });
  }

  next();
};

/**
 * Middleware opcional de autenticación
 * No lanza error si no hay token, pero lo procesa si existe
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Next function de Express
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        firstName: decoded.firstName,
        lastName: decoded.lastName
      };
    }
  } catch (error) {
    // Ignorar errores de autenticación en modo opcional
    console.log('Error en autenticación opcional:', error.message);
  }

  next();
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeOwnership,
  requireVeterinarianOrAdmin,
  requireAdmin,
  optionalAuth
};
