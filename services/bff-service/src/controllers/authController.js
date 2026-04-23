const AuthService = require('../services/authService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Controladores de autenticación para el BFF
 * @class AuthController
 * @description Maneja las solicitudes HTTP de autenticación con agregación de datos
 */
class AuthController {
  /**
   * Inicia sesión de usuario
   */
  static login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    // Obtener información adicional del request
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const result = await AuthService.login({
      email,
      password,
      ipAddress,
      userAgent
    });

    res.status(200).json(result);
  });

  /**
   * Refresca el token de acceso
   */
  static refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    const result = await AuthService.refreshToken(refreshToken);

    res.status(200).json(result);
  });

  /**
   * Cierra sesión de usuario
   */
  static logout = asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    const result = await AuthService.logout(token);

    res.status(200).json(result);
  });

  /**
   * Obtiene el perfil del usuario autenticado
   */
  static getProfile = asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    const result = await AuthService.getProfile(token);

    res.status(200).json(result);
  });

  /**
   * Valida un token JWT
   */
  static validateToken = asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    const result = await AuthService.validateToken(token);

    res.status(200).json(result);
  });

  /**
   * Obtiene estadísticas de autenticación
   */
  static getStats = asyncHandler(async (req, res) => {
    const result = await AuthService.getStats();

    res.status(200).json(result);
  });
}

module.exports = AuthController;
