# Tech - Orders System

Sistema de microservicios para gestión de órdenes con Lambda Orchestrator.

## Arquitectura del Proyecto

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Lambda         │────▶│  Customers API  │     │  MySQL          │
│  Orchestrator   │     │  :3001          │────▶│  :3306          │
│  :3000          │────▶│                 │     │                 │
│                 │     ├─────────────────┤     │                 │
│                 │────▶│  Orders API     │────▶│                 │
│                 │     │  :3002          │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        └───────────────────────┴───────────────────────┘
                  JWT Authentication (automático)
```

## Documentación por Servicio

Cada servicio tiene su propia documentación detallada:

- **[Customers API](./customers_api/README.md)** - Gestión de clientes
- **[Orders API](./orders_api/README.md)** - Gestión de órdenes y productos
- **[Lambda Orchestrator](./lambda-orchestrator/README.md)** - Orquestador de órdenes

## Modos de Ejecución

### Opción A: Desarrollo Local

Ejecuta todos los servicios en tu máquina local:

```bash
# 1. Levantar base de datos y APIs con Docker
docker-compose up -d

# 2. Iniciar Lambda Orchestrator local
cd lambda-orchestrator
npm install
npx serverless offline

# 3. En otra terminal, probar el sistema
curl -X POST http://localhost:3000/create-and-confirm-order \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [{"productId": 1, "qty": 2}],
    "idempotency_key": "local-test-001",
    "correlation_id": "corr-local-123"
  }'
```

### Opción B: Deploy en AWS Lambda

Despliega el orchestrator en AWS Lambda con APIs que corren localmente con túneles:

```bash
# 1. Levantar servicios con túneles Cloudflare
docker-compose --profile tunnels up -d
sleep 5

# 2. Obtener URLs de los túneles
echo "=== Customers API ===" && docker logs cloudflared-customers 2>&1 | grep "trycloudflare.com"
echo "=== Orders API ===" && docker logs cloudflared-orders 2>&1 | grep "trycloudflare.com"
# En este caso se usó cloudflared dado que en su versión gratuita permite más de un túnel en ejecución, mientras que ngrok solo permite 1.

# 3. Actualizar lambda-orchestrator/.env.production con las URLs obtenidas
# Edita el archivo manualmente con las URLs del paso anterior:
# CUSTOMERS_API_URL=https://tu-url-customers.trycloudflare.com
# ORDERS_API_URL=https://tu-url-orders.trycloudflare.com

# 4. Verificar que los túneles funcionan
curl https://tu-url-customers.trycloudflare.com/api/health
curl https://tu-url-orders.trycloudflare.com/api/health

# 5. Deploy a AWS con variables de producción
cd lambda-orchestrator
npm install
# Temporalmente usa .env.production para el deploy
cp .env .env.backup
cp .env.production .env
npx serverless@3 deploy
# Restaura .env para desarrollo local
mv .env.backup .env

# 6. Probar el Lambda en AWS (reemplaza con tu URL del deploy)
curl -X POST https://abc123xyz.execute-api.us-east-1.amazonaws.com/create-and-confirm-order \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [{"productId": 1, "qty": 2}],
    "idempotency_key": "aws-test-001",
    "correlation_id": "corr-aws-123"
  }'

# 7. Limpiar recursos de AWS cuando termines
npx serverless@3 remove
```

### Reiniciar desde Cero

Para limpiar y reiniciar la base de datos:

```bash
 docker-compose down -v && \
docker system prune -af --volumes && \
docker volume prune -f    # Elimina volúmenes (borra datos)

docker-compose up -d      # Se reinicializa automáticamente
```

### Schema

El esquema completo está en [`db/schema.sql`](./db/schema.sql) e incluye:

- **customers** - Información de clientes
- **products** - Catálogo de productos
- **orders** - Órdenes con estados (CREATED, CONFIRMED, CANCELED)
- **order_items** - Items de cada orden
- **idempotency_keys** - Control de idempotencia

**Campo importante**: `orders.confirmed_at` se establece automáticamente al confirmar la orden y se usa para validar la ventana de 10 minutos para cancelación.

## Variables de Entorno

Cada servicio necesita su archivo `.env`:

### Customers API
```env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=root
DB_NAME=tech_test
PORT=3001
JWT_SECRET=your_jwt_secret_key_change_in_production
```

### Orders API
```env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=root
DB_NAME=tech_test
PORT=3002
JWT_SECRET=your_jwt_secret_key_change_in_production
CUSTOMERS_API_URL=http://localhost:3001
```

### Lambda Orchestrator

**`.env` (desarrollo local):**
```env
CUSTOMERS_API_URL=http://localhost:3001
ORDERS_API_URL=http://localhost:3002
JWT_SECRET=your_jwt_secret_key_change_in_production
PORT=3000
```

**`.env.production` (AWS Lambda):**
```env
CUSTOMERS_API_URL=https://tu-url-customers.trycloudflare.com
ORDERS_API_URL=https://tu-url-orders.trycloudflare.com
JWT_SECRET=your_jwt_secret_key_change_in_production
PORT=3000
```

**Importante**:
- `JWT_SECRET` debe ser el mismo en todos los servicios para que la validación funcione
- Para producción, usa un secreto fuerte y único (ej: generado con `openssl rand -hex 32`)
- Para AWS Lambda, usa las URLs de los túneles Cloudflare en `.env.production`


### APIs Locales

```bash
# Health checks
curl http://localhost:3001/api/health
curl http://localhost:3002/api/health

# Swagger UI
open http://localhost:3001/api/docs
open http://localhost:3002/api/docs

# Listar clientes
curl http://localhost:3001/api/customers

# Listar productos
curl http://localhost:3002/api/products

# Ver orden específica
curl http://localhost:3002/api/orders/1
```

### Serverless (Lambda)

```bash
# Deploy (ejecuta predeploy que genera JWT automáticamente)
npm run deploy

# Ver información del servicio deployado
npx serverless@3 info

# Ver logs en tiempo real
npx serverless@3 logs -f orchestrateOrder --tail

# Eliminar stack de AWS
npx serverless@3 remove
```

## Seguridad y Autenticación

### JWT para Comunicación entre Servicios

Todos los servicios internos se comunican usando **JSON Web Tokens (JWT)**:

- El Lambda Orchestrator genera JWTs automáticamente al llamar a las APIs
- Orders API genera JWTs al llamar a Customers API
- Customers API valida los JWTs en su endpoint interno `/api/internal/customers/:id`

**Flujo de autenticación:**
```
1. Usuario → Lambda (sin JWT)
2. Lambda → Customers API (con JWT generado)
3. Lambda → Orders API (con JWT generado)
4. Orders API → Customers API (con JWT generado)
```

**Importante:**
- Los usuarios finales **NO necesitan enviar JWTs** al Lambda
- Los JWTs se generan y validan automáticamente entre servicios
- El `JWT_SECRET` debe ser idéntico en todos los servicios
- Los tokens de servicio expiran en 24 horas

### Generar JWT para Testing

Para probar endpoints internos (como `/api/internal/customers/:id`) en Postman o herramientas similares:

```bash
cd lambda-orchestrator
npm run generate-jwt
```

Este comando genera un token JWT válido por 24 horas que puedes copiar y usar en:
- Postman: Header `Authorization: Bearer <token>`
- curl: `-H "Authorization: Bearer <token>"`

El token también se genera automáticamente antes de cada deploy con `npm run deploy`.

## Reglas de Backoffice de Pedidos B2B

### Cancelación de Órdenes

- **CREATED**: Se puede cancelar siempre
- **CONFIRMED**: Se puede cancelar solo dentro de 10 minutos desde `confirmed_at`
- **CANCELED**: Ya está cancelada (idempotente)

Al cancelar una orden se restaura automáticamente el stock de los productos.

### Idempotencia

El endpoint `/orders/:id/confirm` requiere el header `X-Idempotency-Key`. Las llamadas repetidas con la misma key retornan la respuesta guardada sin reprocesar.

## Probando Flujo

```bash
# 1. Crear orden via Orchestrator
curl -X POST http://localhost:3000/create-and-confirm-order \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [{"productId": 1, "qty": 2}],
    "idempotency_key": "test-e2e-001",
    "correlation_id": "corr-e2e-001"
  }'

# 2. Verificar orden creada (guarda el ID de la respuesta)
curl http://localhost:3002/api/orders/1

# 3. Cancelar orden dentro de 10 minutos
curl -X POST http://localhost:3002/api/orders/1/cancel

# 4. Verificar stock restaurado
curl http://localhost:3002/api/products/1
```

## Estructura del Proyecto Generalizada

```
.
├── customers_api/           # API de clientes
│   ├── src/
│   │   └── middlewares/
│   │       └── jwtAuth.js   # Validación JWT
│   ├── README.md
│   └── package.json
├── orders_api/              # API de órdenes y productos
│   ├── src/
│   │   └── middlewares/
│   │       └── jwtAuth.js   # Validación JWT
│   ├── README.md
│   └── package.json
├── lambda-orchestrator/     # Lambda AWS
│   ├── src/
│   │   └── handler.js       # Generación JWT para servicios
│   ├── scripts/
│   │   └── generate-jwt.js  # Generación JWT para testing
│   ├── .env                 # Local
│   ├── .env.production      # AWS
│   ├── serverless.yml
│   ├── README.md
│   └── package.json
├── db/
│   ├── schema.sql          # Esquema completo de DB
│   └── seed.sql            # Datos de prueba
├── docker-compose.yml       # Orquestación de servicios
└── README.md               # Este archivo
```

## URLs del Sistema

### Desarrollo Local
- Lambda Orchestrator: `http://localhost:3000`
- Customers API: `http://localhost:3001`
- Orders API: `http://localhost:3002`
- Swagger Customers: `http://localhost:3001/api/docs`
- Swagger Orders: `http://localhost:3002/api/docs`

### AWS Lambda (después del deploy)
- API Gateway: `https://4z6a4159x3.execute-api.us-east-1.amazonaws.com/create-and-confirm-order`

## Importante

- Para AWS Lambda, las APIs deben ser accesibles desde internet (usa túneles para desarrollo)
- Los túneles de Cloudflare generan URLs temporales que cambian al reiniciar
- El `JWT_SECRET` debe coincidir en todos los servicios para que funcione la autenticación
- Para producción real, las APIs deberían estar en servidores públicos (EC2, ECS, Fargate, etc.)
- **Despliegue a AWS:** Usa el archivo `.env.production` con las URLs públicas de Cloudflare
