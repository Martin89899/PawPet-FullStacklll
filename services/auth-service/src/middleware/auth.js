const AuthService = require('../services/authService');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied',
        message: 'No token provided' 
      });
    }

    const decoded = await AuthService.validateToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      error: 'Access denied',
      message: 'Invalid or expired token' 
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Access denied',
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

const authorizeOwnership = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Access denied',
        message: 'Authentication required' 
      });
    }

    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    // Los administradores pueden acceder a cualquier recurso
    if (req.user.role === 'admin') {
      return next();
    }

    // Los usuarios solo pueden acceder a sus propios recursos
    if (parseInt(resourceUserId) !== req.user.id) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only access your own resources' 
      });
    }

    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = await AuthService.validateToken(token);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Si el token es inválido, continuamos sin usuario autenticado
    next();
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeOwnership,
  optionalAuth
};
