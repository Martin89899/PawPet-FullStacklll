# PawPet Project - Prerequisites and Setup Guide

## IMPORTANTE: REQUISITOS OBLIGATORIOS ANTES DE PROBAR

### 1. Docker y Docker Compose

El proyecto requiere Docker Desktop instalado para ejecutar la infraestructura.

#### Windows:
```bash
# Descargar e instalar Docker Desktop for Windows
# https://www.docker.com/products/docker-desktop/

# Después de instalar, reiniciar el equipo
# Iniciar Docker Desktop

# Verificar instalación
docker --version
docker compose version
```

#### **Verificación:**
```bash
# Docker debe estar corriendo
docker info
```

### 🗄️ **2. PostgreSQL (Opcional - Docker lo maneja)**

Si prefieres usar PostgreSQL localmente en lugar de Docker:

#### **Windows:**
```bash
# Descargar PostgreSQL 15+
# https://www.postgresql.org/download/windows/

# O usar Chocolatey
choco install postgresql

# Crear bases de datos manualmente:
CREATE DATABASE pawpet_auth;
CREATE DATABASE pawpet_appointments;
CREATE DATABASE pawpet_patients;
CREATE DATABASE pawpet_billing;

CREATE USER pawpet_user WITH PASSWORD 'pawpet_password';
GRANT ALL PRIVILEGES ON DATABASE pawpet_auth TO pawpet_user;
GRANT ALL PRIVILEGES ON DATABASE pawpet_appointments TO pawpet_user;
GRANT ALL PRIVILEGES ON DATABASE pawpet_patients TO pawpet_user;
GRANT ALL PRIVILEGES ON DATABASE pawpet_billing TO pawpet_user;
```

### 🐰 **3. RabbitMQ (Opcional - Docker lo maneja)**

Si prefieres RabbitMQ local:

#### **Windows:**
```bash
# Descargar RabbitMQ
# https://www.rabbitmq.com/download.html

# O usar Chocolatey
choco install rabbitmq

# Configurar usuario y vhost
rabbitmqctl add_user pawpet_user pawpet_password
rabbitmqctl add_vhost pawpet_vhost
rabbitmqctl set_permissions -p pawpet_vhost pawpet_user ".*" ".*" ".*"
```

### 🟢 **4. Node.js (Para desarrollo local)**

```bash
# Descargar Node.js 18+ LTS
# https://nodejs.org/

# Verificar instalación
node --version
npm --version
```

---

## 🔧 **CONFIGURACIÓN AUTOMÁTICA (Recomendado)**

### **Paso 1: Configurar Variables de Entorno**

```bash
# Desde la raíz del proyecto
cp services/auth-service/.env.example services/auth-service/.env
cp services/patients-service/.env.example services/patients-service/.env
cp services/appointments-service/.env.example services/appointments-service/.env
cp services/billing-service/.env.example services/billing-service/.env
cp services/bff-service/.env.example services/bff-service/.env
```

### **Paso 2: Iniciar con Docker (Más fácil)**

```bash
# Desde la raíz del proyecto
docker compose up -d

# Esperar 30-60 segundos para que todo inicie
docker compose ps

# Verificar logs si hay problemas
docker compose logs -f auth-service
```

### **Paso 3: Verificar Funcionamiento**

```bash
# Health checks
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # Appointments Service  
curl http://localhost:3003/health  # Patients Service
curl http://localhost:3004/health  # Billing Service
curl http://localhost:3000/health  # BFF Service

# Documentación Swagger
# http://localhost:3001/api-docs
# http://localhost:3002/api-docs  
# http://localhost:3003/api-docs
# http://localhost:3004/api-docs
```

---

## 🖥️ **CONFIGURACIÓN MANUAL (Alternativa)**

### **Si Docker no está disponible:**

#### **1. Iniciar PostgreSQL local**
```bash
# Asegurar que PostgreSQL esté corriendo en los puertos:
# - 5432: auth-db
# - 5433: appointments-db  
# - 5434: patients-db
# - 5435: billing-db
```

#### **2. Iniciar RabbitMQ local**
```bash
# RabbitMQ Management: http://localhost:15672
# Usuario: pawpet_user / pawpet_password
```

#### **3. Iniciar servicios individualmente**
```bash
# Abrir múltiples terminales

# Terminal 1: Auth Service
cd services/auth-service
npm run dev

# Terminal 2: Patients Service  
cd services/patients-service
npm run dev

# Terminal 3: Appointments Service
cd services/appointments-service
npm run dev

# Terminal 4: Billing Service
cd services/billing-service
npm run dev

# Terminal 5: BFF Service
cd services/bff-service
npm run dev
```

---

## 🧪 **VERIFICACIÓN COMPLETA**

### **Checklist de Prueba:**

- [ ] **Docker Desktop** instalado y corriendo
- [ ] **Variables de entorno** configuradas (copiar .env.example)
- [ ] **Servicios inician** sin errores críticos
- [ ] **Health checks** responden 200 OK
- [ ] **Swagger docs** accesibles
- [ ] **RabbitMQ Management** accesible en http://localhost:15672
- [ ] **PostgreSQL** bases de datos creadas
- [ ] **Logs** sin errores graves

### **Comandos de Verificación Rápida:**

```bash
# Verificar todos los servicios
curl -s http://localhost:3001/health && echo "✅ Auth OK"
curl -s http://localhost:3002/health && echo "✅ Appointments OK"  
curl -s http://localhost:3003/health && echo "✅ Patients OK"
curl -s http://localhost:3004/health && echo "✅ Billing OK"
curl -s http://localhost:3000/health && echo "✅ BFF OK"

# Verificar Docker
docker compose ps

# Verificar RabbitMQ
curl -u pawpet_user:pawpet_password http://localhost:15672/api/overview
```

---

## 🚨 **PROBLEMAS COMUNES Y SOLUCIONES**

### **Docker no encontrado:**
```bash
# Instalar Docker Desktop for Windows
# Reiniciar el equipo después de instalar
# Iniciar Docker Desktop manualmente
```

### **Puertos ocupados:**
```bash
# Verificar puertos
netstat -tulpn | grep :3001
netstat -tulpn | grep :3002
netstat -tulpn | grep :3003
netstat -tulpn | grep :3004
netstat -tulpn | grep :3000

# Liberar puertos si es necesario
sudo kill -9 <PID>
```

### **Error de conexión a base de datos:**
```bash
# Verificar PostgreSQL
docker compose logs auth-db
docker compose logs patients-db
docker compose logs appointments-db  
docker compose logs billing-db
```

### **Error de RabbitMQ:**
```bash
# Verificar RabbitMQ
docker compose logs rabbitmq
# Acceder a http://localhost:15672 para diagnóstico
```

### **Variables de entorno faltantes:**
```bash
# Asegurar que todos los .env existan
ls services/*/.env

# Si falta alguno, copiar desde .env.example
cp services/auth-service/.env.example services/auth-service/.env
```

---

## 🎯 **ESTADO FINAL ESPERADO**

### **Todo funcionando correctamente cuando:**

```bash
# Docker compose status
docker compose ps
# Debería mostrar todos los servicios como "Up" o "running"

# Health checks funcionando
curl http://localhost:3001/health  # → {"status":"OK",...}
curl http://localhost:3002/health  # → {"status":"OK",...}  
curl http://localhost:3003/health  # → {"status":"OK",...}
curl http://localhost:3004/health  # → {"status":"OK",...}
curl http://localhost:3000/health  # → {"status":"OK",...}

# Sin errores críticos en logs
docker compose logs --tail=10 auth-service
docker compose logs --tail=10 patients-service
docker compose logs --tail=10 appointments-service
docker compose logs --tail=10 billing-service
docker compose logs --tail=10 bff-service
```

---

## 📞 **AYUDA ADICIONAL**

### **Si todo falla:**
1. **Reinstalar Docker Desktop**
2. **Limpiar todo y empezar de nuevo:**
   ```bash
   docker compose down -v
   docker system prune -a
   docker compose up -d
   ```
3. **Verificar espacio en disco**
4. **Reiniciar el equipo**

### **Recursos útiles:**
- [Docker Desktop Documentation](https://docs.docker.com/desktop/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)

---

**🚀 UNA VEZ CONFIGURADO, EL PROYECTO ESTARÁ 100% LISTO PARA PRUEBAS COMPLETAS!**
