import 'dotenv/config';
import axios from 'axios';
import jwt from 'jsonwebtoken';


function generateServiceToken() {
  return jwt.sign(
    {
      type: 'service',
      service: 'lambda-orchestrator'
    },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
}

export async function orchestrateOrder(event) {
  try {
    const body = JSON.parse(event.body || '{}');
    const { customer_id, items, idempotency_key, correlation_id } = body;

    if (!customer_id || !Array.isArray(items) || items.length === 0 || !idempotency_key) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'customer_id, items and idempotency_key are required'
        })
      };
    }

    const token = generateServiceToken();
    const headers = {
      Authorization: `Bearer ${token}`
    };

    // Validar cliente con Customers API (endpoint interno)
    const customerResp = await axios.get(
      `${process.env.CUSTOMERS_API_URL}/api/internal/customers/${customer_id}`,
      { headers }
    );
    const customer = customerResp.data;

    // Crear orden en Orders API
    const orderItems = items.map(item => ({
      productId: item.productId,
      qty: item.qty
    }));

    const orderCreateResp = await axios.post(
      `${process.env.ORDERS_API_URL}/api/orders`,
      { customer_id: customer_id, items: orderItems, idempotency_key: `create_${idempotency_key}` },
      { headers }
    );
    const order = orderCreateResp.data;

    // Confirmar la orden con X-Idempotency-Key
    await axios.post(
      `${process.env.ORDERS_API_URL}/api/orders/${order.id}/confirm`,
      {},
      {
        headers: {
          ...headers,
          'X-Idempotency-Key': idempotency_key
        }
      }
    );

    // Obtener items de la orden (estado más actualizado)
    const orderDetailResp = await axios.get(
      `${process.env.ORDERS_API_URL}/api/orders/${order.id}`,
      { headers }
    );
    const orderWithItems = orderDetailResp.data;
    
    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        correlationId: correlation_id || null,
        data: {
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone || null
          },
          order: {
            id: orderWithItems.id,
            customer_id: orderWithItems.customer_id,
            status: orderWithItems.status,
            total_cents: orderWithItems.total_cents,
            created_at: orderWithItems.created_at,
            confirmed_at: orderWithItems.confirmed_at,
            items: orderWithItems.items.map(item => ({
              product_id: item.product_id,
              qty: item.qty,
              unit_price_cents: item.unit_price_cents,
              subtotal_cents: item.subtotal_cents
            }))
          }
        }
      })
    };
  } catch (err) {
    console.error('Error in orchestrateOrder:', err.response?.data || err.message);

    return {
      statusCode: err.response?.status || 500,
      body: JSON.stringify({
        success: false,
        correlationId: null,
        error: {
          message: 'Error orchestrating order',
          detail: err.response?.data || err.message
        }
      })
    };
  }
}
