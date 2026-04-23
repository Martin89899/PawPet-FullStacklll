/**
 * Modelo de Administración de Medicamentos
 */
class MedicationAdministration {
  constructor(data) {
    this.id = data.id;
    this.hospitalizationId = data.hospitalization_id;
    this.medicationName = data.medication_name;
    this.dosage = data.dosage;
    this.route = data.route;
    this.batchNumber = data.batch_number;
    this.administeredBy = data.administered_by;
    this.administeredAt = data.administered_at;
    this.nextDoseTime = data.next_dose_time;
    this.notes = data.notes;
    this.createdAt = data.created_at;
  }

  /**
   * Validar datos de administración de medicamentos
   */
  static validate(data) {
    const errors = [];

    if (!data.hospitalizationId || typeof data.hospitalizationId !== 'number') {
      errors.push('Hospitalization ID is required and must be a number');
    }

    if (!data.medicationName || typeof data.medicationName !== 'string') {
      errors.push('Medication name is required and must be a string');
    }

    if (!data.dosage || typeof data.dosage !== 'string') {
      errors.push('Dosage is required and must be a string');
    }

    if (!data.route || typeof data.route !== 'string') {
      errors.push('Route is required and must be a string');
    }

    if (!['IV', 'IM', 'SC', 'PO', 'TOPICAL'].includes(data.route)) {
      errors.push('Route must be one of: IV, IM, SC, PO, TOPICAL');
    }

    if (!data.administeredBy || typeof data.administeredBy !== 'number') {
      errors.push('Administered by is required and must be a number');
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
    return new MedicationAdministration(data);
  }

  /**
   * Convertir a formato de base de datos
   */
  toDatabase() {
    return {
      hospitalization_id: this.hospitalizationId,
      medication_name: this.medicationName,
      dosage: this.dosage,
      route: this.route,
      batch_number: this.batchNumber,
      administered_by: this.administeredBy,
      administered_at: this.administeredAt,
      next_dose_time: this.nextDoseTime,
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
      medicationName: this.medicationName,
      dosage: this.dosage,
      route: this.route,
      batchNumber: this.batchNumber,
      administeredBy: this.administeredBy,
      administeredAt: this.administeredAt,
      nextDoseTime: this.nextDoseTime,
      notes: this.notes,
      createdAt: this.createdAt
    };
  }

  /**
   * Verificar si es un medicamento controlado
   */
  isControlledSubstance() {
    const controlledMedications = [
      'ketamina', 'ketamine', 'morfina', 'morphine', 
      'fentanil', 'fentanyl', 'oxycodone', 'hidromorfona'
    ];
    
    return controlledMedications.some(med => 
      this.medicationName.toLowerCase().includes(med.toLowerCase())
    );
  }

  /**
   * Obtener descripción completa de la ruta
   */
  getRouteDescription() {
    const routes = {
      'IV': 'Intravenosa',
      'IM': 'Intramuscular',
      'SC': 'Subcutánea',
      'PO': 'Oral',
      'TOPICAL': 'Tópica'
    };
    
    return routes[this.route] || this.route;
  }

  /**
   * Verificar si necesita próxima dosis
   */
  needsNextDose() {
    if (!this.nextDoseTime) return false;
    return new Date(this.nextDoseTime) > new Date();
  }

  /**
   * Calcular tiempo hasta próxima dosis
   */
  getTimeToNextDose() {
    if (!this.nextDoseTime) return null;
    
    const now = new Date();
    const nextDose = new Date(this.nextDoseTime);
    const diffMs = nextDose - now;
    
    if (diffMs <= 0) return null;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  }

  /**
   * Programar próxima dosis
   */
  scheduleNextDose(intervalHours) {
    const nextDose = new Date(this.administeredAt);
    nextDose.setHours(nextDose.getHours() + intervalHours);
    this.nextDoseTime = nextDose.toISOString();
  }

  /**
   * Obtener información de trazabilidad legal
   */
  getTraceabilityInfo() {
    return {
      medicationName: this.medicationName,
      dosage: this.dosage,
      route: this.getRouteDescription(),
      batchNumber: this.batchNumber,
      administeredAt: this.administeredAt,
      administeredBy: this.administeredBy,
      isControlled: this.isControlledSubstance(),
      hospitalizationId: this.hospitalizationId
    };
  }
}

module.exports = MedicationAdministration;
