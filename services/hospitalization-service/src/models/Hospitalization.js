/**
 * Modelo de Hospitalización
 */
class Hospitalization {
  constructor(data) {
    this.id = data.id;
    this.patientId = data.patient_id;
    this.veterinarianId = data.veterinarian_id;
    this.roomNumber = data.room_number;
    this.admissionDate = data.admission_date;
    this.dischargeDate = data.discharge_date;
    this.status = data.status;
    this.reasonForAdmission = data.reason_for_admission;
    this.initialDiagnosis = data.initial_diagnosis;
    this.treatmentPlan = data.treatment_plan;
    this.notes = data.notes;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * Validar datos de hospitalización
   */
  static validate(data) {
    const errors = [];

    if (!data.patientId || typeof data.patientId !== 'number') {
      errors.push('Patient ID is required and must be a number');
    }

    if (!data.veterinarianId || typeof data.veterinarianId !== 'number') {
      errors.push('Veterinarian ID is required and must be a number');
    }

    if (!data.roomNumber || typeof data.roomNumber !== 'string') {
      errors.push('Room number is required and must be a string');
    }

    if (!data.reasonForAdmission || typeof data.reasonForAdmission !== 'string') {
      errors.push('Reason for admission is required and must be a string');
    }

    if (data.status && !['active', 'discharged', 'transferred'].includes(data.status)) {
      errors.push('Status must be one of: active, discharged, transferred');
    }

    if (errors.length > 0) {
      throw new Error(`Validation error: ${errors.join(', ')}`);
    }

    return true;
  }

  /**
   * Crear instancia desde datos de base de datos
   */
  static fromDatabase(data) {
    return new Hospitalization(data);
  }

  /**
   * Convertir a formato de base de datos
   */
  toDatabase() {
    return {
      patient_id: this.patientId,
      veterinarian_id: this.veterinarianId,
      room_number: this.roomNumber,
      admission_date: this.admissionDate,
      discharge_date: this.dischargeDate,
      status: this.status,
      reason_for_admission: this.reasonForAdmission,
      initial_diagnosis: this.initialDiagnosis,
      treatment_plan: this.treatmentPlan,
      notes: this.notes
    };
  }

  /**
   * Convertir a formato JSON
   */
  toJSON() {
    return {
      id: this.id,
      patientId: this.patientId,
      veterinarianId: this.veterinarianId,
      roomNumber: this.roomNumber,
      admissionDate: this.admissionDate,
      dischargeDate: this.dischargeDate,
      status: this.status,
      reasonForAdmission: this.reasonForAdmission,
      initialDiagnosis: this.initialDiagnosis,
      treatmentPlan: this.treatmentPlan,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Marcar como dado de alta
   */
  discharge(dischargeNotes) {
    this.status = 'discharged';
    this.dischargeDate = new Date().toISOString();
    if (dischargeNotes) {
      this.notes = this.notes ? `${this.notes}\n\nDischarge: ${dischargeNotes}` : dischargeNotes;
    }
  }

  /**
   * Transferir a otra habitación
   */
  transfer(newRoomNumber, reason) {
    this.status = 'transferred';
    if (reason) {
      this.notes = this.notes ? `${this.notes}\n\nTransfer: ${reason}` : reason;
    }
  }

  /**
   * Verificar si está activa
   */
  isActive() {
    return this.status === 'active';
  }

  /**
   * Calcular días de hospitalización
   */
  calculateDays() {
    const start = new Date(this.admissionDate);
    const end = this.dischargeDate ? new Date(this.dischargeDate) : new Date();
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  }
}

module.exports = Hospitalization;
