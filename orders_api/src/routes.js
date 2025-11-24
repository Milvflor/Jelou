import { Router } from "express";
import {
    createProduct,
    updateProduct,
    detailProduct,
    searchProduct

} from "./controllers/productsController.js";
import {
    createOrder,
    getOrder,
    searchOrders,
    confirmOrder,
    cancelOrder,
} from "./controllers/ordersController.js";

const router = Router();

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
 *                   example: orders-api
 */
router.get('/health', (req, res)=>{
    res.json({
        status:'ok', service:'orders-api'
    });
})

// ==================== PRODUCTS ====================

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Crear un nuevo producto
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       409:
 *         description: SKU ya existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/products', createProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Actualizar precio y/o stock de un producto
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductUpdate'
 *     responses:
 *       200:
 *         description: Producto actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/products/:id', updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Obtener producto por ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto
 *     responses:
 *       200:
 *         description: Producto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/products/:id', detailProduct);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Buscar productos con paginación
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por SKU o nombre
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
 *         description: Lista de productos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedProducts'
 */
router.get('/products', searchProduct);

// ==================== ORDERS ====================

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Crear una nueva orden
 *     description: Crea una orden en estado CREATED. Valida que el cliente exista y que haya stock suficiente.
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderInput'
 *     responses:
 *       201:
 *         description: Orden creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Error de validación o stock insuficiente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.post('/orders', createOrder);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Obtener orden por ID con sus items
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden
 *     responses:
 *       200:
 *         description: Orden encontrada con items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderWithItems'
 *       404:
 *         description: Orden no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/orders/:id', getOrder);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Buscar órdenes con filtros y paginación
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [CREATED, CONFIRMED, CANCELED]
 *         description: Filtrar por estado
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha desde (created_at >= from)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha hasta (created_at <= to)
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
 *         description: Lista de órdenes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedOrders'
 */
router.get('/orders', searchOrders);

/**
 * @swagger
 * /api/orders/{id}/confirm:
 *   post:
 *     summary: Confirmar una orden
 *     description: Cambia el estado de CREATED a CONFIRMED. Requiere header X-Idempotency-Key para garantizar idempotencia.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden
 *       - in: header
 *         name: X-Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *         description: Clave única para idempotencia
 *     responses:
 *       200:
 *         description: Orden confirmada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Falta X-Idempotency-Key o la orden no está en estado CREATED
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Orden no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/orders/:id/confirm', confirmOrder);

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   post:
 *     summary: Cancelar una orden
 *     description: |
 *       Cancela una orden y restaura el stock de los productos.
 *       - CREATED: se puede cancelar siempre
 *       - CONFIRMED: solo dentro de 10 minutos desde confirmación
 *       - CANCELED: ya está cancelada (idempotente)
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden
 *     responses:
 *       200:
 *         description: Orden cancelada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: No se puede cancelar (más de 10 minutos desde confirmación)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Orden no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/orders/:id/cancel', cancelOrder);

export default router;
