/**
 * Modelo de Veterinario para el Appointments Service
 * @class Veterinarian
 * @description Representa un veterinario en el sistema
 */
class Veterinarian {
  /**
   * Constructor del modelo Veterinarian
   * @param {Object} data - Datos del veterinario
   * @param {number} data.id - ID del veterinario
   * @param {number} data.userId - ID del usuario asociado
   * @param {string} data.firstName - Nombre del veterinario
   * @param {string} data.lastName - Apellido del veterinario
   * @param {string} data.licenseNumber - Número de licencia
   * @param {string} data.specialization - Especialización
   * @param {string} data.phone - Teléfono
   * @param {string} data.email - Correo electrónico
   * @param {boolean} data.isActive - Si está activo
   * @param {Object} data.workingHours - Horarios de trabajo
   * @param {Date} data.createdAt - Fecha de creación
   * @param {Date} data.updatedAt - Fecha de actualización
   */
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.licenseNumber = data.licenseNumber;
    this.specialization = data.specialization;
    this.phone = data.phone;
    this.email = data.email;
    this.isActive = data.isActive;
    this.workingHours = data.workingHours;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Obtiene el nombre completo del veterinario
   * @returns {string} Nombre completo
   */
  getFullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Valida si el veterinario está disponible
   * @returns {boolean} True si está activo
   */
  isAvailable() {
    return this.isActive;
  }

  /**
   * Valida si el veterinario trabaja en un día específico
   * @param {number} dayOfWeek - Día de la semana (0-6, 0=Domingo)
   * @returns {boolean} True si trabaja ese día
   */
  worksOnDay(dayOfWeek) {
    if (!this.workingHours || !this.workingHours[dayOfWeek]) {
      return false;
    }
    return this.workingHours[dayOfWeek].enabled;
  }

  /**
   * Obtiene los horarios de trabajo para un día específico
   * @param {number} dayOfWeek - Día de la semana (0-6, 0=Domingo)
   * @returns {Object|null} Horarios de trabajo o null
   */
  getWorkingHoursForDay(dayOfWeek) {
    if (!this.worksOnDay(dayOfWeek)) {
      return null;
    }
    return this.workingHours[dayOfWeek];
  }

  /**
   * Valida si el veterinario está disponible en una hora específica
   * @param {Date} datetime - Fecha y hora a verificar
   * @returns {boolean} True si está disponible
   */
  isAvailableAt(datetime) {
    const dayOfWeek = datetime.getDay();
    const workingHours = this.getWorkingHoursForDay(dayOfWeek);
    
    if (!workingHours) {
      return false;
    }

    const currentTime = datetime.getHours() * 60 + datetime.getMinutes();
    const startTime = this.parseTime(workingHours.startTime);
    const endTime = this.parseTime(workingHours.endTime);

    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * Convierte una hora en formato "HH:MM" a minutos
   * @param {string} timeString - Hora en formato "HH:MM"
   * @returns {number} Minutos desde medianoche
   */
  parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Obtiene los días de trabajo como array
   * @returns {number[]} Array de días (0-6)
   */
  getWorkingDays() {
    const days = [];
    for (let i = 0; i < 7; i++) {
      if (this.worksOnDay(i)) {
        days.push(i);
      }
    }
    return days;
  }

  /**
   * Obtiene una descripción formateada del veterinario
   * @returns {string} Descripción formateada
   */
  getFormattedDescription() {
    let description = this.getFullName();
    if (this.specialization) {
      description += ` - ${this.specialization}`;
    }
    if (this.licenseNumber) {
      description += ` (Lic: ${this.licenseNumber})`;
    }
    return description;
  }

  /**
   * Convierte el modelo a un objeto plano
   * @returns {Object} Objeto plano del modelo
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      firstName: this.firstName,
      lastName: this.lastName,
      licenseNumber: this.licenseNumber,
      specialization: this.specialization,
      phone: this.phone,
      email: this.email,
      isActive: this.isActive,
      workingHours: this.workingHours,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      // Propiedades calculadas
      fullName: this.getFullName(),
      isAvailable: this.isAvailable(),
      workingDays: this.getWorkingDays(),
      formattedDescription: this.getFormattedDescription()
    };
  }

  /**
   * Crea una instancia desde una fila de base de datos
   * @param {Object} row - Fila de base de datos
   * @returns {Veterinarian} Instancia de Veterinarian
   */
  static fromDatabaseRow(row) {
    return new Veterinarian({
      id: row.id,
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      licenseNumber: row.license_number,
      specialization: row.specialization,
      phone: row.phone,
      email: row.email,
      isActive: row.is_active,
      workingHours: row.working_hours || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

module.exports = Veterinarian;
