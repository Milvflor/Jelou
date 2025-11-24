import pool from "../db/pool.js";
import { 
    createProductSchema, 
    updateProductSchema 
 } from "../validations/productSchema.js";


export async function createProduct(req, res) {
    try {
        const parsed = createProductSchema.parse(req.body);
        const { sku, name, price_cents, stock } = parsed;

        const [result] = await pool.execute(
            'INSERT INTO products (sku, name, price_cents, stock) VALUES (?,?,?,?);',
            [sku, name, price_cents, stock] 
        );

        const [rows] = await pool.execute(
            'SELECT id, sku, name, price_cents, stock, created_at FROM products WHERE id=?;',
            [result.insertId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: 'Product not found'
            });
        }
        return res.status(201).json(rows[0]);

    } catch (error) {
        
        if (error.name === 'ZodError') {
        return res.status(400).json({
            message: 'Validation error',
            errors: error.errors
        });
        }

        if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            message: 'SKU already exists'
        });
        }

        console.error('Error creating customer:', error);
        return res.status(500).json({
        message: 'Internal server error'
        });
    }
}

export async function updateProduct(req, res) {
    try {
        const { id } = req.params;
        const parsed = updateProductSchema.parse(req.body);

        const updates = [];
        const params = [];

        if (parsed.price_cents !== undefined) {
            updates.push('price_cents = ?');
            params.push(parsed.price_cents);
        }

        if (parsed.stock !== undefined) {
            updates.push('stock = ?');
            params.push(parsed.stock);
        }

        params.push(id);

        const [result] = await pool.execute(
            `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Product not found'
            });
        }

        const [rows] = await pool.execute(
            'SELECT id, sku, name, price_cents, stock, created_at FROM products WHERE id = ?',
            [id]
        );

        return res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error updating product:', error);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}

export async function detailProduct(req, res) {
    try {
        const { id } = req.params;

        if(!id){
            return res.status(400).json({
                message: 'Product ID is required'
            });
        }

        const [rows] = await pool.execute(
            'SELECT id, sku, name, price_cents, stock, created_at FROM products WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: 'Product not found'
            });
        }

        return res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching product details:', error);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}

export async function searchProduct(req, res) {
    try {
        const { search = '', cursor, limit = 10 } = req.query;
        const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

        let query = 'SELECT id, sku, name, price_cents, stock, created_at FROM products';
        const params = [];
        const conditions = [];

        if (search) {
            conditions.push('(sku LIKE ? OR name LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }

        if (cursor) {
            conditions.push('id > ?');
            params.push(cursor);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY id ASC LIMIT ?';
        params.push(limitNum + 1);

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
        console.error('Error searching products:', error);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}