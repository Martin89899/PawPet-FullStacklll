const amqp = require('amqplib');

let connection = null;
let channel = null;

/**
 * Utilidades de RabbitMQ para el BFF Service
 * @class RabbitMQ
 * @description Gestiona la comunicación asíncrona mediante eventos con cola adicional
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
    
    // Nuevo exchange para BFF
    await channel.assertExchange('pawpet.bff', 'topic', { durable: true });

    // Declarar colas específicas del BFF service
    await channel.assertQueue('bff.events', { durable: true });
    await channel.assertQueue('bff.notifications', { durable: true });
    
    // COLA ADICIONAL PARA COMUNICACIÓN BFF
    await channel.assertQueue('bff.requests', { durable: true });
    await channel.assertQueue('bff.responses', { durable: true });

    // Bind de colas a exchanges
    await channel.bindQueue('bff.events', 'pawpet.events', 'user.*');
    await channel.bindQueue('bff.events', 'pawpet.events', 'patient.*');
    await channel.bindQueue('bff.events', 'pawpet.events', 'clinical_history.*');
    await channel.bindQueue('bff.events', 'pawpet.events', 'vaccination.*');
    await channel.bindQueue('bff.events', 'pawpet.events', 'deworming.*');
    await channel.bindQueue('bff.events', 'pawpet.events', 'allergy.*');

    await channel.bindQueue('bff.notifications', 'pawpet.notifications', 'reminder.*');
    await channel.bindQueue('bff.notifications', 'pawpet.notifications', 'alert.*');
    
    // Bind de la cola adicional para comunicación BFF
    await channel.bindQueue('bff.requests', 'pawpet.bff', 'request.*');
    await channel.bindQueue('bff.responses', 'pawpet.bff', 'response.*');

    console.log('Conectado exitosamente a RabbitMQ para BFF Service');
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
 * @param {string} [exchange='pawpet.events'] - Exchange a usar
 * @returns {Promise<boolean>} True si se publicó exitosamente
 */
const publishEvent = async (routingKey, data, exchange = 'pawpet.events') => {
  try {
    if (!channel) {
      console.warn('Canal de RabbitMQ no disponible, omitiendo publicación de evento');
      return false;
    }

    const message = {
      ...data,
      timestamp: new Date().toISOString(),
      service: 'bff-service',
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
          service: 'bff-service',
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
 * @param {string} [queue='bff.events'] - Cola a usar
 * @returns {Promise<boolean>} True si se suscribió exitosamente
 */
const subscribeToEvent = async (pattern, callback, queue = 'bff.events') => {
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
 * Publica eventos específicos del BFF
 */
const events = {
  // Eventos de autenticación
  userLogin: (userData) => 
    publishEvent('user.login', userData),
  
  userLogout: (userData) => 
    publishEvent('user.logout', userData),
  
  userProfileUpdated: (userData) => 
    publishEvent('user.profile.updated', userData),

  // Eventos de pacientes
  patientViewed: (patientData) => 
    publishEvent('patient.viewed', patientData),
  
  patientSearched: (searchData) => 
    publishEvent('patient.searched', searchData),

  // Eventos de solicitudes BFF (COLA ADICIONAL)
  requestProcessed: (requestData) => 
    publishEvent('request.processed', requestData, 'pawpet.bff'),
  
  responseReady: (responseData) => 
    publishEvent('response.ready', responseData, 'pawpet.bff'),

  // Eventos de cache
  cacheHit: (cacheData) => 
    publishEvent('cache.hit', cacheData, 'pawpet.bff'),
  
  cacheMiss: (cacheData) => 
    publishEvent('cache.miss', cacheData, 'pawpet.bff'),

  // Eventos de agregación
  dataAggregated: (aggregationData) => 
    publishEvent('data.aggregated', aggregationData, 'pawpet.bff'),

  // Eventos de sistema
  serviceHealthCheck: () => 
    publishEvent('service.health.bff', {
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
    console.log('Procesando evento de usuario:', event);
  });

  // Eventos del patients service
  await subscribeToEvent('patient.*', async (event, message) => {
    // Manejar eventos de pacientes
    console.log('Procesando evento de paciente:', event);
  });

  // Eventos de solicitudes BFF (COLA ADICIONAL)
  await subscribeToEvent('request.*', async (event, message) => {
    // Manejar solicitudes asíncronas
    console.log('Procesando solicitud BFF:', event);
  });

  // Eventos de respuestas BFF (COLA ADICIONAL)
  await subscribeToEvent('response.*', async (event, message) => {
    // Manejar respuestas asíncronas
    console.log('Procesando respuesta BFF:', event);
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
