const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PawPet Patients Service API',
      version: '1.0.0',
      description: 'Microservicio de gestión clínica de pacientes para PawPet Veterinary Management System',
      contact: {
        name: 'PawPet Team',
        email: 'support@pawpet.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3003',
        description: 'Development server'
      },
      {
        url: 'https://api.pawpet.com/patients',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token para autenticación'
        }
      },
      schemas: {
        Patient: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID único del paciente'
            },
            tutorId: {
              type: 'integer',
              description: 'ID del tutor'
            },
            speciesId: {
              type: 'integer',
              description: 'ID de la especie'
            },
            breedId: {
              type: 'integer',
              description: 'ID de la raza'
            },
            name: {
              type: 'string',
              description: 'Nombre del paciente'
            },
            nickname: {
              type: 'string',
              description: 'Apodo del paciente'
            },
            birthDate: {
              type: 'string',
              format: 'date',
              description: 'Fecha de nacimiento'
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'unknown'],
              description: 'Género'
            },
            color: {
              type: 'string',
              description: 'Color'
            },
            weight: {
              type: 'number',
              description: 'Peso en kg'
            },
            microchipNumber: {
              type: 'string',
              description: 'Número de microchip'
            },
            specialMarks: {
              type: 'string',
              description: 'Marcas especiales'
            },
            allergies: {
              type: 'string',
              description: 'Alergias'
            },
            chronicDiseases: {
              type: 'string',
              description: 'Enfermedades crónicas'
            },
            currentMedications: {
              type: 'string',
              description: 'Medicamentos actuales'
            },
            isActive: {
              type: 'boolean',
              description: 'Estado activo'
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
        Tutor: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID único del tutor'
            },
            firstName: {
              type: 'string',
              description: 'Nombre'
            },
            lastName: {
              type: 'string',
              description: 'Apellido'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Correo electrónico'
            },
            phone: {
              type: 'string',
              description: 'Teléfono'
            },
            address: {
              type: 'string',
              description: 'Dirección'
            },
            city: {
              type: 'string',
              description: 'Ciudad'
            },
            country: {
              type: 'string',
              description: 'País'
            },
            identificationNumber: {
              type: 'string',
              description: 'Número de identificación'
            },
            isActive: {
              type: 'boolean',
              description: 'Estado activo'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación'
            }
          }
        },
        ClinicalHistory: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID único del registro'
            },
            patientId: {
              type: 'integer',
              description: 'ID del paciente'
            },
            veterinarianId: {
              type: 'integer',
              description: 'ID del veterinario'
            },
            consultationType: {
              type: 'string',
              enum: ['emergency', 'checkup', 'surgery', 'hospitalization', 'vaccination', 'deworming', 'follow_up', 'other'],
              description: 'Tipo de consulta'
            },
            chiefComplaint: {
              type: 'string',
              description: 'Motivo de consulta'
            },
            diagnosis: {
              type: 'string',
              description: 'Diagnóstico'
            },
            treatment: {
              type: 'string',
              description: 'Tratamiento'
            },
            medications: {
              type: 'string',
              description: 'Medicamentos'
            },
            recommendations: {
              type: 'string',
              description: 'Recomendaciones'
            },
            followUpRequired: {
              type: 'boolean',
              description: 'Requiere seguimiento'
            },
            followUpDays: {
              type: 'integer',
              description: 'Días para seguimiento'
            },
            temperature: {
              type: 'number',
              description: 'Temperatura corporal'
            },
            heartRate: {
              type: 'integer',
              description: 'Frecuencia cardíaca'
            },
            respiratoryRate: {
              type: 'integer',
              description: 'Frecuencia respiratoria'
            },
            weight: {
              type: 'number',
              description: 'Peso'
            },
            isEmergency: {
              type: 'boolean',
              description: 'Es emergencia'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación'
            }
          }
        },
        CreatePatientRequest: {
          type: 'object',
          required: ['tutorId', 'name'],
          properties: {
            tutorId: {
              type: 'integer',
              description: 'ID del tutor'
            },
            speciesId: {
              type: 'integer',
              description: 'ID de la especie'
            },
            breedId: {
              type: 'integer',
              description: 'ID de la raza'
            },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              description: 'Nombre del paciente'
            },
            nickname: {
              type: 'string',
              maxLength: 100,
              description: 'Apodo'
            },
            birthDate: {
              type: 'string',
              format: 'date',
              description: 'Fecha de nacimiento'
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'unknown'],
              description: 'Género'
            },
            color: {
              type: 'string',
              maxLength: 100,
              description: 'Color'
            },
            weight: {
              type: 'number',
              minimum: 0,
              maximum: 999.99,
              description: 'Peso en kg'
            },
            microchipNumber: {
              type: 'string',
              maxLength: 50,
              description: 'Número de microchip'
            },
            specialMarks: {
              type: 'string',
              description: 'Marcas especiales'
            },
            allergies: {
              type: 'string',
              description: 'Alergias'
            },
            chronicDiseases: {
              type: 'string',
              description: 'Enfermedades crónicas'
            },
            currentMedications: {
              type: 'string',
              description: 'Medicamentos actuales'
            }
          }
        },
        CreateClinicalHistoryRequest: {
          type: 'object',
          required: ['patientId', 'consultationType'],
          properties: {
            patientId: {
              type: 'integer',
              description: 'ID del paciente'
            },
            consultationType: {
              type: 'string',
              enum: ['emergency', 'checkup', 'surgery', 'hospitalization', 'vaccination', 'deworming', 'follow_up', 'other'],
              description: 'Tipo de consulta'
            },
            chiefComplaint: {
              type: 'string',
              description: 'Motivo de consulta'
            },
            history: {
              type: 'string',
              description: 'Historia clínica'
            },
            physicalExamination: {
              type: 'string',
              description: 'Examen físico'
            },
            diagnosis: {
              type: 'string',
              description: 'Diagnóstico'
            },
            treatment: {
              type: 'string',
              description: 'Tratamiento'
            },
            medications: {
              type: 'string',
              description: 'Medicamentos'
            },
            recommendations: {
              type: 'string',
              description: 'Recomendaciones'
            },
            followUpRequired: {
              type: 'boolean',
              description: 'Requiere seguimiento'
            },
            followUpDays: {
              type: 'integer',
              minimum: 1,
              description: 'Días para seguimiento'
            },
            temperature: {
              type: 'number',
              minimum: 30,
              maximum: 45,
              description: 'Temperatura corporal'
            },
            heartRate: {
              type: 'integer',
              minimum: 0,
              maximum: 300,
              description: 'Frecuencia cardíaca'
            },
            respiratoryRate: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              description: 'Frecuencia respiratoria'
            },
            weight: {
              type: 'number',
              minimum: 0,
              maximum: 999.99,
              description: 'Peso'
            },
            bloodPressureSystolic: {
              type: 'integer',
              minimum: 0,
              maximum: 300,
              description: 'Presión arterial sistólica'
            },
            bloodPressureDiastolic: {
              type: 'integer',
              minimum: 0,
              maximum: 200,
              description: 'Presión arterial diastólica'
            },
            oxygenSaturation: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'Saturación de oxígeno'
            },
            isEmergency: {
              type: 'boolean',
              description: 'Es emergencia'
            }
          }
        },
        CreateTutorRequest: {
          type: 'object',
          required: ['firstName', 'lastName'],
          properties: {
            firstName: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              description: 'Nombre'
            },
            lastName: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              description: 'Apellido'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Correo electrónico'
            },
            phone: {
              type: 'string',
              maxLength: 20,
              description: 'Teléfono'
            },
            address: {
              type: 'string',
              description: 'Dirección'
            },
            city: {
              type: 'string',
              maxLength: 100,
              description: 'Ciudad'
            },
            country: {
              type: 'string',
              maxLength: 100,
              description: 'País'
            },
            identificationNumber: {
              type: 'string',
              maxLength: 50,
              description: 'Número de identificación'
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
                    description: 'Mensaje de error específico'
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
        }
      }
    },
    tags: [
      {
        name: 'Patients',
        description: 'Gestión de pacientes (mascotas)'
      },
      {
        name: 'Tutors',
        description: 'Gestión de tutores (dueños)'
      },
      {
        name: 'Clinical History',
        description: 'Historial clínico y consultas'
      },
      {
        name: 'Vaccinations',
        description: 'Registro de vacunaciones'
      },
      {
        name: 'Dewormings',
        description: 'Registro de desparasitaciones'
      },
      {
        name: 'Allergies',
        description: 'Registro de alergias'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const specs = swaggerJsdoc(options);

const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'PawPet Patients Service API Documentation',
  customfavIcon: '/favicon.ico'
};

module.exports = {
  specs,
  swaggerUi,
  swaggerUiOptions
};
