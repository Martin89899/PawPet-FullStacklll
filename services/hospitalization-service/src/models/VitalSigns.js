/**
 * Modelo de Signos Vitales
 */
class VitalSigns {
  constructor(data) {
    this.id = data.id;
    this.hospitalizationId = data.hospitalization_id;
    this.recordedBy = data.recorded_by;
    this.recordedAt = data.recorded_at;
    this.temperature = data.temperature;
    this.heartRate = data.heart_rate;
    this.respiratoryRate = data.respiratory_rate;
    this.bloodPressureSystolic = data.blood_pressure_systolic;
    this.bloodPressureDiastolic = data.blood_pressure_diastolic;
    this.oxygenSaturation = data.oxygen_saturation;
    this.weight = data.weight;
    this.notes = data.notes;
    this.createdAt = data.created_at;
  }

  /**
   * Validar datos de signos vitales
   */
  static validate(data) {
    const errors = [];

    if (!data.hospitalizationId || typeof data.hospitalizationId !== 'number') {
      errors.push('Hospitalization ID is required and must be a number');
    }

    if (!data.recordedBy || typeof data.recordedBy !== 'number') {
      errors.push('Recorded by is required and must be a number');
    }

    if (data.temperature && (data.temperature < 35 || data.temperature > 42)) {
      errors.push('Temperature must be between 35 and 42 degrees Celsius');
    }

    if (data.heartRate && (data.heartRate < 40 || data.heartRate > 200)) {
      errors.push('Heart rate must be between 40 and 200 bpm');
    }

    if (data.respiratoryRate && (data.respiratoryRate < 10 || data.respiratoryRate > 60)) {
      errors.push('Respiratory rate must be between 10 and 60 breaths per minute');
    }

    if (data.oxygenSaturation && (data.oxygenSaturation < 70 || data.oxygenSaturation > 100)) {
      errors.push('Oxygen saturation must be between 70 and 100%');
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
    return new VitalSigns(data);
  }

  /**
   * Convertir a formato de base de datos
   */
  toDatabase() {
    return {
      hospitalization_id: this.hospitalizationId,
      recorded_by: this.recordedBy,
      temperature: this.temperature,
      heart_rate: this.heartRate,
      respiratory_rate: this.respiratoryRate,
      blood_pressure_systolic: this.bloodPressureSystolic,
      blood_pressure_diastolic: this.bloodPressureDiastolic,
      oxygen_saturation: this.oxygenSaturation,
      weight: this.weight,
      notes: this.notes
    };
  }

  /**
   * Convertir a formato JSON
   */
  toJSON() {
    return {
      id: this.id,
      hospitalizationId: this.hospitalizationId,
      recordedBy: this.recordedBy,
      recordedAt: this.recordedAt,
      temperature: this.temperature,
      heartRate: this.heartRate,
      respiratoryRate: this.respiratoryRate,
      bloodPressureSystolic: this.bloodPressureSystolic,
      bloodPressureDiastolic: this.bloodPressureDiastolic,
      oxygenSaturation: this.oxygenSaturation,
      weight: this.weight,
      notes: this.notes,
      createdAt: this.createdAt
    };
  }

  /**
   * Verificar si hay alertas de temperatura
   */
  hasTemperatureAlert() {
    if (!this.temperature) return false;
    const threshold = parseFloat(process.env.VITAL_SIGNS_ALERT_THRESHOLD_TEMPERATURE) || 39.5;
    return this.temperature > threshold;
  }

  /**
   * Verificar si hay alertas de frecuencia cardíaca
   */
  hasHeartRateAlert() {
    if (!this.heartRate) return false;
    const threshold = parseInt(process.env.VITAL_SIGNS_ALERT_THRESHOLD_HEART_RATE) || 120;
    return this.heartRate > threshold;
  }

  /**
   * Verificar si hay alertas de saturación de oxígeno
   */
  hasOxygenAlert() {
    if (!this.oxygenSaturation) return false;
    return this.oxygenSaturation < 95;
  }

  /**
   * Obtener nivel de alerta general
   */
  getAlertLevel() {
    if (this.hasTemperatureAlert() || this.hasHeartRateAlert() || this.hasOxygenAlert()) {
      return 'critical';
    }
    return 'normal';
  }

  /**
   * Obtener presión arterial formateada
   */
  getBloodPressure() {
    if (!this.bloodPressureSystolic || !this.bloodPressureDiastolic) {
      return null;
    }
    return `${this.bloodPressureSystolic}/${this.bloodPressureDiastolic}`;
  }

  /**
   * Verificar si los signos vitales están en rango normal
   */
  isNormal() {
    return (
      (!this.temperature || (this.temperature >= 37.5 && this.temperature <= 39.0)) &&
      (!this.heartRate || (this.heartRate >= 60 && this.heartRate <= 100)) &&
      (!this.respiratoryRate || (this.respiratoryRate >= 16 && this.respiratoryRate <= 30)) &&
      (!this.oxygenSaturation || this.oxygenSaturation >= 95)
    );
  }
}

module.exports = VitalSigns;
