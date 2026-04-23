const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PawPet Appointments Service API',
      version: '1.0.0',
      description: 'Microservicio de gestión de citas y calendarios para PawPet Veterinary Management',
      contact: {
        name: 'PawPet Team',
        email: 'support@pawpet.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Servidor de desarrollo'
      },
      {
        url: 'https://api.pawpet.com',
        description: 'Servidor de producción'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Appointment: {
          type: 'object',
          required: ['patientId', 'tutorId', 'scheduledDatetime', 'appointmentTypeId'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID de la cita'
            },
            uuid: {
              type: 'string',
              format: 'uuid',
              description: 'UUID único de la cita'
            },
            patientId: {
              type: 'integer',
              description: 'ID del paciente'
            },
            tutorId: {
              type: 'integer',
              description: 'ID del tutor'
            },
            veterinarianId: {
              type: 'integer',
              description: 'ID del veterinario'
            },
            appointmentTypeId: {
              type: 'integer',
              description: 'ID del tipo de cita'
            },
            status: {
              type: 'string',
              enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'],
              description: 'Estado de la cita'
            },
            scheduledDatetime: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha y hora programada'
            },
            estimatedDurationMinutes: {
              type: 'integer',
              description: 'Duración estimada en minutos'
            },
            actualDurationMinutes: {
              type: 'integer',
              description: 'Duración real en minutos'
            },
            notes: {
              type: 'string',
              description: 'Notas adicionales'
            },
            symptoms: {
              type: 'string',
              description: 'Síntomas del paciente'
            },
            urgencyLevel: {
              type: 'string',
              enum: ['low', 'normal', 'high', 'emergency'],
              description: 'Nivel de urgencia'
            },
            price: {
              type: 'number',
              format: 'decimal',
              description: 'Precio de la cita'
            },
            isPaid: {
              type: 'boolean',
              description: 'Si la cita está pagada'
            },
            paymentMethod: {
              type: 'string',
              description: 'Método de pago'
            },
            reminderSent: {
              type: 'boolean',
              description: 'Si se envió recordatorio'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de actualización'
            }
          }
        },
        AppointmentType: {
          type: 'object',
          required: ['name', 'durationMinutes', 'price'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID del tipo de cita'
            },
            name: {
              type: 'string',
              description: 'Nombre del tipo de cita'
            },
            description: {
              type: 'string',
              description: 'Descripción del tipo de cita'
            },
            durationMinutes: {
              type: 'integer',
              description: 'Duración en minutos'
            },
            price: {
              type: 'number',
              format: 'decimal',
              description: 'Precio'
            },
            color: {
              type: 'string',
              description: 'Color hexadecimal para el calendario'
            },
            requiresVeterinarian: {
              type: 'boolean',
              description: 'Si requiere veterinario asignado'
            },
            isActive: {
              type: 'boolean',
              description: 'Si está activo'
            }
          }
        },
        Veterinarian: {
          type: 'object',
          required: ['firstName', 'lastName'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID del veterinario'
            },
            userId: {
              type: 'integer',
              description: 'ID del usuario asociado'
            },
            firstName: {
              type: 'string',
              description: 'Nombre del veterinario'
            },
            lastName: {
              type: 'string',
              description: 'Apellido del veterinario'
            },
            licenseNumber: {
              type: 'string',
              description: 'Número de licencia'
            },
            specialization: {
              type: 'string',
              description: 'Especialización'
            },
            phone: {
              type: 'string',
              description: 'Teléfono'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Correo electrónico'
            },
            isActive: {
              type: 'boolean',
              description: 'Si está activo'
            },
            workingHours: {
              type: 'object',
              description: 'Horarios de trabajo'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación'
            }
          }
        },
        AvailabilitySlot: {
          type: 'object',
          required: ['veterinarianId', 'startDatetime', 'endDatetime'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID del slot'
            },
            veterinarianId: {
              type: 'integer',
              description: 'ID del veterinario'
            },
            startDatetime: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha y hora de inicio'
            },
            endDatetime: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha y hora de fin'
            },
            slotDurationMinutes: {
              type: 'integer',
              description: 'Duración del slot en minutos'
            },
            isAvailable: {
              type: 'boolean',
              description: 'Si está disponible'
            },
            appointmentId: {
              type: 'integer',
              description: 'ID de la cita asignada'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación'
            }
          }
        },
        CreateAppointmentRequest: {
          type: 'object',
          required: ['patientId', 'tutorId', 'scheduledDatetime', 'appointmentTypeId'],
          properties: {
            patientId: {
              type: 'integer',
              description: 'ID del paciente'
            },
            tutorId: {
              type: 'integer',
              description: 'ID del tutor'
            },
            veterinarianId: {
              type: 'integer',
              description: 'ID del veterinario (opcional)'
            },
            appointmentTypeId: {
              type: 'integer',
              description: 'ID del tipo de cita'
            },
            scheduledDatetime: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha y hora programada'
            },
            notes: {
              type: 'string',
              description: 'Notas adicionales'
            },
            symptoms: {
              type: 'string',
              description: 'Síntomas del paciente'
            },
            urgencyLevel: {
              type: 'string',
              enum: ['low', 'normal', 'high', 'emergency'],
              description: 'Nivel de urgencia'
            }
          }
        },
        UpdateAppointmentRequest: {
          type: 'object',
          properties: {
            veterinarianId: {
              type: 'integer',
              description: 'ID del veterinario'
            },
            scheduledDatetime: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha y hora programada'
            },
            status: {
              type: 'string',
              enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'],
              description: 'Estado de la cita'
            },
            notes: {
              type: 'string',
              description: 'Notas adicionales'
            },
            symptoms: {
              type: 'string',
              description: 'Síntomas del paciente'
            },
            urgencyLevel: {
              type: 'string',
              enum: ['low', 'normal', 'high', 'emergency'],
              description: 'Nivel de urgencia'
            },
            actualDurationMinutes: {
              type: 'integer',
              description: 'Duración real en minutos'
            },
            price: {
              type: 'number',
              format: 'decimal',
              description: 'Precio'
            },
            isPaid: {
              type: 'boolean',
              description: 'Si la cita está pagada'
            },
            paymentMethod: {
              type: 'string',
              description: 'Método de pago'
            }
          }
        },
        AppointmentQuery: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Número de página',
              default: 1
            },
            limit: {
              type: 'integer',
              description: 'Límite de resultados',
              default: 20
            },
            veterinarianId: {
              type: 'integer',
              description: 'ID del veterinario'
            },
            patientId: {
              type: 'integer',
              description: 'ID del paciente'
            },
            tutorId: {
              type: 'integer',
              description: 'ID del tutor'
            },
            status: {
              type: 'string',
              description: 'Estado de la cita'
            },
            urgencyLevel: {
              type: 'string',
              description: 'Nivel de urgencia'
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Fecha de inicio'
            },
            endDate: {
              type: 'string',
              format: 'date',
              description: 'Fecha de fin'
            }
          }
        },
        CalendarQuery: {
          type: 'object',
          properties: {
            veterinarianId: {
              type: 'integer',
              description: 'ID del veterinario'
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Fecha de inicio'
            },
            endDate: {
              type: 'string',
              format: 'date',
              description: 'Fecha de fin'
            },
            includeUnavailable: {
              type: 'boolean',
              description: 'Incluir slots no disponibles',
              default: false
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Tipo de error'
            },
            message: {
              type: 'string',
              description: 'Mensaje de error'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Campo con error'
                  },
                  message: {
                    type: 'string',
                    description: 'Mensaje de error del campo'
                  }
                }
              }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Mensaje de éxito'
            },
            data: {
              type: 'object',
              description: 'Datos de respuesta'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Página actual'
            },
            limit: {
              type: 'integer',
              description: 'Límite de resultados'
            },
            total: {
              type: 'integer',
              description: 'Total de resultados'
            },
            totalPages: {
              type: 'integer',
              description: 'Total de páginas'
            }
          }
        },
        WebSocketMessage: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Tipo de mensaje'
            },
            data: {
              type: 'object',
              description: 'Datos del mensaje'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp del mensaje'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Appointments',
        description: 'Operaciones de gestión de citas'
      },
      {
        name: 'Appointment Types',
        description: 'Operaciones de tipos de cita'
      },
      {
        name: 'Veterinarians',
        description: 'Operaciones de veterinarios'
      },
      {
        name: 'Availability',
        description: 'Operaciones de disponibilidad'
      },
      {
        name: 'Calendar',
        description: 'Operaciones de calendario'
      },
      {
        name: 'WebSocket',
        description: 'Eventos en tiempo real'
      },
      {
        name: 'Health',
        description: 'Verificación de estado del servicio'
      }
    ]
  },
  apis: ['./src/controllers/*.js'], // Ruta a los archivos con anotaciones Swagger
};

const specs = swaggerJsdoc(options);

const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'none',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
  },
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'PawPet Appointments Service API Documentation'
};

module.exports = {
  specs,
  swaggerUi,
  swaggerUiOptions
};
