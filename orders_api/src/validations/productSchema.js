import { z } from 'zod';

export const createProductSchema = z.object({
    sku: z.string().min(5, 'SKU is required').max(50),
    name: z.string().min(1, 'Name is required').max(255),
    price_cents: z.number().int().positive('Price must be positive'),
    stock: z.number().int().min(0, 'Stock must be non-negative').optional().default(0)
});

export const updateProductSchema = z.object({
    price_cents: z.number().int().positive('Price must be positive').optional(),
    stock: z.number().int().min(0, 'Stock must be non-negative').optional()
}).refine(data => data.price_cents !== undefined || data.stock !== undefined, {
    message: 'At least price_cents or stock is required'
});

export const itemSchema = z.object({
    productId: z.number().int().positive('Product ID must be a positive integer'),
    qty: z.number().int().positive('Quantity must be a positive integer'),
});