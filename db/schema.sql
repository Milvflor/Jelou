-- Crear base de datos
CREATE DATABASE IF NOT EXISTS tech_test;
USE tech_test;

-- =========================
-- Tabla: customers
-- =========================
CREATE TABLE customers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(30) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- Tabla: products
-- =========================
CREATE TABLE products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  price_cents INT UNSIGNED NOT NULL, 
  stock INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- Tabla: orders
-- =========================
CREATE TABLE orders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id INT UNSIGNED NOT NULL,
  status ENUM('CREATED','CONFIRMED','CANCELED') NOT NULL DEFAULT 'CREATED',
  total_cents INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP NULL,
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Índice para búsquedas por cliente
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- =========================
-- Tabla: order_items
-- =========================
CREATE TABLE order_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  qty INT UNSIGNED NOT NULL,
  unit_price_cents INT UNSIGNED NOT NULL,
  subtotal_cents INT UNSIGNED NOT NULL,
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Índices para joins
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- =========================
-- Tabla: idempotency_keys
-- =========================
CREATE TABLE idempotency_keys (
  `key` VARCHAR(100) NOT NULL PRIMARY KEY,   -- identificador único enviado por el cliente
  target_type VARCHAR(50) NOT NULL,          -- 'order'
  target_id INT UNSIGNED NULL,               -- id del recurso creado (order_id)
  status ENUM('CREATED','CONFIRMED','CANCELED') NOT NULL DEFAULT 'CREATED',
  response_body JSON NULL,                   
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Índice opcional para limpieza por expiración
CREATE INDEX idx_idempotency_expires_at ON idempotency_keys(expires_at);
