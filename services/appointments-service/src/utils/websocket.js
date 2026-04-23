const { events } = require('./rabbitmq');

/**
 * Utilidades de WebSocket para el Appointments Service
 * @class WebSocket
 * @description Gestiona las conexiones WebSocket para actualizaciones en tiempo real
 */

// Almacenamiento de conexiones activas por usuario
const userConnections = new Map();

// Almacenamiento de conexiones por veterinario
const veterinarianConnections = new Map();

/**
 * Inicializa el servidor WebSocket
 * @param {Object} io - Instancia de Socket.IO
 */
const initializeWebSocket = (io) => {
  console.log('Inicializando servidor WebSocket para Appointments Service');

  // Manejar conexión de nuevos clientes
  io.on('connection', (socket) => {
    console.log(`Cliente WebSocket conectado: ${socket.id}`);

    // Evento de autenticación
    socket.on('authenticate', (data) => {
      try {
        const { userId, role, veterinarianId } = data;
        
        // Guardar conexión del usuario
        userConnections.set(userId, socket);
        
        // Si es veterinario, guardar conexión específica
        if (role === 'veterinarian' && veterinarianId) {
          veterinarianConnections.set(veterinarianId, socket);
          socket.veterinarianId = veterinarianId;
        }
        
        socket.userId = userId;
        socket.role = role;
        
        socket.emit('authenticated', { success: true, message: 'Autenticado exitosamente' });
        
        console.log(`Usuario ${userId} (${role}) autenticado en WebSocket`);
      } catch (error) {
        socket.emit('error', { message: 'Error en autenticación' });
      }
    });

    // Evento para unirse a sala de veterinario
    socket.on('join-veterinarian-room', (veterinarianId) => {
      if (socket.role === 'veterinarian') {
        socket.join(`veterinarian-${veterinarianId}`);
        socket.emit('joined-room', { room: `veterinarian-${veterinarianId}` });
      }
    });

    // Evento para unirse a sala de paciente
    socket.on('join-patient-room', (patientId) => {
      socket.join(`patient-${patientId}`);
      socket.emit('joined-room', { room: `patient-${patientId}` });
    });

    // Evento para suscribirse a calendario
    socket.on('subscribe-calendar', (data) => {
      const { veterinarianId, startDate, endDate } = data;
      
      // Unirse a sala de calendario específico
      const roomName = `calendar-${veterinarianId}-${startDate}-${endDate}`;
      socket.join(roomName);
      
      socket.emit('calendar-subscribed', { room: roomName });
    });

    // Evento para obtener disponibilidad en tiempo real
    socket.on('get-availability', async (data) => {
      try {
        const { veterinarianId, date } = data;
        
        // Aquí se podría llamar a un servicio para obtener disponibilidad
        // Por ahora, emitimos un evento de ejemplo
        socket.emit('availability-data', {
          veterinarianId,
          date,
          availableSlots: [
            { start: '09:00', end: '09:30', available: true },
            { start: '09:30', end: '10:00', available: true },
            { start: '10:00', end: '10:30', available: false }
          ]
        });
      } catch (error) {
        socket.emit('error', { message: 'Error al obtener disponibilidad' });
      }
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
      console.log(`Cliente WebSocket desconectado: ${socket.id}`);
      
      // Limpiar conexiones almacenadas
      if (socket.userId) {
        userConnections.delete(socket.userId);
      }
      
      if (socket.veterinarianId) {
        veterinarianConnections.delete(socket.veterinarianId);
      }
    });

    // Manejar errores
    socket.on('error', (error) => {
      console.error(`Error en WebSocket (${socket.id}):`, error);
    });
  });

  // Publicar eventos de RabbitMQ a clientes WebSocket
  setupRabbitMQEventForwarding(io);
};

/**
 * Configura el reenvío de eventos de RabbitMQ a clientes WebSocket
 * @param {Object} io - Instancia de Socket.IO
 */
const setupRabbitMQEventForwarding = (io) => {
  // Escuchar eventos de citas creadas
  const originalAppointmentCreated = events.appointmentCreated;
  events.appointmentCreated = (appointmentData) => {
    originalAppointmentCreated(appointmentData);
    
    // Enviar a clientes WebSocket
    io.emit('appointment-created', {
      type: 'appointment.created',
      data: appointmentData,
      timestamp: new Date().toISOString()
    });
    
    // Enviar a sala específica del veterinario
    if (appointmentData.veterinarianId) {
      io.to(`veterinarian-${appointmentData.veterinarianId}`).emit('veterinarian-appointment-created', {
        type: 'veterinarian.appointment.created',
        data: appointmentData,
        timestamp: new Date().toISOString()
      });
    }
    
    // Enviar a sala del paciente
    if (appointmentData.patientId) {
      io.to(`patient-${appointmentData.patientId}`).emit('patient-appointment-created', {
        type: 'patient.appointment.created',
        data: appointmentData,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Escuchar eventos de citas actualizadas
  const originalAppointmentUpdated = events.appointmentUpdated;
  events.appointmentUpdated = (appointmentData) => {
    originalAppointmentUpdated(appointmentData);
    
    io.emit('appointment-updated', {
      type: 'appointment.updated',
      data: appointmentData,
      timestamp: new Date().toISOString()
    });
    
    if (appointmentData.veterinarianId) {
      io.to(`veterinarian-${appointmentData.veterinarianId}`).emit('veterinarian-appointment-updated', {
        type: 'veterinarian.appointment.updated',
        data: appointmentData,
        timestamp: new Date().toISOString()
      });
    }
    
    if (appointmentData.patientId) {
      io.to(`patient-${appointmentData.patientId}`).emit('patient-appointment-updated', {
        type: 'patient.appointment.updated',
        data: appointmentData,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Escuchar eventos de citas canceladas
  const originalAppointmentCancelled = events.appointmentCancelled;
  events.appointmentCancelled = (appointmentData) => {
    originalAppointmentCancelled(appointmentData);
    
    io.emit('appointment-cancelled', {
      type: 'appointment.cancelled',
      data: appointmentData,
      timestamp: new Date().toISOString()
    });
    
    if (appointmentData.veterinarianId) {
      io.to(`veterinarian-${appointmentData.veterinarianId}`).emit('veterinarian-appointment-cancelled', {
        type: 'veterinarian.appointment.cancelled',
        data: appointmentData,
        timestamp: new Date().toISOString()
      });
    }
    
    if (appointmentData.patientId) {
      io.to(`patient-${appointmentData.patientId}`).emit('patient-appointment-cancelled', {
        type: 'patient.appointment.cancelled',
        data: appointmentData,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Escuchar eventos de disponibilidad actualizada
  const originalAvailabilityUpdated = events.availabilityUpdated;
  events.availabilityUpdated = (availabilityData) => {
    originalAvailabilityUpdated(availabilityData);
    
    io.emit('availability-updated', {
      type: 'availability.updated',
      data: availabilityData,
      timestamp: new Date().toISOString()
    });
    
    if (availabilityData.veterinarianId) {
      io.to(`veterinarian-${availabilityData.veterinarianId}`).emit('veterinarian-availability-updated', {
        type: 'veterinarian.availability.updated',
        data: availabilityData,
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Envía una notificación a un usuario específico
 * @param {string} userId - ID del usuario
 * @param {string} event - Tipo de evento
 * @param {Object} data - Datos del evento
 */
const sendToUser = (userId, event, data) => {
  const socket = userConnections.get(userId);
  if (socket) {
    socket.emit(event, {
      type: event,
      data,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Envía una notificación a un veterinario específico
 * @param {string} veterinarianId - ID del veterinario
 * @param {string} event - Tipo de evento
 * @param {Object} data - Datos del evento
 */
const sendToVeterinarian = (veterinarianId, event, data) => {
  const socket = veterinarianConnections.get(veterinarianId);
  if (socket) {
    socket.emit(event, {
      type: event,
      data,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Envía una notificación a todos los veterinarios
 * @param {string} event - Tipo de evento
 * @param {Object} data - Datos del evento
 */
const sendToAllVeterinarians = (event, data) => {
  veterinarianConnections.forEach((socket, veterinarianId) => {
    socket.emit(event, {
      type: event,
      data,
      timestamp: new Date().toISOString()
    });
  });
};

/**
 * Envía una notificación a todos los clientes conectados
 * @param {string} event - Tipo de evento
 * @param {Object} data - Datos del evento
 */
const broadcastToAll = (event, data) => {
  // Esto usaría la instancia global de io
  // Por ahora, se implementa como referencia
  console.log(`Broadcast a todos: ${event}`, data);
};

/**
 * Obtiene estadísticas de conexiones WebSocket
 * @returns {Object} Estadísticas de conexiones
 */
const getConnectionStats = () => {
  return {
    totalConnections: userConnections.size,
    veterinarianConnections: veterinarianConnections.size,
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  initializeWebSocket,
  sendToUser,
  sendToVeterinarian,
  sendToAllVeterinarians,
  broadcastToAll,
  getConnectionStats
};
