/**
 * Fixtures para tests de usuarios
 */

const validUser = {
  email: 'test@example.com',
  password: 'Test123!@#',
  firstName: 'John',
  lastName: 'Doe',
  role: 'client',
  phone: '+1234567890'
};

const adminUser = {
  email: 'admin@example.com',
  password: 'Admin123!@#',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
  phone: '+1234567891'
};

const veterinarianUser = {
  email: 'vet@example.com',
  password: 'Vet123!@#',
  firstName: 'Jane',
  lastName: 'Smith',
  role: 'veterinarian',
  phone: '+1234567892'
};

const invalidUser = {
  email: 'invalid-email',
  password: '123', // Contraseña demasiado corta
  firstName: '', // Nombre vacío
  lastName: '', // Apellido vacío
  role: 'invalid-role'
};

const existingUser = {
  id: 1,
  email: 'existing@example.com',
  password_hash: '$2b$12$hashedpassword',
  first_name: 'Existing',
  last_name: 'User',
  role: 'client',
  phone: '+1234567893',
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  last_login: new Date()
};

const mockUserResponse = {
  id: 1,
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'client',
  phone: '+1234567890',
  is_active: true,
  created_at: new Date(),
  updated_at: new Date()
};

const mockLoginResponse = {
  user: {
    id: 1,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'client',
    phone: '+1234567890',
    lastLogin: new Date()
  },
  tokens: {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: '1h'
  }
};

module.exports = {
  validUser,
  adminUser,
  veterinarianUser,
  invalidUser,
  existingUser,
  mockUserResponse,
  mockLoginResponse
};
