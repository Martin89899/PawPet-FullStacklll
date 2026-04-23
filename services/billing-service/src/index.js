const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const billingRoutes = require('./routes/billingRoutes');
const errorHandler = require('./middleware/errorHandler');
const { connectDatabase } = require('./config/database');
const { specs, swaggerUi, swaggerUiOptions } = require('./config/swagger');
const { connectRabbitMQ } = require('./utils/rabbitmq');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware de seguridad
app.use(helmet());

// Configuración de CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3101', 'http://localhost:3102', 'http://localhost:3103'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // límite de 100 peticiones
  message: 'Demasiadas peticiones desde esta IP, por favor intente mas tarde.'
});
app.use('/api/', limiter);

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/billing', billingRoutes);

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(specs, swaggerUiOptions));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'billing-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Manejo de errores
app.use(errorHandler);

// Inicialización del servidor
async function startServer() {
  try {
    // Conectar a la base de datos
    await connectDatabase();
    console.log('✅ Database connected successfully');

    // Conectar a RabbitMQ
    await connectRabbitMQ();
    console.log('✅ RabbitMQ connected successfully');

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Billing Service running on port ${PORT}`);
      console.log(`📖 Swagger documentation available at http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start billing service:', error);
    process.exit(1);
  }
}

// Manejo graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Iniciar servidor
startServer();

module.exports = app;
