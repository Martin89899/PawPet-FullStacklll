const BaseRepository = require('./BaseRepository');
const AvailabilitySlot = require('../models/AvailabilitySlot');

/**
 * Repositorio de Slots de Disponibilidad para el Appointments Service
 * @class AvailabilitySlotRepository
 * @description Gestiona la persistencia de slots de tiempo disponibles
 */
class AvailabilitySlotRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'availability_slots');
  }

  /**
   * Crea múltiples slots de disponibilidad
   * @param {Array<AvailabilitySlot>} slots - Array de slots a crear
   * @returns {Promise<AvailabilitySlot[]>} Array de slots creados
   */
  async createMultipleSlots(slots) {
    try {
      return await this.transaction(async (client) => {
        const createdSlots = [];
        
        for (const slot of slots) {
          const query = `
            INSERT INTO availability_slots (veterinarian_id, start_datetime, end_datetime, slot_duration_minutes, is_available, appointment_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `;
          
          const result = await client.query(query, [
            slot.veterinarianId,
            slot.startDatetime,
            slot.endDatetime,
            slot.slotDurationMinutes,
            slot.isAvailable,
            slot.appointmentId
          ]);
          
          createdSlots.push(AvailabilitySlot.fromDatabaseRow(result.rows[0]));
        }
        
        return createdSlots;
      });
    } catch (error) {
      throw new Error(`Error al crear múltiples slots: ${error.message}`);
    }
  }

  /**
   * Obtiene slots de disponibilidad para un veterinario en un rango de fechas
   * @param {number} veterinarianId - ID del veterinario
   * @param {Date} startDate - Fecha de inicio
   * @param {Date} endDate - Fecha de fin
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<AvailabilitySlot[]>} Array de slots
   */
  async getVeterinarianSlots(veterinarianId, startDate, endDate, options = {}) {
    try {
      const { includeUnavailable = false, includeBooked = true } = options;
      
      let whereClause = 'WHERE veterinarian_id = $1 AND start_datetime >= $2 AND end_datetime <= $3';
      const params = [veterinarianId, startDate, endDate];
      
      if (!includeUnavailable) {
        whereClause += ' AND is_available = true';
      }
      
      if (!includeBooked) {
        whereClause += ' AND (appointment_id IS NULL OR appointment_id = 0)';
      }
      
      const query = `
        SELECT * FROM availability_slots 
        ${whereClause}
        ORDER BY start_datetime ASC
      `;
      
      const result = await this.pool.query(query, params);
      return result.rows.map(row => AvailabilitySlot.fromDatabaseRow(row));
    } catch (error) {
      throw new Error(`Error al obtener slots del veterinario: ${error.message}`);
    }
  }

  /**
   * Obtiene slots disponibles para un veterinario en una fecha específica
   * @param {number} veterinarianId - ID del veterinario
   * @param {Date} date - Fecha específica
   * @returns {Promise<AvailabilitySlot[]>} Array de slots disponibles
   */
  async getAvailableSlotsForDate(veterinarianId, date) {
    try {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
      const query = `
        SELECT * FROM availability_slots 
        WHERE veterinarian_id = $1 
        AND start_datetime >= $2 
        AND end_datetime <= $3
        AND is_available = true 
        AND (appointment_id IS NULL OR appointment_id = 0)
        ORDER BY start_datetime ASC
      `;
      
      const result = await this.pool.query(query, [veterinarianId, startOfDay, endOfDay]);
      return result.rows.map(row => AvailabilitySlot.fromDatabaseRow(row));
    } catch (error) {
      throw new Error(`Error al obtener slots disponibles para la fecha: ${error.message}`);
    }
  }

  /**
   * Marca un slot como ocupado por una cita
   * @param {number} slotId - ID del slot
   * @param {number} appointmentId - ID de la cita
   * @returns {Promise<AvailabilitySlot|null>} Slot actualizado
   */
  async bookSlot(slotId, appointmentId) {
    try {
      const query = `
        UPDATE availability_slots 
        SET is_available = false, appointment_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND is_available = true
        RETURNING *
      `;
      
      const result = await this.pool.query(query, [appointmentId, slotId]);
      return result.rows[0] ? AvailabilitySlot.fromDatabaseRow(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error al reservar slot: ${error.message}`);
    }
  }

  /**
   * Libera un slot previamente reservado
   * @param {number} slotId - ID del slot
   * @returns {Promise<AvailabilitySlot|null>} Slot liberado
   */
  async releaseSlot(slotId) {
    try {
      const query = `
        UPDATE availability_slots 
        SET is_available = true, appointment_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await this.pool.query(query, [slotId]);
      return result.rows[0] ? AvailabilitySlot.fromDatabaseRow(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error al liberar slot: ${error.message}`);
    }
  }

  /**
   * Elimina slots en un rango de fechas para un veterinario
   * @param {number} veterinarianId - ID del veterinario
   * @param {Date} startDate - Fecha de inicio
   * @param {Date} endDate - Fecha de fin
   * @returns {Promise<number>} Número de slots eliminados
   */
  async deleteSlotsInRange(veterinarianId, startDate, endDate) {
    try {
      const query = `
        DELETE FROM availability_slots 
        WHERE veterinarian_id = $1 
        AND start_datetime >= $2 
        AND end_datetime <= $3
      `;
      
      const result = await this.pool.query(query, [veterinarianId, startDate, endDate]);
      return result.rowCount;
    } catch (error) {
      throw new Error(`Error al eliminar slots en rango: ${error.message}`);
    }
  }

  /**
   * Obtiene slots que están próximos a expirar (para limpieza)
   * @param {Date} cutoffDate - Fecha límite
   * @returns {Promise<AvailabilitySlot[]>} Array de slots a eliminar
   */
  async getExpiredSlots(cutoffDate) {
    try {
      const query = `
        SELECT * FROM availability_slots 
        WHERE start_datetime < $1 AND is_available = true
        ORDER BY start_datetime ASC
      `;
      
      const result = await this.pool.query(query, [cutoffDate]);
      return result.rows.map(row => AvailabilitySlot.fromDatabaseRow(row));
    } catch (error) {
      throw new Error(`Error al obtener slots expirados: ${error.message}`);
    }
  }

  /**
   * Limpia slots expirados
   * @param {Date} cutoffDate - Fecha límite
   * @returns {Promise<number>} Número de slots eliminados
   */
  async cleanupExpiredSlots(cutoffDate) {
    try {
      const query = `
        DELETE FROM availability_slots 
        WHERE start_datetime < $1 AND is_available = true
      `;
      
      const result = await this.pool.query(query, [cutoffDate]);
      return result.rowCount;
    } catch (error) {
      throw new Error(`Error al limpiar slots expirados: ${error.message}`);
    }
  }

  /**
   * Obtiene estadísticas de slots de disponibilidad
   * @param {Object} filters - Filtros para estadísticas
   * @returns {Promise<Object>} Estadísticas de slots
   */
  async getSlotStats(filters = {}) {
    try {
      const { veterinarianId, startDate, endDate } = filters;
      
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (veterinarianId) {
        whereClause += ` AND veterinarian_id = $${paramIndex}`;
        params.push(veterinarianId);
        paramIndex++;
      }

      if (startDate) {
        whereClause += ` AND start_datetime >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND end_datetime <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      const query = `
        SELECT 
          COUNT(*) as total_slots,
          COUNT(CASE WHEN is_available = true THEN 1 END) as available_slots,
          COUNT(CASE WHEN is_available = false THEN 1 END) as booked_slots,
          COUNT(CASE WHEN start_datetime > CURRENT_TIMESTAMP THEN 1 END) as future_slots,
          COUNT(CASE WHEN start_datetime <= CURRENT_TIMESTAMP THEN 1 END) as past_slots,
          AVG(slot_duration_minutes) as avg_duration
        FROM availability_slots 
        ${whereClause}
      `;

      const result = await this.pool.query(query, params);
      const stats = result.rows[0];

      return {
        totalSlots: parseInt(stats.total_slots) || 0,
        availableSlots: parseInt(stats.available_slots) || 0,
        bookedSlots: parseInt(stats.booked_slots) || 0,
        futureSlots: parseInt(stats.future_slots) || 0,
        pastSlots: parseInt(stats.past_slots) || 0,
        avgDuration: parseFloat(stats.avg_duration) || 0,
        availabilityRate: stats.total_slots > 0 ? (stats.available_slots / stats.total_slots) * 100 : 0
      };
    } catch (error) {
      throw new Error(`Error al obtener estadísticas de slots: ${error.message}`);
    }
  }

  /**
   * Encuentra un slot disponible para una cita específica
   * @param {number} veterinarianId - ID del veterinario
   * @param {Date} scheduledDatetime - Fecha y hora programada
   * @param {number} durationMinutes - Duración requerida
   * @returns {Promise<AvailabilitySlot|null>} Slot encontrado o null
   */
  async findAvailableSlot(veterinarianId, scheduledDatetime, durationMinutes) {
    try {
      const startTime = new Date(scheduledDatetime);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

      const query = `
        SELECT * FROM availability_slots 
        WHERE veterinarian_id = $1 
        AND start_datetime <= $2 
        AND end_datetime >= $3
        AND is_available = true
        AND (appointment_id IS NULL OR appointment_id = 0)
        ORDER BY start_datetime ASC
        LIMIT 1
      `;

      const result = await this.pool.query(query, [veterinarianId, startTime, endTime]);
      return result.rows[0] ? AvailabilitySlot.fromDatabaseRow(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error al buscar slot disponible: ${error.message}`);
    }
  }
}

module.exports = AvailabilitySlotRepository;
