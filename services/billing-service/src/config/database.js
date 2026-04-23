const { Pool } = require('pg');

/**
 * Configuración de la base de datos para el servicio de facturación
 */
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5435,
  database: process.env.DB_NAME || 'pawpet_billing',
  user: process.env.DB_USER || 'pawpet_user',
  password: process.env.DB_PASSWORD || 'pawpet_password',
  max: 20, // máximo número de clientes en el pool
  idleTimeoutMillis: 30000, // tiempo máximo de inactividad
  connectionTimeoutMillis: 2000, // tiempo máximo para conectar
};

const pool = new Pool(poolConfig);

/**
 * Conectar a la base de datos y crear tablas si no existen
 */
async function connectDatabase() {
  try {
    // Probar conexión
    await pool.query('SELECT NOW()');
    
    // Crear tablas si no existen
    await createTables();
    
    console.log('✅ Database connection established');
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

/**
 * Crear las tablas necesarias para el servicio de facturación
 */
async function createTables() {
  try {
    // Tabla de productos/servicios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('service', 'product', 'consultation', 'vaccine', 'procedure')),
        category VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de facturas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        patient_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        veterinarian_id INTEGER,
        subtotal DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
        due_date DATE,
        paid_date TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de detalles de factura
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        description VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de pagos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'card', 'stripe', 'transfer', 'check')),
        payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
        stripe_payment_id VARCHAR(255),
        transaction_id VARCHAR(255),
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de configuración de facturación
    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_config (
        id SERIAL PRIMARY KEY,
        tax_rate DECIMAL(5,4) DEFAULT 0.0000,
        currency VARCHAR(3) DEFAULT 'USD',
        invoice_prefix VARCHAR(10) DEFAULT 'INV',
        next_invoice_number INTEGER DEFAULT 1,
        payment_terms_days INTEGER DEFAULT 30,
        auto_send_reminders BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insertar configuración por defecto si no existe
    await pool.query(`
      INSERT INTO billing_config (tax_rate, currency, invoice_prefix, next_invoice_number)
      VALUES (0.0000, 'USD', 'INV', 1)
      ON CONFLICT DO NOTHING
    `);

    // Crear índices para mejor rendimiento
    await pool.query('CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON invoices(patient_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)');

    console.log('✅ Database tables created/verified successfully');
  } catch (error) {
    console.error('❌ Error creating database tables:', error);
    throw error;
  }
}

/**
 * Cerrar la conexión a la base de datos
 */
async function closeDatabase() {
  await pool.end();
  console.log('🔄 Database connection closed');
}

module.exports = {
  pool,
  connectDatabase,
  closeDatabase
};
