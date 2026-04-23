require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const { connectDatabase, closeDatabase } = require('./config/database');
const { connectRabbitMQ, setupEventHandlers } = require('./utils/rabbitmq');
const hospitalizationRoutes = require('./routes/hospitalizationRoutes');
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware de seguridad
app.use(helmet());

// Configuración de CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3101', 'http://localhost:3102', 'http://localhost:3103'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // límite de 100 solicitudes
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuración de Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PawPet Hospitalization Service API',
      version: '1.0.0',
      description: 'API para el servicio de hospitalización de PawPet Veterinary Management System',
      contact: {
        name: 'PawPet Team',
        email: 'support@pawpet.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'hospitalization-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rutas de la API
app.use('/api/hospitalization', authMiddleware, hospitalizationRoutes);

// Middleware de manejo de errores
app.use(errorHandler);

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    error: 'NOT_FOUND'
  });
});

/**
 * Iniciar servidor
 */
async function startServer() {
  try {
    // Conectar a la base de datos
    await connectDatabase();
    
    // Conectar a RabbitMQ
    await connectRabbitMQ();
    
    // Configurar manejadores de eventos
    await setupEventHandlers();
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`✅ Hospitalization Service running on port ${PORT}`);
      console.log(`📚 Swagger documentation available at http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health check available at http://localhost:${PORT}/health`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start Hospitalization Service:', error);
    process.exit(1);
  }
}

/**
 * Manejo de cierre elegante
 */
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  
  try {
    await closeDatabase();
    console.log('✅ Database connections closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully');
  
  try {
    await closeDatabase();
    console.log('✅ Database connections closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Iniciar servidor si este archivo se ejecuta directamente
if (require.main === module) {
  startServer();
}

module.exports = app;
