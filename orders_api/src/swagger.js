import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Orders API',
      version: '1.0.0',
      description: 'API para gestión de productos y órdenes',
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Servidor de desarrollo',
      },
    ],
    components: {
      schemas: {
        Product: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            sku: { type: 'string', example: 'SKU-1001' },
            name: { type: 'string', example: 'Smartphone Galaxy S24' },
            price_cents: { type: 'integer', example: 850000 },
            stock: { type: 'integer', example: 50 },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        ProductInput: {
          type: 'object',
          required: ['sku', 'name', 'price_cents', 'stock'],
          properties: {
            sku: { type: 'string', example: 'SKU-5001' },
            name: { type: 'string', example: 'Keyboard' },
            price_cents: { type: 'integer', example: 50000 },
            stock: { type: 'integer', example: 100 },
          },
        },
        ProductUpdate: {
          type: 'object',
          properties: {
            price_cents: { type: 'integer', example: 55000 },
            stock: { type: 'integer', example: 75 },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            customer_id: { type: 'integer', example: 1 },
            status: { type: 'string', enum: ['CREATED', 'CONFIRMED', 'CANCELED'], example: 'CONFIRMED' },
            total_cents: { type: 'integer', example: 1700000 },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        OrderWithItems: {
          allOf: [
            { $ref: '#/components/schemas/Order' },
            {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/OrderItem' },
                },
              },
            },
          ],
        },
        OrderItem: {
          type: 'object',
          properties: {
            product_id: { type: 'integer', example: 1 },
            qty: { type: 'integer', example: 2 },
            unit_price_cents: { type: 'integer', example: 850000 },
            subtotal_cents: { type: 'integer', example: 1700000 },
            name: { type: 'string', example: 'Smartphone Galaxy S24' },
            sku: { type: 'string', example: 'SKU-1001' },
          },
        },
        OrderInput: {
          type: 'object',
          required: ['customer_id', 'items'],
          properties: {
            customer_id: { type: 'integer', example: 1 },
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['productId', 'qty'],
                properties: {
                  productId: { type: 'integer', example: 1 },
                  qty: { type: 'integer', minimum: 1, example: 2 },
                },
              },
            },
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
        PaginatedProducts: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
            nextCursor: { type: 'integer', nullable: true },
            hasMore: { type: 'boolean' },
          },
        },
        PaginatedOrders: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
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
