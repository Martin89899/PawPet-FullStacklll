/**
 * Modelo de Tipo de Cita para el Appointments Service
 * @class AppointmentType
 * @description Representa un tipo de cita médica en el sistema
 */
class AppointmentType {
  /**
   * Constructor del modelo AppointmentType
   * @param {Object} data - Datos del tipo de cita
   * @param {number} data.id - ID del tipo de cita
   * @param {string} data.name - Nombre del tipo de cita
   * @param {string} data.description - Descripción del tipo de cita
   * @param {number} data.durationMinutes - Duración en minutos
   * @param {number} data.price - Precio del tipo de cita
   * @param {string} data.color - Color hexadecimal para el calendario
   * @param {boolean} data.requiresVeterinarian - Si requiere veterinario asignado
   * @param {boolean} data.isActive - Si está activo
   * @param {Date} data.createdAt - Fecha de creación
   * @param {Date} data.updatedAt - Fecha de actualización
   */
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.durationMinutes = data.durationMinutes;
    this.price = data.price;
    this.color = data.color;
    this.requiresVeterinarian = data.requiresVeterinarian;
    this.isActive = data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Valida si el tipo de cita está activo
   * @returns {boolean} True si está activo
   */
  isAvailable() {
    return this.isActive;
  }

  /**
   * Obtiene la duración formateada
   * @returns {string} Duración formateada
   */
  getFormattedDuration() {
    if (this.durationMinutes < 60) {
      return `${this.durationMinutes} min`;
    } else {
      const hours = Math.floor(this.durationMinutes / 60);
      const minutes = this.durationMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    }
  }

  /**
   * Obtiene el precio formateado
   * @returns {string} Precio formateado
   */
  getFormattedPrice() {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(this.price);
  }

  /**
   * Convierte el modelo a un objeto plano
   * @returns {Object} Objeto plano del modelo
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      durationMinutes: this.durationMinutes,
      price: this.price,
      color: this.color,
      requiresVeterinarian: this.requiresVeterinarian,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      // Propiedades calculadas
      isAvailable: this.isAvailable(),
      formattedDuration: this.getFormattedDuration(),
      formattedPrice: this.getFormattedPrice()
    };
  }

  /**
   * Crea una instancia desde una fila de base de datos
   * @param {Object} row - Fila de base de datos
   * @returns {AppointmentType} Instancia de AppointmentType
   */
  static fromDatabaseRow(row) {
    return new AppointmentType({
      id: row.id,
      name: row.name,
      description: row.description,
      durationMinutes: row.duration_minutes,
      price: parseFloat(row.price) || 0,
      color: row.color,
      requiresVeterinarian: row.requires_veterinarian,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

module.exports = AppointmentType;
