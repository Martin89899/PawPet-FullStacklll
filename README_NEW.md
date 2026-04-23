# PawPet Veterinary Management System

Plataforma integral de gestión veterinaria diseñada para cerrar la brecha tecnológica en la industria, unificando procesos clínicos, operativos y financieros en un único ecosistema digital basado en microservicios.

## 1. Contexto y Objetivos de Negocio

### Problemática Identificada

La industria veterinaria enfrenta una brecha tecnológica profunda. La gran mayoría de clínicas y hospitales veterinarios de mediana escala operan con herramientas fragmentadas o analógicas, generando tres categorías críticas de problemas:

**Riesgo Clínico y Legal**
La falta de un historial clínico centralizado compromete la trazabilidad del paciente. En el caso de fármacos controlados (ketamina, morfina), la ausencia de registros con marcas de tiempo puede derivar en consecuencias legales graves para el establecimiento.

**Fugas Financieras**
En entornos de alta presión como urgencias o cirugías, los procedimientos e insumos consumidos frecuentemente no llegan a registrarse en el punto de venta. El quirófano y la recepción operan como islas de información: lo que no se comunica, no se cobra.

**Seguimiento Deficiente de Pacientes**
La ausencia de recordatorios automatizados impide dar seguimiento efectivo a tratamientos crónicos, calendarios de vacunación y desparasitaciones, afectando tanto la salud animal como la fidelización del cliente.

### Objetivos de Negocio

El objetivo general es desarrollar una plataforma web de gestión veterinaria integral que unifique los procesos clínicos, operativos y financieros en un único ecosistema digital, seguro y escalable.

**Objetivos Específicos:**
- Implementar un sistema RBAC que adapte la interfaz y los permisos según el perfil del usuario
- Diseñar un módulo clínico con historial tipificado por tipo de consulta y registro de constantes vitales
- Desarrollar un sistema de agenda con actualización en tiempo real mediante WebSockets
- Construir un módulo de farmacia e inventario con trazabilidad por lote y descuento automático
- Integrar un Punto de Venta (POS) que unifique los servicios clínicos pendientes con la venta de productos
- Implementar notificaciones automáticas para tutores sobre hospitalización y tratamientos

## 3. Arquitectura Orientada a Microservicios

El sistema adopta una Arquitectura de Microservicios con el objetivo de construir un sistema altamente escalable, de alta disponibilidad, flexibilidad y mantenible. Este enfoque permite segmentar la plataforma en múltiples microservicios independientes, cada uno enfocado en una función específica.

### Ventajas de la Arquitectura

**Escalabilidad Independiente**
Cada microservicio puede adaptarse a la demanda sin necesidad de modificar todo el sistema, permitiendo optimizar recursos según las necesidades específicas de cada dominio.

**Modularidad y Mantenimiento**
La separación por dominios simplifica realizar modificaciones o actualizaciones en los diferentes módulos del sistema sin afectar a otros componentes.

**Resiliencia y Tolerancia a Fallos**
El fallo completo de un microservicio no degrada la funcionalidad de los demás. Por ejemplo, el fallo del servicio de notificaciones no impide registrar consultas.

### Estructura de Microservicios

#### Capa de API Gateway
Punto de entrada único a la plataforma que gestiona la seguridad mediante validación de tokens JWT, aplica las reglas de RBAC, enruta peticiones a los microservicios internos y controla el tráfico mediante Rate Limiting.

#### Dominios de Negocio

**A. Dominio de Identidad y Acceso (MS-Auth)**
- Responsabilidad: Autenticación, gestión de sesiones, emisión de JWT y control de acceso basado en roles
- APIs Críticas: POST /auth/login, POST /users/register, GET /users/profile

**B. Dominio Clínico (MS-Patient)**
- Responsabilidad: Registro de pacientes, historial clínico inmutable tipificado y evolución
- APIs Críticas: POST /patients, GET /patients/{id}/history, POST /patients/{id}/consultation

**C. Dominio de Agenda (MS-Agenda)**
- Responsabilidad: Gestión de citas, transición de estados y emisión de eventos en tiempo real
- APIs Críticas: POST /appointments, PATCH /appointments/{id}/status, WS /agenda/live

**D. Dominio de Hospitalización (MS-Hospitalization)**
- Responsabilidad: Hoja de monitoreo de internados, registro de aplicaciones de fármacos con trazabilidad completa
- APIs Críticas: POST /hospitalization/{id}/vital-signs, POST /hospitalization/{id}/medication

**E. Dominio de Inventario y Farmacia (MS-InvFarm)**
- Responsabilidad: Control de existencias por lote, alertas de vencimiento y descuento automático por uso clínico
- APIs Críticas: GET /inventory, PATCH /inventory/commit, POST /inventory/adjust

**F. Dominio de Punto de Venta (MS-Billing & POS)**
- Responsabilidad: Punto de venta, generación de cargos desde módulos clínicos e integración con inventario
- APIs Críticas: GET /billing/{tutorId}/pending, POST /billing/checkout

**G. Dominio de Notificaciones (MS-Notifications)**
- Responsabilidad: Comunicación con tutores mediante canales externos, opera principalmente de forma asíncrona
- APIs Críticas: POST /notifications/send, escucha eventos de RabbitMQ

## 5. Punto de Venta (POS) e Integridad Transaccional

### Orquestación de Cargo Automático

El sistema implementa una orquestación inteligente que garantiza la integridad transaccional completa. Al registrar la aplicación de un insumo clínico:

1. **Descuento Automático de Inventario**: El sistema descuenta automáticamente del lote activo en el módulo de farmacia
2. **Generación de Cargo Pendiente**: Simultáneamente genera un cargo pendiente en la cuenta del tutor
3. **Trazabilidad Completa**: Mantiene un registro inmutable de toda la transacción para auditoría

### POS Unificado

El Punto de Venta consolida en una sola pantalla dos flujos críticos:

**Servicios Clínicos Pendientes de Cobro**
- Procedimientos realizados en consulta
- Aplicaciones de fármacos y medicamentos
- Hospitalización y monitoreo
- Estudios diagnósticos

**Productos de Retail**
- Alimentos y accesorios
- Medicamentos para venta
- Productos de higiene y cuidado

### Integridad Transaccional

El sistema garantiza que ningún servicio clínico quede sin cobrar mediante:

**Validación en Tiempo Real**
- Verificación automática de servicios realizados vs. cargos generados
- Alertas de discrepancias para el personal administrativo

**Conciliación Automática**
- Cruce nightly entre procedimientos clínicos y facturación
- Generación automática de cargos faltantes

**Control de Acceso**
- Roles específicos para modificar cargos y realizar ajustes
- Auditoría completa de todas las modificaciones

## Estado Actual del Proyecto

### Microservicios Completados (75%)

**MS-Auth Service (100%)**
- Arquitectura MVC + Repository Pattern
- Autenticación JWT con refresh tokens
- Control de acceso por roles (RBAC)
- Tests unitarios con Jest (80% cobertura)
- Swagger UI completa y JSDoc documentación

**MS-Patient Service (100%)**
- Arquitectura MVC + Repository Pattern
- Dominio clínico completo (tutores, pacientes, historial)
- Vacunaciones, desparasitaciones, alergias
- Comunicación RabbitMQ para eventos clínicos
- Swagger UI completa y JSDoc documentación

**MS-Billing Service (100%)**
- Arquitectura MVC + Repository Pattern
- Gestión completa de facturación y pagos
- Integración Stripe para pagos online
- Generación de PDFs y reportes
- Eventos RabbitMQ para sincronización
- Swagger UI completa y documentación técnica

### Microservicios en Desarrollo (25%)

- MS-Agenda Service (0%)
- MS-Hospitalization (0%)
- MS-InvFarm (0%)
- MS-Notifications (0%)
- Frontend Apps (0%)

## Instalación y Despliegue

### Prerrequisitos
- Docker y Docker Compose
- Node.js 18+ (para desarrollo local)
- Git

### Instalación Rápida

1. Clonar el repositorio:
```bash
git clone https://github.com/Martin89899/PawPet-FullStacklll.git
cd PawPet-FullStacklll
```

2. Configurar variables de entorno:
```bash
# Copiar archivos de ejemplo para cada microservicio
cp services/auth-service/.env.example services/auth-service/.env
cp services/appointments-service/.env.example services/appointments-service/.env
cp services/patients-service/.env.example services/patients-service/.env
cp services/billing-service/.env.example services/billing-service/.env
```

3. Iniciar todos los servicios:
```bash
docker-compose up -d
```

### Acceso a los Servicios

#### APIs Backend
- **Auth Service**: http://localhost:3001 (Swagger: http://localhost:3001/api-docs)
- **Patients Service**: http://localhost:3003 (Swagger: http://localhost:3003/api-docs)
- **Billing Service**: http://localhost:3004 (Swagger: http://localhost:3004/api-docs)

#### Infraestructura
- **RabbitMQ Management**: http://localhost:15672
  - Usuario: pawpet_user
  - Contraseña: pawpet_password

## Tecnologías

### Backend
- Node.js con Express.js
- PostgreSQL como base de datos relacional
- RabbitMQ para comunicación asíncrona
- JWT para autenticación
- Joi para validación de datos
- Jest para testing
- Swagger para documentación API

### Infraestructura
- Docker para contenerización
- Docker Compose para orquestación
- Nginx como servidor web y proxy inverso

## Contribución

1. Fork del proyecto
2. Crear rama de características
3. Commit de cambios con mensajes claros
4. Push a la rama
5. Abrir Pull Request

## Licencia

Este proyecto está licenciado bajo la Licencia MIT.

---

**PawPet Veterinary Management** - Cuidando de tus mascotas con tecnología y eficiencia operativa
**Desarrollado por Martin89899** - 75% completo - 3/4 microservicios listos para producción
