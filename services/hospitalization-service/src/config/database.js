const { Pool } = require('pg');

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5436,
  database: process.env.DB_NAME || 'pawpet_hospitalization',
  user: process.env.DB_USER || 'pawpet_user',
  password: process.env.DB_PASSWORD || 'pawpet_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(poolConfig);

/**
 * Conectar a la base de datos y crear tablas
 */
async function connectDatabase() {
  try {
    // Probar conexión
    await pool.query('SELECT NOW()');
    console.log('✅ Hospitalization Database connected successfully');

    // Crear tablas si no existen
    await createTables();
    console.log('✅ Hospitalization tables created/verified');
    
    return pool;
  } catch (error) {
    console.error('❌ Error connecting to hospitalization database:', error);
    throw error;
  }
}

/**
 * Crear tablas necesarias para el servicio de hospitalización
 */
async function createTables() {
  const queries = [
    // Tabla de hospitalizaciones
    `
    CREATE TABLE IF NOT EXISTS hospitalizations (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL,
      veterinarian_id INTEGER NOT NULL,
      room_number VARCHAR(10) NOT NULL,
      admission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      discharge_date TIMESTAMP WITH TIME ZONE,
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'discharged', 'transferred')),
      reason_for_admission TEXT NOT NULL,
      initial_diagnosis TEXT,
      treatment_plan TEXT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `,

    // Tabla de signos vitales
    `
    CREATE TABLE IF NOT EXISTS vital_signs (
      id SERIAL PRIMARY KEY,
      hospitalization_id INTEGER NOT NULL REFERENCES hospitalizations(id) ON DELETE CASCADE,
      recorded_by INTEGER NOT NULL,
      recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      temperature DECIMAL(4,1),
      heart_rate INTEGER,
      respiratory_rate INTEGER,
      blood_pressure_systolic INTEGER,
      blood_pressure_diastolic INTEGER,
      oxygen_saturation DECIMAL(4,1),
      weight DECIMAL(5,2),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `,

    // Tabla de medicamentos administrados
    `
    CREATE TABLE IF NOT EXISTS medication_administration (
      id SERIAL PRIMARY KEY,
      hospitalization_id INTEGER NOT NULL REFERENCES hospitalizations(id) ON DELETE CASCADE,
      medication_name VARCHAR(100) NOT NULL,
      dosage VARCHAR(50) NOT NULL,
      route VARCHAR(20) NOT NULL CHECK (route IN ('IV', 'IM', 'SC', 'PO', 'TOPICAL')),
      batch_number VARCHAR(50),
      administered_by INTEGER NOT NULL,
      administered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      next_dose_time TIMESTAMP WITH TIME ZONE,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `,

    // Tabla de procedimientos
    `
    CREATE TABLE IF NOT EXISTS procedures (
      id SERIAL PRIMARY KEY,
      hospitalization_id INTEGER NOT NULL REFERENCES hospitalizations(id) ON DELETE CASCADE,
      procedure_name VARCHAR(100) NOT NULL,
      description TEXT,
      performed_by INTEGER NOT NULL,
      performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      duration_minutes INTEGER,
      complications TEXT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `,

    // Tabla de monitoreo
    `
    CREATE TABLE IF NOT EXISTS monitoring_logs (
      id SERIAL PRIMARY KEY,
      hospitalization_id INTEGER NOT NULL REFERENCES hospitalizations(id) ON DELETE CASCADE,
      monitored_by INTEGER NOT NULL,
      monitoring_type VARCHAR(50) NOT NULL,
      observations TEXT NOT NULL,
      alert_level VARCHAR(10) DEFAULT 'normal' CHECK (alert_level IN ('normal', 'warning', 'critical')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `,

    // Tabla de configuración de habitaciones
    `
    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      room_number VARCHAR(10) UNIQUE NOT NULL,
      room_type VARCHAR(20) DEFAULT 'standard' CHECK (room_type IN ('standard', 'icu', 'isolation', 'surgery')),
      max_capacity INTEGER DEFAULT 4,
      current_occupancy INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      equipment TEXT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `,

    // Índices para optimización
    `
    CREATE INDEX IF NOT EXISTS idx_hospitalizations_patient_id ON hospitalizations(patient_id);
    CREATE INDEX IF NOT EXISTS idx_hospitalizations_status ON hospitalizations(status);
    CREATE INDEX IF NOT EXISTS idx_hospitalizations_admission_date ON hospitalizations(admission_date);
    CREATE INDEX IF NOT EXISTS idx_vital_signs_hospitalization_id ON vital_signs(hospitalization_id);
    CREATE INDEX IF NOT EXISTS idx_vital_signs_recorded_at ON vital_signs(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_medication_administration_hospitalization_id ON medication_administration(hospitalization_id);
    CREATE INDEX IF NOT EXISTS idx_medication_administration_administered_at ON medication_administration(administered_at);
    CREATE INDEX IF NOT EXISTS idx_procedures_hospitalization_id ON procedures(hospitalization_id);
    CREATE INDEX IF NOT EXISTS idx_monitoring_logs_hospitalization_id ON monitoring_logs(hospitalization_id);
    CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON rooms(room_number);
    `
  ];

  for (const query of queries) {
    try {
      await pool.query(query);
    } catch (error) {
      console.error('Error creating table:', error.message);
      throw error;
    }
  }
}

/**
 * Cerrar conexión a la base de datos
 */
async function closeDatabase() {
  await pool.end();
  console.log('🔄 Hospitalization Database connection closed');
}

module.exports = {
  pool,
  connectDatabase,
  closeDatabase,
  createTables
};
