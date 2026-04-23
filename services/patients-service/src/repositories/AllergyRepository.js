const BaseRepository = require('./BaseRepository');

class AllergyRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'allergies');
  }

  async create(allergyData) {
    const {
      patientId,
      veterinarianId,
      allergen,
      allergyType,
      severity,
      symptoms,
      treatment
    } = allergyData;

    const data = {
      patient_id: patientId,
      veterinarian_id: veterinarianId,
      allergen,
      allergy_type: allergyType,
      severity,
      symptoms,
      treatment
    };

    return this.create(data);
  }

  async getPatientAllergies(patientId) {
    const query = `
      SELECT 
        a.*,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name
      FROM allergies a
      LEFT JOIN users u ON a.veterinarian_id = u.id
      WHERE a.patient_id = $1
      ORDER BY a.severity DESC, a.allergen
    `;

    const result = await this.pool.query(query, [patientId]);
    return result.rows;
  }

  async getSevereAllergies() {
    const query = `
      SELECT 
        a.*,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        t.email as tutor_email,
        t.phone as tutor_phone,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name
      FROM allergies a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON a.veterinarian_id = u.id
      WHERE a.severity IN ('severe', 'life_threatening')
        AND p.is_active = true
      ORDER BY a.severity DESC, a.allergen
      LIMIT 100
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getAllergiesByType(allergyType) {
    const query = `
      SELECT 
        a.*,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name
      FROM allergies a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON a.veterinarian_id = u.id
      WHERE a.allergy_type = $1
        AND p.is_active = true
      ORDER BY a.severity DESC, a.allergen
      LIMIT 50
    `;

    const result = await this.pool.query(query, [allergyType]);
    return result.rows;
  }

  async getAllergiesBySeverity(severity) {
    const query = `
      SELECT 
        a.*,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name
      FROM allergies a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON a.veterinarian_id = u.id
      WHERE a.severity = $1
        AND p.is_active = true
      ORDER BY a.allergen
      LIMIT 50
    `;

    const result = await this.pool.query(query, [severity]);
    return result.rows;
  }

  async getAllergyStats() {
    const query = `
      SELECT 
        COUNT(*) as total_allergies,
        COUNT(DISTINCT patient_id) as unique_patients,
        COUNT(DISTINCT allergen) as unique_allergens,
        COUNT(CASE WHEN severity = 'mild' THEN 1 END) as mild_allergies,
        COUNT(CASE WHEN severity = 'moderate' THEN 1 END) as moderate_allergies,
        COUNT(CASE WHEN severity = 'severe' THEN 1 END) as severe_allergies,
        COUNT(CASE WHEN severity = 'life_threatening' THEN 1 END) as life_threatening_allergies,
        COUNT(CASE WHEN allergy_type = 'food' THEN 1 END) as food_allergies,
        COUNT(CASE WHEN allergy_type = 'medication' THEN 1 END) as medication_allergies,
        COUNT(CASE WHEN allergy_type = 'environmental' THEN 1 END) as environmental_allergies,
        COUNT(CASE WHEN allergy_type = 'other' THEN 1 END) as other_allergies
      FROM allergies a
      LEFT JOIN patients p ON a.patient_id = p.id
      WHERE p.is_active = true
    `;

    const result = await this.pool.query(query);
    return result.rows[0];
  }

  async getAllergyTypeStats() {
    const query = `
      SELECT 
        allergy_type,
        COUNT(*) as count,
        COUNT(DISTINCT patient_id) as unique_patients,
        COUNT(CASE WHEN severity = 'severe' THEN 1 END) as severe_count,
        COUNT(CASE WHEN severity = 'life_threatening' THEN 1 END) as life_threatening_count
      FROM allergies a
      LEFT JOIN patients p ON a.patient_id = p.id
      WHERE p.is_active = true
      GROUP BY allergy_type
      ORDER BY count DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getSeverityStats() {
    const query = `
      SELECT 
        severity,
        COUNT(*) as count,
        COUNT(DISTINCT patient_id) as unique_patients,
        allergy_type
      FROM allergies a
      LEFT JOIN patients p ON a.patient_id = p.id
      WHERE p.is_active = true
      GROUP BY severity, allergy_type
      ORDER BY 
        CASE severity 
          WHEN 'life_threatening' THEN 1
          WHEN 'severe' THEN 2
          WHEN 'moderate' THEN 3
          WHEN 'mild' THEN 4
        END,
        count DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getCommonAllergens() {
    const query = `
      SELECT 
        allergen,
        COUNT(*) as count,
        COUNT(DISTINCT patient_id) as unique_patients,
        COUNT(CASE WHEN severity = 'severe' THEN 1 END) as severe_count,
        COUNT(CASE WHEN severity = 'life_threatening' THEN 1 END) as life_threatening_count,
        allergy_type
      FROM allergies a
      LEFT JOIN patients p ON a.patient_id = p.id
      WHERE p.is_active = true
      GROUP BY allergen, allergy_type
      ORDER BY count DESC
      LIMIT 20
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getAllergiesByVeterinarian(veterinarianId, startDate, endDate) {
    const query = `
      SELECT 
        a.*,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name
      FROM allergies a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      WHERE a.veterinarian_id = $1 
        AND a.created_at BETWEEN $2 AND $3
        AND p.is_active = true
      ORDER BY a.created_at DESC
      LIMIT 100
    `;

    const result = await this.pool.query(query, [veterinarianId, startDate, endDate]);
    return result.rows;
  }

  async getRecentAllergies(days = 30) {
    const query = `
      SELECT 
        a.id,
        a.patient_id,
        a.allergen,
        a.allergy_type,
        a.severity,
        a.symptoms,
        a.created_at,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name,
        s.name as species_name
      FROM allergies a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON a.veterinarian_id = u.id
      LEFT JOIN species s ON p.species_id = s.id
      WHERE a.created_at >= CURRENT_DATE - INTERVAL '${days} days'
        AND p.is_active = true
      ORDER BY a.created_at DESC
      LIMIT 50
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async searchAllergies(searchTerm) {
    const query = `
      SELECT 
        a.id,
        a.patient_id,
        a.allergen,
        a.allergy_type,
        a.severity,
        a.symptoms,
        a.created_at,
        p.name as patient_name,
        p.nickname as patient_nickname,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        u.first_name as veterinarian_first_name,
        u.last_name as veterinarian_last_name
      FROM allergies a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON a.veterinarian_id = u.id
      WHERE a.allergen ILIKE $1 
        OR a.symptoms ILIKE $1
        OR a.treatment ILIKE $1
        OR p.name ILIKE $1
        OR p.nickname ILIKE $1
        OR t.first_name ILIKE $1
        OR t.last_name ILIKE $1
        AND p.is_active = true
      ORDER BY a.severity DESC, a.allergen
      LIMIT 50
    `;

    const result = await this.pool.query(query, [`%${searchTerm}%`]);
    return result.rows;
  }

  async getAllergyById(id) {
    const query = `
      SELECT 
        a.*,
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
      FROM allergies a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN users u ON a.veterinarian_id = u.id
      LEFT JOIN species s ON p.species_id = s.id
      LEFT JOIN breeds b ON p.breed_id = b.id
      WHERE a.id = $1
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async update(id, allergyData) {
    const {
      allergen,
      allergyType,
      severity,
      symptoms,
      treatment
    } = allergyData;

    const data = {
      allergen,
      allergy_type: allergyType,
      severity,
      symptoms,
      treatment
    };

    return this.update(id, data);
  }

  async delete(id) {
    const query = `
      DELETE FROM allergies
      WHERE id = $1
      RETURNING id, patient_id, allergen
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async getPatientAllergySummary(patientId) {
    const query = `
      SELECT 
        COUNT(*) as total_allergies,
        COUNT(CASE WHEN severity = 'mild' THEN 1 END) as mild_count,
        COUNT(CASE WHEN severity = 'moderate' THEN 1 END) as moderate_count,
        COUNT(CASE WHEN severity = 'severe' THEN 1 END) as severe_count,
        COUNT(CASE WHEN severity = 'life_threatening' THEN 1 END) as life_threatening_count,
        COUNT(CASE WHEN allergy_type = 'food' THEN 1 END) as food_count,
        COUNT(CASE WHEN allergy_type = 'medication' THEN 1 END) as medication_count,
        COUNT(CASE WHEN allergy_type = 'environmental' THEN 1 END) as environmental_count,
        COUNT(CASE WHEN allergy_type = 'other' THEN 1 END) as other_count,
        BOOL_OR(CASE WHEN severity IN ('severe', 'life_threatening') THEN true ELSE false END) as has_severe_allergies
      FROM allergies
      WHERE patient_id = $1
    `;

    const result = await this.pool.query(query, [patientId]);
    return result.rows[0];
  }

  async getPatientsWithMultipleAllergies(minAllergies = 3) {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.nickname,
        p.birth_date,
        p.gender,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        t.email as tutor_email,
        t.phone as tutor_phone,
        COUNT(a.id) as allergy_count,
        COUNT(CASE WHEN a.severity IN ('severe', 'life_threatening') THEN 1 END) as severe_count
      FROM patients p
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN allergies a ON p.id = a.patient_id
      WHERE p.is_active = true
      GROUP BY p.id, p.name, p.nickname, p.birth_date, p.gender, t.first_name, t.last_name, t.email, t.phone
      HAVING COUNT(a.id) >= $1
      ORDER BY allergy_count DESC, p.name
      LIMIT 50
    `;

    const result = await this.pool.query(query, [minAllergies]);
    return result.rows;
  }

  async getAllergyInteractions(patientId, newAllergen) {
    const query = `
      SELECT 
        a.allergen,
        a.allergy_type,
        a.severity,
        a.symptoms,
        a.treatment
      FROM allergies a
      WHERE a.patient_id = $1
        AND a.allergen ILIKE $2
    `;

    const result = await this.pool.query(query, [patientId, `%${newAllergen}%`]);
    return result.rows;
  }
}

module.exports = AllergyRepository;
