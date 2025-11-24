# Lambda Orchestrator

AWS Lambda que orquesta la creación y confirmación de órdenes coordinando Customers API y Orders API.

## Tecnologías

- Node.js 22.x
- AWS Lambda
- Serverless Framework v3
- Axios
- JSON Web Tokens (JWT)

## Variables de Entorno

### Desarrollo Local

Crea un archivo `.env` en este directorio:

```env
# Desarrollo Local (Serverless Offline)
CUSTOMERS_API_URL=http://localhost:3001
ORDERS_API_URL=http://localhost:3002
JWT_SECRET=your_jwt_secret_key_change_in_production
PORT=3000
```

### Producción (AWS Lambda)

Crea un archivo `.env.production` en este directorio:

```env
# Producción (AWS Lambda con túneles Cloudflare)
CUSTOMERS_API_URL=https://your-cloudflare-url.trycloudflare.com
ORDERS_API_URL=https://your-cloudflare2-url.trycloudflare.com
JWT_SECRET=your_jwt_secret_key_change_in_production
PORT=3000
```

**Importante:** El `JWT_SECRET` debe ser idéntico en todos los servicios (orchestrator, customers_api, orders_api).

## Instalación

```bash
npm install --legacy-peer-deps
```

## Ejecución Local

```bash
npx serverless offline
```

El orchestrator estará disponible en: `http://localhost:3000`

## Deploy a AWS

### Requisitos
- AWS CLI configurado (`aws configure`)
- Cuenta de AWS con permisos para Lambda y API Gateway
- Túneles Cloudflare corriendo y URLs actualizadas en `.env.production`

### Comandos

```bash
# Deploy con variables de producción
cp .env .env.backup
cp .env.production .env
npx serverless@3 deploy
mv .env.backup .env

# Ver información del servicio
npx serverless@3 info

# Ver logs en tiempo real
npx serverless@3 logs -f orchestrateOrder --tail

# Eliminar el stack
npx serverless@3 remove
```

## Endpoint

### POST /create-and-confirm-order

Crea y confirma una orden completa, validando el cliente y coordinando con ambas APIs usando JWT para autenticación entre servicios.

**Request:**
```json
{
  "customer_id": 1,
  "items": [
    {
      "productId": 1,
      "qty": 2
    }
  ],
  "idempotency_key": "order-001",
  "correlation_id": "corr-123"
}
```

**Campos:**
- `customer_id` (number, requerido): ID del cliente
- `items` (array, requerido): Lista de productos con `productId` y `qty`
- `idempotency_key` (string, requerido): Clave única para idempotencia
- `correlation_id` (string, opcional): ID de correlación que se retorna en la respuesta para identificar la transacción

**Response (201):**
```json
{
  "success": true,
  "correlationId": "corr-123",
  "data": {
    "customer": {
      "id": 1,
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "phone": "0991234567"
    },
    "order": {
      "id": 1,
      "customer_id": 1,
      "status": "CONFIRMED",
      "total_cents": 1700000,
      "created_at": "2025-11-24T18:30:00.000Z",
      "confirmed_at": "2025-11-24T18:30:01.000Z",
      "items": [
        {
          "product_id": 1,
          "qty": 2,
          "unit_price_cents": 850000,
          "subtotal_cents": 1700000
        }
      ]
    }
  }
}
```

## Autenticación JWT

El orchestrator genera **automáticamente** tokens JWT para comunicarse con las APIs:

1. **No requiere JWT del usuario** - Los usuarios llaman al endpoint sin autenticación
2. **Genera JWT internamente** - Crea tokens con firma criptográfica usando `JWT_SECRET`
3. **Tokens con expiración** - Los JWTs expiran en 24 horas
4. **Validación en APIs** - Las APIs validan la firma y tipo de token

**Ejemplo de generación interna:**
```javascript
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
```

## Flujo de Ejecución

1. **Valida cliente** via `GET /api/internal/customers/:id` (Customers API) con JWT
2. **Crea orden** via `POST /api/orders` (Orders API) con JWT
3. **Confirma orden** via `POST /api/orders/:id/confirm` con `X-Idempotency-Key` y JWT
4. **Obtiene items** via `GET /api/orders/:id` con JWT (estado más actualizado)
5. **Retorna** JSON consolidado con customer + order + items

## Generar JWT para Testing

Para probar endpoints internos que requieren JWT (como `/api/internal/customers/:id`), genera un token de prueba:

```bash
npm run generate-jwt
```

Este comando imprime un JWT válido por 24 horas que puedes usar en Postman o en headers de `Authorization: Bearer <token>`.

## Testing

### Local
```bash
curl -X POST http://localhost:3000/create-and-confirm-order \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [{"productId": 1, "qty": 2}],
    "idempotency_key": "local-test-001",
    "correlation_id": "corr-local-123"
  }'
```

### AWS (después del deploy)
```bash
curl -X POST https://4z6a4159x3.execute-api.us-east-1.amazonaws.com/create-and-confirm-order \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [{"productId": 1, "qty": 2}],
    "idempotency_key": "aws-test-001",
    "correlation_id": "corr-aws-123"
  }'
```

### Invocar localmente con Serverless CLI
```bash
npx serverless invoke local -f orchestrateOrder -d '{
  "body": "{\"customer_id\": 1, \"items\": [{\"productId\": 1, \"qty\": 2}], \"idempotency_key\": \"test-001\"}"
}'
```

## Configuración AWS

El archivo `serverless.yml` configura:
- Runtime: Node.js 22.x
- Memoria: 256 MB (default)
- Timeout: 29 segundos
- Región: us-east-1
- Variables de entorno desde `.env`

## Estructura del Proyecto

```
lambda-orchestrator/
├── src/
│   └── handler.js           # Lógica principal del Lambda + JWT
├── .env                     # Variables de entorno (local)
├── .env.production          # Variables de entorno (AWS)
├── serverless.yml           # Configuración de Serverless
├── README.md
└── package.json
```

## Notas Importantes

### Despliegue
- **Siempre** usa `.env.production` al desplegar a AWS
- Las URLs de `.env.production` deben ser accesibles públicamente (Cloudflare tunnels)
- Después del deploy, restaura `.env` para desarrollo local

### Seguridad
- El `JWT_SECRET` debe ser idéntico en todos los servicios
- Los JWTs se generan automáticamente, los usuarios no los envían
- Los tokens expiran en 24 horas
- Las APIs validan la firma criptográfica de cada token

### Limitaciones
- Los túneles de Cloudflare generan URLs temporales que cambian al reiniciar
- Para producción real, las APIs deberían estar en servidores permanentes (EC2, ECS, Fargate, etc.)
- Runtime nodejs22.x muestra warning en Serverless Framework v3 (funcionalmente correcto)
