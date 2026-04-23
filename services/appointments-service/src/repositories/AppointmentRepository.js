const BaseRepository = require('./BaseRepository');
const Appointment = require('../models/Appointment');

/**
 * Repositorio de Citas para el Appointments Service
 * @class AppointmentRepository
 * @description Gestiona la persistencia de citas médicas
 */
class AppointmentRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'appointments');
  }

  /**
   * Crea una nueva cita
   * @param {Object} appointmentData - Datos de la cita
   * @returns {Promise<Appointment>} Cita creada
   */
  async createAppointment(appointmentData) {
    try {
      // Verificar si ya existe una cita en el mismo horario para el mismo veterinario
      const conflictQuery = `
        SELECT id FROM appointments 
        WHERE veterinarian_id = $1 
        AND scheduled_datetime = $2 
        AND status NOT IN ('cancelled', 'no_show')
      `;
      const conflictResult = await this.pool.query(conflictQuery, [
        appointmentData.veterinarianId,
        appointmentData.scheduledDatetime
      ]);

      if (conflictResult.rows.length > 0) {
        throw new Error('Ya existe una cita programada para este veterinario en el mismo horario');
      }

      // Crear la cita
      const createdRow = await this.create({
        patient_id: appointmentData.patientId,
        tutor_id: appointmentData.tutorId,
        veterinarian_id: appointmentData.veterinarianId,
        appointment_type_id: appointmentData.appointmentTypeId,
        status: appointmentData.status || 'scheduled',
        scheduled_datetime: appointmentData.scheduledDatetime,
        estimated_duration_minutes: appointmentData.estimatedDurationMinutes,
        notes: appointmentData.notes,
        symptoms: appointmentData.symptoms,
        urgency_level: appointmentData.urgencyLevel || 'normal',
        price: appointmentData.price,
        is_paid: appointmentData.isPaid || false,
        payment_method: appointmentData.paymentMethod,
        created_by: appointmentData.createdBy
      });

      return Appointment.fromDatabaseRow(createdRow);
    } catch (error) {
      throw new Error(`Error al crear cita: ${error.message}`);
    }
  }

  /**
   * Obtiene citas por filtros avanzados
   * @param {Object} filters - Filtros de búsqueda
   * @param {Object} options - Opciones de paginación
   * @returns {Promise<{appointments: Appointment[], pagination: Object}>}
   */
  async getAppointmentsWithFilters(filters = {}, options = {}) {
    try {
      const { page = 1, limit = 20, orderBy = 'scheduled_datetime', orderDirection = 'ASC' } = options;
      const offset = (page - 1) * limit;

      const whereConditions = [];
      const params = [];
      let paramIndex = 1;

      // Construir condiciones WHERE dinámicamente
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'startDate') {
            whereConditions.push(`scheduled_datetime >= $${paramIndex}`);
            params.push(value);
            paramIndex++;
          } else if (key === 'endDate') {
            whereConditions.push(`scheduled_datetime <= $${paramIndex}`);
            params.push(value);
            paramIndex++;
          } else if (key === 'status' && Array.isArray(value)) {
            whereConditions.push(`status = ANY($${paramIndex})`);
            params.push(value);
            paramIndex++;
          } else if (key === 'veterinarianIds' && Array.isArray(value)) {
            whereConditions.push(`veterinarian_id = ANY($${paramIndex})`);
            params.push(value);
            paramIndex++;
          } else {
            whereConditions.push(`${key} = $${paramIndex}`);
            params.push(value);
            paramIndex++;
          }
        }
      });

      // Query principal
      const query = `
        SELECT a.*, 
               at.name as appointment_type_name,
               at.color as appointment_type_color,
               v.first_name as veterinarian_first_name,
               v.last_name as veterinarian_last_name,
               v.specialization as veterinarian_specialization
        FROM appointments a
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        LEFT JOIN veterinarians v ON a.veterinarian_id = v.id
        ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);

      const result = await this.pool.query(query, params);
      const appointments = result.rows.map(row => Appointment.fromDatabaseRow(row));

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM appointments a
        ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
      `;

      const countResult = await this.pool.query(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      return {
        appointments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error al obtener citas: ${error.message}`);
    }
  }

  /**
   * Obtiene una cita por su UUID
   * @param {string} uuid - UUID de la cita
   * @returns {Promise<Appointment|null>} Cita encontrada o null
   */
  async findByUuid(uuid) {
    try {
      const query = `
        SELECT a.*, 
               at.name as appointment_type_name,
               at.color as appointment_type_color,
               v.first_name as veterinarian_first_name,
               v.last_name as veterinarian_last_name,
               v.specialization as veterinarian_specialization
        FROM appointments a
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        LEFT JOIN veterinarians v ON a.veterinarian_id = v.id
        WHERE a.uuid = $1
      `;

      const result = await this.pool.query(query, [uuid]);
      return result.rows[0] ? Appointment.fromDatabaseRow(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error al buscar cita por UUID: ${error.message}`);
    }
  }

  /**
   * Obtiene citas de un veterinario en un rango de fechas
   * @param {number} veterinarianId - ID del veterinario
   * @param {Date} startDate - Fecha de inicio
   * @param {Date} endDate - Fecha de fin
   * @returns {Promise<Appointment[]>} Array de citas
   */
  async getVeterinarianAppointments(veterinarianId, startDate, endDate) {
    try {
      const query = `
        SELECT a.*, 
               at.name as appointment_type_name,
               at.color as appointment_type_color
        FROM appointments a
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        WHERE a.veterinarian_id = $1 
        AND a.scheduled_datetime BETWEEN $2 AND $3
        AND a.status NOT IN ('cancelled', 'no_show')
        ORDER BY a.scheduled_datetime ASC
      `;

      const result = await this.pool.query(query, [veterinarianId, startDate, endDate]);
      return result.rows.map(row => Appointment.fromDatabaseRow(row));
    } catch (error) {
      throw new Error(`Error al obtener citas del veterinario: ${error.message}`);
    }
  }

  /**
   * Obtiene citas de un paciente
   * @param {number} patientId - ID del paciente
   * @param {Object} options - Opciones de consulta
   * @returns {Promise<{appointments: Appointment[], pagination: Object}>}
   */
  async getPatientAppointments(patientId, options = {}) {
    try {
      const { page = 1, limit = 20, status } = options;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE a.patient_id = $1';
      const params = [patientId];
      let paramIndex = 2;

      if (status && Array.isArray(status)) {
        whereClause += ` AND a.status = ANY($${paramIndex})`;
        params.push(status);
        paramIndex++;
      }

      const query = `
        SELECT a.*, 
               at.name as appointment_type_name,
               at.color as appointment_type_color,
               v.first_name as veterinarian_first_name,
               v.last_name as veterinarian_last_name,
               v.specialization as veterinarian_specialization
        FROM appointments a
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        LEFT JOIN veterinarians v ON a.veterinarian_id = v.id
        ${whereClause}
        ORDER BY a.scheduled_datetime DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);

      const result = await this.pool.query(query, params);
      const appointments = result.rows.map(row => Appointment.fromDatabaseRow(row));

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM appointments a
        ${whereClause}
      `;

      const countResult = await this.pool.query(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      return {
        appointments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error al obtener citas del paciente: ${error.message}`);
    }
  }

  /**
   * Actualiza el estado de una cita
   * @param {number} appointmentId - ID de la cita
   * @param {string} status - Nuevo estado
   * @param {number} updatedBy - ID del usuario que actualiza
   * @returns {Promise<Appointment|null>} Cita actualizada
   */
  async updateStatus(appointmentId, status, updatedBy) {
    try {
      const query = `
        UPDATE appointments 
        SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;

      const result = await this.pool.query(query, [status, updatedBy, appointmentId]);
      return result.rows[0] ? Appointment.fromDatabaseRow(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error al actualizar estado de cita: ${error.message}`);
    }
  }

  /**
   * Obtiene citas para el día de hoy
   * @param {number} veterinarianId - ID del veterinario (opcional)
   * @returns {Promise<Appointment[]>} Array de citas de hoy
   */
  async getTodayAppointments(veterinarianId = null) {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      let query = `
        SELECT a.*, 
               at.name as appointment_type_name,
               at.color as appointment_type_color,
               v.first_name as veterinarian_first_name,
               v.last_name as veterinarian_last_name
        FROM appointments a
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        LEFT JOIN veterinarians v ON a.veterinarian_id = v.id
        WHERE a.scheduled_datetime BETWEEN $1 AND $2
        AND a.status NOT IN ('cancelled', 'no_show')
      `;
      
      const params = [startOfDay, endOfDay];

      if (veterinarianId) {
        query += ` AND a.veterinarian_id = $3`;
        params.push(veterinarianId);
      }

      query += ` ORDER BY a.scheduled_datetime ASC`;

      const result = await this.pool.query(query, params);
      return result.rows.map(row => Appointment.fromDatabaseRow(row));
    } catch (error) {
      throw new Error(`Error al obtener citas de hoy: ${error.message}`);
    }
  }

  /**
   * Obtiene estadísticas de citas
   * @param {Object} filters - Filtros para estadísticas
   * @returns {Promise<Object>} Estadísticas de citas
   */
  async getAppointmentStats(filters = {}) {
    try {
      const { startDate, endDate, veterinarianId } = filters;
      
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (startDate) {
        whereClause += ` AND scheduled_datetime >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND scheduled_datetime <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      if (veterinarianId) {
        whereClause += ` AND veterinarian_id = $${paramIndex}`;
        params.push(veterinarianId);
        paramIndex++;
      }

      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
          COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_show,
          COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
          COUNT(CASE WHEN urgency_level = 'emergency' THEN 1 END) as emergencies,
          AVG(estimated_duration_minutes) as avg_duration,
          SUM(price) as total_revenue
        FROM appointments 
        ${whereClause}
      `;

      const result = await this.pool.query(query, params);
      const stats = result.rows[0];

      return {
        total: parseInt(stats.total) || 0,
        completed: parseInt(stats.completed) || 0,
        cancelled: parseInt(stats.cancelled) || 0,
        noShow: parseInt(stats.no_show) || 0,
        scheduled: parseInt(stats.scheduled) || 0,
        confirmed: parseInt(stats.confirmed) || 0,
        emergencies: parseInt(stats.emergencies) || 0,
        avgDuration: parseFloat(stats.avg_duration) || 0,
        totalRevenue: parseFloat(stats.total_revenue) || 0,
        completionRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
        cancellationRate: stats.total > 0 ? (stats.cancelled / stats.total) * 100 : 0
      };
    } catch (error) {
      throw new Error(`Error al obtener estadísticas de citas: ${error.message}`);
    }
  }

  /**
   * Verifica disponibilidad de horario
   * @param {number} veterinarianId - ID del veterinario
   * @param {Date} scheduledDatetime - Fecha y hora programada
   * @param {number} durationMinutes - Duración en minutos
   * @param {number} excludeAppointmentId - ID de cita a excluir (para actualizaciones)
   * @returns {Promise<boolean>} True si está disponible
   */
  async checkAvailability(veterinarianId, scheduledDatetime, durationMinutes, excludeAppointmentId = null) {
    try {
      const startTime = new Date(scheduledDatetime);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

      let query = `
        SELECT COUNT(*) as count
        FROM appointments 
        WHERE veterinarian_id = $1 
        AND (
          (scheduled_datetime < $2 AND scheduled_datetime + (estimated_duration_minutes * INTERVAL '1 minute') > $2) OR
          (scheduled_datetime < $3 AND scheduled_datetime + (estimated_duration_minutes * INTERVAL '1 minute') > $3) OR
          (scheduled_datetime >= $2 AND scheduled_datetime + (estimated_duration_minutes * INTERVAL '1 minute') <= $3)
        )
        AND status NOT IN ('cancelled', 'no_show')
      `;
      
      const params = [veterinarianId, startTime, endTime];

      if (excludeAppointmentId) {
        query += ` AND id != $4`;
        params.push(excludeAppointmentId);
      }

      const result = await this.pool.query(query, params);
      return parseInt(result.rows[0].count) === 0;
    } catch (error) {
      throw new Error(`Error al verificar disponibilidad: ${error.message}`);
    }
  }
}

module.exports = AppointmentRepository;
