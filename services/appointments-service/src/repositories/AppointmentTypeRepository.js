const BaseRepository = require('./BaseRepository');
const AppointmentType = require('../models/AppointmentType');

/**
 * Repositorio de Tipos de Cita para el Appointments Service
 * @class AppointmentTypeRepository
 * @description Gestiona la persistencia de tipos de cita
 */
class AppointmentTypeRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'appointment_types');
  }

  /**
   * Obtiene todos los tipos de cita activos
   * @returns {Promise<AppointmentType[]>} Array de tipos de cita
   */
  async getActiveAppointmentTypes() {
    try {
      const query = `
        SELECT * FROM appointment_types 
        WHERE is_active = true 
        ORDER BY name ASC
      `;
      
      const result = await this.pool.query(query);
      return result.rows.map(row => AppointmentType.fromDatabaseRow(row));
    } catch (error) {
      throw new Error(`Error al obtener tipos de cita activos: ${error.message}`);
    }
  }

  /**
   * Obtiene un tipo de cita por nombre
   * @param {string} name - Nombre del tipo de cita
   * @returns {Promise<AppointmentType|null>} Tipo de cita encontrado o null
   */
  async findByName(name) {
    try {
      const query = `SELECT * FROM appointment_types WHERE name = $1 AND is_active = true`;
      const result = await this.pool.query(query, [name]);
      return result.rows[0] ? AppointmentType.fromDatabaseRow(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error al buscar tipo de cita por nombre: ${error.message}`);
    }
  }

  /**
   * Crea un nuevo tipo de cita
   * @param {Object} appointmentTypeData - Datos del tipo de cita
   * @returns {Promise<AppointmentType>} Tipo de cita creado
   */
  async createAppointmentType(appointmentTypeData) {
    try {
      const createdRow = await this.create({
        name: appointmentTypeData.name,
        description: appointmentTypeData.description,
        duration_minutes: appointmentTypeData.durationMinutes,
        price: appointmentTypeData.price,
        color: appointmentTypeData.color,
        requires_veterinarian: appointmentTypeData.requiresVeterinarian,
        is_active: appointmentTypeData.isActive !== false
      });

      return AppointmentType.fromDatabaseRow(createdRow);
    } catch (error) {
      throw new Error(`Error al crear tipo de cita: ${error.message}`);
    }
  }

  /**
   * Actualiza un tipo de cita
   * @param {number} id - ID del tipo de cita
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<AppointmentType|null>} Tipo de cita actualizado
   */
  async updateAppointmentType(id, updateData) {
    try {
      const updatedRow = await this.updateById(id, {
        name: updateData.name,
        description: updateData.description,
        duration_minutes: updateData.durationMinutes,
        price: updateData.price,
        color: updateData.color,
        requires_veterinarian: updateData.requiresVeterinarian,
        is_active: updateData.isActive
      });

      return updatedRow ? AppointmentType.fromDatabaseRow(updatedRow) : null;
    } catch (error) {
      throw new Error(`Error al actualizar tipo de cita: ${error.message}`);
    }
  }

  /**
   * Desactiva un tipo de cita (soft delete)
   * @param {number} id - ID del tipo de cita
   * @returns {Promise<boolean>} True si se desactivó correctamente
   */
  async deactivateAppointmentType(id) {
    try {
      const query = `
        UPDATE appointment_types 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `;
      
      const result = await this.pool.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Error al desactivar tipo de cita: ${error.message}`);
    }
  }

  /**
   * Obtiene estadísticas de tipos de cita
   * @returns {Promise<Object>} Estadísticas de tipos de cita
   */
  async getAppointmentTypeStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_types,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_types,
          AVG(duration_minutes) as avg_duration,
          AVG(price) as avg_price,
          MIN(price) as min_price,
          MAX(price) as max_price
        FROM appointment_types
      `;

      const result = await this.pool.query(query);
      const stats = result.rows[0];

      return {
        totalTypes: parseInt(stats.total_types) || 0,
        activeTypes: parseInt(stats.active_types) || 0,
        avgDuration: parseFloat(stats.avg_duration) || 0,
        avgPrice: parseFloat(stats.avg_price) || 0,
        minPrice: parseFloat(stats.min_price) || 0,
        maxPrice: parseFloat(stats.max_price) || 0
      };
    } catch (error) {
      throw new Error(`Error al obtener estadísticas de tipos de cita: ${error.message}`);
    }
  }
}

module.exports = AppointmentTypeRepository;
