const amqp = require('amqplib');

let connection = null;
let channel = null;

/**
 * Conectar a RabbitMQ
 */
async function connectRabbitMQ() {
  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://pawpet_user:pawpet_password@localhost:5672';
    
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    
    // Declarar exchanges
    await channel.assertExchange('hospitalization.events', 'topic', { durable: true });
    await channel.assertExchange('billing.events', 'topic', { durable: true });
    await channel.assertExchange('appointments.events', 'topic', { durable: true });
    await channel.assertExchange('patients.events', 'topic', { durable: true });
    await channel.assertExchange('notifications.events', 'topic', { durable: true });
    
    console.log('✅ RabbitMQ connected successfully for Hospitalization Service');
    
    // Manejar desconexión
    connection.on('close', () => {
      console.log('🔄 RabbitMQ connection closed, attempting to reconnect...');
      setTimeout(connectRabbitMQ, 5000);
    });
    
    connection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err);
    });
    
  } catch (error) {
    console.error('❌ Failed to connect to RabbitMQ:', error);
    throw error;
  }
}

/**
 * Publicar evento
 */
async function publishEvent(eventType, data) {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel not available');
    }
    
    const routingKey = `hospitalization.${eventType}`;
    const message = {
      eventType,
      data,
      timestamp: new Date().toISOString(),
      service: 'hospitalization-service'
    };
    
    await channel.publish(
      'hospitalization.events',
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
    
    // Publicar a otros exchanges si es necesario
    if (eventType.includes('charge_generated')) {
      await channel.publish(
        'billing.events',
        `billing.${eventType}`,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );
    }
    
    if (eventType.includes('critical_alert')) {
      await channel.publish(
        'notifications.events',
        `notifications.${eventType}`,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );
    }
    
    console.log(`📤 Event published: ${eventType}`);
  } catch (error) {
    console.error(`❌ Error publishing event ${eventType}:`, error);
    throw error;
  }
}

/**
 * Suscribir a eventos
 */
async function subscribeToEvent(pattern, callback) {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel not available');
    }
    
    // Declarar cola temporal
    const queue = await channel.assertQueue('', { exclusive: true });
    
    // Bind al exchange con el patrón
    await channel.bindQueue(queue.queue, 'hospitalization.events', pattern);
    
    // También bind a otros exchanges si es necesario
    if (pattern.includes('appointments')) {
      await channel.bindQueue(queue.queue, 'appointments.events', pattern);
    }
    
    if (pattern.includes('patients')) {
      await channel.bindQueue(queue.queue, 'patients.events', pattern);
    }
    
    // Consumir mensajes
    await channel.consume(queue.queue, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          await callback(content);
          channel.ack(msg);
        } catch (error) {
          console.error('❌ Error processing message:', error);
          channel.nack(msg, false, false);
        }
      }
    });
    
    console.log(`📥 Subscribed to event pattern: ${pattern}`);
  } catch (error) {
    console.error(`❌ Error subscribing to events:`, error);
    throw error;
  }
}

/**
 * Cerrar conexión
 */
async function closeRabbitMQ() {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    console.log('🔄 RabbitMQ connection closed');
  } catch (error) {
    console.error('❌ Error closing RabbitMQ connection:', error);
  }
}

/**
 * Configurar manejadores de eventos
 */
async function setupEventHandlers() {
  try {
    const HospitalizationService = require('../services/HospitalizationService');
    
    // Escuchar eventos de appointments-service
    await subscribeToEvent('appointments.*', async (event) => {
      console.log('📥 Received appointment event:', event.eventType);
      
      switch (event.eventType) {
        case 'appointments.emergency_admission':
          await HospitalizationService.handleEmergencyAdmission(event.data);
          break;
        case 'appointments.surgery_scheduled':
          await HospitalizationService.handleSurgeryScheduled(event.data);
          break;
        default:
          console.log(`Unhandled appointment event: ${event.eventType}`);
      }
    });
    
    // Escuchar eventos de patients-service
    await subscribeToEvent('patients.*', async (event) => {
      console.log('📥 Received patient event:', event.eventType);
      
      switch (event.eventType) {
        case 'patient.emergency':
          await HospitalizationService.handlePatientEmergency(event.data);
          break;
        default:
          console.log(`Unhandled patient event: ${event.eventType}`);
      }
    });
    
    console.log('✅ Hospitalization event handlers configured');
  } catch (error) {
    console.error('❌ Error setting up hospitalization event handlers:', error);
    throw error;
  }
}

module.exports = {
  connectRabbitMQ,
  publishEvent,
  subscribeToEvent,
  closeRabbitMQ,
  setupEventHandlers
};
