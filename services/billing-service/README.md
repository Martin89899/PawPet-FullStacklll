# PawPet Billing Service

Microservicio de facturación y pagos para PawPet Veterinary Management System.

## 🎯 Overview

El **Billing Service** es responsable de gestionar toda la facturación, pagos y procesos financieros del sistema veterinario. Ofrece capacidades completas de facturación electrónica, procesamiento de pagos múltiples métodos, y generación de documentos PDF.

## 🚀 Características Principales

### 💳 **Gestión de Facturas**
- Creación y gestión de facturas con múltiples items
- Cálculo automático de impuestos y totales
- Estados de factura: pending, paid, cancelled, refunded
- Generación automática de números de factura únicos

### 💰 **Procesamiento de Pagos**
- **Stripe Integration**: Pagos online con tarjetas
- **Pagos Manuales**: Efectivo, transferencia, cheques
- Webhooks para confirmación de pagos
- Soporte para reembolsos y devoluciones

### 📄 **Generación de Documentos**
- Facturas en PDF con diseño profesional
- Recibos de pago
- Reportes de facturación
- Exportación de datos

### 🛍️ **Gestión de Productos/Servicios**
- Catálogo de productos y servicios
- Categorización y tipos
- Precios y disponibilidad
- Búsqueda y filtrado

### 📡 **Integración con Microservicios**
- Eventos RabbitMQ para comunicación asíncrona
- Integración con appointments-service
- Integración con patients-service
- Sincronización de datos en tiempo real

## 🏗️ Arquitectura

El servicio implementa una arquitectura limpia con los siguientes patrones:

- **Repository Pattern**: Abstracción de acceso a datos
- **MVC Pattern**: Separación de responsabilidades
- **Service Layer**: Lógica de negocio centralizada
- **Event-Driven Architecture**: Comunicación asíncrona

### 📁 Estructura del Proyecto

```
src/
├── config/              # Configuración centralizada
│   ├── database.js      # Configuración PostgreSQL
│   └── swagger.js       # Documentación API
├── controllers/         # Controladores HTTP
│   └── BillingController.js
├── middleware/          # Middleware Express
│   ├── auth.js          # Autenticación JWT
│   ├── errorHandler.js  # Manejo de errores
│   ├── validateInvoice.js
│   ├── validatePayment.js
│   └── validateProduct.js
├── models/             # Modelos de dominio
│   ├── Invoice.js
│   ├── InvoiceItem.js
│   ├── Payment.js
│   └── Product.js
├── repositories/       # Acceso a datos
│   ├── InvoiceRepository.js
│   ├── PaymentRepository.js
│   └── ProductRepository.js
├── routes/             # Definición API
│   └── billingRoutes.js
├── services/           # Lógica de negocio
│   ├── BillingService.js
│   ├── StripeService.js
│   └── PDFService.js
├── utils/              # Utilidades
│   └── rabbitmq.js     # Comunicación eventos
└── index.js            # Punto de entrada
```

## 🔧 Configuración

### Variables de Entorno

```bash
# Configuración del Servidor
NODE_ENV=development
PORT=3004

# Configuración de Base de Datos
DB_HOST=localhost
DB_PORT=5435
DB_NAME=pawpet_billing
DB_USER=pawpet_user
DB_PASSWORD=pawpet_password

# Configuración de RabbitMQ
RABBITMQ_URL=amqp://pawpet_user:pawpet_password@localhost:5672/pawpet_vhost

# Configuración de Stripe
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Configuración de Facturación
TAX_RATE=0.0000
CURRENCY=USD

# Configuración de JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Configuración de CORS
CORS_ORIGIN=http://localhost:3101,http://localhost:3102,http://localhost:3103
```

### Base de Datos

El servicio utiliza PostgreSQL con las siguientes tablas principales:

- **invoices**: Facturas principales
- **invoice_items**: Items/detalles de facturas
- **payments**: Registros de pagos
- **products**: Catálogo de productos/servicios
- **billing_config**: Configuración del sistema

## 📡 API Documentation

### Endpoints Principales

#### **Facturas**
- `POST /api/billing/invoices` - Crear factura
- `GET /api/billing/invoices` - Listar facturas
- `GET /api/billing/invoices/:id` - Obtener factura
- `PUT /api/billing/invoices/:id/cancel` - Cancelar factura
- `GET /api/billing/invoices/:id/pdf` - Generar PDF

#### **Pagos**
- `POST /api/billing/invoices/:id/payment/stripe` - Pago Stripe
- `POST /api/billing/invoices/:id/payment/manual` - Pago manual
- `GET /api/billing/payments` - Listar pagos
- `POST /api/billing/webhook/stripe` - Webhook Stripe

#### **Productos**
- `GET /api/billing/products` - Listar productos
- `POST /api/billing/products` - Crear producto

#### **Reportes**
- `GET /api/billing/stats` - Estadísticas
- `GET /api/billing/report` - Reporte PDF
- `GET /api/billing/overdue` - Facturas vencidas

### Documentación Interactiva

La API cuenta con documentación Swagger/OpenAPI completa:
- **URL**: http://localhost:3004/api-docs
- **Esquemas**: Todos los modelos documentados
- **Ejemplos**: Request/response samples

## 🔄 Eventos RabbitMQ

### Eventos Publicados

```javascript
billing.invoice.created
billing.invoice.cancelled
billing.invoice.reminder
billing.payment.completed
billing.payment.failed
billing.product.created
```

### Eventos Suscritos

```javascript
appointments.created      // Para facturación automática
appointments.completed   // Para generar facturas
appointments.cancelled    // Para cancelar facturas
patient.created          // Registro de pacientes
patient.updated          // Actualización de datos
```

## 🧪 Testing

### Estructura de Tests

```bash
tests/
├── unit/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   └── models/
├── integration/
│   ├── api/
│   └── database/
└── e2e/
    └── billing-flows/
```

### Ejecutar Tests

```bash
# Tests unitarios
npm test

# Tests con coverage
npm run test:coverage

# Tests en modo watch
npm run test:watch
```

## 🚀 Despliegue

### Desarrollo Local

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Iniciar servicio
npm run dev
```

### Docker

```bash
# Construir imagen
docker build -t pawpet-billing-service .

# Ejecutar contenedor
docker run -p 3004:3004 pawpet-billing-service
```

### Docker Compose

```bash
# Incluir en docker-compose.yml del proyecto
docker-compose up billing-service
```

## 📊 Monitoreo y Logging

### Logs Estructurados

El servicio implementa logging estructurado con información contextual:

```javascript
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "service": "billing-service",
  "message": "Invoice created successfully",
  "data": {
    "invoiceId": 123,
    "invoiceNumber": "INV000123",
    "amount": 150.00
  }
}
```

### Métricas

- **Request Rate**: Tasa de solicitudes por endpoint
- **Response Time**: Tiempo de respuesta promedio
- **Error Rate**: Tasa de errores por tipo
- **Database Performance**: Tiempos de consulta
- **Payment Processing**: Métricas de Stripe

## 🔒 Seguridad

### Autenticación

- JWT tokens con validación centralizada
- Role-based access control (RBAC)
- Permission-based fine-grained control

### Validación

- Input validation con Joi schemas
- Sanitización de datos
- Prevención de inyección SQL

### Encriptación

- Passwords encriptados con bcrypt
- Comunicación HTTPS obligatoria
- Variables de entorno sensibles

## 🐛 Troubleshooting

### Problemas Comunes

#### **Conexión a Base de Datos**
```bash
Error: Connection refused
Solución: Verificar que PostgreSQL esté corriendo en puerto 5435
```

#### **Stripe Webhooks**
```bash
Error: Invalid webhook signature
Solución: Verificar STRIPE_WEBHOOK_SECRET en variables de entorno
```

#### **RabbitMQ Connection**
```bash
Error: AMQP connection failed
Solución: Verificar servicio RabbitMQ y credenciales
```

### Debug Mode

```bash
# Habilitar debug logs
DEBUG=billing-service:* npm run dev
```

## 📚 Documentación Adicional

- [Arquitectura Detallada](./ARCHITECTURE.md)
- [Reporte de Calidad](./CODE_QUALITY_REPORT.md)
- [Guía de Contribución](../../CONTRIBUTING.md)
- [Documentación del Proyecto](../../README.md)

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama de características
3. Implementar cambios con tests
4. Submit Pull Request

## 📄 Licencia

MIT License - Ver [LICENSE](../../LICENSE) para detalles.

---

**PawPet Veterinary Management** - 🐾 Cuidando de tus mascotas con tecnología

**Desarrollado por PawPet Team** - Microservicio de facturación producción-ready
