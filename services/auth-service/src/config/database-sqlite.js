const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

/**
 * Configuración de base de datos SQLite para el Auth Service (pruebas locales)
 * @description Configuración temporal para pruebas rápidas sin PostgreSQL
 */

const dbPath = path.join(__dirname, '../../../data/auth-service.db');

/**
 * Conecta a la base de datos SQLite
 * @returns {Promise<Object>} Conexión a la base de datos
 */
async function connectDatabase() {
  try {
    // Crear directorio de datos si no existe
    const fs = require('fs');
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log('Conectado exitosamente a la base de datos SQLite para Auth Service');
    
    // Crear tablas si no existen
    await createTables(db);
    
    return db;
  } catch (error) {
    console.error('Error en conexión a base de datos SQLite:', error);
    throw error;
  }
}

/**
 * Crea las tablas necesarias para el Auth Service
 * @param {Object} db - Conexión a la base de datos
 * @returns {Promise<void>}
 */
async function createTables(db) {
  try {
    // Tabla de usuarios
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'client',
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabla de sesiones
    await db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Tabla de refresh tokens
    await db.exec(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_revoked BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Tabla de intentos de login fallidos
    await db.exec(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN DEFAULT false
      );
    `);

    // Insertar datos iniciales si no existen
    await insertInitialData(db);

    console.log('Tablas de base de datos SQLite creadas/verificadas para Auth Service');
  } catch (error) {
    console.error('Error al crear tablas SQLite:', error);
    throw error;
  }
}

/**
 * Inserta datos iniciales para el Auth Service
 * @param {Object} db - Conexión a la base de datos
 * @returns {Promise<void>}
 */
async function insertInitialData(db) {
  try {
    // Insertar usuarios básicos si no existen
    const bcrypt = require('bcrypt');
    
    const users = [
      {
        email: 'admin@pawpet.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      },
      {
        email: 'vet@pawpet.com',
        password: 'vet123',
        firstName: 'Dr. John',
        lastName: 'Smith',
        role: 'veterinarian'
      },
      {
        email: 'client@pawpet.com',
        password: 'client123',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'client'
      }
    ];

    for (const user of users) {
      const existingUser = await db.get(
        'SELECT id FROM users WHERE email = ?',
        [user.email]
      );

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await db.run(
          `INSERT INTO users (email, password_hash, first_name, last_name, role) 
           VALUES (?, ?, ?, ?, ?)`,
          [user.email, hashedPassword, user.firstName, user.lastName, user.role]
        );
      }
    }

    console.log('Datos iniciales insertados para Auth Service');
  } catch (error) {
    console.error('Error al insertar datos iniciales:', error);
    throw error;
  }
}

/**
 * Cierra la conexión a la base de datos
 * @param {Object} db - Conexión a la base de datos
 * @returns {Promise<void>}
 */
async function closeDatabase(db) {
  if (db) {
    await db.close();
    console.log('Conexión a base de datos SQLite cerrada');
  }
}

module.exports = {
  connectDatabase,
  closeDatabase,
  dbPath
};
