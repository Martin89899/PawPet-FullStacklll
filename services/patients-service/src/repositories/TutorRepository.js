const BaseRepository = require('./BaseRepository');

class TutorRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'tutors');
  }

  async findByEmail(email) {
    return this.findOne({ email, is_active: true });
  }

  async findByIdentificationNumber(identificationNumber) {
    return this.findOne({ identification_number: identificationNumber, is_active: true });
  }

  async create(tutorData) {
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      country,
      postalCode,
      identificationNumber
    } = tutorData;

    const data = {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      address,
      city,
      country,
      postal_code: postalCode,
      identification_number: identificationNumber
    };

    return this.create(data);
  }

  async update(id, tutorData) {
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      country,
      postalCode
    } = tutorData;

    const data = {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      address,
      city,
      country,
      postal_code: postalCode
    };

    return this.update(id, data);
  }

  async getActiveTutors(limit = 50, offset = 0) {
    return this.findMany(
      { is_active: true },
      { 
        orderBy: 'created_at DESC',
        limit,
        offset
      }
    );
  }

  async searchTutors(searchTerm) {
    const query = `
      SELECT id, first_name, last_name, email, phone, city, country, created_at
      FROM tutors
      WHERE is_active = true 
        AND (first_name ILIKE $1 
             OR last_name ILIKE $1 
             OR email ILIKE $1 
             OR phone ILIKE $1
             OR identification_number ILIKE $1)
      ORDER BY first_name, last_name
      LIMIT 20
    `;

    const result = await this.pool.query(query, [`%${searchTerm}%`]);
    return result.rows;
  }

  async getTutorsWithPatientCount() {
    const query = `
      SELECT 
        t.id,
        t.first_name,
        t.last_name,
        t.email,
        t.phone,
        t.city,
        t.country,
        t.created_at,
        COUNT(p.id) as patient_count
      FROM tutors t
      LEFT JOIN patients p ON t.id = p.tutor_id AND p.is_active = true
      WHERE t.is_active = true
      GROUP BY t.id, t.first_name, t.last_name, t.email, t.phone, t.city, t.country, t.created_at
      ORDER BY t.last_name, t.first_name
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getTutorStats() {
    const query = `
      SELECT 
        COUNT(*) as total_tutors,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_tutors,
        COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as tutors_with_email,
        COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as tutors_with_phone,
        COUNT(CASE WHEN identification_number IS NOT NULL THEN 1 END) as tutors_with_id
      FROM tutors
    `;

    const result = await this.pool.query(query);
    return result.rows[0];
  }

  async getTutorsByCity() {
    const query = `
      SELECT 
        city,
        COUNT(*) as tutor_count
      FROM tutors
      WHERE is_active = true AND city IS NOT NULL
      GROUP BY city
      ORDER BY tutor_count DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getRecentTutors(days = 30) {
    const query = `
      SELECT id, first_name, last_name, email, phone, city, created_at
      FROM tutors
      WHERE is_active = true 
        AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY created_at DESC
      LIMIT 20
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async deactivateTutor(id) {
    const query = `
      UPDATE tutors
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, first_name, last_name, email
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async reactivateTutor(id) {
    const query = `
      UPDATE tutors
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, first_name, last_name, email
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async hasActivePatients(tutorId) {
    const query = `
      SELECT COUNT(*) as count
      FROM patients
      WHERE tutor_id = $1 AND is_active = true
    `;

    const result = await this.pool.query(query, [tutorId]);
    return parseInt(result.rows[0].count) > 0;
  }

  async getTutorWithPatients(tutorId) {
    const query = `
      SELECT 
        t.id,
        t.first_name,
        t.last_name,
        t.email,
        t.phone,
        t.address,
        t.city,
        t.country,
        t.postal_code,
        t.identification_number,
        t.created_at,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', p.id,
            'name', p.name,
            'species_id', p.species_id,
            'breed_id', p.breed_id,
            'birth_date', p.birth_date,
            'gender', p.gender,
            'is_active', p.is_active
          )
        ) FILTER (WHERE p.id IS NOT NULL) as patients
      FROM tutors t
      LEFT JOIN patients p ON t.id = p.tutor_id
      WHERE t.id = $1 AND t.is_active = true
      GROUP BY t.id, t.first_name, t.last_name, t.email, t.phone, t.address, t.city, t.country, t.postal_code, t.identification_number, t.created_at
    `;

    const result = await this.pool.query(query, [tutorId]);
    return result.rows[0];
  }
}

module.exports = TutorRepository;
