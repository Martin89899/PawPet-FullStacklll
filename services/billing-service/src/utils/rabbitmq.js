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
    await channel.assertExchange('billing.events', 'topic', { durable: true });
    await channel.assertExchange('appointments.events', 'topic', { durable: true });
    await channel.assertExchange('patients.events', 'topic', { durable: true });
    
    console.log('✅ RabbitMQ connected successfully');
    
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
    
    const routingKey = `billing.${eventType}`;
    const message = {
      eventType,
      data,
      timestamp: new Date().toISOString(),
      service: 'billing-service'
    };
    
    await channel.publish(
      'billing.events',
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
    
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
    await channel.bindQueue(queue.queue, 'billing.events', pattern);
    
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
    // Escuchar eventos de appointments-service
    await subscribeToEvent('appointments.*', async (event) => {
      console.log('📥 Received appointment event:', event.eventType);
      
      switch (event.eventType) {
        case 'appointments.created':
          await handleAppointmentCreated(event.data);
          break;
        case 'appointments.completed':
          await handleAppointmentCompleted(event.data);
          break;
        case 'appointments.cancelled':
          await handleAppointmentCancelled(event.data);
          break;
        default:
          console.log(`Unhandled appointment event: ${event.eventType}`);
      }
    });
    
    // Escuchar eventos de patients-service
    await subscribeToEvent('patients.*', async (event) => {
      console.log('📥 Received patient event:', event.eventType);
      
      switch (event.eventType) {
        case 'patient.created':
          await handlePatientCreated(event.data);
          break;
        case 'patient.updated':
          await handlePatientUpdated(event.data);
          break;
        default:
          console.log(`Unhandled patient event: ${event.eventType}`);
      }
    });
    
    console.log('✅ Event handlers configured');
  } catch (error) {
    console.error('❌ Error setting up event handlers:', error);
    throw error;
  }
}

/**
 * Manejar evento de cita creada
 */
async function handleAppointmentCreated(data) {
  try {
    // Aquí se podría crear una factura automática para la cita
    console.log('📅 Appointment created, potential billing opportunity:', data);
    
    // Publicar evento de respuesta si es necesario
    await publishEvent('appointment.acknowledged', {
      appointmentId: data.id,
      billingServiceStatus: 'acknowledged'
    });
  } catch (error) {
    console.error('❌ Error handling appointment created:', error);
  }
}

/**
 * Manejar evento de cita completada
 */
async function handleAppointmentCompleted(data) {
  try {
    // Crear factura automática para la cita completada
    console.log('✅ Appointment completed, generating invoice:', data);
    
    // Aquí se implementaría la lógica para crear una factura basada en la cita
    await publishEvent('invoice.auto_generated', {
      appointmentId: data.id,
      patientId: data.patientId,
      clientId: data.clientId,
      status: 'pending'
    });
  } catch (error) {
    console.error('❌ Error handling appointment completed:', error);
  }
}

/**
 * Manejar evento de cita cancelada
 */
async function handleAppointmentCancelled(data) {
  try {
    // Cancelar cualquier factura pendiente relacionada con la cita
    console.log('❌ Appointment cancelled, checking pending invoices:', data);
    
    await publishEvent('invoice.check_cancellation', {
      appointmentId: data.id,
      reason: data.reason
    });
  } catch (error) {
    console.error('❌ Error handling appointment cancelled:', error);
  }
}

/**
 * Manejar evento de paciente creado
 */
async function handlePatientCreated(data) {
  try {
    console.log('🐾 Patient created:', data);
    
    // No se necesita acción específica, pero se podría registrar
    await publishEvent('patient.acknowledged', {
      patientId: data.id,
      billingServiceStatus: 'patient_registered'
    });
  } catch (error) {
    console.error('❌ Error handling patient created:', error);
  }
}

/**
 * Manejar evento de paciente actualizado
 */
async function handlePatientUpdated(data) {
  try {
    console.log('📝 Patient updated:', data);
    
    // Verificar si hay facturas pendientes que necesiten actualización
    await publishEvent('invoice.verify_patient_update', {
      patientId: data.id,
      updatedFields: Object.keys(data)
    });
  } catch (error) {
    console.error('❌ Error handling patient updated:', error);
  }
}

module.exports = {
  connectRabbitMQ,
  publishEvent,
  subscribeToEvent,
  closeRabbitMQ,
  setupEventHandlers
};
