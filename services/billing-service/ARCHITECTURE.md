# Billing Service - Arquitectura y Patrones de Diseño

## 🏗️ Arquitectura General

El **Billing Service** implementa una arquitectura de microservicios siguiendo patrones de diseño establecidos para garantizar escalabilidad, mantenibilidad y consistencia con el resto del sistema PawPet.

### 📁 Estructura de Carpetas (Pattern-Based)

```
src/
├── config/          # 📋 Configuración centralizada
│   ├── database.js  # Configuración de base de datos PostgreSQL
│   └── swagger.js   # Configuración de documentación API
├── controllers/      # 🎮 Controladores MVC
│   └── BillingController.js  # Manejo de requests HTTP
├── middleware/       # 🔧 Middleware de Express
│   ├── auth.js              # Autenticación JWT
│   ├── errorHandler.js      # Manejo centralizado de errores
│   ├── validateInvoice.js   # Validación Joi para facturas
│   ├── validatePayment.js   # Validación Joi para pagos
│   └── validateProduct.js   # Validación Joi para productos
├── models/          # 📊 Modelos de datos (Domain Models)
│   ├── Invoice.js           # Modelo de Factura
│   ├── InvoiceItem.js       # Modelo de Item de Factura
│   ├── Payment.js           # Modelo de Pago
│   └── Product.js           # Modelo de Producto/Servicio
├── repositories/    # 🗄️ Data Access Layer (Repository Pattern)
│   ├── InvoiceRepository.js # Repositorio de Facturas
│   ├── PaymentRepository.js # Repositorio de Pagos
│   └── ProductRepository.js # Repositorio de Productos
├── routes/          # 🛣️ Definición de rutas API
│   └── billingRoutes.js     # Rutas RESTful con Swagger
├── services/        # ⚙️ Business Logic Layer
│   ├── BillingService.js    # Lógica de negocio principal
│   ├── StripeService.js     # Integración Stripe
│   └── PDFService.js       # Generación de PDFs
├── utils/           # 🛠️ Utilidades y helpers
│   └── rabbitmq.js          # Comunicación asíncrona
└── index.js         # 🚀 Punto de entrada del servicio
```

## 🎯 Patrones de Diseño Implementados

### 1. **Repository Pattern**
- **Propósito**: Abstraer el acceso a datos y desacoplar la lógica de negocio de la persistencia
- **Implementación**: `InvoiceRepository`, `PaymentRepository`, `ProductRepository`
- **Ventajas**:
  - Testabilidad (facilita mocking)
  - Cambio de tecnología de persistencia sin afectar lógica de negocio
  - Centralización de consultas SQL

### 2. **MVC (Model-View-Controller) Pattern**
- **Model**: Clases de dominio (`Invoice`, `Payment`, `Product`)
- **View**: Respuestas JSON y PDFs generados
- **Controller**: `BillingController` maneja requests HTTP
- **Ventajas**: Separación de responsabilidades clara

### 3. **Service Layer Pattern**
- **Implementación**: `BillingService`, `StripeService`, `PDFService`
- **Propósito**: Encapsular lógica de negocio compleja
- **Ventajas**:
  - Reutilización de lógica
  - Transacciones controladas
  - Facilita testing unitario

### 4. **Dependency Injection Pattern**
- **Implementación**: Inyección de dependencias a través de constructors
- **Ventajas**: 
  - Mejor testabilidad
  - Desacoplamiento entre componentes
  - Configuración flexible

### 5. **Middleware Pattern (Express)**
- **Implementación**: `auth.js`, `errorHandler.js`, validaciones
- **Propósito**: Procesamiento de requests en pipeline
- **Ventajas**: Reutilización y orden claro de procesamiento

### 6. **Observer Pattern (Event-Driven)**
- **Implementación**: RabbitMQ con eventos `billing.*`
- **Propósito**: Comunicación asíncrona entre microservicios
- **Ventajas**:
  - Desacoplamiento de servicios
  - Escalabilidad horizontal
  - Resiliencia del sistema

### 7. **Factory Pattern (Implícito)**
- **Implementación**: Métodos estáticos `fromDatabase()` en modelos
- **Propósito**: Creación de instancias desde diferentes fuentes
- **Ventajas**: Centralización de lógica de construcción

### 8. **Strategy Pattern (Stripe Integration)**
- **Implementación**: `StripeService` con diferentes métodos de pago
- **Propósito**: Selección de algoritmos de pago en runtime
- **Ventajas**: Fácil adición de nuevos métodos de pago

## 🔧 Principios SOLID Aplicados

### **S - Single Responsibility Principle**
- Cada clase tiene una única responsabilidad:
  - `InvoiceRepository`: Solo acceso a datos de facturas
  - `PDFService`: Solo generación de PDFs
  - `BillingController`: Solo manejo de HTTP requests

### **O - Open/Closed Principle**
- Extensible sin modificación:
  - Nuevos métodos de pago vía `StripeService`
  - Nuevos eventos RabbitMQ sin modificar código existente
  - Nuevos validadores vía middleware

### **L - Liskov Substitution Principle**
- Implementaciones consistentes de interfaces
- Repositories intercambiables si mantienen contrato

### **I - Interface Segregation Principle**
- Interfaces específicas y pequeñas
- Middleware especializado por función

### **D - Dependency Inversion Principle**
- Dependencias inyectadas, no hardcodeadas
- Abstracciones sobre implementaciones concretas

## 🔄 Flujo de Datos (Request Lifecycle)

```
HTTP Request
    ↓
Middleware Pipeline
├── auth.js (JWT validation)
├── validate*.js (Joi validation)
└── errorHandler.js (error catching)
    ↓
Controller Layer (BillingController)
    ↓
Service Layer (BillingService)
    ├── Business Logic
    ├── Transaction Management
    └── Event Publishing (RabbitMQ)
    ↓
Repository Layer (Database Access)
    ↓
Database (PostgreSQL)
```

## 📡 Arquitectura de Comunicación

### **Síncrona (REST APIs)**
- Client → Billing Service → Database
- Billing Service → Auth Service (validación)

### **Asíncrona (Event-Driven)**
```
Billing Service → RabbitMQ → billing.events.exchange
                                    ↓
                            [appointments.events.exchange]
                            [patients.events.exchange]
```

### **Eventos Publicados**
- `billing.invoice.created`
- `billing.invoice.cancelled`
- `billing.payment.completed`
- `billing.product.created`

### **Eventos Suscritos**
- `appointments.created`
- `appointments.completed`
- `appointments.cancelled`
- `patient.created`
- `patient.updated`

## 🛡️ Patrones de Seguridad

### **Authentication & Authorization**
- JWT tokens con middleware `auth.js`
- Role-based access control
- Permission-based fine-grained control

### **Input Validation**
- Joi schemas en middleware dedicado
- Sanitización de datos de entrada
- Validación de tipos y formatos

### **Error Handling**
- Centralizado en `errorHandler.js`
- Información sensible oculta en producción
- Logging estructurado

## 📊 Gestión de Estado

### **Database State**
- PostgreSQL ACID transactions
- Connection pooling
- Migrations automáticas

### **Application State**
- Stateless REST API
- Session management via JWT
- Event-driven state synchronization

## 🧪 Testability

### **Unit Testing**
- Mock de repositories
- Test de servicios aislados
- Validaciones de negocio

### **Integration Testing**
- API endpoints completos
- Database transactions
- Event publishing

### **E2E Testing**
- Flujo completo de facturación
- Integración con Stripe (sandbox)
- Comunicación RabbitMQ

## 📈 Escalabilidad

### **Horizontal Scaling**
- Stateless design permite múltiples instancias
- Load balancing via Nginx
- Database read replicas

### **Vertical Scaling**
- Connection pooling optimizado
- Memory-efficient PDF generation
- Async event processing

## 🔍 Calidad de Código

### **Code Organization**
- Consistent naming conventions
- Clear separation of concerns
- Comprehensive JSDoc documentation

### **Error Handling**
- Centralized error management
- Proper HTTP status codes
- Structured error responses

### **Performance**
- Database query optimization
- Efficient PDF generation
- Async event processing

## 🎯 Consistencia con el Proyecto

El **Billing Service** sigue exactamente los mismos patrones y convenciones que:

- ✅ **Auth Service**: MVC + Repository Pattern
- ✅ **Patients Service**: Event-driven architecture
- ✅ **Appointments Service**: Middleware pipeline
- ✅ **BFF Service**: API Gateway pattern

Esta consistencia garantiza:
- Mantenimiento simplificado
- Onboarding rápido de nuevos desarrolladores
- Reutilización de componentes y patrones
- Calidad uniforme en todo el sistema

---

**Conclusión**: El Billing Service implementa una arquitectura robusta, escalable y mantenible que sigue las mejores prácticas de la industria y mantiene consistencia perfecta con el resto del sistema PawPet.
