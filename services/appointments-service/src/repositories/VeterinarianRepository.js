const BaseRepository = require('./BaseRepository');
const Veterinarian = require('../models/Veterinarian');

/**
 * Repositorio de Veterinarios para el Appointments Service
 * @class VeterinarianRepository
 * @description Gestiona la persistencia de veterinarios
 */
class VeterinarianRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'veterinarians');
  }

  /**
   * Obtiene todos los veterinarios activos
   * @returns {Promise<Veterinarian[]>} Array de veterinarios
   */
  async getActiveVeterinarians() {
    try {
      const query = `
        SELECT * FROM veterinarians 
        WHERE is_active = true 
        ORDER BY first_name ASC, last_name ASC
      `;
      
      const result = await this.pool.query(query);
      return result.rows.map(row => Veterinarian.fromDatabaseRow(row));
    } catch (error) {
      throw new Error(`Error al obtener veterinarios activos: ${error.message}`);
    }
  }

  /**
   * Obtiene veterinarios disponibles en una fecha y hora específicas
   * @param {Date} datetime - Fecha y hora a verificar
   * @returns {Promise<Veterinarian[]>} Array de veterinarios disponibles
   */
  async getAvailableVeterinarians(datetime) {
    try {
      const dayOfWeek = datetime.getDay();
      const query = `
        SELECT v.* 
        FROM veterinarians v
        LEFT JOIN veterinarian_schedules vs ON v.id = vs.veterinarian_id
        WHERE v.is_active = true
        AND (vs.day_of_week = $1 OR vs.day_of_week IS NULL)
        ORDER BY v.first_name ASC, v.last_name ASC
      `;
      
      const result = await this.pool.query(query, [dayOfWeek]);
      const allVeterinarians = result.rows.map(row => Veterinarian.fromDatabaseRow(row));
      
      // Filtrar por disponibilidad horaria
      return allVeterinarians.filter(vet => vet.isAvailableAt(datetime));
    } catch (error) {
      throw new Error(`Error al obtener veterinarios disponibles: ${error.message}`);
    }
  }

  /**
   * Busca un veterinario por ID de usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<Veterinarian|null>} Veterinario encontrado o null
   */
  async findByUserId(userId) {
    try {
      const query = `SELECT * FROM veterinarians WHERE user_id = $1`;
      const result = await this.pool.query(query, [userId]);
      return result.rows[0] ? Veterinarian.fromDatabaseRow(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error al buscar veterinario por ID de usuario: ${error.message}`);
    }
  }

  /**
   * Crea un nuevo veterinario
   * @param {Object} veterinarianData - Datos del veterinario
   * @returns {Promise<Veterinarian>} Veterinario creado
   */
  async createVeterinarian(veterinarianData) {
    try {
      const createdRow = await this.create({
        user_id: veterinarianData.userId,
        first_name: veterinarianData.firstName,
        last_name: veterinarianData.lastName,
        license_number: veterinarianData.licenseNumber,
        specialization: veterinarianData.specialization,
        phone: veterinarianData.phone,
        email: veterinarianData.email,
        is_active: veterinarianData.isActive !== false,
        working_hours: veterinarianData.workingHours || {}
      });

      return Veterinarian.fromDatabaseRow(createdRow);
    } catch (error) {
      throw new Error(`Error al crear veterinario: ${error.message}`);
    }
  }

  /**
   * Actualiza un veterinario
   * @param {number} id - ID del veterinario
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Veterinarian|null>} Veterinario actualizado
   */
  async updateVeterinarian(id, updateData) {
    try {
      const updatedRow = await this.updateById(id, {
        first_name: updateData.firstName,
        last_name: updateData.lastName,
        license_number: updateData.licenseNumber,
        specialization: updateData.specialization,
        phone: updateData.phone,
        email: updateData.email,
        is_active: updateData.isActive,
        working_hours: updateData.workingHours
      });

      return updatedRow ? Veterinarian.fromDatabaseRow(updatedRow) : null;
    } catch (error) {
      throw new Error(`Error al actualizar veterinario: ${error.message}`);
    }
  }

  /**
   * Obtiene los horarios de trabajo de un veterinario
   * @param {number} veterinarianId - ID del veterinario
   * @returns {Promise<Array>} Array de horarios de trabajo
   */
  async getVeterinarianSchedules(veterinarianId) {
    try {
      const query = `
        SELECT * FROM veterinarian_schedules 
        WHERE veterinarian_id = $1 
        ORDER BY day_of_week ASC, start_time ASC
      `;
      
      const result = await this.pool.query(query, [veterinarianId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener horarios del veterinario: ${error.message}`);
    }
  }

  /**
   * Actualiza los horarios de trabajo de un veterinario
   * @param {number} veterinarianId - ID del veterinario
   * @param {Array} schedules - Array de horarios
   * @returns {Promise<boolean>} True si se actualizaron correctamente
   */
  async updateVeterinarianSchedules(veterinarianId, schedules) {
    try {
      return await this.transaction(async (client) => {
        // Eliminar horarios existentes
        await client.query(
          'DELETE FROM veterinarian_schedules WHERE veterinarian_id = $1',
          [veterinarianId]
        );

        // Insertar nuevos horarios
        for (const schedule of schedules) {
          await client.query(`
            INSERT INTO veterinarian_schedules (veterinarian_id, day_of_week, start_time, end_time, is_available)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            veterinarianId,
            schedule.dayOfWeek,
            schedule.startTime,
            schedule.endTime,
            schedule.isAvailable !== false
          ]);
        }

        return true;
      });
    } catch (error) {
      throw new Error(`Error al actualizar horarios del veterinario: ${error.message}`);
    }
  }

  /**
   * Obtiene estadísticas de veterinarios
   * @returns {Promise<Object>} Estadísticas de veterinarios
   */
  async getVeterinarianStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_veterinarians,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_veterinarians,
          COUNT(CASE WHEN specialization IS NOT NULL THEN 1 END) as with_specialization,
          COUNT(DISTINCT specialization) as unique_specializations
        FROM veterinarians
      `;

      const result = await this.pool.query(query);
      const stats = result.rows[0];

      return {
        totalVeterinarians: parseInt(stats.total_veterinarians) || 0,
        activeVeterinarians: parseInt(stats.active_veterinarians) || 0,
        withSpecialization: parseInt(stats.with_specialization) || 0,
        uniqueSpecializations: parseInt(stats.unique_specializations) || 0
      };
    } catch (error) {
      throw new Error(`Error al obtener estadísticas de veterinarios: ${error.message}`);
    }
  }

  /**
   * Busca veterinarios por especialización
   * @param {string} specialization - Especialización a buscar
   * @returns {Promise<Veterinarian[]>} Array de veterinarios
   */
  async findBySpecialization(specialization) {
    try {
      const query = `
        SELECT * FROM veterinarians 
        WHERE specialization ILIKE $1 AND is_active = true 
        ORDER BY first_name ASC, last_name ASC
      `;
      
      const result = await this.pool.query(query, [`%${specialization}%`]);
      return result.rows.map(row => Veterinarian.fromDatabaseRow(row));
    } catch (error) {
      throw new Error(`Error al buscar veterinarios por especialización: ${error.message}`);
    }
  }

  /**
   * Obtiene veterinarios con más citas en un rango de fechas
   * @param {Date} startDate - Fecha de inicio
   * @param {Date} endDate - Fecha de fin
   * @param {number} limit - Límite de resultados
   * @returns {Promise<Array>} Array de veterinarios con estadísticas
   */
  async getTopVeterinariansByAppointments(startDate, endDate, limit = 10) {
    try {
      const query = `
        SELECT 
          v.*,
          COUNT(a.id) as appointment_count
        FROM veterinarians v
        LEFT JOIN appointments a ON v.id = a.veterinarian_id
          AND a.scheduled_datetime BETWEEN $1 AND $2
          AND a.status NOT IN ('cancelled', 'no_show')
        WHERE v.is_active = true
        GROUP BY v.id, v.user_id, v.first_name, v.last_name, v.license_number, 
                 v.specialization, v.phone, v.email, v.is_active, v.working_hours, 
                 v.created_at, v.updated_at
        ORDER BY appointment_count DESC, v.first_name ASC
        LIMIT $3
      `;

      const result = await this.pool.query(query, [startDate, endDate, limit]);
      return result.rows.map(row => ({
        ...Veterinarian.fromDatabaseRow(row),
        appointmentCount: parseInt(row.appointment_count)
      }));
    } catch (error) {
      throw new Error(`Error al obtener top veterinarios: ${error.message}`);
    }
  }
}

module.exports = VeterinarianRepository;
