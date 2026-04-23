const AuthService = require('../services/authService');
const UserRepository = require('../repositories/UserRepository');
const { pool } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

// Instanciar repository para métodos de administrador
const userRepository = new UserRepository(pool);

class AuthController {
  static register = asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName, role, phone } = req.body;

    const user = await AuthService.register({
      email,
      password,
      firstName,
      lastName,
      role,
      phone
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user
      }
    });
  });

  static login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    const result = await AuthService.login(email, password, ipAddress, userAgent);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  });

  static refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    const tokens = await AuthService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens
    });
  });

  static logout = asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    const result = await AuthService.logout(token);

    res.status(200).json({
      success: true,
      message: result.message,
      data: null
    });
  });

  static logoutAll = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const result = await AuthService.logoutAllSessions(userId);

    res.status(200).json({
      success: true,
      message: result.message,
      data: null
    });
  });

  static getProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const profile = await AuthService.getProfile(userId);

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: { profile }
    });
  });

  static updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { firstName, lastName, phone } = req.body;

    const updatedProfile = await AuthService.updateProfile(userId, {
      firstName,
      lastName,
      phone
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedProfile }
    });
  });

  static changePassword = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const result = await AuthService.changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: result.message,
      data: null
    });
  });

  static getSessions = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const sessions = await AuthService.getUserSessions(userId);

    res.status(200).json({
      success: true,
      message: 'Sessions retrieved successfully',
      data: { sessions }
    });
  });

  static validateToken = asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    const decoded = await AuthService.validateToken(token);

    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: { user: decoded }
    });
  });

  // Métodos para administradores
  static getAllUsers = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const users = await userRepository.getAllUsers(limit, offset);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: { users, pagination: { page, limit } }
    });
  });

  static getUsersByRole = asyncHandler(async (req, res) => {
    const { role } = req.params;

    const users = await userRepository.getUsersByRole(role);

    res.status(200).json({
      success: true,
      message: `Users with role ${role} retrieved successfully`,
      data: { users }
    });
  });

  static searchUsers = asyncHandler(async (req, res) => {
    const { q: searchTerm } = req.query;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    const users = await userRepository.searchUsers(searchTerm);

    res.status(200).json({
      success: true,
      message: 'Search results retrieved successfully',
      data: { users }
    });
  });

  static deactivateUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    await userRepository.deactivateUser(parseInt(userId));

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
      data: null
    });
  });
}

module.exports = AuthController;
