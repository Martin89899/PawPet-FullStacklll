const UserRepository = require('../../../src/repositories/UserRepository');
const { pool } = require('../../../src/config/database');
const { validUser, existingUser } = require('../../fixtures/userFixtures');

// Mock del pool de PostgreSQL
jest.mock('../../../src/config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('UserRepository', () => {
  let userRepository;

  beforeEach(() => {
    userRepository = new UserRepository(pool);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          email: validUser.email,
          first_name: validUser.firstName,
          last_name: validUser.lastName,
          role: validUser.role,
          phone: validUser.phone,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      const result = await userRepository.create(validUser);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          validUser.email,
          expect.any(String), // hashed password
          validUser.firstName,
          validUser.lastName,
          validUser.role,
          validUser.phone
        ])
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should handle database errors during user creation', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      await expect(userRepository.create(validUser)).rejects.toThrow('Database error');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockResult = { rows: [existingUser] };
      pool.query.mockResolvedValue(mockResult);

      const result = await userRepository.findByEmail(existingUser.email);

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        [existingUser.email]
      );
      expect(result).toEqual(existingUser);
    });

    it('should return null when user not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await userRepository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const mockResult = { rows: [existingUser] };
      pool.query.mockResolvedValue(mockResult);

      const result = await userRepository.findById(1);

      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      expect(result).toEqual(existingUser);
    });

    it('should return null when user not found by id', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await userRepository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      const mockLoginTime = new Date();
      const mockResult = {
        rows: [{ last_login: mockLoginTime }]
      };
      pool.query.mockResolvedValue(mockResult);

      const result = await userRepository.updateLastLogin(1);

      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1 RETURNING last_login',
        [1]
      );
      expect(result).toEqual(mockLoginTime);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+1234567899'
      };

      const mockResult = {
        rows: [{
          ...existingUser,
          first_name: updateData.firstName,
          last_name: updateData.lastName,
          phone: updateData.phone,
          updated_at: new Date()
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      const result = await userRepository.updateProfile(1, updateData);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [1, updateData.firstName, updateData.lastName, updateData.phone]
      );
      expect(result).toEqual(mockResult.rows[0]);
    });
  });

  describe('getAllUsers', () => {
    it('should get all users with pagination', async () => {
      const mockResult = {
        rows: [existingUser],
        rowCount: 1
      };
      pool.query.mockResolvedValue(mockResult);

      const result = await userRepository.getAllUsers(10, 0);

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [10, 0]
      );
      expect(result).toEqual([existingUser]);
    });
  });

  describe('getUsersByRole', () => {
    it('should get users by role', async () => {
      const mockResult = { rows: [existingUser] };
      pool.query.mockResolvedValue(mockResult);

      const result = await userRepository.getUsersByRole('client');

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE role = $1 AND is_active = true ORDER BY first_name, last_name',
        ['client']
      );
      expect(result).toEqual([existingUser]);
    });
  });

  describe('searchUsers', () => {
    it('should search users by term', async () => {
      const mockResult = { rows: [existingUser] };
      pool.query.mockResolvedValue(mockResult);

      const result = await userRepository.searchUsers('john');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1)'),
        ['%john%']
      );
      expect(result).toEqual([existingUser]);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user', async () => {
      const mockResult = {
        rows: [{ ...existingUser, is_active: false }]
      };
      pool.query.mockResolvedValue(mockResult);

      const result = await userRepository.deactivateUser(1);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET is_active = false'),
        [1]
      );
      expect(result).toEqual(mockResult.rows[0]);
    });
  });

  describe('validatePassword', () => {
    it('should validate correct password', async () => {
      const bcrypt = require('bcryptjs');
      jest.mock('bcryptjs');
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      const result = await userRepository.validatePassword('password', 'hashed');

      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashed');
      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const bcrypt = require('bcryptjs');
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      const result = await userRepository.validatePassword('wrong', 'hashed');

      expect(result).toBe(false);
    });
  });
});
