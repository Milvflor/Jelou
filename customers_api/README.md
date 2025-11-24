# Customers API

API REST para gestión de clientes del sistema de órdenes.

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
PORT=3001
JWT_SECRET=your_jwt_secret_key_change_in_production

# Solo para producción con túneles
PUBLIC_URL=https://your-cloudflare-url.trycloudflare.com
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

### Públicos
- `GET /api/health` - Health check
- `GET /api/customers` - Listar todos los clientes
- `GET /api/customers/:id` - Obtener cliente por ID
- `POST /api/customers` - Crear nuevo cliente

### Internos (requieren autenticación)
- `GET /api/internal/customers/:id` - Obtener cliente

## Documentación

Swagger UI disponible en: `http://localhost:3001/api/docs`

OpenAPI JSON: `http://localhost:3001/api/docs.json`

## Autenticación

Los endpoints internos (`/api/internal/*`) requieren un JWT válido:
- Los servicios generan tokens JWT firmados con `JWT_SECRET`
- Token incluye: `{ type: 'service', service: 'nombre-servicio' }`
- Expiración: 24 horas
- Header: `Authorization: Bearer {JWT_TOKEN}`

Ejemplo de uso desde otros servicios (automático en el código):
```javascript
const token = jwt.sign({ type: 'service', service: 'orders-api' }, JWT_SECRET, { expiresIn: '5m' });
```

## Testing

```bash
# Health check
curl http://localhost:3001/api/health

# Listar clientes
curl http://localhost:3001/api/customers

# Obtener cliente específico
curl http://localhost:3001/api/customers/1

# Crear cliente
curl -X POST http://localhost:3001/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "0999999999"
  }'

# Endpoint interno (requiere token)
curl http://localhost:3001/api/internal/customers/1 \
  -H "Authorization: Bearer my__here"
```

## Base de Datos

### Schema
Ver [/db/schema.sql](../db/schema.sql) para el schema completo.

Tabla principal:
```sql
CREATE TABLE customers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(30) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

**Con Docker:**
```bash
docker-compose up -d 
```

## Estructura del Proyecto

```
customers_api/
├── src/
│   ├── index.js              # Entry point
│   ├── controllers/          # Lógica de negocio
│   └── routes/               # Definición de rutas
├── scripts/                  # Scripts de DB
├── .env                      # Variables de entorno
└── package.json
```
