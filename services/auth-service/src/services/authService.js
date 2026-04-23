const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/UserRepository');
const RefreshTokenRepository = require('../repositories/RefreshTokenRepository');
const SessionRepository = require('../repositories/SessionRepository');
const { pool } = require('../config/database');
const { publishEvent } = require('../utils/rabbitmq');

// Instanciar repositories
const userRepository = new UserRepository(pool);
const refreshTokenRepository = new RefreshTokenRepository(pool);
const sessionRepository = new SessionRepository(pool);

/**
 * Servicio de autenticación que maneja la lógica de negocio de usuarios
 * @class AuthService
 * @description Proporciona funcionalidades de registro, login, gestión de tokens y perfiles de usuario
 */
class AuthService {
  /**
   * Registra un nuevo usuario en el sistema
   * @param {Object} userData - Datos del nuevo usuario
   * @param {string} userData.email - Correo electrónico del usuario
   * @param {string} userData.password - Contraseña del usuario
   * @param {string} userData.firstName - Nombre del usuario
   * @param {string} userData.lastName - Apellido del usuario
   * @param {string} [userData.role='client'] - Rol del usuario (admin, veterinarian, client)
   * @param {string} [userData.phone] - Teléfono del usuario
   * @returns {Promise<Object>} Datos del usuario creado
   * @throws {Error} Si el usuario ya existe
   * @example
   * const user = await AuthService.register({
   *   email: 'user@example.com',
   *   password: 'Password123!',
   *   firstName: 'John',
   *   lastName: 'Doe'
   * });
   */
  static async register(userData) {
    const { email, password, firstName, lastName, role = 'client', phone } = userData;

    // Validar que el usuario no exista
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Crear usuario
    const user = await userRepository.create({
      email,
      password,
      firstName,
      lastName,
      role,
      phone
    });

    // Publicar evento de usuario creado
    await publishEvent('user.created', {
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      createdAt: user.created_at
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      phone: user.phone,
      isActive: user.is_active,
      createdAt: user.created_at
    };
  }

  /**
   * Inicia sesión de un usuario
   * @param {string} email - Correo electrónico del usuario
   * @param {string} password - Contraseña del usuario
   * @param {string} ipAddress - Dirección IP del cliente
   * @param {string} userAgent - User agent del cliente
   * @returns {Promise<Object>} Datos del usuario y tokens de acceso
   * @throws {Error} Si las credenciales son inválidas o la cuenta está desactivada
   * @example
   * const result = await AuthService.login(
   *   'user@example.com',
   *   'Password123!',
   *   '127.0.0.1',
   *   'Mozilla/5.0...'
   * );
   */
  static async login(email, password, ipAddress, userAgent) {
    // Buscar usuario
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verificar si el usuario está activo
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Validar password
    const isValidPassword = await userRepository.validatePassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Actualizar último login
    await userRepository.updateLastLogin(user.id);

    // Generar tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken();

    // Guardar refresh token
    await refreshTokenRepository.create(user.id, refreshToken);

    // Crear sesión
    await sessionRepository.create(user.id, accessToken, ipAddress, userAgent);

    // Publicar evento de login
    await publishEvent('user.login', {
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        phone: user.phone,
        lastLogin: user.last_login
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    };
  }

  /**
   * Refresca los tokens de acceso usando un refresh token
   * @param {string} refreshTokenString - Token de refresh válido
   * @returns {Promise<Object>} Nuevos tokens de acceso
   * @throws {Error} Si el refresh token es inválido
   * @example
   * const tokens = await AuthService.refreshToken('refresh-token-string');
   */
  static async refreshToken(refreshTokenString) {
    // Buscar refresh token
    const tokenData = await refreshTokenRepository.findByToken(refreshTokenString);
    if (!tokenData) {
      throw new Error('Invalid refresh token');
    }

    // Verificar que el usuario esté activo
    if (!tokenData.is_active) {
      throw new Error('Account is deactivated');
    }

    // Generar nuevos tokens
    const newAccessToken = this.generateAccessToken({
      id: tokenData.user_id,
      email: tokenData.email,
      role: tokenData.role
    });
    const newRefreshToken = this.generateRefreshToken();

    // Revocar el refresh token anterior
    await refreshTokenRepository.revokeToken(tokenData.id);

    // Crear nuevo refresh token
    await refreshTokenRepository.create(tokenData.user_id, newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    };
  }

  static async logout(accessToken) {
    // Buscar y desactivar sesión
    const session = await sessionRepository.findByToken(accessToken);
    if (session) {
      await sessionRepository.deactivateSession(session.id);

      // Publicar evento de logout
      await publishEvent('user.logout', {
        userId: session.user_id,
        timestamp: new Date().toISOString()
      });
    }

    return { message: 'Logged out successfully' };
  }

  static async logoutAllSessions(userId) {
    // Desactivar todas las sesiones del usuario
    await sessionRepository.deactivateAllUserSessions(userId);
    await refreshTokenRepository.revokeAllUserTokens(userId);

    // Publicar evento de logout de todas las sesiones
    await publishEvent('user.logout.all', {
      userId,
      timestamp: new Date().toISOString()
    });

    return { message: 'All sessions logged out successfully' };
  }

  /**
   * Valida un token JWT y verifica que la sesión esté activa
   * @param {string} token - Token JWT a validar
   * @returns {Promise<Object>} Datos del usuario decodificados
   * @throws {Error} Si el token es inválido o la sesión no existe
   * @example
   * const userData = await AuthService.validateToken('jwt-token');
   */
  static async validateToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verificar que la sesión esté activa
      const session = await sessionRepository.findByToken(token);
      if (!session) {
        throw new Error('Session not found or expired');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static async changePassword(userId, currentPassword, newPassword) {
    // Obtener usuario
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validar password actual
    const isValidPassword = await userRepository.validatePassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Cambiar password
    await userRepository.changePassword(userId, newPassword);

    // Cerrar todas las sesiones excepto la actual
    await refreshTokenRepository.revokeAllUserTokens(userId);

    // Publicar evento de cambio de password
    await publishEvent('user.password.changed', {
      userId,
      timestamp: new Date().toISOString()
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Obtiene el perfil de un usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object>} Datos del perfil del usuario
   * @throws {Error} Si el usuario no existe
   * @example
   * const profile = await AuthService.getProfile(1);
   */
  static async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      phone: user.phone,
      isActive: user.is_active,
      createdAt: user.created_at,
      lastLogin: user.last_login
    };
  }

  static async updateProfile(userId, profileData) {
    const { firstName, lastName, phone } = profileData;

    const updatedUser = await userRepository.updateProfile(userId, {
      firstName,
      lastName,
      phone
    });

    // Publicar evento de actualización de perfil
    await publishEvent('user.profile.updated', {
      userId,
      firstName,
      lastName,
      phone,
      timestamp: new Date().toISOString()
    });

    return updatedUser;
  }

  static async getUserSessions(userId) {
    return await sessionRepository.getUserActiveSessions(userId);
  }

  static generateAccessToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
  }

  static generateRefreshToken() {
    return require('crypto').randomBytes(64).toString('hex');
  }
}

module.exports = AuthService;
