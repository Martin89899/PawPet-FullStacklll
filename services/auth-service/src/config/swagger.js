const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PawPet Auth Service API',
      version: '1.0.0',
      description: 'Microservicio de autenticación para PawPet Veterinary Management System',
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
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.pawpet.com/auth',
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
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID único del usuario'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Correo electrónico del usuario'
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
              description: 'Teléfono del usuario'
            },
            isActive: {
              type: 'boolean',
              description: 'Estado del usuario'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación'
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              description: 'Último login'
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Correo electrónico'
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'Contraseña (mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial)'
            },
            firstName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Nombre'
            },
            lastName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Apellido'
            },
            role: {
              type: 'string',
              enum: ['admin', 'veterinarian', 'client'],
              default: 'client',
              description: 'Rol del usuario'
            },
            phone: {
              type: 'string',
              description: 'Teléfono (opcional)'
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
              description: 'Correo electrónico'
            },
            password: {
              type: 'string',
              description: 'Contraseña'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indica si la operación fue exitosa'
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
                tokens: {
                  type: 'object',
                  properties: {
                    accessToken: {
                      type: 'string',
                      description: 'Token de acceso JWT'
                    },
                    refreshToken: {
                      type: 'string',
                      description: 'Token de refresh'
                    },
                    expiresIn: {
                      type: 'string',
                      description: 'Tiempo de expiración'
                    }
                  }
                }
              }
            }
          }
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              description: 'Token de refresh'
            }
          }
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: {
              type: 'string',
              description: 'Contraseña actual'
            },
            newPassword: {
              type: 'string',
              minLength: 8,
              description: 'Nueva contraseña'
            }
          }
        },
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            firstName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Nombre'
            },
            lastName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Apellido'
            },
            phone: {
              type: 'string',
              description: 'Teléfono'
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
        name: 'Authentication',
        description: 'Operaciones de autenticación'
      },
      {
        name: 'Profile',
        description: 'Gestión de perfil de usuario'
      },
      {
        name: 'Admin',
        description: 'Operaciones de administrador'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'], // Rutas a los archivos con documentación
};

const specs = swaggerJsdoc(options);

const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'PawPet Auth Service API Documentation',
  customfavIcon: '/favicon.ico'
};

module.exports = {
  specs,
  swaggerUi,
  swaggerUiOptions
};
