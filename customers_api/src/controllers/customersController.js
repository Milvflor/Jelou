import pool from '../db/pool.js';
import { createCustomerSchema } from '../validations/customersSchema.js';

export async function createCustomer(req, res) {
  try {
    // 1. Validar body
    const parsed = createCustomerSchema.parse(req.body);
    const { name, email, phone } = parsed;

    // 2. Insertar en la BD
    const [result] = await pool.execute(
      'INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)',
      [name, email, phone]
    );

    // 3. Recuperar el registro creado
    const [rows] = await pool.execute(
      'SELECT id, name, email, phone, created_at FROM customers WHERE id = ?',
      [result.insertId]
    );

    if(rows.length === 0) {
      return res.status(404).json({
        message: 'Customer not found after creation'
      });
    }

    return res.status(201).json(rows[0]);
  } catch (error) {
    // Error de validación Zod
    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      });
    }

    // Error de email duplicado (MySQL error code 1062)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'Email already exists'
      });
    }

    console.error('Error creating customer:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
}

export async function detailCustomer(req, res) {
    try {
        const { id } = req.params;

        const [rows] = await pool.execute(
            'SELECT id, name, email, phone, created_at FROM customers WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: 'Customer not found'
            });
        }

        return res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error getting customer:', error);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}

export async function search(req, res) {
    try {
        const { search = '', cursor, limit = 10 } = req.query;
        const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

        let query = 'SELECT id, name, email, phone, created_at FROM customers';
        const params = [];
        const conditions = [];

        // Filtro de búsqueda por nombre o email
        if (search) {
            conditions.push('(name LIKE ? OR email LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }

        // Paginación por cursor (id del último registro)
        if (cursor) {
            conditions.push('id > ?');
            params.push(parseInt(cursor));
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY id ASC LIMIT ' + (limitNum + 1);

        const [rows] = await pool.execute(query, params);

        // Determinar si hay más resultados
        const hasMore = rows.length > limitNum;
        const data = hasMore ? rows.slice(0, limitNum) : rows;
        const nextCursor = hasMore ? data[data.length - 1].id : null;

        return res.status(200).json({
            data,
            nextCursor,
            hasMore
        });
    } catch (error) {
        console.error('Error searching customers:', error);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}

export async function updateCustomer(req, res) {
    try {
        const { id } = req.params;
        const parsed = createCustomerSchema.parse(req.body);
        const { name, email, phone } = parsed;

        const [result] = await pool.execute(
            'UPDATE customers SET name = ?, email = ?, phone = ? WHERE id = ?',
            [name, email, phone, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Customer not found'
            });
        }

        const [rows] = await pool.execute(
            'SELECT id, name, email, phone, created_at FROM customers WHERE id = ?',
            [id]
        );

        return res.status(200).json(rows[0]);
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                message: 'Validation error',
                errors: error.errors
            });
        }

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'Email already exists'
            });
        }

        console.error('Error updating customer:', err);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}

export async function deleteCustomer(req, res) {
    try {
        const { id } = req.params;

        const [result] = await pool.execute(
            'DELETE FROM customers WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Customer not found'
            });
        }

        return res.status(204).send(
            {
                message: 'Customer deleted successfully'
            }
        );
    } catch (error) {
        console.error('Error deleting customer:', error);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}

export async function internalDetailCustomer(req, res) {
    try {
        const { id } = req.params;

        const [rows] = await pool.execute(
            'SELECT id, name, email, phone, created_at FROM customers WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: 'Customer not found'
            });
        }

        return res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error getting customer (internal):', error);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}
