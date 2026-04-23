const { pool } = require('../src/config/database');

// Configuración global para tests
beforeAll(async () => {
  // Deshabilitar logs durante los tests
  console.log = jest.fn();
  console.error = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
});

afterAll(async () => {
  // Cerrar conexión a la base de datos después de todos los tests
  if (pool) {
    await pool.end();
  }
});

// Limpiar la base de datos antes de cada test
beforeEach(async () => {
  if (pool) {
    // Limpiar tablas en orden correcto para evitar problemas de foreign keys
    await pool.query('DELETE FROM sessions');
    await pool.query('DELETE FROM refresh_tokens');
    await pool.query('DELETE FROM login_attempts');
    await pool.query('DELETE FROM users');
  }
});

// Mock de RabbitMQ para tests
jest.mock('../src/utils/rabbitmq', () => ({
  connectRabbitMQ: jest.fn().mockResolvedValue(true),
  publishEvent: jest.fn().mockResolvedValue(true),
  subscribeToEvent: jest.fn().mockResolvedValue(true),
  closeConnection: jest.fn().mockResolvedValue(true)
}));

// Mock de variables de entorno
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'pawpet_auth_test';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.RABBITMQ_URL = 'amqp://localhost:5672/test';
