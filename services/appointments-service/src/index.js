const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const appointmentRoutes = require('./routes/appointmentRoutes');
const errorHandler = require('./middleware/errorHandler');
const { connectDatabase } = require('./config/database');
const { specs, swaggerUi, swaggerUiOptions } = require('./config/swagger');
const { connectRabbitMQ } = require('./utils/rabbitmq');
const { initializeWebSocket } = require('./utils/websocket');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3002;

// Configuración de Socket.IO para WebSockets
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3101', 'http://localhost:3102', 'http://localhost:3103'],
    methods: ['GET', 'POST'],
    credentials: true
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
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // límite de 100 peticiones
  message: 'Demasiadas peticiones desde esta IP, por favor intente mas tarde.'
});
app.use('/api/', limiter);

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/appointments', appointmentRoutes);

// Documentación de Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

// Ruta de información de API
app.get('/api', (req, res) => {
  res.json({
    name: 'PawPet Appointments Service API',
    version: '1.0.0',
    description: 'Microservicio de gestión de citas y calendarios para PawPet Veterinary Management',
    documentation: '/api-docs',
    health: '/health',
    websocket: '/socket.io',
    features: {
      appointments: 'Gestión de citas médicas',
      calendar: 'Calendario con disponibilidad',
      veterinarians: 'Gestión de veterinarios',
      availability: 'Control de horarios disponibles',
      reminders: 'Recordatorios automáticos',
      websockets: 'Actualizaciones en tiempo real'
    },
    endpoints: {
      appointments: '/api/appointments',
      calendar: '/api/appointments/calendar',
      veterinarians: '/api/appointments/veterinarians',
      availability: '/api/appointments/availability',
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
    service: 'appointments-service',
    timestamp: new Date().toISOString(),
    features: {
      database: 'connected',
      rabbitmq: 'connected',
      websockets: 'active',
      swagger: 'available'
    }
  });
});

// Iniciar servidor
async function startServer() {
  try {
    // Conectar a la base de datos
    await connectDatabase();
    
    // Conectar a RabbitMQ
    await connectRabbitMQ();
    
    // Inicializar WebSockets
    initializeWebSocket(io);
    
    server.listen(PORT, () => {
      console.log(`Appointments Service iniciado en puerto ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`WebSocket: ws://localhost:${PORT}/socket.io`);
    });
  } catch (error) {
    console.error('Error al iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server, io };
