import { z } from 'zod';

export const createOrderSchema = z.object({
    customer_id: z.number().int().positive('Customer ID must be a positive integer'),
    total_cents: z.number().int().min(0,'Total must be non-negative'),
})

export const updatedOrderStatus = z.object({
    status: z.enum(['CREATED','CONFIRMED','CANCELED'])
})