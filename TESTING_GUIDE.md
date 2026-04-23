# 🧪 PawPet Testing Guide - Guía Completa de Pruebas

## 🎯 **Estado Actual del Proyecto para Pruebas**

### ✅ **Servicios Completos (75%)**
- **auth-service** (puerto 3001) ✅ Autenticación y autorización
- **patients-service** (puerto 3003) ✅ Gestión de pacientes clínicos  
- **appointments-service** (puerto 3002) ✅ Gestión de citas y calendarios
- **billing-service** (puerto 3004) ✅ Facturación y pagos
- **bff-service** (puerto 3000) ✅ API Gateway

### 🔄 **Pendiente (25%)**
- Frontend Applications (React apps)

---

## 📋 **CHECKLIST COMPLETA PARA PRUEBAS**

### 🔧 **1. Configuración de Variables de Entorno**

#### ✅ **Auth Service** - `.env.example` existe
```bash
cp services/auth-service/.env.example services/auth-service/.env
```

#### ✅ **Patients Service** - `.env.example` existe  
```bash
cp services/patients-service/.env.example services/patients-service/.env
```

#### ✅ **Appointments Service** - `.env.example` existe
```bash
cp services/appointments-service/.env.example services/appointments-service/.env
```

#### ✅ **Billing Service** - `.env.example` existe
```bash
cp services/billing-service/.env.example services/billing-service/.env
```

#### ✅ **BFF Service** - `.env.example` existe
```bash
cp services/bff-service/.env.example services/bff-service/.env
```

### 🗄️ **2. Configuración de Base de Datos PostgreSQL**

El proyecto usa PostgreSQL con las siguientes bases de datos:
- **auth-db**: localhost:5432 (pawpet_auth)
- **appointments-db**: localhost:5433 (pawpet_appointments)  
- **patients-db**: localhost:5434 (pawpet_patients)
- **billing-db**: localhost:5435 (pawpet_billing)

#### **Requisitos PostgreSQL:**
```bash
# Asegurar que PostgreSQL esté corriendo
# Crear bases de datos si no existen:
CREATE DATABASE pawpet_auth;
CREATE DATABASE pawpet_appointments;
CREATE DATABASE pawpet_patients;  
CREATE DATABASE pawpet_billing;

# Crear usuario pawpet_user con contraseña pawpet_password
CREATE USER pawpet_user WITH PASSWORD 'pawpet_password';
GRANT ALL PRIVILEGES ON DATABASE pawpet_auth TO pawpet_user;
GRANT ALL PRIVILEGES ON DATABASE pawpet_appointments TO pawpet_user;
GRANT ALL PRIVILEGES ON DATABASE pawpet_patients TO pawpet_user;
GRANT ALL PRIVILEGES ON DATABASE pawpet_billing TO pawpet_user;
```

### 🐰 **3. Configuración de RabbitMQ**

#### **Requisitos RabbitMQ:**
```bash
# RabbitMQ debe estar corriendo en localhost:5672
# Crear usuario pawpet_user con contraseña pawpet_password
# Crear vhost pawpet_vhost
```

#### **Verificación:**
```bash
# Verificar conexión
rabbitmqctl status
rabbitmqctl list_users
rabbitmqctl list_vhosts
```

### 📦 **4. Instalación de Dependencias**

#### **Para cada servicio:**
```bash
# Auth Service
cd services/auth-service
npm install

# Patients Service  
cd ../patients-service
npm install

# Appointments Service
cd ../appointments-service
npm install

# Billing Service
cd ../billing-service
npm install

# BFF Service
cd ../bff-service
npm install
```

---

## 🚀 **MÉTODOS DE PRUEBA**

### **Opción A: Docker Compose (Recomendado)**

#### **1. Iniciar todos los servicios:**
```bash
# Desde la raíz del proyecto
docker-compose up -d
```

#### **2. Verificar estado:**
```bash
docker-compose ps
```

#### **3. Verificar logs:**
```bash
docker-compose logs -f auth-service
docker-compose logs -f patients-service
docker-compose logs -f appointments-service
docker-compose logs -f billing-service
docker-compose logs -f bff-service
```

### **Opción B: Desarrollo Local**

#### **1. Iniciar infraestructura:**
```bash
# Iniciar PostgreSQL y RabbitMQ
docker-compose up -d auth-db appointments-db patients-db billing-db rabbitmq redis
```

#### **2. Iniciar servicios individualmente:**
```bash
# Auth Service
cd services/auth-service
npm run dev

# Patients Service (en otra terminal)
cd services/patients-service  
npm run dev

# Appointments Service (en otra terminal)
cd services/appointments-service
npm run dev

# Billing Service (en otra terminal)
cd services/billing-service
npm run dev

# BFF Service (en otra terminal)
cd services/bff-service
npm run dev
```

---

## 🧪 **TESTING CHECKLIST**

### ✅ **1. Health Checks**

Verificar que cada servicio responda al health check:
```bash
# Auth Service
curl http://localhost:3001/health

# Patients Service
curl http://localhost:3003/health

# Appointments Service  
curl http://localhost:3002/health

# Billing Service
curl http://localhost:3004/health

# BFF Service
curl http://localhost:3000/health
```

### ✅ **2. Documentación Swagger**

Acceder a la documentación de cada API:
```bash
# Auth Service
http://localhost:3001/api-docs

# Patients Service
http://localhost:3003/api-docs

# Appointments Service
http://localhost:3002/api-docs

# Billing Service
http://localhost:3004/api-docs
```

### ✅ **3. Endpoints Principales**

#### **Auth Service:**
```bash
# Registro
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

#### **Patients Service:**
```bash
# Crear paciente (necesita token JWT)
curl -X POST http://localhost:3003/api/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"name":"Fido","species":"dog","breed":"Labrador","tutorId":1}'
```

#### **Appointments Service:**
```bash
# Crear cita (necesita token JWT)
curl -X POST http://localhost:3002/api/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"patientId":1,"veterinarianId":1,"dateTime":"2024-01-15T10:00:00Z"}'
```

#### **Billing Service:**
```bash
# Crear factura (necesita token JWT)
curl -X POST http://localhost:3004/api/billing/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"patientId":1,"clientId":1,"items":[{"description":"Consulta","quantity":1,"unitPrice":50}]}'
```

### ✅ **4. Conectividad entre Servicios**

#### **Verificar RabbitMQ:**
```bash
# Acceder a RabbitMQ Management
http://localhost:15672
# Usuario: pawpet_user
# Contraseña: pawpet_password

# Verificar exchanges y colas
# Deberías ver exchanges como: billing.events, patients.events, appointments.events
```

#### **Verificar BFF Gateway:**
```bash
# Probar endpoint del BFF que delega a otros servicios
curl http://localhost:3000/api/health
```

---

## 🔍 **VERIFICACIÓN DE FUNCIONALIDAD**

### **1. Flujo Completo de Usuario:**
1. **Registro** en auth-service
2. **Login** y obtención de JWT
3. **Creación de paciente** en patients-service
4. **Agendamiento de cita** en appointments-service  
5. **Generación de factura** en billing-service
6. **Verificación de eventos** RabbitMQ

### **2. Integración RabbitMQ:**
- **appointments.completed** → billing.invoice.created
- **patient.created** → billing.patient.registered
- **user.created** → patients.user.acknowledged

### **3. Base de Datos:**
- Verificar tablas creadas automáticamente
- Verificar datos persistiendo correctamente
- Verificar relaciones entre tablas

---

## 🚨 **TROUBLESHOOTING COMÚN**

### **Problemas de Conexión:**
```bash
# Verificar si los puertos están ocupados
netstat -tulpn | grep :3001
netstat -tulpn | grep :3002
netstat -tulpn | grep :3003
netstat -tulpn | grep :3004
netstat -tulpn | grep :3000

# Liberar puertos si es necesario
sudo kill -9 <PID>
```

### **Problemas de Base de Datos:**
```bash
# Verificar conexión PostgreSQL
psql -h localhost -p 5432 -U pawpet_user -d pawpet_auth

# Verificar bases de datos
\l

# Verificar tablas
\dt
```

### **Problemas de RabbitMQ:**
```bash
# Verificar estado de RabbitMQ
rabbitmqctl status

# Reiniciar RabbitMQ si es necesario
sudo systemctl restart rabbitmq-server
```

### **Problemas de Dependencias:**
```bash
# Limpiar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 **MÉTRICAS DE ÉXITO**

### **✅ Prueba Exitosa Cuando:**
- [ ] Todos los servicios responden a health checks
- [ ] Swagger documentation accesible para todos
- [ ] Endpoints principales funcionan con JWT
- [ ] RabbitMQ events se publican y consumen
- [ ] Base de datos persiste datos correctamente
- [ ] BFF Gateway comunica con todos los servicios
- [ ] No hay errores críticos en los logs

### **🎯 Ready for Production Cuando:**
- [ ] Todos los tests unitarios pasan
- [ ] Integración entre servicios funciona
- [ ] Performance es aceptable
- [ ] Logs no muestran errores
- [ ] Documentación está completa

---

## 🚀 **COMANDOS RÁPIDOS**

```bash
# Setup completo para pruebas
git pull origin main
cp services/auth-service/.env.example services/auth-service/.env
cp services/patients-service/.env.example services/patients-service/.env
cp services/appointments-service/.env.example services/appointments-service/.env
cp services/billing-service/.env.example services/billing-service/.env
cp services/bff-service/.env.example services/bff-service/.env

# Iniciar todo con Docker
docker-compose up -d

# Verificar estado
docker-compose ps

# Verificar health checks
curl http://localhost:3001/health && curl http://localhost:3002/health && curl http://localhost:3003/health && curl http://localhost:3004/health && curl http://localhost:3000/health
```

---

**🎯 ESTADO LISTO PARA PRUEBAS: 75% del proyecto completo con todos los microservicios backend funcionando y listos para testing completo!**
