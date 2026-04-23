const { pool } = require('../config/database');
const Hospitalization = require('../models/Hospitalization');
const VitalSigns = require('../models/VitalSigns');
const MedicationAdministration = require('../models/MedicationAdministration');

/**
 * Repositorio de Hospitalizaciones
 */
class HospitalizationRepository {
  /**
   * Crear nueva hospitalización
   */
  async create(hospitalizationData) {
    Hospitalization.validate(hospitalizationData);
    
    const query = `
      INSERT INTO hospitalizations (
        patient_id, veterinarian_id, room_number, admission_date, 
        reason_for_admission, initial_diagnosis, treatment_plan, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      hospitalizationData.patientId,
      hospitalizationData.veterinarianId,
      hospitalizationData.roomNumber,
      hospitalizationData.admissionDate || new Date().toISOString(),
      hospitalizationData.reasonForAdmission,
      hospitalizationData.initialDiagnosis,
      hospitalizationData.treatmentPlan,
      hospitalizationData.notes
    ];
    
    try {
      const result = await pool.query(query, values);
      return Hospitalization.fromDatabase(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        throw new Error('Hospitalization already exists for this patient');
      }
      throw error;
    }
  }

  /**
   * Obtener hospitalización por ID
   */
  async findById(id) {
    const query = `
      SELECT * FROM hospitalizations 
      WHERE id = $1
    `;
    
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0] ? Hospitalization.fromDatabase(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener hospitalizaciones activas
   */
  async findActive() {
    const query = `
      SELECT * FROM hospitalizations 
      WHERE status = 'active'
      ORDER BY admission_date DESC
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows.map(row => Hospitalization.fromDatabase(row));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener hospitalizaciones por paciente
   */
  async findByPatientId(patientId, limit = 10) {
    const query = `
      SELECT * FROM hospitalizations 
      WHERE patient_id = $1
      ORDER BY admission_date DESC
      LIMIT $2
    `;
    
    try {
      const result = await pool.query(query, [patientId, limit]);
      return result.rows.map(row => Hospitalization.fromDatabase(row));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener hospitalizaciones por habitación
   */
  async findByRoomNumber(roomNumber) {
    const query = `
      SELECT * FROM hospitalizations 
      WHERE room_number = $1 AND status = 'active'
      ORDER BY admission_date DESC
    `;
    
    try {
      const result = await pool.query(query, [roomNumber]);
      return result.rows.map(row => Hospitalization.fromDatabase(row));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener hospitalizaciones con paginación
   */
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      veterinarianId,
      startDate,
      endDate
    } = options;
    
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramIndex = 1;
    
    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }
    
    if (veterinarianId) {
      whereClause += ` AND veterinarian_id = $${paramIndex}`;
      values.push(veterinarianId);
      paramIndex++;
    }
    
    if (startDate) {
      whereClause += ` AND admission_date >= $${paramIndex}`;
      values.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      whereClause += ` AND admission_date <= $${paramIndex}`;
      values.push(endDate);
      paramIndex++;
    }
    
    const query = `
      SELECT * FROM hospitalizations 
      ${whereClause}
      ORDER BY admission_date DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const countQuery = `
      SELECT COUNT(*) FROM hospitalizations 
      ${whereClause}
    `;
    
    try {
      const [result, countResult] = await Promise.all([
        pool.query(query, [...values, limit, offset]),
        pool.query(countQuery, values)
      ]);
      
      const total = parseInt(countResult.rows[0].count);
      const pages = Math.ceil(total / limit);
      
      return {
        hospitalizations: result.rows.map(row => Hospitalization.fromDatabase(row)),
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Actualizar hospitalización
   */
  async update(id, updateData) {
    const allowedFields = [
      'roomNumber', 'status', 'reasonForAdmission', 
      'initialDiagnosis', 'treatmentPlan', 'notes', 'dischargeDate'
    ];
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        updates.push(`${dbField} = $${paramIndex}`);
        values.push(updateData[field]);
        paramIndex++;
      }
    }
    
    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const query = `
      UPDATE hospitalizations 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0] ? Hospitalization.fromDatabase(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Dar de alta hospitalización
   */
  async discharge(id, dischargeNotes) {
    const query = `
      UPDATE hospitalizations 
      SET status = 'discharged', 
          discharge_date = CURRENT_TIMESTAMP,
          notes = COALESCE(notes, '') || CASE WHEN $1 IS NOT NULL THEN '\n\nDischarge: ' || $1 ELSE '' END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [dischargeNotes, id]);
      return result.rows[0] ? Hospitalization.fromDatabase(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener estadísticas de hospitalización
   */
  async getStatistics(options = {}) {
    const { startDate, endDate } = options;
    
    let whereClause = 'WHERE 1=1';
    const values = [];
    
    if (startDate) {
      whereClause += ` AND admission_date >= $1`;
      values.push(startDate);
    }
    
    if (endDate) {
      const paramIndex = values.length + 1;
      whereClause += ` AND admission_date <= $${paramIndex}`;
      values.push(endDate);
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_hospitalizations,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_hospitalizations,
        COUNT(CASE WHEN status = 'discharged' THEN 1 END) as discharged_hospitalizations,
        COUNT(CASE WHEN status = 'transferred' THEN 1 END) as transferred_hospitalizations,
        AVG(CASE WHEN discharge_date IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (discharge_date - admission_date)) / 86400 
          END) as avg_stay_days
      FROM hospitalizations 
      ${whereClause}
    `;
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener ocupación por habitación
   */
  async getOccupancyByRoom() {
    const query = `
      SELECT 
        r.room_number,
        r.max_capacity,
        COUNT(h.id) as current_occupancy,
        r.max_capacity - COUNT(h.id) as available_spaces
      FROM rooms r
      LEFT JOIN hospitalizations h ON r.room_number = h.room_number AND h.status = 'active'
      WHERE r.is_active = true
      GROUP BY r.room_number, r.max_capacity
      ORDER BY r.room_number
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new HospitalizationRepository();
