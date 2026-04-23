/**
 * Modelo de Cita para el Appointments Service
 * @class Appointment
 * @description Representa una cita médica en el sistema
 */
class Appointment {
  /**
   * Constructor del modelo Appointment
   * @param {Object} data - Datos de la cita
   * @param {number} data.id - ID de la cita
   * @param {string} data.uuid - UUID único de la cita
   * @param {number} data.patientId - ID del paciente
   * @param {number} data.tutorId - ID del tutor
   * @param {number} data.veterinarianId - ID del veterinario
   * @param {number} data.appointmentTypeId - ID del tipo de cita
   * @param {string} data.status - Estado de la cita
   * @param {Date} data.scheduledDatetime - Fecha y hora programada
   * @param {number} data.estimatedDurationMinutes - Duración estimada en minutos
   * @param {number} data.actualDurationMinutes - Duración real en minutos
   * @param {string} data.notes - Notas adicionales
   * @param {string} data.symptoms - Síntomas del paciente
   * @param {string} data.urgencyLevel - Nivel de urgencia
   * @param {number} data.price - Precio de la cita
   * @param {boolean} data.isPaid - Si la cita está pagada
   * @param {string} data.paymentMethod - Método de pago
   * @param {boolean} data.reminderSent - Si se envió recordatorio
   * @param {Date} data.reminderSentAt - Fecha de envío de recordatorio
   * @param {number} data.createdBy - ID del usuario que creó la cita
   * @param {number} data.updatedBy - ID del usuario que actualizó la cita
   * @param {Date} data.createdAt - Fecha de creación
   * @param {Date} data.updatedAt - Fecha de actualización
   */
  constructor(data) {
    this.id = data.id;
    this.uuid = data.uuid;
    this.patientId = data.patientId;
    this.tutorId = data.tutorId;
    this.veterinarianId = data.veterinarianId;
    this.appointmentTypeId = data.appointmentTypeId;
    this.status = data.status;
    this.scheduledDatetime = data.scheduledDatetime;
    this.estimatedDurationMinutes = data.estimatedDurationMinutes;
    this.actualDurationMinutes = data.actualDurationMinutes;
    this.notes = data.notes;
    this.symptoms = data.symptoms;
    this.urgencyLevel = data.urgencyLevel;
    this.price = data.price;
    this.isPaid = data.isPaid;
    this.paymentMethod = data.paymentMethod;
    this.reminderSent = data.reminderSent;
    this.reminderSentAt = data.reminderSentAt;
    this.createdBy = data.createdBy;
    this.updatedBy = data.updatedBy;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Valida si la cita es futura
   * @returns {boolean} True si la cita es futura
   */
  isFuture() {
    return new Date(this.scheduledDatetime) > new Date();
  }

  /**
   * Valida si la cita es hoy
   * @returns {boolean} True si la cita es hoy
   */
  isToday() {
    const today = new Date();
    const appointmentDate = new Date(this.scheduledDatetime);
    return today.toDateString() === appointmentDate.toDateString();
  }

  /**
   * Valida si la cita está en progreso
   * @returns {boolean} True si la cita está en progreso
   */
  isInProgress() {
    return this.status === 'in_progress';
  }

  /**
   * Valida si la cita está completada
   * @returns {boolean} True si la cita está completada
   */
  isCompleted() {
    return this.status === 'completed';
  }

  /**
   * Valida si la cita está cancelada
   * @returns {boolean} True si la cita está cancelada
   */
  isCancelled() {
    return this.status === 'cancelled';
  }

  /**
   * Valida si la cita es una emergencia
   * @returns {boolean} True si la cita es una emergencia
   */
  isEmergency() {
    return this.urgencyLevel === 'emergency';
  }

  /**
   * Obtiene el color según el estado
   * @returns {string} Color hexadecimal
   */
  getStatusColor() {
    const colors = {
      scheduled: '#007bff',
      confirmed: '#28a745',
      in_progress: '#fd7e14',
      completed: '#6c757d',
      cancelled: '#dc3545',
      no_show: '#6f42c1',
      rescheduled: '#17a2b8'
    };
    return colors[this.status] || '#007bff';
  }

  /**
   * Obtiene el color según la urgencia
   * @returns {string} Color hexadecimal
   */
  getUrgencyColor() {
    const colors = {
      low: '#28a745',
      normal: '#007bff',
      high: '#fd7e14',
      emergency: '#dc3545'
    };
    return colors[this.urgencyLevel] || '#007bff';
  }

  /**
   * Calcula la fecha y hora de fin estimada
   * @returns {Date} Fecha y hora de fin estimada
   */
  getEstimatedEndTime() {
    const startTime = new Date(this.scheduledDatetime);
    const endTime = new Date(startTime.getTime() + this.estimatedDurationMinutes * 60000);
    return endTime;
  }

  /**
   * Convierte el modelo a un objeto plano
   * @returns {Object} Objeto plano del modelo
   */
  toJSON() {
    return {
      id: this.id,
      uuid: this.uuid,
      patientId: this.patientId,
      tutorId: this.tutorId,
      veterinarianId: this.veterinarianId,
      appointmentTypeId: this.appointmentTypeId,
      status: this.status,
      scheduledDatetime: this.scheduledDatetime,
      estimatedDurationMinutes: this.estimatedDurationMinutes,
      actualDurationMinutes: this.actualDurationMinutes,
      notes: this.notes,
      symptoms: this.symptoms,
      urgencyLevel: this.urgencyLevel,
      price: this.price,
      isPaid: this.isPaid,
      paymentMethod: this.paymentMethod,
      reminderSent: this.reminderSent,
      reminderSentAt: this.reminderSentAt,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      // Propiedades calculadas
      isFuture: this.isFuture(),
      isToday: this.isToday(),
      isInProgress: this.isInProgress(),
      isCompleted: this.isCompleted(),
      isCancelled: this.isCancelled(),
      isEmergency: this.isEmergency(),
      statusColor: this.getStatusColor(),
      urgencyColor: this.getUrgencyColor(),
      estimatedEndTime: this.getEstimatedEndTime()
    };
  }

  /**
   * Crea una instancia desde una fila de base de datos
   * @param {Object} row - Fila de base de datos
   * @returns {Appointment} Instancia de Appointment
   */
  static fromDatabaseRow(row) {
    return new Appointment({
      id: row.id,
      uuid: row.uuid,
      patientId: row.patient_id,
      tutorId: row.tutor_id,
      veterinarianId: row.veterinarian_id,
      appointmentTypeId: row.appointment_type_id,
      status: row.status,
      scheduledDatetime: row.scheduled_datetime,
      estimatedDurationMinutes: row.estimated_duration_minutes,
      actualDurationMinutes: row.actual_duration_minutes,
      notes: row.notes,
      symptoms: row.symptoms,
      urgencyLevel: row.urgency_level,
      price: parseFloat(row.price) || 0,
      isPaid: row.is_paid,
      paymentMethod: row.payment_method,
      reminderSent: row.reminder_sent,
      reminderSentAt: row.reminder_sent_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

module.exports = Appointment;
