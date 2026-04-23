const BaseRepository = require('./BaseRepository');

class DewormingRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'dewormings');
  }

  async create(dewormingData) {
    const {
      patientId,
      veterinarianId,
      productName,
      activeIngredient,
      manufacturer,
      lotNumber,
      expirationDate,
      applicationDate,
      nextApplicationDate,
      dosage,
      dosageUnit,
      administrationRoute,
      targetParasites,
      adverseReactions
    } = dewormingData;

    const data = {
      patient_id: patientId,
      veterinarian_id: veterinarianId,
      product_name: productName,
      active_ingredient: activeIngredient,
      manufacturer,
      lot_number: lotNumber,
      expiration_date: expirationDate,
      application_date: applicationDate,
      next_application_date: nextApplicationDate,
      dosage,
      dosage_unit: dosageUnit,
      administration_route: administrationRoute,
      target_parasites: targetParasites,
      adverse_reactions: adverseReactions
    };

    return this.create(data);
  }

  async getPatientDewormings(patientId) {
    const query = `
      SELECT 
        d.*,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name
      FROM dewormings d
      LEFT JOIN users u ON d.veterinarian_id = u.id
      WHERE d.patient_id = $1
      ORDER BY d.application_date DESC
    `;

    const result = await this.pool.query(query, [patientId]);
    return result.rows;
  }

  async getUpcomingDewormings(days = 30) {
    const query = `
      SELECT 
        d.id,
        d.patient_id,
        d.product_name,
        d.active_ingredient,
        d.application_date,
        d.next_application_date,
        d.dosage,
        d.dosage_unit,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        t.email as tutor_email,
        t.phone as tutor_phone,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name
      FROM dewormings d
      LEFT JOIN patients p ON d.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON d.veterinarian_id = u.id
      WHERE d.next_application_date IS NOT NULL
        AND d.next_application_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
        AND p.is_active = true
      ORDER BY d.next_application_date, p.name
      LIMIT 100
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getOverdueDewormings() {
    const query = `
      SELECT 
        d.id,
        d.patient_id,
        d.product_name,
        d.active_ingredient,
        d.application_date,
        d.next_application_date,
        d.dosage,
        d.dosage_unit,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        t.email as tutor_email,
        t.phone as tutor_phone,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name,
        CURRENT_DATE - d.next_application_date as days_overdue
      FROM dewormings d
      LEFT JOIN patients p ON d.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON d.veterinarian_id = u.id
      WHERE d.next_application_date IS NOT NULL
        AND d.next_application_date < CURRENT_DATE
        AND p.is_active = true
      ORDER BY d.next_application_date, p.name
      LIMIT 100
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getDewormingsByActiveIngredient(activeIngredient) {
    const query = `
      SELECT 
        d.*,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name
      FROM dewormings d
      LEFT JOIN patients p ON d.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON d.veterinarian_id = u.id
      WHERE d.active_ingredient ILIKE $1
        AND p.is_active = true
      ORDER BY d.application_date DESC
      LIMIT 50
    `;

    const result = await this.pool.query(query, [`%${activeIngredient}%`]);
    return result.rows;
  }

  async getDewormingsByDateRange(startDate, endDate) {
    const query = `
      SELECT 
        d.*,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name
      FROM dewormings d
      LEFT JOIN patients p ON d.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON d.veterinarian_id = u.id
      WHERE d.application_date BETWEEN $1 AND $2
        AND p.is_active = true
      ORDER BY d.application_date DESC
      LIMIT 100
    `;

    const result = await this.pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  async getDewormingStats() {
    const query = `
      SELECT 
        COUNT(*) as total_dewormings,
        COUNT(DISTINCT patient_id) as unique_patients,
        COUNT(DISTINCT product_name) as unique_products,
        COUNT(DISTINCT active_ingredient) as unique_ingredients,
        COUNT(CASE WHEN next_application_date > CURRENT_DATE THEN 1 END) as upcoming_dewormings,
        COUNT(CASE WHEN next_application_date < CURRENT_DATE THEN 1 END) as overdue_dewormings,
        AVG(dosage) as avg_dosage,
        COUNT(CASE WHEN adverse_reactions IS NOT NULL AND adverse_reactions != '' THEN 1 END) as dewormings_with_reactions
      FROM dewormings d
      LEFT JOIN patients p ON d.patient_id = p.id
      WHERE p.is_active = true
    `;

    const result = await this.pool.query(query);
    return result.rows[0];
  }

  async getActiveIngredientStats() {
    const query = `
      SELECT 
        active_ingredient,
        COUNT(*) as count,
        COUNT(DISTINCT patient_id) as unique_patients,
        AVG(dosage) as avg_dosage,
        COUNT(CASE WHEN adverse_reactions IS NOT NULL AND adverse_reactions != '' THEN 1 END) as reactions_count
      FROM dewormings d
      LEFT JOIN patients p ON d.patient_id = p.id
      WHERE p.is_active = true
      GROUP BY active_ingredient
      ORDER BY count DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getProductStats() {
    const query = `
      SELECT 
        product_name,
        manufacturer,
        active_ingredient,
        COUNT(*) as count,
        COUNT(DISTINCT patient_id) as unique_patients,
        AVG(dosage) as avg_dosage,
        COUNT(CASE WHEN adverse_reactions IS NOT NULL AND adverse_reactions != '' THEN 1 END) as reactions_count
      FROM dewormings d
      LEFT JOIN patients p ON d.patient_id = p.id
      WHERE p.is_active = true
      GROUP BY product_name, manufacturer, active_ingredient
      ORDER BY count DESC
      LIMIT 20
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getMonthlyDewormingStats(year, month) {
    const query = `
      SELECT 
        DATE_TRUNC('day', application_date) as date,
        COUNT(*) as daily_dewormings,
        COUNT(DISTINCT patient_id) as unique_patients_daily,
        active_ingredient,
        COUNT(*) as ingredient_count
      FROM dewormings d
      LEFT JOIN patients p ON d.patient_id = p.id
      WHERE EXTRACT(YEAR FROM d.application_date) = $1 
        AND EXTRACT(MONTH FROM d.application_date) = $2
        AND p.is_active = true
      GROUP BY DATE_TRUNC('day', d.application_date), active_ingredient
      ORDER BY date DESC, active_ingredient
    `;

    const result = await this.pool.query(query, [year, month]);
    return result.rows;
  }

  async getDewormingsByVeterinarian(veterinarianId, startDate, endDate) {
    const query = `
      SELECT 
        d.*,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name
      FROM dewormings d
      LEFT JOIN patients p ON d.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      WHERE d.veterinarian_id = $1 
        AND d.application_date BETWEEN $2 AND $3
        AND p.is_active = true
      ORDER BY d.application_date DESC
      LIMIT 100
    `;

    const result = await this.pool.query(query, [veterinarianId, startDate, endDate]);
    return result.rows;
  }

  async getPatientDewormingSchedule(patientId) {
    const query = `
      SELECT 
        product_name,
        active_ingredient,
        manufacturer,
        application_date,
        next_application_date,
        dosage,
        dosage_unit,
        administration_route,
        target_parasites,
        CASE 
          WHEN next_application_date IS NULL THEN 'completed'
          WHEN next_application_date < CURRENT_DATE THEN 'overdue'
          WHEN next_application_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
          ELSE 'scheduled'
        END as status
      FROM dewormings
      WHERE patient_id = $1
      ORDER BY application_date DESC
    `;

    const result = await this.pool.query(query, [patientId]);
    return result.rows;
  }

  async getExpiringProducts(days = 90) {
    const query = `
      SELECT DISTINCT
        d.product_name,
        d.manufacturer,
        d.lot_number,
        d.expiration_date,
        COUNT(*) as applications_count,
        COUNT(DISTINCT d.patient_id) as unique_patients
      FROM dewormings d
      LEFT JOIN patients p ON d.patient_id = p.id
      WHERE d.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
        AND p.is_active = true
      GROUP BY d.product_name, d.manufacturer, d.lot_number, d.expiration_date
      ORDER BY d.expiration_date
      LIMIT 50
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async searchDewormings(searchTerm) {
    const query = `
      SELECT 
        d.id,
        d.patient_id,
        d.product_name,
        d.active_ingredient,
        d.application_date,
        d.next_application_date,
        d.dosage,
        d.dosage_unit,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name
      FROM dewormings d
      LEFT JOIN patients p ON d.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON d.veterinarian_id = u.id
      WHERE d.product_name ILIKE $1 
        OR d.active_ingredient ILIKE $1
        OR d.manufacturer ILIKE $1
        OR d.lot_number ILIKE $1
        OR d.target_parasites ILIKE $1
        OR p.name ILIKE $1
        OR p.nickname ILIKE $1
        OR t.first_name ILIKE $1
        OR t.last_name ILIKE $1
        AND p.is_active = true
      ORDER BY d.application_date DESC
      LIMIT 50
    `;

    const result = await this.pool.query(query, [`%${searchTerm}%`]);
    return result.rows;
  }

  async updateNextApplicationDate(id, nextApplicationDate) {
    const query = `
      UPDATE dewormings
      SET next_application_date = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, next_application_date, updated_at
    `;

    const result = await this.pool.query(query, [id, nextApplicationDate]);
    return result.rows[0];
  }

  async getDewormingById(id) {
    const query = `
      SELECT 
        d.*,
        p.name as patient_name,
        p.nickname as patient_nickname,
        p.gender,
        p.birth_date,
        p.weight,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        t.email as tutor_email,
        t.phone as tutor_phone,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name,
        u.email as veterinarian_email,
        s.name as species_name,
        b.name as breed_name
      FROM dewormings d
      LEFT JOIN patients p ON d.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON d.veterinarian_id = u.id
      LEFT JOIN species s ON p.species_id = s.id
      LEFT JOIN breeds b ON p.breed_id = b.id
      WHERE d.id = $1
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async getRecentDewormings(days = 30) {
    const query = `
      SELECT 
        d.id,
        d.patient_id,
        d.product_name,
        d.active_ingredient,
        d.application_date,
        d.dosage,
        d.dosage_unit,
        d.administration_route,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name,
        s.name as species_name
      FROM dewormings d
      LEFT JOIN patients p ON d.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON d.veterinarian_id = u.id
      LEFT JOIN species s ON p.species_id = s.id
      WHERE d.application_date >= CURRENT_DATE - INTERVAL '${days} days'
        AND p.is_active = true
      ORDER BY d.application_date DESC
      LIMIT 50
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getTargetParasitesStats() {
    const query = `
      SELECT 
        UNNEST(string_to_array(target_parasites, ',')) as parasite,
        COUNT(*) as count,
        COUNT(DISTINCT patient_id) as unique_patients
      FROM dewormings d
      LEFT JOIN patients p ON d.patient_id = p.id
      WHERE p.is_active = true
        AND target_parasites IS NOT NULL
        AND target_parasites != ''
      GROUP BY parasite
      ORDER BY count DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getAdministrationRouteStats() {
    const query = `
      SELECT 
        administration_route,
        COUNT(*) as count,
        COUNT(DISTINCT patient_id) as unique_patients,
        AVG(dosage) as avg_dosage
      FROM dewormings d
      LEFT JOIN patients p ON d.patient_id = p.id
      WHERE p.is_active = true
        AND administration_route IS NOT NULL
      GROUP BY administration_route
      ORDER BY count DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }
}

module.exports = DewormingRepository;
