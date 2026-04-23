const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');
const { connectDatabase } = require('./config/database-sqlite');
const { specs, swaggerUi, swaggerUiOptions } = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3001;

// Variable global para la conexión a la base de datos
let dbConnection;

// Middleware de seguridad
app.use(helmet());

// Configuración de CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3101'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // límite de 100 peticiones
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para pasar la conexión de la base de datos a las rutas
app.use((req, res, next) => {
  req.db = dbConnection;
  next();
});

// Rutas
app.use('/api', authRoutes);

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'PawPet Auth Service',
    timestamp: new Date().toISOString(),
    database: 'SQLite',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'PawPet Auth Service - API de Autenticación',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health'
  });
});

// Middleware de manejo de errores
app.use(errorHandler);

/**
 * Inicia el servidor Express
 */
async function startServer() {
  try {
    // Conectar a la base de datos SQLite
    dbConnection = await connectDatabase();
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 PawPet Auth Service iniciado en el puerto ${PORT}`);
      console.log(`📚 Documentación Swagger: http://localhost:${PORT}/api-docs`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log(`🔧 Base de datos: SQLite`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Error al iniciar servidor:', error);
    process.exit(1);
  }
}

/**
 * Manejo de cierre gracioso
 */
process.on('SIGINT', async () => {
  console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
  
  if (dbConnection) {
    await closeDatabase(dbConnection);
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
  
  if (dbConnection) {
    await closeDatabase(dbConnection);
  }
  
  process.exit(0);
});

// Iniciar servidor
startServer().catch(console.error);

module.exports = app;
