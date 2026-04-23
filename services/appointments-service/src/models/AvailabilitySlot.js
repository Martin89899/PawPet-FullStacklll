/**
 * Modelo de Slot de Disponibilidad para el Appointments Service
 * @class AvailabilitySlot
 * @description Representa un slot de tiempo disponible para citas
 */
class AvailabilitySlot {
  /**
   * Constructor del modelo AvailabilitySlot
   * @param {Object} data - Datos del slot
   * @param {number} data.id - ID del slot
   * @param {number} data.veterinarianId - ID del veterinario
   * @param {Date} data.startDatetime - Fecha y hora de inicio
   * @param {Date} data.endDatetime - Fecha y hora de fin
   * @param {number} data.slotDurationMinutes - Duración del slot en minutos
   * @param {boolean} data.isAvailable - Si está disponible
   * @param {number} data.appointmentId - ID de la cita asignada
   * @param {Date} data.createdAt - Fecha de creación
   */
  constructor(data) {
    this.id = data.id;
    this.veterinarianId = data.veterinarianId;
    this.startDatetime = data.startDatetime;
    this.endDatetime = data.endDatetime;
    this.slotDurationMinutes = data.slotDurationMinutes;
    this.isAvailable = data.isAvailable;
    this.appointmentId = data.appointmentId;
    this.createdAt = data.createdAt;
  }

  /**
   * Valida si el slot está disponible
   * @returns {boolean} True si está disponible
   */
  isSlotAvailable() {
    return this.isAvailable && !this.appointmentId;
  }

  /**
   * Valida si el slot es futuro
   * @returns {boolean} True si es futuro
   */
  isFuture() {
    return new Date(this.startDatetime) > new Date();
  }

  /**
   * Valida si el slot es hoy
   * @returns {boolean} True si es hoy
   */
  isToday() {
    const today = new Date();
    const slotDate = new Date(this.startDatetime);
    return today.toDateString() === slotDate.toDateString();
  }

  /**
   * Obtiene la hora de inicio formateada
   * @returns {string} Hora formateada "HH:MM"
   */
  getFormattedStartTime() {
    const date = new Date(this.startDatetime);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  /**
   * Obtiene la hora de fin formateada
   * @returns {string} Hora formateada "HH:MM"
   */
  getFormattedEndTime() {
    const date = new Date(this.endDatetime);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  /**
   * Obtiene la fecha formateada
   * @returns {string} Fecha formateada "DD/MM/YYYY"
   */
  getFormattedDate() {
    const date = new Date(this.startDatetime);
    return date.toLocaleDateString('es-ES');
  }

  /**
   * Obtiene el rango de tiempo formateado
   * @returns {string} Rango de tiempo "HH:MM - HH:MM"
   */
  getFormattedTimeRange() {
    return `${this.getFormattedStartTime()} - ${this.getFormattedEndTime()}`;
  }

  /**
   * Valida si el slot contiene una hora específica
   * @param {Date} datetime - Fecha y hora a verificar
   * @returns {boolean} True si contiene la hora
   */
  containsTime(datetime) {
    const startTime = new Date(this.startDatetime);
    const endTime = new Date(this.endDatetime);
    const checkTime = new Date(datetime);
    
    return checkTime >= startTime && checkTime < endTime;
  }

  /**
   * Obtiene el estado del slot como texto
   * @returns {string} Estado del slot
   */
  getStatus() {
    if (!this.isAvailable) {
      return 'No disponible';
    }
    if (this.appointmentId) {
      return 'Ocupado';
    }
    return 'Disponible';
  }

  /**
   * Obtiene el color según el estado
   * @returns {string} Color hexadecimal
   */
  getStatusColor() {
    if (!this.isAvailable) {
      return '#6c757d'; // Gris
    }
    if (this.appointmentId) {
      return '#dc3545'; // Rojo
    }
    return '#28a745'; // Verde
  }

  /**
   * Convierte el modelo a un objeto plano
   * @returns {Object} Objeto plano del modelo
   */
  toJSON() {
    return {
      id: this.id,
      veterinarianId: this.veterinarianId,
      startDatetime: this.startDatetime,
      endDatetime: this.endDatetime,
      slotDurationMinutes: this.slotDurationMinutes,
      isAvailable: this.isAvailable,
      appointmentId: this.appointmentId,
      createdAt: this.createdAt,
      // Propiedades calculadas
      isSlotAvailable: this.isSlotAvailable(),
      isFuture: this.isFuture(),
      isToday: this.isToday(),
      formattedStartTime: this.getFormattedStartTime(),
      formattedEndTime: this.getFormattedEndTime(),
      formattedDate: this.getFormattedDate(),
      formattedTimeRange: this.getFormattedTimeRange(),
      status: this.getStatus(),
      statusColor: this.getStatusColor()
    };
  }

  /**
   * Crea una instancia desde una fila de base de datos
   * @param {Object} row - Fila de base de datos
   * @returns {AvailabilitySlot} Instancia de AvailabilitySlot
   */
  static fromDatabaseRow(row) {
    return new AvailabilitySlot({
      id: row.id,
      veterinarianId: row.veterinarian_id,
      startDatetime: row.start_datetime,
      endDatetime: row.end_datetime,
      slotDurationMinutes: row.slot_duration_minutes,
      isAvailable: row.is_available,
      appointmentId: row.appointment_id,
      createdAt: row.created_at
    });
  }

  /**
   * Genera slots para un veterinario en un rango de fechas
   * @param {number} veterinarianId - ID del veterinario
   * @param {Date} startDate - Fecha de inicio
   * @param {Date} endDate - Fecha de fin
   * @param {Object} workingHours - Horarios de trabajo
   * @param {number} slotDuration - Duración de cada slot en minutos
   * @returns {AvailabilitySlot[]} Array de slots generados
   */
  static generateSlots(veterinarianId, startDate, endDate, workingHours, slotDuration = 15) {
    const slots = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const daySchedule = workingHours[dayOfWeek];
      
      if (daySchedule && daySchedule.enabled) {
        const startTime = this.parseTime(daySchedule.startTime);
        const endTime = this.parseTime(daySchedule.endTime);
        
        let currentSlotTime = startTime;
        
        while (currentSlotTime + slotDuration <= endTime) {
          const slotStart = new Date(currentDate);
          slotStart.setHours(Math.floor(currentSlotTime / 60), currentSlotTime % 60, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);
          
          slots.push(new AvailabilitySlot({
            veterinarianId,
            startDatetime: slotStart,
            endDatetime: slotEnd,
            slotDurationMinutes: slotDuration,
            isAvailable: true,
            appointmentId: null,
            createdAt: new Date()
          }));
          
          currentSlotTime += slotDuration;
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return slots;
  }

  /**
   * Convierte una hora en formato "HH:MM" a minutos
   * @param {string} timeString - Hora en formato "HH:MM"
   * @returns {number} Minutos desde medianoche
   */
  static parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

module.exports = AvailabilitySlot;
