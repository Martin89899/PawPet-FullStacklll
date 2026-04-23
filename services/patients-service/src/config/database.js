const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5434,
  database: process.env.DB_NAME || 'pawpet_patients',
  user: process.env.DB_USER || 'pawpet_user',
  password: process.env.DB_PASSWORD || 'pawpet_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function connectDatabase() {
  try {
    await pool.connect();
    console.log('Conectado exitosamente a la base de datos PostgreSQL para Patients Service');
    
    // Crear tablas si no existen
    await createTables();
  } catch (error) {
    console.error('Error en conexión a base de datos:', error);
    throw error;
  }
}

async function createTables() {
  try {
    // Tabla de especies
    const createSpeciesTable = `
      CREATE TABLE IF NOT EXISTS species (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tabla de razas
    const createBreedsTable = `
      CREATE TABLE IF NOT EXISTS breeds (
        id SERIAL PRIMARY KEY,
        species_id INTEGER REFERENCES species(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        average_weight_min DECIMAL(5,2),
        average_weight_max DECIMAL(5,2),
        average_lifespan_years INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tabla de tutores (dueños de mascotas)
    const createTutorsTable = `
      CREATE TABLE IF NOT EXISTS tutors (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100),
        postal_code VARCHAR(20),
        identification_number VARCHAR(50) UNIQUE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tabla de pacientes (mascotas)
    const createPatientsTable = `
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        tutor_id INTEGER REFERENCES tutors(id) ON DELETE CASCADE,
        species_id INTEGER REFERENCES species(id),
        breed_id INTEGER REFERENCES breeds(id),
        name VARCHAR(100) NOT NULL,
        nickname VARCHAR(100),
        birth_date DATE,
        gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'unknown')),
        color VARCHAR(100),
        weight DECIMAL(5,2),
        microchip_number VARCHAR(50) UNIQUE,
        tattoo_number VARCHAR(50),
        special_marks TEXT,
        allergies TEXT,
        chronic_diseases TEXT,
        current_medications TEXT,
        dietary_restrictions TEXT,
        behavior_notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tabla de historial clínico (inmutable)
    const createClinicalHistoryTable = `
      CREATE TABLE IF NOT EXISTS clinical_history (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        veterinarian_id INTEGER NOT NULL,
        consultation_type VARCHAR(50) NOT NULL CHECK (consultation_type IN ('emergency', 'checkup', 'surgery', 'hospitalization', 'vaccination', 'deworming', 'follow_up', 'other')),
        chief_complaint TEXT,
        history TEXT,
        physical_examination TEXT,
        diagnosis TEXT,
        treatment TEXT,
        medications TEXT,
        recommendations TEXT,
        follow_up_required BOOLEAN DEFAULT false,
        follow_up_days INTEGER,
        temperature DECIMAL(4,1),
        heart_rate INTEGER,
        respiratory_rate INTEGER,
        weight DECIMAL(5,2),
        blood_pressure_systolic INTEGER,
        blood_pressure_diastolic INTEGER,
        oxygen_saturation DECIMAL(4,1),
        files JSONB,
        is_emergency BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tabla de vacunaciones
    const createVaccinationsTable = `
      CREATE TABLE IF NOT EXISTS vaccinations (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        veterinarian_id INTEGER NOT NULL,
        vaccine_name VARCHAR(100) NOT NULL,
        vaccine_type VARCHAR(50),
        manufacturer VARCHAR(100),
        lot_number VARCHAR(50),
        expiration_date DATE,
        application_date DATE NOT NULL,
        next_application_date DATE,
        dose_number INTEGER,
        total_doses INTEGER,
        application_site VARCHAR(50),
        adverse_reactions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tabla de desparasitaciones
    const createDewormingsTable = `
      CREATE TABLE IF NOT EXISTS dewormings (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        veterinarian_id INTEGER NOT NULL,
        product_name VARCHAR(100) NOT NULL,
        active_ingredient VARCHAR(100),
        manufacturer VARCHAR(100),
        lot_number VARCHAR(50),
        expiration_date DATE,
        application_date DATE NOT NULL,
        next_application_date DATE,
        dosage DECIMAL(8,2),
        dosage_unit VARCHAR(20),
        administration_route VARCHAR(50),
        target_parasites TEXT,
        adverse_reactions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tabla de alergias y sensibilidades
    const createAllergiesTable = `
      CREATE TABLE IF NOT EXISTS allergies (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        veterinarian_id INTEGER NOT NULL,
        allergen VARCHAR(100) NOT NULL,
        allergy_type VARCHAR(50) CHECK (allergy_type IN ('food', 'medication', 'environmental', 'other')),
        severity VARCHAR(20) CHECK (severity IN ('mild', 'moderate', 'severe', 'life_threatening')),
        symptoms TEXT,
        treatment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tabla de archivos adjuntos
    const createAttachmentsTable = `
      CREATE TABLE IF NOT EXISTS attachments (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        clinical_history_id INTEGER REFERENCES clinical_history(id) ON DELETE CASCADE,
        veterinarian_id INTEGER NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        file_size INTEGER NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100),
        description TEXT,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createSpeciesTable);
    await pool.query(createBreedsTable);
    await pool.query(createTutorsTable);
    await pool.query(createPatientsTable);
    await pool.query(createClinicalHistoryTable);
    await pool.query(createVaccinationsTable);
    await pool.query(createDewormingsTable);
    await pool.query(createAllergiesTable);
    await pool.query(createAttachmentsTable);

    // Crear índices
    await pool.query('CREATE INDEX IF NOT EXISTS idx_patients_tutor_id ON patients(tutor_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_patients_species_id ON patients(species_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_patients_breed_id ON patients(breed_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_patients_microchip ON patients(microchip_number);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_clinical_history_patient_id ON clinical_history(patient_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_clinical_history_created_at ON clinical_history(created_at);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_clinical_history_consultation_type ON clinical_history(consultation_type);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_vaccinations_patient_id ON vaccinations(patient_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_vaccinations_next_application ON vaccinations(next_application_date);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_dewormings_patient_id ON dewormings(patient_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_dewormings_next_application ON dewormings(next_application_date);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_allergies_patient_id ON allergies(patient_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_attachments_patient_id ON attachments(patient_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tutors_email ON tutors(email);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tutors_identification ON tutors(identification_number);');

    console.log('Tablas de base de datos creadas/verificadas para Patients Service');
  } catch (error) {
    console.error('Error al crear tablas:', error);
    throw error;
  }
}

async function closeDatabase() {
  await pool.end();
  console.log('Conexión a base de datos cerrada');
}

module.exports = {
  pool,
  connectDatabase,
  closeDatabase
};
