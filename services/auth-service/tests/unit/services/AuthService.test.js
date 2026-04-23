const AuthService = require('../../../src/services/authService');
const UserRepository = require('../../../src/repositories/UserRepository');
const RefreshTokenRepository = require('../../../src/repositories/RefreshTokenRepository');
const SessionRepository = require('../../../src/repositories/SessionRepository');
const { validUser, mockUserResponse, mockLoginResponse } = require('../../fixtures/userFixtures');

// Mock de los repositories
jest.mock('../../../src/repositories/UserRepository');
jest.mock('../../../src/repositories/RefreshTokenRepository');
jest.mock('../../../src/repositories/SessionRepository');

// Mock de JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn().mockReturnValue({ id: 1, email: 'test@example.com', role: 'client' })
}));

// Mock de RabbitMQ
jest.mock('../../../src/utils/rabbitmq', () => ({
  publishEvent: jest.fn().mockResolvedValue(true)
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Mock del repository
      UserRepository.findByEmail.mockResolvedValue(null);
      UserRepository.create.mockResolvedValue(mockUserResponse);

      const result = await AuthService.register(validUser);

      expect(UserRepository.findByEmail).toHaveBeenCalledWith(validUser.email);
      expect(UserRepository.create).toHaveBeenCalledWith(validUser);
      expect(result).toEqual({
        id: mockUserResponse.id,
        email: mockUserResponse.email,
        firstName: mockUserResponse.first_name,
        lastName: mockUserResponse.last_name,
        role: mockUserResponse.role,
        phone: mockUserResponse.phone,
        isActive: mockUserResponse.is_active,
        createdAt: mockUserResponse.created_at
      });
    });

    it('should throw error if user already exists', async () => {
      UserRepository.findByEmail.mockResolvedValue(mockUserResponse);

      await expect(AuthService.register(validUser)).rejects.toThrow('User already exists');
      expect(UserRepository.create).not.toHaveBeenCalled();
    });

    it('should publish user.created event', async () => {
      UserRepository.findByEmail.mockResolvedValue(null);
      UserRepository.create.mockResolvedValue(mockUserResponse);

      await AuthService.register(validUser);

      const { publishEvent } = require('../../../src/utils/rabbitmq');
      expect(publishEvent).toHaveBeenCalledWith('user.created', expect.objectContaining({
        userId: mockUserResponse.id,
        email: mockUserResponse.email,
        role: mockUserResponse.role
      }));
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const mockUserWithHash = {
        ...mockUserResponse,
        password_hash: 'hashed-password',
        is_active: true
      };

      UserRepository.findByEmail.mockResolvedValue(mockUserWithHash);
      UserRepository.validatePassword.mockResolvedValue(true);
      UserRepository.updateLastLogin.mockResolvedValue(new Date());
      RefreshTokenRepository.create.mockResolvedValue({ id: 1 });
      SessionRepository.create.mockResolvedValue({ id: 1 });

      const result = await AuthService.login('test@example.com', 'password', '127.0.0.1', 'test-agent');

      expect(UserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(UserRepository.validatePassword).toHaveBeenCalledWith('password', 'hashed-password');
      expect(UserRepository.updateLastLogin).toHaveBeenCalledWith(mockUserWithHash.id);
      expect(RefreshTokenRepository.create).toHaveBeenCalled();
      expect(SessionRepository.create).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
    });

    it('should throw error for invalid credentials', async () => {
      UserRepository.findByEmail.mockResolvedValue(null);

      await expect(AuthService.login('test@example.com', 'password', '127.0.0.1', 'test-agent'))
        .rejects.toThrow('Invalid credentials');
    });

    it('should throw error for inactive user', async () => {
      const inactiveUser = { ...mockUserResponse, is_active: false };
      UserRepository.findByEmail.mockResolvedValue(inactiveUser);

      await expect(AuthService.login('test@example.com', 'password', '127.0.0.1', 'test-agent'))
        .rejects.toThrow('Account is deactivated');
    });

    it('should throw error for invalid password', async () => {
      const mockUserWithHash = {
        ...mockUserResponse,
        password_hash: 'hashed-password',
        is_active: true
      };

      UserRepository.findByEmail.mockResolvedValue(mockUserWithHash);
      UserRepository.validatePassword.mockResolvedValue(false);

      await expect(AuthService.login('test@example.com', 'wrong-password', '127.0.0.1', 'test-agent'))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockTokenData = {
        id: 1,
        user_id: 1,
        email: 'test@example.com',
        role: 'client',
        is_active: true
      };

      RefreshTokenRepository.findByToken.mockResolvedValue(mockTokenData);
      RefreshTokenRepository.revokeToken.mockResolvedValue(true);
      RefreshTokenRepository.create.mockResolvedValue({ id: 2 });

      const result = await AuthService.refreshToken('refresh-token');

      expect(RefreshTokenRepository.findByToken).toHaveBeenCalledWith('refresh-token');
      expect(RefreshTokenRepository.revokeToken).toHaveBeenCalledWith(1);
      expect(RefreshTokenRepository.create).toHaveBeenCalledWith(1, expect.any(String));
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw error for invalid refresh token', async () => {
      RefreshTokenRepository.findByToken.mockResolvedValue(null);

      await expect(AuthService.refreshToken('invalid-token')).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const mockSession = {
        id: 1,
        user_id: 1
      };

      SessionRepository.findByToken.mockResolvedValue(mockSession);
      SessionRepository.deactivateSession.mockResolvedValue(true);

      const result = await AuthService.logout('access-token');

      expect(SessionRepository.findByToken).toHaveBeenCalledWith('access-token');
      expect(SessionRepository.deactivateSession).toHaveBeenCalledWith(1);
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should handle logout when session not found', async () => {
      SessionRepository.findByToken.mockResolvedValue(null);

      const result = await AuthService.logout('invalid-token');

      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('logoutAll', () => {
    it('should logout all sessions successfully', async () => {
      SessionRepository.deactivateAllUserSessions.mockResolvedValue(2);
      RefreshTokenRepository.revokeAllUserTokens.mockResolvedValue(2);

      const result = await AuthService.logoutAllSessions(1);

      expect(SessionRepository.deactivateAllUserSessions).toHaveBeenCalledWith(1);
      expect(RefreshTokenRepository.revokeAllUserTokens).toHaveBeenCalledWith(1);
      expect(result).toEqual({ message: 'All sessions logged out successfully' });
    });
  });

  describe('validateToken', () => {
    it('should validate token successfully', async () => {
      const mockSession = {
        id: 1,
        user_id: 1
      };

      SessionRepository.findByToken.mockResolvedValue(mockSession);

      const result = await AuthService.validateToken('valid-token');

      expect(SessionRepository.findByToken).toHaveBeenCalledWith('valid-token');
      expect(result).toEqual({ id: 1, email: 'test@example.com', role: 'client' });
    });

    it('should throw error for invalid token', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(AuthService.validateToken('invalid-token')).rejects.toThrow('Invalid token');
    });

    it('should throw error when session not found', async () => {
      SessionRepository.findByToken.mockResolvedValue(null);

      await expect(AuthService.validateToken('valid-token')).rejects.toThrow('Session not found or expired');
    });
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      UserRepository.findById.mockResolvedValue(mockUserResponse);

      const result = await AuthService.getProfile(1);

      expect(UserRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        id: mockUserResponse.id,
        email: mockUserResponse.email,
        firstName: mockUserResponse.first_name,
        lastName: mockUserResponse.last_name,
        role: mockUserResponse.role,
        phone: mockUserResponse.phone,
        isActive: mockUserResponse.is_active,
        createdAt: mockUserResponse.created_at,
        lastLogin: mockUserResponse.last_login
      });
    });

    it('should throw error when user not found', async () => {
      UserRepository.findById.mockResolvedValue(null);

      await expect(AuthService.getProfile(999)).rejects.toThrow('User not found');
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+1234567899'
      };

      const updatedUser = {
        ...mockUserResponse,
        first_name: updateData.firstName,
        last_name: updateData.lastName,
        phone: updateData.phone
      };

      UserRepository.updateProfile.mockResolvedValue(updatedUser);

      const result = await AuthService.updateProfile(1, updateData);

      expect(UserRepository.updateProfile).toHaveBeenCalledWith(1, updateData);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      UserRepository.findById.mockResolvedValue(mockUserResponse);
      UserRepository.validatePassword.mockResolvedValue(true);
      UserRepository.changePassword.mockResolvedValue(true);
      RefreshTokenRepository.revokeAllUserTokens.mockResolvedValue(2);

      const result = await AuthService.changePassword(1, 'current-password', 'new-password');

      expect(UserRepository.findById).toHaveBeenCalledWith(1);
      expect(UserRepository.validatePassword).toHaveBeenCalledWith('current-password', mockUserResponse.password_hash);
      expect(UserRepository.changePassword).toHaveBeenCalledWith(1, 'new-password');
      expect(RefreshTokenRepository.revokeAllUserTokens).toHaveBeenCalledWith(1);
      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('should throw error for user not found', async () => {
      UserRepository.findById.mockResolvedValue(null);

      await expect(AuthService.changePassword(1, 'current', 'new')).rejects.toThrow('User not found');
    });

    it('should throw error for incorrect current password', async () => {
      UserRepository.findById.mockResolvedValue(mockUserResponse);
      UserRepository.validatePassword.mockResolvedValue(false);

      await expect(AuthService.changePassword(1, 'wrong', 'new')).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('getUserSessions', () => {
    it('should get user sessions successfully', async () => {
      const mockSessions = [
        { id: 1, ip_address: '127.0.0.1', created_at: new Date() },
        { id: 2, ip_address: '127.0.0.1', created_at: new Date() }
      ];

      SessionRepository.getUserActiveSessions.mockResolvedValue(mockSessions);

      const result = await AuthService.getUserSessions(1);

      expect(SessionRepository.getUserActiveSessions).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockSessions);
    });
  });
});
