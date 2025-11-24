import { Router } from 'express';
const router = Router();
import { createCustomer, detailCustomer, search, updateCustomer, deleteCustomer, internalDetailCustomer } from './controllers/customersController.js';
import { verifyJWT } from './middlewares/jwtAuth.js';

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servicio funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: customers-api
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'customers-api' });
});

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Crear un nuevo cliente
 *     tags: [Customers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerInput'
 *     responses:
 *       201:
 *         description: Cliente creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       409:
 *         description: Email ya existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/customers', createCustomer);

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: Obtener cliente por ID
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente
 *     responses:
 *       200:
 *         description: Cliente encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Cliente no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/customers/:id', detailCustomer);

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Buscar clientes con paginación
 *     tags: [Customers]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre o email
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: integer
 *         description: ID del último registro para paginación
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Cantidad de registros por página
 *     responses:
 *       200:
 *         description: Lista de clientes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedCustomers'
 */
router.get('/customers', search);

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Actualizar cliente
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerInput'
 *     responses:
 *       200:
 *         description: Cliente actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Error de validación
 *       404:
 *         description: Cliente no encontrado
 *       409:
 *         description: Email ya existe
 */
router.put('/customers/:id', updateCustomer);

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     summary: Eliminar cliente
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente
 *     responses:
 *       204:
 *         description: Cliente eliminado
 *       404:
 *         description: Cliente no encontrado
 */
router.delete('/customers/:id', deleteCustomer);

/**
 * @swagger
 * /api/internal/customers/{id}:
 *   get:
 *     summary: Obtener cliente (endpoint interno)
 *     description: Endpoint para uso interno entre servicios. Requiere JWT válido.
 *     tags: [Internal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente
 *     responses:
 *       200:
 *         description: Cliente encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       401:
 *         description: Token faltante, inválido o expirado
 *       403:
 *         description: Firma JWT inválida o tipo de token incorrecto
 *       404:
 *         description: Cliente no encontrado
 */
router.get('/internal/customers/:id', verifyJWT, internalDetailCustomer);


export default router;
