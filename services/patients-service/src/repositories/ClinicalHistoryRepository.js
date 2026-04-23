const BaseRepository = require('./BaseRepository');

class ClinicalHistoryRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'clinical_history');
  }

  async create(historyData) {
    const {
      patientId,
      veterinarianId,
      consultationType,
      chiefComplaint,
      history,
      physicalExamination,
      diagnosis,
      treatment,
      medications,
      recommendations,
      followUpRequired,
      followUpDays,
      temperature,
      heartRate,
      respiratoryRate,
      weight,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      oxygenSaturation,
      files,
      isEmergency
    } = historyData;

    const data = {
      patient_id: patientId,
      veterinarian_id: veterinarianId,
      consultation_type: consultationType,
      chief_complaint: chiefComplaint,
      history,
      physical_examination: physicalExamination,
      diagnosis,
      treatment,
      medications,
      recommendations,
      follow_up_required: followUpRequired,
      follow_up_days: followUpDays,
      temperature,
      heart_rate: heartRate,
      respiratory_rate: respiratoryRate,
      weight,
      blood_pressure_systolic: bloodPressureSystolic,
      blood_pressure_diastolic: bloodPressureDiastolic,
      oxygen_saturation: oxygenSaturation,
      files: files ? JSON.stringify(files) : null,
      is_emergency: isEmergency || false
    };

    return this.create(data);
  }

  async getPatientHistory(patientId, limit = 50, offset = 0) {
    const query = `
      SELECT 
        ch.*,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name,
        u.email as veterinarian_email
      FROM clinical_history ch
      LEFT JOIN users u ON ch.veterinarian_id = u.id
      WHERE ch.patient_id = $1
      ORDER BY ch.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.pool.query(query, [patientId, limit, offset]);
    return result.rows;
  }

  async getPatientHistoryByType(patientId, consultationType) {
    const query = `
      SELECT 
        ch.*,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name,
        u.email as veterinarian_email
      FROM clinical_history ch
      LEFT JOIN users u ON ch.veterinarian_id = u.id
      WHERE ch.patient_id = $1 AND ch.consultation_type = $2
      ORDER BY ch.created_at DESC
    `;

    const result = await this.pool.query(query, [patientId, consultationType]);
    return result.rows;
  }

  async getRecentHistory(days = 30) {
    const query = `
      SELECT 
        ch.id,
        ch.patient_id,
        ch.consultation_type,
        ch.diagnosis,
        ch.treatment,
        ch.is_emergency,
        ch.created_at,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        t.email as tutor_email,
        t.phone as tutor_phone,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name,
        s.name as species_name
      FROM clinical_history ch
      LEFT JOIN patients p ON ch.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON ch.veterinarian_id = u.id
      LEFT JOIN species s ON p.species_id = s.id
      WHERE ch.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY ch.created_at DESC
      LIMIT 100
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getEmergencyHistory() {
    const query = `
      SELECT 
        ch.id,
        ch.patient_id,
        ch.consultation_type,
        ch.chief_complaint,
        ch.diagnosis,
        ch.treatment,
        ch.created_at,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        t.email as tutor_email,
        t.phone as tutor_phone,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name,
        s.name as species_name
      FROM clinical_history ch
      LEFT JOIN patients p ON ch.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON ch.veterinarian_id = u.id
      LEFT JOIN species s ON p.species_id = s.id
      WHERE ch.is_emergency = true
      ORDER BY ch.created_at DESC
      LIMIT 50
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getHistoryNeedingFollowUp() {
    const query = `
      SELECT 
        ch.id,
        ch.patient_id,
        ch.follow_up_days,
        ch.created_at,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        t.email as tutor_email,
        t.phone as tutor_phone,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name,
        (ch.created_at + INTERVAL '1 day' * ch.follow_up_days) as follow_up_date,
        CURRENT_DATE as current_date
      FROM clinical_history ch
      LEFT JOIN patients p ON ch.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON ch.veterinarian_id = u.id
      WHERE ch.follow_up_required = true 
        AND ch.follow_up_days IS NOT NULL
        AND (ch.created_at + INTERVAL '1 day' * ch.follow_up_days) <= CURRENT_DATE
      ORDER BY follow_up_date
      LIMIT 100
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getUpcomingFollowUps(days = 7) {
    const query = `
      SELECT 
        ch.id,
        ch.patient_id,
        ch.follow_up_days,
        ch.created_at,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        t.email as tutor_email,
        t.phone as tutor_phone,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name,
        (ch.created_at + INTERVAL '1 day' * ch.follow_up_days) as follow_up_date
      FROM clinical_history ch
      LEFT JOIN patients p ON ch.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON ch.veterinarian_id = u.id
      WHERE ch.follow_up_required = true 
        AND ch.follow_up_days IS NOT NULL
        AND (ch.created_at + INTERVAL '1 day' * ch.follow_up_days) BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
      ORDER BY follow_up_date
      LIMIT 50
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getHistoryByVeterinarian(veterinarianId, startDate, endDate) {
    const query = `
      SELECT 
        ch.*,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        s.name as species_name
      FROM clinical_history ch
      LEFT JOIN patients p ON ch.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN species s ON p.species_id = s.id
      WHERE ch.veterinarian_id = $1 
        AND ch.created_at BETWEEN $2 AND $3
      ORDER BY ch.created_at DESC
    `;

    const result = await this.pool.query(query, [veterinarianId, startDate, endDate]);
    return result.rows;
  }

  async getHistoryStats() {
    const query = `
      SELECT 
        COUNT(*) as total_consultations,
        COUNT(CASE WHEN is_emergency = true THEN 1 END) as emergency_consultations,
        COUNT(CASE WHEN consultation_type = 'emergency' THEN 1 END) as emergency_type,
        COUNT(CASE WHEN consultation_type = 'checkup' THEN 1 END) as checkup_type,
        COUNT(CASE WHEN consultation_type = 'surgery' THEN 1 END) as surgery_type,
        COUNT(CASE WHEN consultation_type = 'hospitalization' THEN 1 END) as hospitalization_type,
        COUNT(CASE WHEN consultation_type = 'vaccination' THEN 1 END) as vaccination_type,
        COUNT(CASE WHEN consultation_type = 'deworming' THEN 1 END) as deworming_type,
        COUNT(CASE WHEN follow_up_required = true THEN 1 END) as follow_up_required,
        AVG(temperature) as avg_temperature,
        AVG(heart_rate) as avg_heart_rate,
        AVG(respiratory_rate) as avg_respiratory_rate,
        AVG(weight) as avg_weight
      FROM clinical_history
    `;

    const result = await this.pool.query(query);
    return result.rows[0];
  }

  async getConsultationTypeStats() {
    const query = `
      SELECT 
        consultation_type,
        COUNT(*) as count,
        COUNT(CASE WHEN is_emergency = true THEN 1 END) as emergency_count,
        AVG(temperature) as avg_temperature,
        AVG(heart_rate) as avg_heart_rate,
        AVG(respiratory_rate) as avg_respiratory_rate,
        AVG(weight) as avg_weight
      FROM clinical_history
      GROUP BY consultation_type
      ORDER BY count DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getMonthlyStats(year, month) {
    const query = `
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as daily_consultations,
        COUNT(CASE WHEN is_emergency = true THEN 1 END) as daily_emergencies,
        consultation_type,
        COUNT(*) as type_count
      FROM clinical_history
      WHERE EXTRACT(YEAR FROM created_at) = $1 
        AND EXTRACT(MONTH FROM created_at) = $2
      GROUP BY DATE_TRUNC('day', created_at), consultation_type
      ORDER BY date DESC, consultation_type
    `;

    const result = await this.pool.query(query, [year, month]);
    return result.rows;
  }

  async getVitalSignsHistory(patientId, days = 30) {
    const query = `
      SELECT 
        created_at,
        temperature,
        heart_rate,
        respiratory_rate,
        weight,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        oxygen_saturation,
        consultation_type
      FROM clinical_history
      WHERE patient_id = $1 
        AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
        AND (temperature IS NOT NULL 
             OR heart_rate IS NOT NULL 
             OR respiratory_rate IS NOT NULL 
             OR weight IS NOT NULL)
      ORDER BY created_at ASC
    `;

    const result = await this.pool.query(query, [patientId]);
    return result.rows;
  }

  async searchHistory(searchTerm) {
    const query = `
      SELECT 
        ch.id,
        ch.patient_id,
        ch.consultation_type,
        ch.chief_complaint,
        ch.diagnosis,
        ch.treatment,
        ch.created_at,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name
      FROM clinical_history ch
      LEFT JOIN patients p ON ch.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON ch.veterinarian_id = u.id
      WHERE ch.chief_complaint ILIKE $1 
        OR ch.diagnosis ILIKE $1 
        OR ch.treatment ILIKE $1
        OR p.name ILIKE $1
        OR p.nickname ILIKE $1
        OR t.first_name ILIKE $1
        OR t.last_name ILIKE $1
      ORDER BY ch.created_at DESC
      LIMIT 50
    `;

    const result = await this.pool.query(query, [`%${searchTerm}%`]);
    return result.rows;
  }

  async getHistoryById(id) {
    const query = `
      SELECT 
        ch.*,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        t.email as tutor_email,
        t.phone as tutor_phone,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name,
        u.email as veterinarian_email,
        s.name as species_name,
        b.name as breed_name
      FROM clinical_history ch
      LEFT JOIN patients p ON ch.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON ch.veterinarian_id = u.id
      LEFT JOIN species s ON p.species_id = s.id
      LEFT JOIN breeds b ON p.breed_id = b.id
      WHERE ch.id = $1
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async updateFiles(id, files) {
    const query = `
      UPDATE clinical_history
      SET files = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, files, updated_at
    `;

    const result = await this.pool.query(query, [id, JSON.stringify(files)]);
    return result.rows[0];
  }

  async getHistoryWithAttachments(patientId) {
    const query = `
      SELECT 
        ch.id,
        ch.consultation_type,
        ch.chief_complaint,
        ch.diagnosis,
        ch.treatment,
        ch.created_at,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', a.id,
            'file_name', a.file_name,
            'original_name', a.original_name,
            'file_type', a.file_type,
            'file_size', a.file_size,
            'description', a.description,
            'created_at', a.created_at
          )
        ) FILTER (WHERE a.id IS NOT NULL) as attachments
      FROM clinical_history ch
      LEFT JOIN attachments a ON ch.id = a.clinical_history_id
      WHERE ch.patient_id = $1
      GROUP BY ch.id, ch.consultation_type, ch.chief_complaint, ch.diagnosis, ch.treatment, ch.created_at
      ORDER BY ch.created_at DESC
    `;

    const result = await this.pool.query(query, [patientId]);
    return result.rows;
  }
}

module.exports = ClinicalHistoryRepository;
