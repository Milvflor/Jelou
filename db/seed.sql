USE tech_test;

-- =========================
-- Customers
-- =========================
INSERT INTO customers (name, email, phone)
VALUES
  ('Alice Johnson', 'alice@example.com', '0991234567'),
  ('Bob Smith', 'bob@example.com', '0987654321'),
  ('Carlos Perez', 'carlos@example.com', '0970011223');

-- =========================
-- Products
-- =========================
INSERT INTO products (sku, name, price_cents, stock)
VALUES
  ('SKU-1001', 'Laptop Lenovo Thinkpad', 850000, 10),
  ('SKU-2001', 'Mouse Logitech M185', 1500, 50),
  ('SKU-3001', 'Monitor Dell 24"', 120000, 20),
  ('SKU-4001', 'Teclado Mecánico Redragon', 30000, 15);

-- =========================
-- Orders (de ejemplo)
-- =========================
INSERT INTO orders (customer_id, status, total_cents)
VALUES
  (1, 'CONFIRMED', 851500),
  (2, 'CREATED', 1500);

-- =========================
-- Order Items for Order 1
-- =========================
INSERT INTO order_items (order_id, product_id, qty, unit_price_cents, subtotal_cents)
VALUES
  (1, 1, 1, 850000, 850000), -- Laptop
  (1, 2, 1, 1500, 1500);     -- Mouse

-- =========================
-- Order Items for Order 2
-- =========================
INSERT INTO order_items (order_id, product_id, qty, unit_price_cents, subtotal_cents)
VALUES
  (2, 2, 1, 1500, 1500); -- Un mouse para Bob

-- =========================
-- Idempotency Keys (ejemplo)
-- =========================
INSERT INTO idempotency_keys (`key`, target_type, target_id, status, response_body, expires_at)
VALUES
  (
    'order-create-abc123',
    'order',
    1,
    'CONFIRMED',
    JSON_OBJECT(
      'orderId', 1,
      'message', 'Order already created via idempotency'
    ),
    DATE_ADD(NOW(), INTERVAL 1 DAY)
  );
