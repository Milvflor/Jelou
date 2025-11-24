import pool from "../db/pool.js";
import { itemSchema } from "../validations/productSchema.js";
import jwt from 'jsonwebtoken';

const CUSTOMERS_API_URL = process.env.CUSTOMERS_API_URL;
const JWT_SECRET = process.env.JWT_SECRET;

function generateServiceToken() {
    return jwt.sign(
        {
            type: 'service',
            service: 'orders-api'
        },
        JWT_SECRET,
        { expiresIn: '5m' }
    );
}

async function validateCustomer(customerId) {
    const token = generateServiceToken();

    const response = await fetch(`${CUSTOMERS_API_URL}/api/internal/customers/${customerId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.status === 404) {
        return { valid: false, error: 'Customer not found' };
    }

    if (!response.ok) {
        return { valid: false, error: 'Failed to validate customer' };
    }

    const customer = await response.json();
    return { valid: true, customer };
}

export async function createOrder(req, res) {
    const connection = await pool.getConnection();
    try {
        const { customer_id, items, idempotency_key } = req.body;

        console.log('Creating order for customer_id:', customer_id, 'with items:', items, 'and idempotency_key:', idempotency_key);

        await connection.beginTransaction();

        // Si hay idempotency_key, verificar si ya existe una orden con esa key
        if (idempotency_key) {
            const [existingKey] = await connection.execute(
                'SELECT target_id, response_body FROM idempotency_keys WHERE `key` = ? AND target_type = ? FOR UPDATE',
                [idempotency_key, 'order_create']
            );

            if (existingKey.length > 0) {
                await connection.commit();
                // Retornar la orden existente
                const responseData = typeof existingKey[0].response_body === 'string'
                    ? JSON.parse(existingKey[0].response_body)
                    : existingKey[0].response_body;
                return res.status(200).json(responseData);
            }
        }

        // Validar cliente con Customers API
        const customerValidation = await validateCustomer(customer_id);
        if (!customerValidation.valid) {
            await connection.rollback();
            return res.status(400).json({
                message: customerValidation.error
            });
        }

        // Validar items con Zod
        const itemsValidated = items.map(item => itemSchema.parse(item));

        // Validar stock y obtener precios (con lock)
        const productIds = itemsValidated.map(i => i.productId);
        const [products] = await connection.execute(
            `SELECT id, price_cents, stock FROM products WHERE id IN (${productIds.map(() => '?').join(',')}) FOR UPDATE`,
            productIds
        );

        const productMap = new Map(products.map(p => [p.id, p]));
        const errors = [];
        let totalCents = 0;

        for (const item of itemsValidated) {
            const product = productMap.get(item.productId);
            if (!product) {
                errors.push({ productId: item.productId, error: 'Product not found' });
            } else if (product.stock < item.qty) {
                errors.push({ productId: item.productId, error: 'Insufficient stock' });
            } else {
                totalCents += product.price_cents * item.qty;
            }
        }

        if (errors.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Stock validation failed', errors });
        }

        // Crear orden
        const [orderResult] = await connection.execute(
            'INSERT INTO orders (customer_id, total_cents) VALUES (?, ?)',
            [customer_id, totalCents]
        );
        const orderId = orderResult.insertId;

        // Crear items de la orden y actualizar stock
        for (const item of itemsValidated) {
            const product = productMap.get(item.productId);
            const subtotalCents = product.price_cents * item.qty;

            await connection.execute(
                'INSERT INTO order_items (order_id, product_id, qty, unit_price_cents, subtotal_cents) VALUES (?, ?, ?, ?, ?)',
                [orderId, item.productId, item.qty, product.price_cents, subtotalCents]
            );

            await connection.execute(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.qty, item.productId]
            );
        }

        const [rows] = await connection.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
        const orderData = rows[0];

        // Guardar idempotency_key si fue proporcionada
        if (idempotency_key) {
            await connection.execute(
                'INSERT INTO idempotency_keys (`key`, target_type, target_id, status, response_body) VALUES (?, ?, ?, ?, ?)',
                [idempotency_key, 'order_create', orderId, 'CREATED', JSON.stringify(orderData)]
            );
        }

        await connection.commit();
        return res.status(201).json(orderData);

    } catch (error) {
        await connection.rollback();

        if (error.name === 'ZodError') {
            return res.status(400).json({ message: 'Validation error', errors: error.errors });
        }

        console.error('Error creating order:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        connection.release();
    }
}

export async function getOrder(req, res) {
    try {
        const orderId = parseInt(req.params.id, 10);
        const [orders] = await pool.execute('SELECT * FROM orders WHERE id = ?', [orderId]);

        if (orders.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const order = orders[0];

        const [items] = await pool.execute(
            'SELECT oi.*, p.name, p.sku FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
            [orderId]
        );

        order.items = items;

        return res.status(200).json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export async function searchOrders(req, res) {
    try {
        const { status, from, to, cursor, limit = 10 } = req.query;
        const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

        let query = 'SELECT id, customer_id, status, total_cents, created_at FROM orders';
        const params = [];
        const conditions = [];

        if (status) {
            conditions.push('status = ?');
            params.push(status);
        }

        if (from) {
            conditions.push('created_at >= ?');
            params.push(from);
        }

        if (to) {
            conditions.push('created_at <= ?');
            params.push(to);
        }

        if (cursor) {
            conditions.push('id > ?');
            params.push(cursor);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ` ORDER BY id ASC LIMIT ${limitNum + 1}`;

        const [rows] = await pool.execute(query, params);

        const hasMore = rows.length > limitNum;
        const data = hasMore ? rows.slice(0, limitNum) : rows;
        const nextCursor = hasMore ? data[data.length - 1].id : null;

        return res.status(200).json({
            data,
            nextCursor,
            hasMore
        });
    } catch (error) {
        console.error('Error searching orders:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export async function confirmOrder(req, res) {

    const idempotencyKey = req.headers['x-idempotency-key'];
    const orderId = parseInt(req.params.id, 10);

    if (!idempotencyKey) {
        return res.status(400).json({ message: 'X-Idempotency-Key header is required' });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Verificar si ya existe la idempotency key
        const [idempotencyRows] = await connection.execute(
            'SELECT status, response_body FROM idempotency_keys WHERE `key` = ? FOR UPDATE',
            [idempotencyKey]
        );

        if (idempotencyRows.length > 0) {
            const record = idempotencyRows[0];
            if (record.status === 'CONFIRMED') {
                await connection.commit();
                // response_body puede ser string o objeto (MySQL JSON)
                const responseData = typeof record.response_body === 'string'
                    ? JSON.parse(record.response_body)
                    : record.response_body;
                return res.status(200).json(responseData);
            } else if (record.status === 'CANCELED') {
                await connection.commit();
                return res.status(400).json({ message: 'Previous request was canceled' });
            }
        } else {
            // Insertar nueva idempotency key con estado CREATED
            await connection.execute(
                'INSERT INTO idempotency_keys (`key`, target_type, target_id, status) VALUES (?, ?, ?, ?)',
                [idempotencyKey, 'order', orderId, 'CREATED']
            );
        }

        // Procesar la confirmación de la orden
        const [orderRows] = await connection.execute(
            'SELECT * FROM orders WHERE id = ? FOR UPDATE',
            [orderId]
        );

        if (orderRows.length === 0) {
            throw new Error('Order not found');
        }

        const order = orderRows[0];

        if (order.status !== 'CREATED') {
            throw new Error('Only orders in CREATED status can be confirmed');
        }

        await connection.execute(
            'UPDATE orders SET status = ?, confirmed_at = NOW() WHERE id = ?',
            ['CONFIRMED', orderId]
        );

        const [updatedRows] = await connection.execute(
            'SELECT * FROM orders WHERE id = ?',
            [orderId]
        );

        const responseData = updatedRows[0];

        // Actualizar idempotency key como confirmada con response_body
        await connection.execute(
            'UPDATE idempotency_keys SET status = ?, response_body = ? WHERE `key` = ?',
            ['CONFIRMED', JSON.stringify(responseData), idempotencyKey]
        );

        await connection.commit();
        return res.status(200).json(responseData);

    } catch (error) {
        await connection.rollback();

        // NO marcar como CANCELED automáticamente - solo se cancela explícitamente
        // Eliminar la key en CREATED para permitir reintentos
        try {
            await pool.execute(
                'DELETE FROM idempotency_keys WHERE `key` = ? AND status = ?',
                [idempotencyKey, 'CREATED']
            );
        } catch (e) {
            console.error('Error deleting idempotency key:', e);
        }

        if (error.message === 'Order not found') {
            return res.status(404).json({ message: error.message });
        }
        if (error.message === 'Only orders in CREATED status can be confirmed') {
            return res.status(400).json({ message: error.message });
        }

        console.error('Error confirming order:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        connection.release();
    }
}

export async function cancelOrder(req, res) {
    const orderId = parseInt(req.params.id, 10);
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Obtener orden con lock
        const [orders] = await connection.execute(
            'SELECT * FROM orders WHERE id = ? FOR UPDATE',
            [orderId]
        );

        if (orders.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Order not found' });
        }

        const order = orders[0];

        // Ya está cancelada
        if (order.status === 'CANCELED') {
            await connection.commit();
            return res.status(200).json({ message: 'Order already canceled', order });
        }

        // CREATED: se puede cancelar siempre
        // CONFIRMED: solo dentro de 10 minutos desde confirmación
        if (order.status === 'CONFIRMED') {
            const confirmedAt = new Date(order.confirmed_at);
            const now = new Date();
            const diffMinutes = (now - confirmedAt) / (1000 * 60);

            if (diffMinutes > 1) {
                await connection.rollback();
                return res.status(400).json({
                    message: 'Cannot cancel confirmed order after 10 minutes'
                });
            }
        }

        // Obtener items de la orden para restaurar stock
        const [items] = await connection.execute(
            'SELECT product_id, qty FROM order_items WHERE order_id = ?',
            [orderId]
        );

        // Restaurar stock de cada producto
        for (const item of items) {
            await connection.execute(
                'UPDATE products SET stock = stock + ? WHERE id = ?',
                [item.qty, item.product_id]
            );
        }

        // Cancelar la orden
        await connection.execute(
            'UPDATE orders SET status = ? WHERE id = ?',
            ['CANCELED', orderId]
        );

        await connection.commit();

        const [updatedOrders] = await pool.execute(
            'SELECT * FROM orders WHERE id = ?',
            [orderId]
        );

        return res.status(200).json(updatedOrders[0]);

    } catch (error) {
        await connection.rollback();
        console.error('Error canceling order:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        connection.release();
    }
}
