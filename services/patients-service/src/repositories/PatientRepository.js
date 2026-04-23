const BaseRepository = require('./BaseRepository');

class PatientRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'patients');
  }

  async findByTutorId(tutorId) {
    const query = `
      SELECT p.*, s.name as species_name, b.name as breed_name
      FROM patients p
      LEFT JOIN species s ON p.species_id = s.id
      LEFT JOIN breeds b ON p.breed_id = b.id
      WHERE p.tutor_id = $1 AND p.is_active = true
      ORDER BY p.name
    `;
    
    const result = await this.pool.query(query, [tutorId]);
    return result.rows;
  }

  async findByMicrochipNumber(microchipNumber) {
    return this.findOne({ microchip_number: microchipNumber, is_active: true });
  }

  async create(patientData) {
    const {
      tutorId,
      speciesId,
      breedId,
      name,
      nickname,
      birthDate,
      gender,
      color,
      weight,
      microchipNumber,
      tattooNumber,
      specialMarks,
      allergies,
      chronicDiseases,
      currentMedications,
      dietaryRestrictions,
      behaviorNotes
    } = patientData;

    const data = {
      tutor_id: tutorId,
      species_id: speciesId,
      breed_id: breedId,
      name,
      nickname,
      birth_date: birthDate,
      gender,
      color,
      weight,
      microchip_number: microchipNumber,
      tattoo_number: tattooNumber,
      special_marks: specialMarks,
      allergies,
      chronic_diseases: chronicDiseases,
      current_medications: currentMedications,
      dietary_restrictions: dietaryRestrictions,
      behavior_notes: behaviorNotes
    };

    return this.create(data);
  }

  async update(id, patientData) {
    const {
      speciesId,
      breedId,
      name,
      nickname,
      birthDate,
      gender,
      color,
      weight,
      microchipNumber,
      tattooNumber,
      specialMarks,
      allergies,
      chronicDiseases,
      currentMedications,
      dietaryRestrictions,
      behaviorNotes
    } = patientData;

    const data = {
      species_id: speciesId,
      breed_id: breedId,
      name,
      nickname,
      birth_date: birthDate,
      gender,
      color,
      weight,
      microchip_number: microchipNumber,
      tattoo_number: tattooNumber,
      special_marks: specialMarks,
      allergies,
      chronic_diseases: chronicDiseases,
      current_medications: currentMedications,
      dietary_restrictions: dietaryRestrictions,
      behavior_notes: behaviorNotes
    };

    return this.update(id, data);
  }

  async getPatientWithDetails(id) {
    const query = `
      SELECT 
        p.*,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        t.email as tutor_email,
        t.phone as tutor_phone,
        s.name as species_name,
        b.name as breed_name
      FROM patients p
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN species s ON p.species_id = s.id
      LEFT JOIN breeds b ON p.breed_id = b.id
      WHERE p.id = $1 AND p.is_active = true
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async getAllPatients(limit = 50, offset = 0) {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.nickname,
        p.birth_date,
        p.gender,
        p.weight,
        p.is_active,
        p.created_at,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        s.name as species_name,
        b.name as breed_name
      FROM patients p
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN species s ON p.species_id = s.id
      LEFT JOIN breeds b ON p.breed_id = b.id
      WHERE p.is_active = true
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await this.pool.query(query, [limit, offset]);
    return result.rows;
  }

  async searchPatients(searchTerm) {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.nickname,
        p.gender,
        p.weight,
        p.microchip_number,
        p.created_at,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        t.email as tutor_email,
        t.phone as tutor_phone,
        s.name as species_name,
        b.name as breed_name
      FROM patients p
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN species s ON p.species_id = s.id
      LEFT JOIN breeds b ON p.breed_id = b.id
      WHERE p.is_active = true 
        AND (p.name ILIKE $1 
             OR p.nickname ILIKE $1 
             OR p.microchip_number ILIKE $1
             OR t.first_name ILIKE $1 
             OR t.last_name ILIKE $1
             OR t.email ILIKE $1
             OR t.phone ILIKE $1)
      ORDER BY p.name, t.last_name, t.first_name
      LIMIT 20
    `;

    const result = await this.pool.query(query, [`%${searchTerm}%`]);
    return result.rows;
  }

  async getPatientsBySpecies(speciesId) {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.nickname,
        p.birth_date,
        p.gender,
        p.weight,
        p.created_at,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        s.name as species_name,
        b.name as breed_name
      FROM patients p
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN species s ON p.species_id = s.id
      LEFT JOIN breeds b ON p.breed_id = b.id
      WHERE p.species_id = $1 AND p.is_active = true
      ORDER BY p.name
    `;

    const result = await this.pool.query(query, [speciesId]);
    return result.rows;
  }

  async getPatientsByGender(gender) {
    return this.findMany(
      { gender, is_active: true },
      { orderBy: 'name' }
    );
  }

  async getPatientsByAgeRange(minAge, maxAge) {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.nickname,
        p.birth_date,
        p.gender,
        p.weight,
        p.created_at,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        s.name as species_name,
        b.name as breed_name,
        AGE(p.birth_date) as age
      FROM patients p
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN species s ON p.species_id = s.id
      LEFT JOIN breeds b ON p.breed_id = b.id
      WHERE p.is_active = true 
        AND p.birth_date IS NOT NULL
        AND AGE(p.birth_date) BETWEEN INTERVAL '${minAge} years' AND INTERVAL '${maxAge} years'
      ORDER BY AGE(p.birth_date)
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getPatientsWithUpcomingVaccinations(days = 30) {
    const query = `
      SELECT DISTINCT
        p.id,
        p.name,
        p.nickname,
        p.birth_date,
        p.gender,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        t.email as tutor_email,
        t.phone as tutor_phone,
        s.name as species_name,
        v.next_application_date,
        v.vaccine_name
      FROM patients p
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN species s ON p.species_id = s.id
      LEFT JOIN vaccinations v ON p.id = v.patient_id
      WHERE p.is_active = true
        AND v.next_application_date IS NOT NULL
        AND v.next_application_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
      ORDER BY v.next_application_date, p.name
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getPatientsWithUpcomingDewormings(days = 30) {
    const query = `
      SELECT DISTINCT
        p.id,
        p.name,
        p.nickname,
        p.birth_date,
        p.gender,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        t.email as tutor_email,
        t.phone as tutor_phone,
        s.name as species_name,
        d.next_application_date,
        d.product_name
      FROM patients p
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN species s ON p.species_id = s.id
      LEFT JOIN dewormings d ON p.id = d.patient_id
      WHERE p.is_active = true
        AND d.next_application_date IS NOT NULL
        AND d.next_application_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
      ORDER BY d.next_application_date, p.name
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getPatientStats() {
    const query = `
      SELECT 
        COUNT(*) as total_patients,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_patients,
        COUNT(CASE WHEN gender = 'male' THEN 1 END) as male_patients,
        COUNT(CASE WHEN gender = 'female' THEN 1 END) as female_patients,
        COUNT(CASE WHEN microchip_number IS NOT NULL THEN 1 END) as patients_with_microchip,
        COUNT(CASE WHEN birth_date IS NOT NULL THEN 1 END) as patients_with_birth_date,
        AVG(weight) as average_weight
      FROM patients
    `;

    const result = await this.pool.query(query);
    return result.rows[0];
  }

  async getPatientsBySpeciesStats() {
    const query = `
      SELECT 
        s.name as species_name,
        COUNT(*) as patient_count,
        COUNT(CASE WHEN p.gender = 'male' THEN 1 END) as male_count,
        COUNT(CASE WHEN p.gender = 'female' THEN 1 END) as female_count,
        AVG(p.weight) as average_weight
      FROM patients p
      LEFT JOIN species s ON p.species_id = s.id
      WHERE p.is_active = true
      GROUP BY s.id, s.name
      ORDER BY patient_count DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getRecentPatients(days = 30) {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.nickname,
        p.birth_date,
        p.gender,
        p.weight,
        p.created_at,
        t.first_name as tutor_first_name,
        t.last_name as tutor_last_name,
        t.email as tutor_email,
        t.phone as tutor_phone,
        s.name as species_name,
        b.name as breed_name
      FROM patients p
      LEFT JOIN tutors t ON p.tutor_id = t.id
      LEFT JOIN species s ON p.species_id = s.id
      LEFT JOIN breeds b ON p.breed_id = b.id
      WHERE p.is_active = true 
        AND p.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY p.created_at DESC
      LIMIT 20
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async deactivatePatient(id) {
    const query = `
      UPDATE patients
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, tutor_id
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async reactivatePatient(id) {
    const query = `
      UPDATE patients
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, tutor_id
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async updateWeight(id, weight) {
    const query = `
      UPDATE patients
      SET weight = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, weight, updated_at
    `;

    const result = await this.pool.query(query, [id, weight]);
    return result.rows[0];
  }

  async hasActiveClinicalHistory(patientId) {
    const query = `
      SELECT COUNT(*) as count
      FROM clinical_history
      WHERE patient_id = $1
    `;

    const result = await this.pool.query(query, [patientId]);
    return parseInt(result.rows[0].count) > 0;
  }
}

module.exports = PatientRepository;
