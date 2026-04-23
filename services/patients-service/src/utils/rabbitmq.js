const amqp = require('amqplib');

let connection = null;
let channel = null;

/**
 * Utilidades de RabbitMQ para el Patients Service
 * @class RabbitMQ
 * @description Gestiona la comunicación asíncrona mediante eventos
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
    await channel.assertExchange('pawpet.billing', 'topic', { durable: true });

    // Declarar colas específicas del patients service
    await channel.assertQueue('patients.events', { durable: true });
    await channel.assertQueue('patients.notifications', { durable: true });

    // Bind de colas a exchanges
    await channel.bindQueue('patients.events', 'pawpet.events', 'patient.*');
    await channel.bindQueue('patients.events', 'pawpet.events', 'clinical_history.*');
    await channel.bindQueue('patients.events', 'pawpet.events', 'vaccination.*');
    await channel.bindQueue('patients.events', 'pawpet.events', 'deworming.*');
    await channel.bindQueue('patients.events', 'pawpet.events', 'allergy.*');

    await channel.bindQueue('patients.notifications', 'pawpet.notifications', 'reminder.*');
    await channel.bindQueue('patients.notifications', 'pawpet.notifications', 'alert.*');

    console.log('✅ Connected to RabbitMQ for Patients Service');
    return true;
  } catch (error) {
    console.error('❌ Error connecting to RabbitMQ:', error);
    return false;
  }
};

/**
 * Publica un evento en un exchange específico
 * @param {string} routingKey - Clave de enrutamiento
 * @param {Object} data - Datos del evento
 * @param {string} [exchange='pawpet.events'] - Exchange a usar
 * @returns {Promise<boolean>} True si se publicó exitosamente
 */
const publishEvent = async (routingKey, data, exchange = 'pawpet.events') => {
  try {
    if (!channel) {
      console.warn('⚠️ RabbitMQ channel not available, skipping event publication');
      return false;
    }

    const message = {
      ...data,
      timestamp: new Date().toISOString(),
      service: 'patients-service',
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
          service: 'patients-service',
          version: '1.0'
        }
      }
    );

    if (published) {
      console.log(`📤 Event published: ${routingKey}`, data);
    } else {
      console.warn(`⚠️ Failed to publish event: ${routingKey}`);
    }

    return published;
  } catch (error) {
    console.error(`❌ Error publishing event ${routingKey}:`, error);
    return false;
  }
};

/**
 * Se suscribe a eventos específicos
 * @param {string} pattern - Patrón de eventos a escuchar
 * @param {Function} callback - Función a ejecutar cuando llega un evento
 * @param {string} [queue='patients.events'] - Cola a usar
 * @returns {Promise<boolean>} True si se suscribió exitosamente
 */
const subscribeToEvent = async (pattern, callback, queue = 'patients.events') => {
  try {
    if (!channel) {
      console.warn('⚠️ RabbitMQ channel not available, skipping subscription');
      return false;
    }

    await channel.consume(queue, (message) => {
      if (message) {
        try {
          const event = JSON.parse(message.content.toString());
          console.log(`📥 Event received: ${pattern}`, event);
          
          // Ejecutar callback con el evento
          callback(event, message);
          
          // Acknowledge message
          channel.ack(message);
        } catch (error) {
          console.error(`❌ Error processing event ${pattern}:`, error);
          channel.nack(message, false, false);
        }
      }
    }, { noAck: false });

    console.log(`👂 Subscribed to events: ${pattern}`);
    return true;
  } catch (error) {
    console.error(`❌ Error subscribing to events ${pattern}:`, error);
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

    console.log('📴 RabbitMQ connection closed');
    return true;
  } catch (error) {
    console.error('❌ Error closing RabbitMQ connection:', error);
    return false;
  }
};

/**
 * Publica eventos específicos del dominio clínico
 */
const events = {
  // Eventos de pacientes
  patientCreated: (patientData) => 
    publishEvent('patient.created', patientData),
  
  patientUpdated: (patientData) => 
    publishEvent('patient.updated', patientData),
  
  patientDeactivated: (patientData) => 
    publishEvent('patient.deactivated', patientData),

  // Eventos de tutores
  tutorCreated: (tutorData) => 
    publishEvent('tutor.created', tutorData),
  
  tutorUpdated: (tutorData) => 
    publishEvent('tutor.updated', tutorData),

  // Eventos de historial clínico
  clinicalHistoryCreated: (historyData) => 
    publishEvent('clinical_history.created', historyData),
  
  emergencyRegistered: (historyData) => 
    publishEvent('clinical_history.emergency', historyData, 'pawpet.notifications'),

  // Eventos de seguimiento
  followUpRequired: (followUpData) => 
    publishEvent('follow_up.required', followUpData, 'pawpet.notifications'),

  // Eventos de vacunación
  vaccinationCreated: (vaccinationData) => 
    publishEvent('vaccination.created', vaccinationData),
  
  vaccinationReminder: (reminderData) => 
    publishEvent('vaccination.reminder', reminderData, 'pawpet.notifications'),

  // Eventos de desparasitación
  dewormingCreated: (dewormingData) => 
    publishEvent('deworming.created', dewormingData),
  
  dewormingReminder: (reminderData) => 
    publishEvent('deworming.reminder', reminderData, 'pawpet.notifications'),

  // Eventos de alergias
  allergyCreated: (allergyData) => 
    publishEvent('allergy.created', allergyData),
  
  severeAllergyAlert: (allergyData) => 
    publishEvent('allergy.severe', allergyData, 'pawpet.notifications'),

  // Eventos de facturación (integración con billing service)
  consultationCompleted: (billingData) => 
    publishEvent('billing.consultation.completed', billingData, 'pawpet.billing'),
  
  medicationApplied: (billingData) => 
    publishEvent('billing.medication.applied', billingData, 'pawpet.billing'),

  // Eventos de notificaciones
  patientHospitalized: (notificationData) => 
    publishEvent('notification.patient.hospitalized', notificationData, 'pawpet.notifications'),
  
  patientDischarged: (notificationData) => 
    publishEvent('notification.patient.discharged', notificationData, 'pawpet.notifications'),

  // Eventos de sistema
  serviceHealthCheck: () => 
    publishEvent('service.health.patients', {
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
  // Eventos del auth service
  await subscribeToEvent('user.*', async (event, message) => {
    // Manejar eventos de usuarios creados, actualizados, etc.
    console.log('🔄 Processing user event:', event);
  });

  // Eventos del billing service
  await subscribeToEvent('billing.*', async (event, message) => {
    // Manejar eventos de facturación
    console.log('💰 Processing billing event:', event);
  });

  // Eventos del notifications service
  await subscribeToEvent('notification.*', async (event, message) => {
    // Manejar eventos de notificaciones
    console.log('📬 Processing notification event:', event);
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
  console.log('🔄 Gracefully shutting down RabbitMQ connection...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Gracefully shutting down RabbitMQ connection...');
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
