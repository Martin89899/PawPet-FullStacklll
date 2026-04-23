const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5433,
  database: process.env.DB_NAME || 'pawpet_appointments',
  user: process.env.DB_USER || 'pawpet_user',
  password: process.env.DB_PASSWORD || 'pawpet_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Conecta a la base de datos PostgreSQL para el Appointments Service
 * @returns {Promise<void>}
 */
async function connectDatabase() {
  try {
    await pool.connect();
    console.log('Conectado exitosamente a la base de datos PostgreSQL para Appointments Service');
    
    // Crear tablas si no existen
    await createTables();
  } catch (error) {
    console.error('Error en conexión a base de datos:', error);
    throw error;
  }
}

/**
 * Crea las tablas necesarias para el Appointments Service
 * @returns {Promise<void>}
 */
async function createTables() {
  try {
    // Tabla de tipos de cita
    const createAppointmentTypesTable = `
      CREATE TABLE IF NOT EXISTS appointment_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        duration_minutes INTEGER NOT NULL DEFAULT 30,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        color VARCHAR(7) DEFAULT '#007bff',
        requires_veterinarian BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tabla de veterinarios
    const createVeterinariansTable = `
      CREATE TABLE IF NOT EXISTS veterinarians (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        license_number VARCHAR(50) UNIQUE,
        specialization VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(255) UNIQUE,
        is_active BOOLEAN DEFAULT true,
        working_hours JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tabla de horarios de veterinarios
    const createVeterinarianSchedulesTable = `
      CREATE TABLE IF NOT EXISTS veterinarian_schedules (
        id SERIAL PRIMARY KEY,
        veterinarian_id INTEGER REFERENCES veterinarians(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(veterinarian_id, day_of_week, start_time, end_time)
      );
    `;

    // Tabla de bloqueos de tiempo (vacaciones, días no laborables)
    const createTimeBlocksTable = `
      CREATE TABLE IF NOT EXISTS time_blocks (
        id SERIAL PRIMARY KEY,
        veterinarian_id INTEGER REFERENCES veterinarians(id) ON DELETE CASCADE,
        start_datetime TIMESTAMP NOT NULL,
        end_datetime TIMESTAMP NOT NULL,
        reason VARCHAR(255),
        is_available BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CHECK (end_datetime > start_datetime)
      );
    `;

    // Tabla de citas
    const createAppointmentsTable = `
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE,
        patient_id INTEGER NOT NULL,
        tutor_id INTEGER NOT NULL,
        veterinarian_id INTEGER REFERENCES veterinarians(id),
        appointment_type_id INTEGER REFERENCES appointment_types(id),
        status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')),
        scheduled_datetime TIMESTAMP NOT NULL,
        estimated_duration_minutes INTEGER NOT NULL,
        actual_duration_minutes INTEGER,
        notes TEXT,
        symptoms TEXT,
        urgency_level VARCHAR(50) DEFAULT 'normal' CHECK (urgency_level IN ('low', 'normal', 'high', 'emergency')),
        price DECIMAL(10, 2),
        is_paid BOOLEAN DEFAULT false,
        payment_method VARCHAR(50),
        reminder_sent BOOLEAN DEFAULT false,
        reminder_sent_at TIMESTAMP,
        created_by INTEGER,
        updated_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CHECK (scheduled_datetime >= CURRENT_TIMESTAMP - INTERVAL '1 hour')
      );
    `;

    // Tabla de historial de cambios de citas
    const createAppointmentHistoryTable = `
      CREATE TABLE IF NOT EXISTS appointment_history (
        id SERIAL PRIMARY KEY,
        appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
        changed_by INTEGER,
        field_changed VARCHAR(100),
        old_value TEXT,
        new_value TEXT,
        change_reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tabla de recordatorios de citas
    const createAppointmentRemindersTable = `
      CREATE TABLE IF NOT EXISTS appointment_reminders (
        id SERIAL PRIMARY KEY,
        appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
        reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('email', 'sms', 'push')),
        scheduled_at TIMESTAMP NOT NULL,
        sent_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
        message TEXT,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tabla de disponibilidad de tiempo
    const createAvailabilitySlotsTable = `
      CREATE TABLE IF NOT EXISTS availability_slots (
        id SERIAL PRIMARY KEY,
        veterinarian_id INTEGER REFERENCES veterinarians(id) ON DELETE CASCADE,
        start_datetime TIMESTAMP NOT NULL,
        end_datetime TIMESTAMP NOT NULL,
        slot_duration_minutes INTEGER NOT NULL DEFAULT 15,
        is_available BOOLEAN DEFAULT true,
        appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CHECK (end_datetime > start_datetime),
        CHECK (slot_duration_minutes > 0)
      );
    `;

    // Ejecutar todas las creaciones de tablas
    await pool.query(createAppointmentTypesTable);
    await pool.query(createVeterinariansTable);
    await pool.query(createVeterinarianSchedulesTable);
    await pool.query(createTimeBlocksTable);
    await pool.query(createAppointmentsTable);
    await pool.query(createAppointmentHistoryTable);
    await pool.query(createAppointmentRemindersTable);
    await pool.query(createAvailabilitySlotsTable);

    // Crear índices
    await pool.query('CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_appointments_tutor_id ON appointments(tutor_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_appointments_veterinarian_id ON appointments(veterinarian_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_datetime ON appointments(scheduled_datetime);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_appointments_urgency_level ON appointments(urgency_level);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_appointments_uuid ON appointments(uuid);');
    
    await pool.query('CREATE INDEX IF NOT EXISTS idx_veterinarians_user_id ON veterinarians(user_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_veterinarians_is_active ON veterinarians(is_active);');
    
    await pool.query('CREATE INDEX IF NOT EXISTS idx_veterinarian_schedules_veterinarian_id ON veterinarian_schedules(veterinarian_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_veterinarian_schedules_day_of_week ON veterinarian_schedules(day_of_week);');
    
    await pool.query('CREATE INDEX IF NOT EXISTS idx_time_blocks_veterinarian_id ON time_blocks(veterinarian_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_time_blocks_start_datetime ON time_blocks(start_datetime);');
    
    await pool.query('CREATE INDEX IF NOT EXISTS idx_availability_slots_veterinarian_id ON availability_slots(veterinarian_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_availability_slots_start_datetime ON availability_slots(start_datetime);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_availability_slots_is_available ON availability_slots(is_available);');
    
    await pool.query('CREATE INDEX IF NOT EXISTS idx_appointment_reminders_appointment_id ON appointment_reminders(appointment_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_appointment_reminders_scheduled_at ON appointment_reminders(scheduled_at);');

    // Insertar datos iniciales si no existen
    await insertInitialData();

    console.log('Tablas de base de datos creadas/verificadas para Appointments Service');
  } catch (error) {
    console.error('Error al crear tablas:', error);
    throw error;
  }
}

/**
 * Inserta datos iniciales para el Appointments Service
 * @returns {Promise<void>}
 */
async function insertInitialData() {
  try {
    // Insertar tipos de cita básicos si no existen
    const appointmentTypes = [
      { name: 'Consulta General', description: 'Consulta veterinaria general', duration_minutes: 30, price: 50.00, color: '#007bff' },
      { name: 'Vacunación', description: 'Aplicación de vacunas', duration_minutes: 15, price: 25.00, color: '#28a745' },
      { name: 'Desparasitación', description: 'Tratamiento antiparasitario', duration_minutes: 20, price: 30.00, color: '#17a2b8' },
      { name: 'Cirugía Menor', description: 'Procedimientos quirúrgicos menores', duration_minutes: 60, price: 150.00, color: '#fd7e14' },
      { name: 'Cirugía Mayor', description: 'Procedimientos quirúrgicos mayores', duration_minutes: 120, price: 300.00, color: '#dc3545' },
      { name: 'Chequeo Anual', description: 'Examen médico completo anual', duration_minutes: 45, price: 80.00, color: '#6f42c1' },
      { name: 'Emergencia', description: 'Atención de emergencia', duration_minutes: 45, price: 100.00, color: '#e83e8c' },
      { name: 'Estética', description: 'Servicios de estética veterinaria', duration_minutes: 60, price: 60.00, color: '#20c997' }
    ];

    for (const type of appointmentTypes) {
      await pool.query(`
        INSERT INTO appointment_types (name, description, duration_minutes, price, color)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (name) DO NOTHING
      `, [type.name, type.description, type.duration_minutes, type.price, type.color]);
    }

    console.log('Datos iniciales insertados para Appointments Service');
  } catch (error) {
    console.error('Error al insertar datos iniciales:', error);
    throw error;
  }
}

/**
 * Cierra la conexión a la base de datos
 * @returns {Promise<void>}
 */
async function closeDatabase() {
  await pool.end();
  console.log('Conexión a base de datos cerrada');
}

module.exports = {
  pool,
  connectDatabase,
  closeDatabase
};
