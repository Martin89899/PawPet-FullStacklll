const amqp = require('amqplib');

let connection = null;
let channel = null;

async function connectRabbitMQ() {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    connection = await amqp.connect(url);
    channel = await connection.createChannel();
    
    console.log('✅ Connected to RabbitMQ');
    
    // Configurar exchanges y colas
    await setupExchangesAndQueues();
    
    return channel;
  } catch (error) {
    console.error('❌ RabbitMQ connection error:', error);
    throw error;
  }
}

async function setupExchangesAndQueues() {
  // Crear exchange para eventos de usuarios
  await channel.assertExchange('user.events', 'topic', { durable: true });
  
  // Crear exchange para eventos de autenticación
  await channel.assertExchange('auth.events', 'topic', { durable: true });
  
  // Crear colas
  await createQueue('user.created', 'user.events');
  await createQueue('user.updated', 'user.events');
  await createQueue('user.login', 'auth.events');
  await createQueue('user.logout', 'auth.events');
  await createQueue('user.password.changed', 'auth.events');
}

async function createQueue(routingKey, exchange) {
  const queueName = `auth-service.${routingKey}`;
  
  await channel.assertQueue(queueName, { durable: true });
  await channel.bindQueue(queueName, exchange, routingKey);
  
  console.log(`📬 Queue ${queueName} bound to exchange ${exchange} with routing key ${routingKey}`);
}

async function publishEvent(eventType, eventData) {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }
    
    const exchange = eventType.startsWith('user.') ? 'user.events' : 'auth.events';
    
    const message = {
      eventType,
      data: eventData,
      timestamp: new Date().toISOString(),
      service: 'auth-service'
    };
    
    const published = channel.publish(
      exchange,
      eventType,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
    
    if (published) {
      console.log(`📤 Event published: ${eventType}`);
    } else {
      console.log(`❌ Failed to publish event: ${eventType}`);
    }
    
    return published;
  } catch (error) {
    console.error('❌ Error publishing event:', error);
    throw error;
  }
}

async function subscribeToEvent(eventType, callback) {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }
    
    const queueName = `auth-service.${eventType}`;
    
    await channel.consume(queueName, (message) => {
      if (message) {
        try {
          const event = JSON.parse(message.content.toString());
          callback(event);
          channel.ack(message);
        } catch (error) {
          console.error(`❌ Error processing message for ${eventType}:`, error);
          channel.nack(message, false, false);
        }
      }
    });
    
    console.log(`👂 Subscribed to event: ${eventType}`);
  } catch (error) {
    console.error('❌ Error subscribing to event:', error);
    throw error;
  }
}

async function closeConnection() {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    console.log('📴 RabbitMQ connection closed');
  } catch (error) {
    console.error('❌ Error closing RabbitMQ connection:', error);
  }
}

// Manejar cierre de aplicación
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});

module.exports = {
  connectRabbitMQ,
  publishEvent,
  subscribeToEvent,
  closeConnection
};
