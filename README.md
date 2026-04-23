# PawPet Veterinary Management System

Sistema de gestión veterinaria basado en arquitectura de microservicios con Node.js, Express, React, PostgreSQL y RabbitMQ.

## 🏗️ Arquitectura

### Microservicios Backend

- **auth-service** (puerto 3001): Gestión de autenticación y autorización
- **appointments-service** (puerto 3002): Gestión de citas y calendarios
- **patients-service** (puerto 3003): Gestión de pacientes e historiales médicos
- **billing-service** (puerto 3004): Gestión de facturación y pagos

### Aplicaciones Frontend

- **admin-portal** (puerto 3101): Portal de administración
- **client-portal** (puerto 3102): Portal para clientes
- **veterinarian-portal** (puerto 3103): Portal para veterinarios

### Infraestructura

- **PostgreSQL**: Base de datos para cada microservicio
- **RabbitMQ**: Broker de mensajes para comunicación asíncrona
- **Nginx**: Servidor web para aplicaciones frontend

## 🚀 Inicio Rápido

### Prerrequisitos

- Docker y Docker Compose
- Node.js 18+ (para desarrollo local)
- Git

### Instalación

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd Paw_Pet_ensayo
```

2. Copiar archivos de entorno:
```bash
# Para cada microservicio
cp services/auth-service/.env.example services/auth-service/.env
cp services/appointments-service/.env.example services/appointments-service/.env
cp services/patients-service/.env.example services/patients-service/.env
cp services/billing-service/.env.example services/billing-service/.env

# Para cada aplicación frontend
cp apps/admin-portal/.env.example apps/admin-portal/.env
cp apps/client-portal/.env.example apps/client-portal/.env
cp apps/veterinarian-portal/.env.example apps/veterinarian-portal/.env
```

3. Iniciar todos los servicios con Docker Compose:
```bash
docker-compose up -d
```

### Acceso a los Servicios

#### Frontend
- **Admin Portal**: http://localhost:3101
- **Client Portal**: http://localhost:3102
- **Veterinarian Portal**: http://localhost:3103

#### Backend APIs
- **Auth Service**: http://localhost:3001
- **Appointments Service**: http://localhost:3002
- **Patients Service**: http://localhost:3003
- **Billing Service**: http://localhost:3004

#### Infraestructura
- **RabbitMQ Management**: http://localhost:15672
  - Usuario: `pawpet_user`
  - Contraseña: `pawpet_password`

## 📁 Estructura del Proyecto

```
Paw_Pet_ensayo/
├── services/                    # Microservicios backend
│   ├── auth-service/           # Servicio de autenticación
│   │   ├── src/               # Código fuente
│   │   ├── config/            # Configuración
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── .env.example
│   ├── appointments-service/   # Servicio de citas
│   ├── patients-service/       # Servicio de pacientes
│   └── billing-service/        # Servicio de facturación
├── apps/                       # Aplicaciones frontend
│   ├── admin-portal/          # Portal de administración
│   ├── client-portal/         # Portal de clientes
│   └── veterinarian-portal/   # Portal de veterinarios
├── docker-compose.yml          # Orquestación de servicios
└── README.md
```

## 🔧 Desarrollo Local

### Ejecutar un microservicio individualmente

```bash
# Navegar al directorio del servicio
cd services/auth-service

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev
```

### Ejecutar una aplicación frontend individualmente

```bash
# Navegar al directorio de la app
cd apps/admin-portal

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm start
```

## 🗄️ Bases de Datos

Cada microservicio tiene su propia base de datos PostgreSQL:

- **auth-db**: localhost:5432
- **appointments-db**: localhost:5433
- **patients-db**: localhost:5434
- **billing-db**: localhost:5435

Credenciales por defecto:
- Usuario: `pawpet_user`
- Contraseña: `pawpet_password`

## 📡 Comunicación Entre Servicios

Los microservicios se comunican a través de:

1. **REST APIs**: Para comunicación síncrona
2. **RabbitMQ**: Para comunicación asíncrona basada en eventos

### Eventos Principales

- `user.created`: Nuevo usuario registrado
- `appointment.created`: Nueva cita creada
- `appointment.updated`: Cita actualizada
- `patient.created`: Nuevo paciente registrado
- `invoice.generated`: Nueva factura generada

## 🔐 Seguridad

- Autenticación basada en JWT
- Rate limiting en todos los endpoints
- Validación de datos con Joi
- CORS configurado para los dominios permitidos
- Variables de entorno para configuración sensible

## 🧪 Testing

```bash
# Ejecutar tests de un microservicio
cd services/auth-service
npm test

# Ejecutar tests en modo watch
npm run test:watch
```

## 📦 Despliegue

### Producción con Docker

```bash
# Construir y ejecutar en modo producción
docker-compose -f docker-compose.prod.yml up -d
```

### Variables de Entorno de Producción

Asegúrate de configurar estas variables críticas:

- `JWT_SECRET`: Clave secreta para JWT
- `DB_PASSWORD`: Contraseñas de bases de datos
- `STRIPE_SECRET_KEY`: Clave de Stripe para pagos
- `RABBITMQ_PASSWORD`: Contraseña de RabbitMQ

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js**: Runtime de JavaScript
- **Express**: Framework web
- **PostgreSQL**: Base de datos relacional
- **RabbitMQ**: Broker de mensajes
- **JWT**: Autenticación
- **Joi**: Validación de datos

### Frontend
- **React**: Biblioteca de UI
- **React Router**: Enrutamiento
- **Ant Design / Material-UI / Chakra UI**: Componentes UI
- **Axios**: Cliente HTTP
- **React Query**: Gestión de estado del servidor

### Infraestructura
- **Docker**: Contenerización
- **Docker Compose**: Orquestación
- **Nginx**: Servidor web y proxy inverso

## 📝 Contribución

1. Fork del proyecto
2. Crear rama de características (`git checkout -b feature/amazing-feature`)
3. Commit de cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

Para soporte técnico o preguntas:
- Crear un issue en el repositorio
- Contactar al equipo de PawPet

---

**PawPet Veterinary Management** - 🐾 Cuidando de tus mascotas con tecnología
