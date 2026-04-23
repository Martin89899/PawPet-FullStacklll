const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const AppointmentRepository = require('../repositories/AppointmentRepository');
const AppointmentTypeRepository = require('../repositories/AppointmentTypeRepository');
const VeterinarianRepository = require('../repositories/VeterinarianRepository');
const AvailabilitySlotRepository = require('../repositories/AvailabilitySlotRepository');
const { events } = require('../utils/rabbitmq');
const { ConflictError, NotFoundError, AvailabilityError } = require('../middleware/errorHandler');

/**
 * Servicio de Citas para el Appointments Service
 * @class AppointmentService
 * @description Gestiona la lógica de negocio del dominio de citas
 */
class AppointmentService {
  /**
   * Constructor del AppointmentService
   * @param {Object} pool - Pool de conexiones a PostgreSQL
   */
  constructor(pool) {
    this.appointmentRepository = new AppointmentRepository(pool);
    this.appointmentTypeRepository = new AppointmentTypeRepository(pool);
    this.veterinarianRepository = new VeterinarianRepository(pool);
    this.availabilitySlotRepository = new AvailabilitySlotRepository(pool);
  }

  /**
   * Crea una nueva cita
   * @param {Object} appointmentData - Datos de la cita
   * @param {number} appointmentData.patientId - ID del paciente
   * @param {number} appointmentData.tutorId - ID del tutor
   * @param {number} appointmentData.veterinarianId - ID del veterinario (opcional)
   * @param {number} appointmentData.appointmentTypeId - ID del tipo de cita
   * @param {Date} appointmentData.scheduledDatetime - Fecha y hora programada
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} Cita creada
   */
  async createAppointment(appointmentData, options = {}) {
    try {
      const { createdBy } = options;

      // Validar que el tipo de cita exista
      const appointmentType = await this.appointmentTypeRepository.findById(appointmentData.appointmentTypeId);
      if (!appointmentType) {
        throw new NotFoundError('Tipo de cita no encontrado');
      }

      // Si se especifica veterinario, validar que exista y esté disponible
      if (appointmentData.veterinarianId) {
        const veterinarian = await this.veterinarianRepository.findById(appointmentData.veterinarianId);
        if (!veterinarian) {
          throw new NotFoundError('Veterinario no encontrado');
        }

        if (!veterinator.is_active) {
          throw new AvailabilityError('Veterinario no está disponible');
        }

        // Verificar disponibilidad del veterinario
        const isAvailable = await this.appointmentRepository.checkAvailability(
          appointmentData.veterinarianId,
          appointmentData.scheduledDatetime,
          appointmentType.duration_minutes
        );

        if (!isAvailable) {
          throw new AvailabilityError('El veterinario no está disponible en el horario seleccionado');
        }
      }

      // Preparar datos de la cita
      const appointmentDataToCreate = {
        patientId: appointmentData.patientId,
        tutorId: appointmentData.tutorId,
        veterinarianId: appointmentData.veterinarianId,
        appointmentTypeId: appointmentData.appointmentTypeId,
        scheduledDatetime: appointmentData.scheduledDatetime,
        estimatedDurationMinutes: appointmentType.duration_minutes,
        notes: appointmentData.notes,
        symptoms: appointmentData.symptoms,
        urgencyLevel: appointmentData.urgencyLevel || 'normal',
        price: appointmentType.price,
        createdBy
      };

      // Crear la cita
      const appointment = await this.appointmentRepository.createAppointment(appointmentDataToCreate);

      // Publicar evento de cita creada
      await events.appointmentCreated({
        appointmentId: appointment.id,
        uuid: appointment.uuid,
        patientId: appointment.patientId,
        tutorId: appointment.tutorId,
        veterinarianId: appointment.veterinarianId,
        appointmentTypeId: appointment.appointmentTypeId,
        scheduledDatetime: appointment.scheduledDatetime,
        status: appointment.status,
        urgencyLevel: appointment.urgencyLevel,
        price: appointment.price
      });

      // Programar recordatorio si es necesario
      await this.scheduleReminder(appointment);

      return {
        success: true,
        message: 'Cita creada exitosamente',
        data: { appointment }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtiene citas con filtros avanzados
   * @param {Object} filters - Filtros de búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Citas encontradas
   */
  async getAppointments(filters = {}, pagination = {}) {
    try {
      const result = await this.appointmentRepository.getAppointmentsWithFilters(filters, pagination);

      return {
        success: true,
        message: 'Citas obtenidas exitosamente',
        data: result
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtiene una cita por su UUID
   * @param {string} uuid - UUID de la cita
   * @returns {Promise<Object>} Cita encontrada
   */
  async getAppointmentByUuid(uuid) {
    try {
      const appointment = await this.appointmentRepository.findByUuid(uuid);
      
      if (!appointment) {
        throw new NotFoundError('Cita no encontrada');
      }

      return {
        success: true,
        message: 'Cita obtenida exitosamente',
        data: { appointment }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Actualiza una cita
   * @param {string} uuid - UUID de la cita
   * @param {Object} updateData - Datos a actualizar
   * @param {number} updatedBy - ID del usuario que actualiza
   * @returns {Promise<Object>} Cita actualizada
   */
  async updateAppointment(uuid, updateData, updatedBy) {
    try {
      // Obtener la cita actual
      const currentAppointment = await this.appointmentRepository.findByUuid(uuid);
      if (!currentAppointment) {
        throw new NotFoundError('Cita no encontrada');
      }

      // Validaciones según los datos a actualizar
      if (updateData.veterinarianId && updateData.veterinarianId !== currentAppointment.veterinarianId) {
        const veterinarian = await this.veterinarianRepository.findById(updateData.veterinarianId);
        if (!veterinarian) {
          throw new NotFoundError('Veterinario no encontrado');
        }

        if (!veterinarian.is_active) {
          throw new AvailabilityError('Veterinario no está disponible');
        }
      }

      if (updateData.appointmentTypeId && updateData.appointmentTypeId !== currentAppointment.appointmentTypeId) {
        const appointmentType = await this.appointmentTypeRepository.findById(updateData.appointmentTypeId);
        if (!appointmentType) {
          throw new NotFoundError('Tipo de cita no encontrado');
        }

        updateData.estimatedDurationMinutes = appointmentType.duration_minutes;
        updateData.price = appointmentType.price;
      }

      if (updateData.scheduledDatetime && updateData.scheduledDatetime !== currentAppointment.scheduledDatetime) {
        const duration = updateData.estimatedDurationMinutes || currentAppointment.estimatedDurationMinutes;
        const veterinarianId = updateData.veterinarianId || currentAppointment.veterinarianId;

        if (veterinarianId) {
          const isAvailable = await this.appointmentRepository.checkAvailability(
            veterinarianId,
            updateData.scheduledDatetime,
            duration,
            currentAppointment.id
          );

          if (!isAvailable) {
            throw new AvailabilityError('El veterinario no está disponible en el nuevo horario');
          }
        }
      }

      // Actualizar la cita
      const updatedAppointment = await this.appointmentRepository.updateById(currentAppointment.id, {
        ...updateData,
        updatedBy
      });

      if (!updatedAppointment) {
        throw new NotFoundError('Error al actualizar la cita');
      }

      // Publicar evento de cita actualizada
      await events.appointmentUpdated({
        appointmentId: updatedAppointment.id,
        uuid: updatedAppointment.uuid,
        changes: updateData,
        updatedBy
      });

      return {
        success: true,
        message: 'Cita actualizada exitosamente',
        data: { appointment: updatedAppointment }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancela una cita
   * @param {string} uuid - UUID de la cita
   * @param {string} reason - Motivo de cancelación
   * @param {number} cancelledBy - ID del usuario que cancela
   * @returns {Promise<Object>} Cita cancelada
   */
  async cancelAppointment(uuid, reason, cancelledBy) {
    try {
      const appointment = await this.appointmentRepository.findByUuid(uuid);
      if (!appointment) {
        throw new NotFoundError('Cita no encontrada');
      }

      if (appointment.status === 'cancelled') {
        throw new ConflictError('La cita ya está cancelada');
      }

      if (appointment.status === 'completed') {
        throw new ConflictError('No se puede cancelar una cita completada');
      }

      // Actualizar estado a cancelado
      const updatedAppointment = await this.appointmentRepository.updateStatus(appointment.id, 'cancelled', cancelledBy);

      // Publicar evento de cita cancelada
      await events.appointmentCancelled({
        appointmentId: appointment.id,
        uuid: appointment.uuid,
        patientId: appointment.patientId,
        tutorId: appointment.tutorId,
        veterinarianId: appointment.veterinarianId,
        scheduledDatetime: appointment.scheduledDatetime,
        reason,
        cancelledBy
      });

      return {
        success: true,
        message: 'Cita cancelada exitosamente',
        data: { appointment: updatedAppointment }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Confirma una cita
   * @param {string} uuid - UUID de la cita
   * @param {number} confirmedBy - ID del usuario que confirma
   * @returns {Promise<Object>} Cita confirmada
   */
  async confirmAppointment(uuid, confirmedBy) {
    try {
      const appointment = await this.appointmentRepository.findByUuid(uuid);
      if (!appointment) {
        throw new NotFoundError('Cita no encontrada');
      }

      if (appointment.status !== 'scheduled') {
        throw new ConflictError('Solo se pueden confirmar citas programadas');
      }

      // Actualizar estado a confirmado
      const updatedAppointment = await this.appointmentRepository.updateStatus(appointment.id, 'confirmed', confirmedBy);

      // Publicar evento de cita confirmada
      await events.appointmentConfirmed({
        appointmentId: appointment.id,
        uuid: appointment.uuid,
        patientId: appointment.patientId,
        tutorId: appointment.tutorId,
        veterinarianId: appointment.veterinarianId,
        scheduledDatetime: appointment.scheduledDatetime,
        confirmedBy
      });

      return {
        success: true,
        message: 'Cita confirmada exitosamente',
        data: { appointment: updatedAppointment }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Completa una cita
   * @param {string} uuid - UUID de la cita
   * @param {Object} completionData - Datos de completación
   * @param {number} completedBy - ID del usuario que completa
   * @returns {Promise<Object>} Cita completada
   */
  async completeAppointment(uuid, completionData, completedBy) {
    try {
      const appointment = await this.appointmentRepository.findByUuid(uuid);
      if (!appointment) {
        throw new NotFoundError('Cita no encontrada');
      }

      if (appointment.status === 'completed') {
        throw new ConflictError('La cita ya está completada');
      }

      // Actualizar datos de completación
      const updatedAppointment = await this.appointmentRepository.updateById(appointment.id, {
        status: 'completed',
        actualDurationMinutes: completionData.actualDurationMinutes,
        notes: completionData.notes,
        updatedBy: completedBy
      });

      // Publicar evento de cita completada
      await events.appointmentCompleted({
        appointmentId: appointment.id,
        uuid: appointment.uuid,
        patientId: appointment.patientId,
        tutorId: appointment.tutorId,
        veterinarianId: appointment.veterinarianId,
        scheduledDatetime: appointment.scheduledDatetime,
        actualDurationMinutes: completionData.actualDurationMinutes,
        completedBy
      });

      return {
        success: true,
        message: 'Cita completada exitosamente',
        data: { appointment: updatedAppointment }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtiene el calendario de un veterinario
   * @param {number} veterinarianId - ID del veterinario
   * @param {Date} startDate - Fecha de inicio
   * @param {Date} endDate - Fecha de fin
   * @returns {Promise<Object>} Calendario del veterinario
   */
  async getVeterinarianCalendar(veterinarianId, startDate, endDate) {
    try {
      // Validar que el veterinario exista
      const veterinarian = await this.veterinarianRepository.findById(veterinarianId);
      if (!veterinarian) {
        throw new NotFoundError('Veterinario no encontrado');
      }

      // Obtener citas del veterinario en el rango de fechas
      const appointments = await this.appointmentRepository.getVeterinarianAppointments(veterinarianId, startDate, endDate);

      // Generar slots de disponibilidad
      const workingHours = veterinarian.working_hours || {};
      const availabilitySlots = AvailabilitySlot.generateSlots(
        veterinarianId,
        startDate,
        endDate,
        workingHours,
        15 // Slots de 15 minutos
      );

      // Marcar slots ocupados
      const occupiedSlots = availabilitySlots.map(slot => {
        const isOccupied = appointments.some(appointment => {
          const appointmentStart = new Date(appointment.scheduledDatetime);
          const appointmentEnd = new Date(appointmentStart.getTime() + appointment.estimatedDurationMinutes * 60000);
          
          return (slot.startDatetime < appointmentEnd && slot.endDatetime > appointmentStart);
        });

        return {
          ...slot,
          isAvailable: slot.isAvailable && !isOccupied,
          appointmentId: isOccupied ? null : slot.appointmentId
        };
      });

      return {
        success: true,
        message: 'Calendario obtenido exitosamente',
        data: {
          veterinarian,
          appointments,
          availabilitySlots: occupiedSlots,
          dateRange: { startDate, endDate }
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtiene citas de hoy
   * @param {number} veterinarianId - ID del veterinario (opcional)
   * @returns {Promise<Object>} Citas de hoy
   */
  async getTodayAppointments(veterinarianId = null) {
    try {
      const appointments = await this.appointmentRepository.getTodayAppointments(veterinarianId);

      return {
        success: true,
        message: 'Citas de hoy obtenidas exitosamente',
        data: { appointments }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de citas
   * @param {Object} filters - Filtros para estadísticas
   * @returns {Promise<Object>} Estadísticas de citas
   */
  async getAppointmentStats(filters = {}) {
    try {
      const stats = await this.appointmentRepository.getAppointmentStats(filters);

      return {
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: { stats }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Programa un recordatorio para una cita
   * @param {Object} appointment - Datos de la cita
   * @returns {Promise<void>}
   */
  async scheduleReminder(appointment) {
    try {
      // Calcular fecha del recordatorio (24 horas antes)
      const appointmentTime = new Date(appointment.scheduled_datetime);
      const reminderTime = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000);

      // Solo programar si el recordatorio es en el futuro
      if (reminderTime > new Date()) {
        await events.reminderScheduled({
          appointmentId: appointment.id,
          uuid: appointment.uuid,
          patientId: appointment.patientId,
          tutorId: appointment.tutorId,
          scheduledDatetime: appointment.scheduled_datetime,
          reminderTime: reminderTime.toISOString(),
          type: 'email'
        });
      }
    } catch (error) {
      console.error('Error al programar recordatorio:', error);
    }
  }

  /**
   * Reagenda una cita
   * @param {string} uuid - UUID de la cita
   * @param {Date} newScheduledDatetime - Nueva fecha y hora
   * @param {string} reason - Motivo de reagendación
   * @param {number} rescheduledBy - ID del usuario que reagenda
   * @returns {Promise<Object>} Cita reagendada
   */
  async rescheduleAppointment(uuid, newScheduledDatetime, reason, rescheduledBy) {
    try {
      const appointment = await this.appointmentRepository.findByUuid(uuid);
      if (!appointment) {
        throw new NotFoundError('Cita no encontrada');
      }

      if (appointment.status === 'completed') {
        throw new ConflictError('No se puede reagendar una cita completada');
      }

      if (appointment.status === 'cancelled') {
        throw new ConflictError('No se puede reagendar una cita cancelada');
      }

      // Verificar disponibilidad en el nuevo horario
      const isAvailable = await this.appointmentRepository.checkAvailability(
        appointment.veterinarianId,
        newScheduledDatetime,
        appointment.estimatedDurationMinutes,
        appointment.id
      );

      if (!isAvailable) {
        throw new AvailabilityError('El veterinario no está disponible en el nuevo horario');
      }

      // Actualizar la cita
      const updatedAppointment = await this.appointmentRepository.updateById(appointment.id, {
        scheduledDatetime: newScheduledDatetime,
        status: 'rescheduled',
        updatedBy: rescheduledBy
      });

      // Publicar evento de cita reagendada
      await events.appointmentRescheduled({
        appointmentId: appointment.id,
        uuid: appointment.uuid,
        patientId: appointment.patientId,
        tutorId: appointment.tutorId,
        veterinarianId: appointment.veterinarianId,
        oldScheduledDatetime: appointment.scheduledDatetime,
        newScheduledDatetime,
        reason,
        rescheduledBy
      });

      return {
        success: true,
        message: 'Cita reagendada exitosamente',
        data: { appointment: updatedAppointment }
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = AppointmentService;
