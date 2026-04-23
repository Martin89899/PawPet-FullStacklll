const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PawPet Billing Service API',
      version: '1.0.0',
      description: 'API para el servicio de facturación y pagos de PawPet Veterinary Management System',
      contact: {
        name: 'PawPet Team',
        email: 'support@pawpet.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3004',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'PawPet Billing Service API Documentation'
};

module.exports = {
  specs,
  swaggerUi,
  swaggerUiOptions
};
