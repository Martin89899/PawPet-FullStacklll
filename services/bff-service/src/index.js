const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./controllers/authController');
const patientRoutes = require('./controllers/patientController');
const errorHandler = require('./middleware/errorHandler');
const { specs, swaggerUi, swaggerUiOptions } = require('./config/swagger');
const { connectRabbitMQ } = require('./utils/rabbitmq');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de seguridad
app.use(helmet());

// Middleware de compresion
app.use(compression());

// Logging
app.use(morgan('combined'));

// Configuracion de CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3101', 'http://localhost:3102', 'http://localhost:3103'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200, // limite de 200 peticiones
  message: 'Demasiadas peticiones desde esta IP, por favor intente mas tarde.'
});
app.use('/api/', limiter);

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rutas del BFF
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);

// Documentacion de Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

// Ruta de informacion de API
app.get('/api', (req, res) => {
  res.json({
    name: 'PawPet BFF Service API',
    version: '1.0.0',
    description: 'Backend for Frontend - API Gateway para PawPet Veterinary Management',
    documentation: '/api-docs',
    health: '/health',
    services: {
      auth: `${process.env.AUTH_SERVICE_URL}`,
      patients: `${process.env.PATIENTS_SERVICE_URL}`,
      appointments: `${process.env.APPOINTMENTS_SERVICE_URL}`,
      billing: `${process.env.BILLING_SERVICE_URL}`
    },
    endpoints: {
      auth: '/api/auth',
      patients: '/api/patients',
      docs: '/api-docs'
    }
  });
});

// Middleware de manejo de errores
app.use(errorHandler);

// Ruta de health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'bff-service',
    timestamp: new Date().toISOString(),
    services: {
      auth: 'connected',
      patients: 'connected',
      rabbitmq: 'connected',
      redis: 'connected'
    }
  });
});

// Iniciar servidor
async function startServer() {
  try {
    // Conectar a RabbitMQ
    await connectRabbitMQ();
    
    app.listen(PORT, () => {
      console.log(`BFF Service iniciado en puerto ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Documentation: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('Error al iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
