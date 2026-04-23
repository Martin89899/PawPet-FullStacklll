const amqp = require('amqplib');

let connection = null;
let channel = null;

/**
 * Utilidades de RabbitMQ para el Appointments Service
 * @class RabbitMQ
 * @description Gestiona la comunicación asíncrona mediante eventos de citas
 */

/**
 * Conecta a RabbitMQ y establece el canal
 * @returns {Promise<boolean>} True si la conexión fue exitosa
 */
const connectRabbitMQ = async () => {
  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();

    // Declarar exchanges
    await channel.assertExchange('pawpet.events', 'topic', { durable: true });
    await channel.assertExchange('pawpet.notifications', 'topic', { durable: true });
    await channel.assertExchange('pawpet.appointments', 'topic', { durable: true });

    // Declarar colas específicas del appointments service
    await channel.assertQueue('appointments.events', { durable: true });
    await channel.assertQueue('appointments.notifications', { durable: true });
    await channel.assertQueue('appointments.reminders', { durable: true });

    // Bind de colas a exchanges
    await channel.bindQueue('appointments.events', 'pawpet.events', 'appointment.*');
    await channel.bindQueue('appointments.events', 'pawpet.appointments', 'appointment.*');
    
    await channel.bindQueue('appointments.notifications', 'pawpet.notifications', 'reminder.*');
    await channel.bindQueue('appointments.notifications', 'pawpet.notifications', 'alert.*');
    
    await channel.bindQueue('appointments.reminders', 'pawpet.appointments', 'reminder.*');

    console.log('Conectado exitosamente a RabbitMQ para Appointments Service');
    return true;
  } catch (error) {
    console.error('Error al conectar a RabbitMQ:', error);
    return false;
  }
};

/**
 * Publica un evento en un exchange específico
 * @param {string} routingKey - Clave de enrutamiento
 * @param {Object} data - Datos del evento
 * @param {string} [exchange='pawpet.appointments'] - Exchange a usar
 * @returns {Promise<boolean>} True si se publicó exitosamente
 */
const publishEvent = async (routingKey, data, exchange = 'pawpet.appointments') => {
  try {
    if (!channel) {
      console.warn('Canal de RabbitMQ no disponible, omitiendo publicación de evento');
      return false;
    }

    const message = {
      ...data,
      timestamp: new Date().toISOString(),
      service: 'appointments-service',
      version: '1.0'
    };

    const published = channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        timestamp: Date.now(),
        headers: {
          service: 'appointments-service',
          version: '1.0'
        }
      }
    );

    if (published) {
      console.log(`Evento publicado: ${routingKey}`, data);
    } else {
      console.warn(`Error al publicar evento: ${routingKey}`);
    }

    return published;
  } catch (error) {
    console.error(`Error al publicar evento ${routingKey}:`, error);
    return false;
  }
};

/**
 * Se suscribe a eventos específicos
 * @param {string} pattern - Patrón de eventos a escuchar
 * @param {Function} callback - Función a ejecutar cuando llega un evento
 * @param {string} [queue='appointments.events'] - Cola a usar
 * @returns {Promise<boolean>} True si se suscribió exitosamente
 */
const subscribeToEvent = async (pattern, callback, queue = 'appointments.events') => {
  try {
    if (!channel) {
      console.warn('Canal de RabbitMQ no disponible, omitiendo suscripción');
      return false;
    }

    await channel.consume(queue, (message) => {
      if (message) {
        try {
          const event = JSON.parse(message.content.toString());
          console.log(`Evento recibido: ${pattern}`, event);
          
          // Ejecutar callback con el evento
          callback(event, message);
          
          // Acknowledge message
          channel.ack(message);
        } catch (error) {
          console.error(`Error al procesar evento ${pattern}:`, error);
          channel.nack(message, false, false);
        }
      }
    }, { noAck: false });

    console.log(`Suscrito a eventos: ${pattern}`);
    return true;
  } catch (error) {
    console.error(`Error al suscribir a eventos ${pattern}:`, error);
    return false;
  }
};

/**
 * Cierra la conexión con RabbitMQ
 * @returns {Promise<boolean>} True si se cerró exitosamente
 */
const closeConnection = async () => {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }

    if (connection) {
      await connection.close();
      connection = null;
    }

    console.log('Conexión RabbitMQ cerrada');
    return true;
  } catch (error) {
    console.error('Error al cerrar conexión RabbitMQ:', error);
    return false;
  }
};

/**
 * Publica eventos específicos del dominio de citas
 */
const events = {
  // Eventos de citas
  appointmentCreated: (appointmentData) => 
    publishEvent('appointment.created', appointmentData),
  
  appointmentUpdated: (appointmentData) => 
    publishEvent('appointment.updated', appointmentData),
  
  appointmentCancelled: (appointmentData) => 
    publishEvent('appointment.cancelled', appointmentData),
  
  appointmentCompleted: (appointmentData) => 
    publishEvent('appointment.completed', appointmentData),
  
  appointmentConfirmed: (appointmentData) => 
    publishEvent('appointment.confirmed', appointmentData),
  
  appointmentRescheduled: (appointmentData) => 
    publishEvent('appointment.rescheduled', appointmentData),
  
  appointmentNoShow: (appointmentData) => 
    publishEvent('appointment.no_show', appointmentData),

  // Eventos de calendario
  availabilityUpdated: (availabilityData) => 
    publishEvent('availability.updated', availabilityData),
  
  timeSlotCreated: (slotData) => 
    publishEvent('timeslot.created', slotData),
  
  timeSlotBooked: (slotData) => 
    publishEvent('timeslot.booked', slotData),

  // Eventos de veterinarios
  veterinarianAvailable: (veterinarianData) => 
    publishEvent('veterinarian.available', veterinarianData),
  
  veterinarianUnavailable: (veterinarianData) => 
    publishEvent('veterinarian.unavailable', veterinarianData),

  // Eventos de recordatorios
  reminderScheduled: (reminderData) => 
    publishEvent('reminder.scheduled', reminderData, 'pawpet.notifications'),
  
  reminderSent: (reminderData) => 
    publishEvent('reminder.sent', reminderData, 'pawpet.notifications'),
  
  reminderFailed: (reminderData) => 
    publishEvent('reminder.failed', reminderData, 'pawpet.notifications'),

  // Eventos de notificaciones
  appointmentConfirmedNotification: (notificationData) => 
    publishEvent('notification.appointment.confirmed', notificationData, 'pawpet.notifications'),
  
  appointmentReminderNotification: (notificationData) => 
    publishEvent('notification.appointment.reminder', notificationData, 'pawpet.notifications'),
  
  appointmentCancelledNotification: (notificationData) => 
    publishEvent('notification.appointment.cancelled', notificationData, 'pawpet.notifications'),

  // Eventos de sistema
  serviceHealthCheck: () => 
    publishEvent('service.health.appointments', {
      status: 'healthy',
      timestamp: new Date().toISOString()
    }),

  errorOccurred: (errorData) => 
    publishEvent('error.occurred', errorData)
};

/**
 * Manejador de eventos entrantes
 */
const handleIncomingEvents = async () => {
  // Eventos del patients service
  await subscribeToEvent('patient.*', async (event, message) => {
    // Manejar eventos de pacientes (creados, actualizados, etc.)
    console.log('Procesando evento de paciente:', event);
  });

  // Eventos del auth service
  await subscribeToEvent('user.*', async (event, message) => {
    // Manejar eventos de usuarios (creados, actualizados, etc.)
    console.log('Procesando evento de usuario:', event);
  });

  // Eventos de billing service
  await subscribeToEvent('billing.*', async (event, message) => {
    // Manejar eventos de facturación
    console.log('Procesando evento de facturación:', event);
  });
};

// Auto-conectar al iniciar el módulo
if (process.env.NODE_ENV !== 'test') {
  connectRabbitMQ().then(connected => {
    if (connected) {
      handleIncomingEvents();
    }
  });
}

// Manejar cierre graceful
process.on('SIGINT', async () => {
  console.log('Cerrando conexión RabbitMQ de forma controlada...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Cerrando conexión RabbitMQ de forma controlada...');
  await closeConnection();
  process.exit(0);
});

module.exports = {
  connectRabbitMQ,
  closeConnection,
  publishEvent,
  subscribeToEvent,
  handleIncomingEvents,
  events
};
