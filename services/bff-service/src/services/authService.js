const axios = require('axios');
const NodeCache = require('node-cache');
const { publishEvent } = require('../utils/rabbitmq');

/**
 * Servicio de autenticación para el BFF
 * @class AuthService
 * @description Gestiona la comunicación con el auth-service y caché de sesiones
 */

// Configuración de caché
const cache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL_SECONDS) || 300, // 5 minutos
  checkperiod: 60, // Limpiar cada minuto
  useClones: false
});

// Configuración de Axios para el auth-service
const authApiClient = axios.create({
  baseURL: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Inicia sesión de usuario
 * @param {Object} loginData - Datos de login
 * @param {string} loginData.email - Email del usuario
 * @param {string} loginData.password - Contraseña
 * @param {string} loginData.ipAddress - Dirección IP
 * @param {string} loginData.userAgent - User Agent
 * @returns {Promise<Object>} Datos de autenticación
 * @throws {Error} Si las credenciales son inválidas
 * @example
 * const authData = await AuthService.login({
 *   email: 'user@example.com',
 *   password: 'password123',
 *   ipAddress: '192.168.1.1',
 *   userAgent: 'Mozilla/5.0...'
 * });
 */
const login = async (loginData) => {
  try {
    // Publicar evento de intento de login
    await publishEvent('user.login.attempt', {
      email: loginData.email,
      ipAddress: loginData.ipAddress,
      timestamp: new Date().toISOString()
    });

    // Verificar caché de intentos fallidos
    const cacheKey = `login_attempts:${loginData.email}`;
    const attempts = cache.get(cacheKey) || 0;
    
    if (attempts >= 5) {
      throw new Error('Demasiados intentos de login. Por favor espere 5 minutos.');
    }

    // Hacer login en el auth-service
    const response = await authApiClient.post('/api/auth/login', loginData);
    const authData = response.data.data;

    // Cachear sesión del usuario
    const sessionKey = `session:${authData.user.id}`;
    cache.set(sessionKey, {
      user: authData.user,
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
      loginTime: new Date().toISOString()
    });

    // Publicar evento de login exitoso
    await publishEvent('user.login.success', {
      userId: authData.user.id,
      email: authData.user.email,
      role: authData.user.role,
      ipAddress: loginData.ipAddress,
      timestamp: new Date().toISOString()
    });

    // Limpiar intentos fallidos
    cache.del(cacheKey);

    return {
      success: true,
      message: 'Login exitoso',
      data: authData
    };
  } catch (error) {
    // Incrementar intentos fallidos
    const cacheKey = `login_attempts:${loginData.email}`;
    const attempts = cache.get(cacheKey) || 0;
    cache.set(cacheKey, attempts + 1);

    // Publicar evento de login fallido
    await publishEvent('user.login.failed', {
      email: loginData.email,
      ipAddress: loginData.ipAddress,
      reason: error.message,
      timestamp: new Date().toISOString()
    });

    throw error;
  }
};

/**
 * Refresca el token de acceso
 * @param {string} refreshToken - Token de refresco
 * @returns {Promise<Object>} Nuevos tokens
 * @throws {Error} Si el token de refresco es inválido
 * @example
 * const tokens = await AuthService.refreshToken('refresh_token_here');
 */
const refreshToken = async (refreshToken) => {
  try {
    const response = await authApiClient.post('/api/auth/refresh', {
      refreshToken
    });

    const tokens = response.data.data;

    // Actualizar caché si existe sesión
    const sessionKey = `session:${tokens.user.id}`;
    const cachedSession = cache.get(sessionKey);
    
    if (cachedSession) {
      cache.set(sessionKey, {
        ...cachedSession,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        lastRefresh: new Date().toISOString()
      });
    }

    // Publicar evento de refresco de token
    await publishEvent('user.token.refreshed', {
      userId: tokens.user.id,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Token refrescado exitosamente',
      data: tokens
    };
  } catch (error) {
    // Si el refresh token es inválido, limpiar caché
    if (error.response?.status === 401) {
      // Buscar y eliminar sesión por refresh token
      const keys = cache.keys();
      for (const key of keys) {
        const session = cache.get(key);
        if (session?.refreshToken === refreshToken) {
          cache.del(key);
          break;
        }
      }
    }

    throw error;
  }
};

/**
 * Cierra sesión de usuario
 * @param {string} token - Token de acceso
 * @returns {Promise<Object>} Resultado del logout
 * @throws {Error} Si el token es inválido
 * @example
 * const result = await AuthService.logout('access_token_here');
 */
const logout = async (token) => {
  try {
    const response = await authApiClient.post('/api/auth/logout', {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Extraer ID del usuario del token y limpiar caché
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const sessionKey = `session:${payload.id}`;
      cache.del(sessionKey);
    } catch (e) {
      // Ignorar error al decodificar token
    }

    // Publicar evento de logout
    await publishEvent('user.logout', {
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      message: response.data.message || 'Logout exitoso',
      data: null
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene el perfil del usuario
 * @param {string} token - Token de acceso
 * @returns {Promise<Object>} Datos del perfil del usuario
 * @throws {Error} Si el token es inválido
 * @example
 * const profile = await AuthService.getProfile('access_token_here');
 */
const getProfile = async (token) => {
  try {
    // Verificar caché primero
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const sessionKey = `session:${payload.id}`;
      const cachedSession = cache.get(sessionKey);
      
      if (cachedSession && cachedSession.accessToken === token) {
        // Publicar evento de cache hit
        await publishEvent('cache.hit', {
          type: 'user_profile',
          userId: payload.id,
          timestamp: new Date().toISOString()
        });

        return {
          success: true,
          message: 'Perfil obtenido desde caché',
          data: { profile: cachedSession.user }
        };
      }
    } catch (e) {
      // Continuar con llamada al servicio
    }

    // Llamar al auth-service
    const response = await authApiClient.get('/api/auth/profile', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const profile = response.data.data.profile;

    // Actualizar caché
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const sessionKey = `session:${payload.id}`;
      const cachedSession = cache.get(sessionKey);
      
      if (cachedSession) {
        cache.set(sessionKey, {
          ...cachedSession,
          user: profile
        });
      }
    } catch (e) {
      // Ignorar error al actualizar caché
    }

    // Publicar evento de cache miss
    await publishEvent('cache.miss', {
      type: 'user_profile',
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Perfil obtenido exitosamente',
      data: { profile }
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Valida un token JWT
 * @param {string} token - Token JWT
 * @returns {Promise<Object>} Datos del token decodificado
 * @throws {Error} Si el token es inválido
 * @example
 * const tokenData = await AuthService.validateToken('access_token_here');
 */
const validateToken = async (token) => {
  try {
    // Primero verificar caché
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const sessionKey = `session:${payload.id}`;
      const cachedSession = cache.get(sessionKey);
      
      if (cachedSession && cachedSession.accessToken === token) {
        return {
          success: true,
          data: {
            id: payload.id,
            email: payload.email,
            role: payload.role,
            firstName: payload.firstName,
            lastName: payload.lastName
          }
        };
      }
    } catch (e) {
      // Continuar con validación del servicio
    }

    // Validar con el auth-service
    const response = await authApiClient.get('/api/auth/validate', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene estadísticas de autenticación
 * @returns {Promise<Object>} Estadísticas del servicio
 * @example
 * const stats = await AuthService.getStats();
 */
const getStats = async () => {
  try {
    const response = await authApiClient.get('/api/auth/stats');
    return {
      success: true,
      message: 'Estadísticas obtenidas exitosamente',
      data: response.data.data.stats
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  login,
  refreshToken,
  logout,
  getProfile,
  validateToken,
  getStats
};
