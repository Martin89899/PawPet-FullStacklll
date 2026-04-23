# 🚀 Guía de Instalación y Prueba - PawPet Veterinary Management

## 📋 Requisitos Previos

### 1. Instalar Docker Desktop para Windows
**Descargar:** https://www.docker.com/products/docker-desktop/

**Pasos:**
1. Descargar Docker Desktop para Windows
2. Ejecutar el instalador
3. Reiniciar el PC cuando lo solicite
4. Iniciar Docker Desktop
5. Esperar a que esté completamente iniciado (icono verde en la barra de tareas)

### 2. Verificar instalación
```bash
# Verificar Docker
docker --version
docker compose version

# Verificar que Docker esté corriendo
docker info
```

---

## 🔧 Configuración del Proyecto

### Paso 1: Configurar Variables de Entorno
```bash
# Copiar archivos de entorno
cp services/auth-service/.env.example services/auth-service/.env
cp services/patients-service/.env.example services/patients-service/.env
cp services/appointments-service/.env.example services/appointments-service/.env
cp services/bff-service/.env.example services/bff-service/.env
```

### Paso 2: Configurar JWT Secret (Importante)
Editar los archivos `.env` y cambiar:
```env
JWT_SECRET=tu-clave-secreta-super-larga-y-unic-aqui-123456789
```

### Paso 3: Iniciar Servicios
```bash
# Iniciar todos los servicios (PostgreSQL, RabbitMQ, Microservicios)
docker compose up -d

# Verificar que todos los servicios estén corriendo
docker compose ps
```

---

## 🧪 Pruebas del Sistema

### 1. Health Checks
```bash
# Verificar que todos los servicios estén saludables
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3003/health  # Patients Service
curl http://localhost:3002/health  # Appointments Service
curl http://localhost:3000/health  # BFF Service
```

### 2. Documentación Swagger
Abre en tu navegador:
- **Auth API**: http://localhost:3001/api-docs
- **Patients API**: http://localhost:3003/api-docs
- **Appointments API**: http://localhost:3002/api-docs
- **BFF API**: http://localhost:3000/api-docs

### 3. RabbitMQ Management
- **URL**: http://localhost:15672
- **Usuario**: pawpet_user
- **Contraseña**: pawpet_password

---

## 👤 Crear Usuarios de Prueba

### 1. Registrar Administrador
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pawpet.com",
    "password": "admin123",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

### 2. Registrar Veterinario
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vet@pawpet.com",
    "password": "vet123",
    "firstName": "Dr. John",
    "lastName": "Smith",
    "role": "veterinarian"
  }'
```

### 3. Registrar Cliente
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@pawpet.com",
    "password": "client123",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "client"
  }'
```

---

## 🔐 Login y Tokens

### Obtener Token de Administrador
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pawpet.com",
    "password": "admin123"
  }'
```

Guarda el token que devuelve para usarlo en las siguientes pruebas.

---

## 🏥 Probar Pacientes

### Crear Paciente
```bash
curl -X POST http://localhost:3003/api/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "name": "Firulais",
    "nickname": "Firu",
    "speciesId": 1,
    "breedId": 1,
    "gender": "male",
    "birthDate": "2020-05-15",
    "weight": 15.5,
    "tutorId": 1,
    "tutorFirstName": "Jane",
    "tutorLastName": "Doe",
    "tutorEmail": "client@pawpet.com",
    "tutorPhone": "+1234567890"
  }'
```

### Listar Pacientes
```bash
curl -X GET http://localhost:3003/api/patients \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

---

## 📅 Probar Citas

### Crear Cita
```bash
curl -X POST http://localhost:3002/api/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "patientId": 1,
    "tutorId": 1,
    "veterinarianId": 1,
    "appointmentTypeId": 1,
    "scheduledDatetime": "2024-12-25T10:00:00Z",
    "symptoms": "Revisión general anual",
    "urgencyLevel": "normal"
  }'
```

### Listar Citas
```bash
curl -X GET http://localhost:3002/api/appointments \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

---

## 🌉 Probar BFF (API Gateway)

### Login a través del BFF
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pawpet.com",
    "password": "admin123"
  }'
```

### Obtener Pacientes a través del BFF
```bash
curl -X GET http://localhost:3000/api/patients \
  -H "Authorization: Bearer TU_TOKEN_BFF_AQUI"
```

---

## 🐰 Verificar Eventos RabbitMQ

1. Abre http://localhost:15672
2. Login: pawpet_user / pawpet_password
3. Ve a "Exchanges"
4. Verifica que existan:
   - `pawpet.events`
   - `pawpet.notifications`
   - `pawpet.appointments`
   - `pawpet.bff`

---

## 🔍 Solución de Problemas

### Docker no inicia
```bash
# Reiniciar Docker Desktop
# Esperar a que el icono esté verde
# Verificar que WSL 2 esté instalado
```

### Servicios no conectan a la base de datos
```bash
# Verificar logs de los servicios
docker compose logs auth-service
docker compose logs patients-service
docker compose logs appointments-service
```

### Error de conexión RabbitMQ
```bash
# Verificar que RabbitMQ esté corriendo
docker compose logs rabbitmq

# Reiniciar RabbitMQ
docker compose restart rabbitmq
```

---

## 🎯 Flujo Completo de Prueba

1. **Instalar Docker Desktop** ✅
2. **Configurar variables de entorno** ✅
3. **Iniciar servicios** ✅
4. **Crear usuarios de prueba** ✅
5. **Login y obtener tokens** ✅
6. **Crear pacientes** ✅
7. **Crear citas** ✅
8. **Probar BFF** ✅
9. **Verificar RabbitMQ** ✅

---

## 📊 Estado del Sistema después de las Pruebas

- ✅ **4 Microservicios** corriendo
- ✅ **4 Bases de datos PostgreSQL** configuradas
- ✅ **RabbitMQ** con eventos funcionando
- ✅ **BFF** como API Gateway
- ✅ **WebSockets** para actualizaciones en tiempo real
- ✅ **Swagger UI** para documentación
- ✅ **JWT Authentication** funcionando
- ✅ **Event-driven architecture** operativa

¡Listo para usar! 🚀
