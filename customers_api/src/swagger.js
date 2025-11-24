import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Customers API',
      version: '1.0.0',
      description: 'API para gestión de clientes',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Servidor de desarrollo',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
      },
      schemas: {
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Alice Johnson' },
            email: { type: 'string', format: 'email', example: 'alice@example.com' },
            phone: { type: 'string', example: '0991234567' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        CustomerInput: {
          type: 'object',
          required: ['name', 'email', 'phone'],
          properties: {
            name: { type: 'string', minLength: 1, example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            phone: { type: 'string', example: '0999999999' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Validation error' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
        PaginatedCustomers: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { $ref: '#/components/schemas/Customer' } },
            nextCursor: { type: 'integer', nullable: true },
            hasMore: { type: 'boolean' },
          },
        },
      },
    },
  },
  apis: ['./src/routes.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

export default swaggerSpec;
