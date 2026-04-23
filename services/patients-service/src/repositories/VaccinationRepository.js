const BaseRepository = require('./BaseRepository');

class VaccinationRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'vaccinations');
  }

  async create(vaccinationData) {
    const {
      patientId,
      veterinarianId,
      vaccineName,
      vaccineType,
      manufacturer,
      lotNumber,
      expirationDate,
      applicationDate,
      nextApplicationDate,
      doseNumber,
      totalDoses,
      applicationSite,
      adverseReactions
    } = vaccinationData;

    const data = {
      patient_id: patientId,
      veterinarian_id: veterinarianId,
      vaccine_name: vaccineName,
      vaccine_type: vaccineType,
      manufacturer,
      lot_number: lotNumber,
      expiration_date: expirationDate,
      application_date: applicationDate,
      next_application_date: nextApplicationDate,
      dose_number: doseNumber,
      total_doses: totalDoses,
      application_site: applicationSite,
      adverse_reactions: adverseReactions
    };

    return this.create(data);
  }

  async getPatientVaccinations(patientId) {
    const query = `
      SELECT 
        v.*,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name
      FROM vaccinations v
      LEFT JOIN users u ON v.veterinarian_id = u.id
      WHERE v.patient_id = $1
      ORDER BY v.application_date DESC
    `;

    const result = await this.pool.query(query, [patientId]);
    return result.rows;
  }

  async getUpcomingVaccinations(days = 30) {
    const query = `
      SELECT 
        v.id,
        v.patient_id,
        v.vaccine_name,
        v.vaccine_type,
        v.application_date,
        v.next_application_date,
        v.dose_number,
        v.total_doses,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        t.email as tutor_email,
        t.phone as tutor_phone,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name
      FROM vaccinations v
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON v.veterinarian_id = u.id
      WHERE v.next_application_date IS NOT NULL
        AND v.next_application_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
        AND p.is_active = true
      ORDER BY v.next_application_date, p.name
      LIMIT 100
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getOverdueVaccinations() {
    const query = `
      SELECT 
        v.id,
        v.patient_id,
        v.vaccine_name,
        v.vaccine_type,
        v.application_date,
        v.next_application_date,
        v.dose_number,
        v.total_doses,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        t.email as tutor_email,
        t.phone as tutor_phone,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name,
        CURRENT_DATE - v.next_application_date as days_overdue
      FROM vaccinations v
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON v.veterinarian_id = u.id
      WHERE v.next_application_date IS NOT NULL
        AND v.next_application_date < CURRENT_DATE
        AND p.is_active = true
      ORDER BY v.next_application_date, p.name
      LIMIT 100
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getVaccinationsByType(vaccineType) {
    const query = `
      SELECT 
        v.*,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name
      FROM vaccinations v
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON v.veterinarian_id = u.id
      WHERE v.vaccine_type = $1
        AND p.is_active = true
      ORDER BY v.application_date DESC
      LIMIT 50
    `;

    const result = await this.pool.query(query, [vaccineType]);
    return result.rows;
  }

  async getVaccinationsByDateRange(startDate, endDate) {
    const query = `
      SELECT 
        v.*,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name
      FROM vaccinations v
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON v.veterinarian_id = u.id
      WHERE v.application_date BETWEEN $1 AND $2
        AND p.is_active = true
      ORDER BY v.application_date DESC
      LIMIT 100
    `;

    const result = await this.pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  async getVaccinationStats() {
    const query = `
      SELECT 
        COUNT(*) as total_vaccinations,
        COUNT(DISTINCT patient_id) as unique_patients,
        COUNT(DISTINCT vaccine_name) as unique_vaccines,
        COUNT(CASE WHEN next_application_date > CURRENT_DATE THEN 1 END) as upcoming_vaccinations,
        COUNT(CASE WHEN next_application_date < CURRENT_DATE THEN 1 END) as overdue_vaccinations,
        AVG(dose_number) as avg_dose_number,
        COUNT(CASE WHEN adverse_reactions IS NOT NULL AND adverse_reactions != '' THEN 1 END) as vaccinations_with_reactions
      FROM vaccinations v
      LEFT JOIN patients p ON v.patient_id = p.id
      WHERE p.is_active = true
    `;

    const result = await this.pool.query(query);
    return result.rows[0];
  }

  async getVaccinationTypeStats() {
    const query = `
      SELECT 
        vaccine_type,
        COUNT(*) as count,
        COUNT(DISTINCT patient_id) as unique_patients,
        COUNT(CASE WHEN adverse_reactions IS NOT NULL AND adverse_reactions != '' THEN 1 END) as reactions_count
      FROM vaccinations v
      LEFT JOIN patients p ON v.patient_id = p.id
      WHERE p.is_active = true
      GROUP BY vaccine_type
      ORDER BY count DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getVaccineNameStats() {
    const query = `
      SELECT 
        vaccine_name,
        manufacturer,
        COUNT(*) as count,
        COUNT(DISTINCT patient_id) as unique_patients,
        AVG(dose_number) as avg_dose_number,
        COUNT(CASE WHEN adverse_reactions IS NOT NULL AND adverse_reactions != '' THEN 1 END) as reactions_count
      FROM vaccinations v
      LEFT JOIN patients p ON v.patient_id = p.id
      WHERE p.is_active = true
      GROUP BY vaccine_name, manufacturer
      ORDER BY count DESC
      LIMIT 20
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getMonthlyVaccinationStats(year, month) {
    const query = `
      SELECT 
        DATE_TRUNC('day', application_date) as date,
        COUNT(*) as daily_vaccinations,
        COUNT(DISTINCT patient_id) as unique_patients_daily,
        vaccine_type,
        COUNT(*) as type_count
      FROM vaccinations v
      LEFT JOIN patients p ON v.patient_id = p.id
      WHERE EXTRACT(YEAR FROM v.application_date) = $1 
        AND EXTRACT(MONTH FROM v.application_date) = $2
        AND p.is_active = true
      GROUP BY DATE_TRUNC('day', v.application_date), vaccine_type
      ORDER BY date DESC, vaccine_type
    `;

    const result = await this.pool.query(query, [year, month]);
    return result.rows;
  }

  async getVaccinationsByVeterinarian(veterinarianId, startDate, endDate) {
    const query = `
      SELECT 
        v.*,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name
      FROM vaccinations v
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      WHERE v.veterinarian_id = $1 
        AND v.application_date BETWEEN $2 AND $3
        AND p.is_active = true
      ORDER BY v.application_date DESC
      LIMIT 100
    `;

    const result = await this.pool.query(query, [veterinarianId, startDate, endDate]);
    return result.rows;
  }

  async getPatientVaccinationSchedule(patientId) {
    const query = `
      SELECT 
        vaccine_name,
        vaccine_type,
        manufacturer,
        application_date,
        next_application_date,
        dose_number,
        total_doses,
        CASE 
          WHEN next_application_date IS NULL THEN 'completed'
          WHEN next_application_date < CURRENT_DATE THEN 'overdue'
          WHEN next_application_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
          ELSE 'scheduled'
        END as status
      FROM vaccinations
      WHERE patient_id = $1
      ORDER BY vaccine_type, dose_number
    `;

    const result = await this.pool.query(query, [patientId]);
    return result.rows;
  }

  async getExpiringVaccines(days = 90) {
    const query = `
      SELECT DISTINCT
        v.vaccine_name,
        v.manufacturer,
        v.lot_number,
        v.expiration_date,
        COUNT(*) as applications_count,
        COUNT(DISTINCT v.patient_id) as unique_patients
      FROM vaccinations v
      LEFT JOIN patients p ON v.patient_id = p.id
      WHERE v.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
        AND p.is_active = true
      GROUP BY v.vaccine_name, v.manufacturer, v.lot_number, v.expiration_date
      ORDER BY v.expiration_date
      LIMIT 50
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async searchVaccinations(searchTerm) {
    const query = `
      SELECT 
        v.id,
        v.patient_id,
        v.vaccine_name,
        v.vaccine_type,
        v.application_date,
        v.next_application_date,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name
      FROM vaccinations v
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON v.veterinarian_id = u.id
      WHERE v.vaccine_name ILIKE $1 
        OR v.vaccine_type ILIKE $1
        OR v.manufacturer ILIKE $1
        OR v.lot_number ILIKE $1
        OR p.name ILIKE $1
        OR p.nickname ILIKE $1
        OR t.first_name ILIKE $1
        OR t.last_name ILIKE $1
        AND p.is_active = true
      ORDER BY v.application_date DESC
      LIMIT 50
    `;

    const result = await this.pool.query(query, [`%${searchTerm}%`]);
    return result.rows;
  }

  async updateNextApplicationDate(id, nextApplicationDate) {
    const query = `
      UPDATE vaccinations
      SET next_application_date = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, next_application_date, updated_at
    `;

    const result = await this.pool.query(query, [id, nextApplicationDate]);
    return result.rows[0];
  }

  async getVaccinationById(id) {
    const query = `
      SELECT 
        v.*,
        p.name as patient_name,
        p.nickname as patient_nickname,
        p.gender,
        p.birth_date,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        t.email as tutor_email,
        t.phone as tutor_phone,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name,
        u.email as veterinarian_email,
        s.name as species_name,
        b.name as breed_name
      FROM vaccinations v
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON v.veterinarian_id = u.id
      LEFT JOIN species s ON p.species_id = s.id
      LEFT JOIN breeds b ON p.breed_id = b.id
      WHERE v.id = $1
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async getRecentVaccinations(days = 30) {
    const query = `
      SELECT 
        v.id,
        v.patient_id,
        v.vaccine_name,
        v.vaccine_type,
        v.application_date,
        v.dose_number,
        v.total_doses,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name,
        s.name as species_name
      FROM vaccinations v
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON v.veterinarian_id = u.id
      LEFT JOIN species s ON p.species_id = s.id
      WHERE v.application_date >= CURRENT_DATE - INTERVAL '${days} days'
        AND p.is_active = true
      ORDER BY v.application_date DESC
      LIMIT 50
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }
}

module.exports = VaccinationRepository;
