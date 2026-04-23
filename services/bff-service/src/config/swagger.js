const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PawPet BFF Service API',
      version: '1.0.0',
      description: 'Backend for Frontend - API Gateway para PawPet Veterinary Management',
      contact: {
        name: 'PawPet Team',
        email: 'support@pawpet.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo'
      },
      {
        url: 'https://api.pawpet.com',
        description: 'Servidor de produccion'
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
        User: {
          type: 'object',
          required: ['id', 'email', 'firstName', 'lastName', 'role'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID del usuario'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Correo electronico del usuario'
            },
            firstName: {
              type: 'string',
              description: 'Nombre del usuario'
            },
            lastName: {
              type: 'string',
              description: 'Apellido del usuario'
            },
            role: {
              type: 'string',
              enum: ['admin', 'veterinarian', 'client'],
              description: 'Rol del usuario'
            },
            phone: {
              type: 'string',
              description: 'Telefono del usuario'
            },
            isActive: {
              type: 'boolean',
              description: 'Estado del usuario'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creacion'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Correo electronico'
            },
            password: {
              type: 'string',
              description: 'Contrasena'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Estado de la operacion'
            },
            message: {
              type: 'string',
              description: 'Mensaje de respuesta'
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User'
                },
                accessToken: {
                  type: 'string',
                  description: 'Token de acceso JWT'
                },
                refreshToken: {
                  type: 'string',
                  description: 'Token de refresco'
                },
                expiresIn: {
                  type: 'integer',
                  description: 'Tiempo de expiracion en segundos'
                }
              }
            }
          }
        },
        Patient: {
          type: 'object',
          required: ['id', 'name', 'tutorId'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID del paciente'
            },
            name: {
              type: 'string',
              description: 'Nombre del paciente'
            },
            tutorId: {
              type: 'integer',
              description: 'ID del tutor'
            },
            speciesName: {
              type: 'string',
              description: 'Nombre de la especie'
            },
            breedName: {
              type: 'string',
              description: 'Nombre de la raza'
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'unknown'],
              description: 'Genero del paciente'
            },
            weight: {
              type: 'number',
              description: 'Peso en kg'
            },
            birthDate: {
              type: 'string',
              format: 'date',
              description: 'Fecha de nacimiento'
            },
            microchipNumber: {
              type: 'string',
              description: 'Numero de microchip'
            },
            isActive: {
              type: 'boolean',
              description: 'Estado del paciente'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creacion'
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
              description: 'Mensaje de exito'
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
        name: 'Authentication',
        description: 'Operaciones de autenticacion'
      },
      {
        name: 'Patients',
        description: 'Operaciones de pacientes'
      },
      {
        name: 'Health',
        description: 'Verificacion de estado del servicio'
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
  customSiteTitle: 'PawPet BFF Service API Documentation'
};

module.exports = {
  specs,
  swaggerUi,
  swaggerUiOptions
};
