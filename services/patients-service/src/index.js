const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
require('dotenv').config();

const patientRoutes = require('./routes/patientRoutes');
const errorHandler = require('./middleware/errorHandler');
const { connectDatabase } = require('./config/database');
const { specs, swaggerUi, swaggerUiOptions } = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3003;

// Configuración de Multer para archivos
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Middleware de seguridad
app.use(helmet());

// Configuración de CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3101', 'http://localhost:3102', 'http://localhost:3103'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Middleware para parsear JSON y archivos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

// Rutas
app.use('/api/patients', patientRoutes);

// Documentación de Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

// Ruta de información de API
app.get('/api', (req, res) => {
  res.json({
    name: 'PawPet Patients Service API',
    version: '1.0.0',
    description: 'Microservicio de gestión clínica de pacientes para PawPet Veterinary Management',
    documentation: '/api-docs',
    health: '/health',
    endpoints: {
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
    service: 'patients-service',
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
async function startServer() {
  try {
    // Conectar a la base de datos
    await connectDatabase();
    
    app.listen(PORT, () => {
      console.log(`Patients Service iniciado en puerto ${PORT}`);
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
