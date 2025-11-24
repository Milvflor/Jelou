# Orders API

API REST para gestión de órdenes, productos e idempotencia.

## Tecnologías

- Node.js + Express
- MySQL 9.0
- Swagger/OpenAPI
- Zod

## Variables de Entorno

Crea un archivo `.env` en este directorio:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=tech_test
PORT=3002
JWT_SECRET=your_jwt_secret_key_change_in_production
CUSTOMERS_API_URL=http://localhost:3001

# Solo para producción con túneles
PUBLIC_URL=https://your-cloudflare2-url.trycloudflare.com
```

## Instalación

```bash
npm install
```

## Ejecución

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

## Endpoints

### Health
- `GET /api/health` - Health check

### Productos
- `GET /api/products` - Listar productos
- `GET /api/products/:id` - Obtener producto por ID
- `POST /api/products` - Crear producto
- `PATCH /api/products/:id` - Actualizar stock/precio

### Órdenes
- `GET /api/orders` - Listar órdenes (con paginación)
- `GET /api/orders/:id` - Obtener orden con items
- `POST /api/orders` - Crear orden
- `POST /api/orders/:id/confirm` - Confirmar orden (requiere `X-Idempotency-Key`)
- `POST /api/orders/:id/cancel` - Cancelar orden

## Documentación

Swagger UI disponible en: `http://localhost:3002/api/docs`

OpenAPI JSON: `http://localhost:3002/api/docs.json`

## Reglas de Negocio

### Cancelación de Órdenes

- **CREATED**: Se puede cancelar siempre (sin restricción de tiempo)
- **CONFIRMED**: Se puede cancelar solo dentro de 10 minutos desde `confirmed_at`
  - Dentro de 10 minutos: Cancelación permitida
  - Después de 10 minutos: Cancelación rechazada
- **CANCELED**: Ya está cancelada (operación idempotente)

Al cancelar una orden, se restaura automáticamente el stock de todos los productos.

### Campo `confirmed_at`

Las órdenes tienen un campo `confirmed_at` (TIMESTAMP NULL) que se establece automáticamente cuando la orden cambia a estado CONFIRMED:

```sql
UPDATE orders SET status = 'CONFIRMED', confirmed_at = NOW() WHERE id = ?;
```

### Idempotencia

El endpoint `/orders/:id/confirm` requiere el header `X-Idempotency-Key`:
- Primera llamada: procesa y guarda respuesta
- Llamadas repetidas con misma key: retorna respuesta guardada sin reprocesar
- Keys en estado `CANCELED`: retorna error 400

## Testing

```bash
# Health check
curl http://localhost:3002/api/health

# Listar productos
curl http://localhost:3002/api/products

# Crear producto
curl -X POST http://localhost:3002/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "SKU-5001",
    "name": "Keyboard",
    "price_cents": 50000,
    "stock": 100
  }'

# Crear orden
curl -X POST http://localhost:3002/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "items": [{"productId": 1, "qty": 2}]
  }'

# Confirmar orden (requiere X-Idempotency-Key)
curl -X POST http://localhost:3002/api/orders/1/confirm \
  -H "X-Idempotency-Key: confirm-order-1"

# Cancelar orden
curl -X POST http://localhost:3002/api/orders/1/cancel

# Buscar órdenes con paginación
curl "http://localhost:3002/api/orders?status=CONFIRMED&limit=10&offset=0"
```

## Base de Datos

### Schema
Ver [/db/schema.sql](../db/schema.sql) para el schema completo.

Tablas principales:
```sql
CREATE TABLE products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  price_cents INT UNSIGNED NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id INT UNSIGNED NOT NULL,
  status ENUM('CREATED','CONFIRMED','CANCELED') NOT NULL DEFAULT 'CREATED',
  total_cents INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE order_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  qty INT UNSIGNED NOT NULL,
  unit_price_cents INT UNSIGNED NOT NULL,
  subtotal_cents INT UNSIGNED NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE idempotency_keys (
  `key` VARCHAR(100) NOT NULL PRIMARY KEY,
  target_type VARCHAR(50) NOT NULL,
  target_id INT UNSIGNED NULL,
  status ENUM('CREATED','CONFIRMED','CANCELED') NOT NULL DEFAULT 'CREATED',
  response_body JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL
);
```

## Scripts Disponibles

### Ejecución de la API
- `npm run dev` - Ejecuta con nodemon (hot reload)
- `npm start` - Ejecuta en modo producción
- `npm run openapi` - Genera archivo OpenAPI YAML

### Scripts de Base de Datos (Uso Manual Opcional)

**Importante**: Si usas **Docker Compose**, la base de datos se inicializa automáticamente y **NO necesitas** ejecutar estos scripts.

Estos scripts solo son útiles si:
- Ejecutas MySQL localmente **sin Docker**
- Necesitas re-ejecutar migraciones manualmente durante desarrollo

```bash
# Solo si NO usas Docker
npm run migrate  # Ejecuta db/schema.sql (crea tablas)
npm run seed     # Ejecuta db/seed.sql (inserta datos de prueba)
```

**Con Docker (recomendado):**
```bash
docker-compose up -d  # ✅ Ya inicializa todo automáticamente
```

## Estructura del Proyecto

```
orders_api/
├── src/
│   ├── index.js              # Entry point
│   ├── controllers/          # Lógica de negocio
│   └── routes/               # Definición de rutas
├── scripts/                  # Scripts de DB
├── .env                      # Variables de entorno
└── package.json
```
