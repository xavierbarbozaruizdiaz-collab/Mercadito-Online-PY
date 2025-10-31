# 📡 Documentación de API - Mercadito Online PY

## 🌐 Endpoints de la API

### Base URL
```
Production: https://mercadito-online-py.vercel.app/api
Development: http://localhost:3000/api
```

## 🔐 Autenticación

La mayoría de los endpoints requieren autenticación mediante Supabase JWT.

### Headers Requeridos
```http
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

## 📦 Productos

### GET /api/products
Obtiene una lista de productos con filtros opcionales.

**Query Parameters:**
- `category` (string, opcional): ID de categoría
- `search` (string, opcional): Término de búsqueda
- `min_price` (number, opcional): Precio mínimo
- `max_price` (number, opcional): Precio máximo
- `condition` (string, opcional): Condición del producto
- `page` (number, opcional): Número de página (default: 1)
- `limit` (number, opcional): Elementos por página (default: 20)

**Ejemplo:**
```http
GET /api/products?category=electronics&min_price=10000&max_price=50000&page=1
```

**Respuesta:**
```json
{
  "products": [
    {
      "id": "uuid",
      "title": "Producto ejemplo",
      "description": "Descripción del producto",
      "price": 25000,
      "compare_price": 30000,
      "stock_quantity": 10,
      "category_id": "uuid",
      "seller_id": "uuid",
      "condition": "new",
      "sale_type": "fixed",
      "status": "active",
      "cover_url": "https://...",
      "created_at": "2025-01-28T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### GET /api/products/[id]
Obtiene los detalles de un producto específico.

**Ejemplo:**
```http
GET /api/products/123e4567-e89b-12d3-a456-426614174000
```

**Respuesta:**
```json
{
  "id": "uuid",
  "title": "Producto ejemplo",
  "description": "Descripción completa",
  "price": 25000,
  "compare_price": 30000,
  "stock_quantity": 10,
  "category_id": "uuid",
  "seller_id": "uuid",
  "seller": {
    "id": "uuid",
    "full_name": "Vendedor Ejemplo",
    "store_name": "Tienda Ejemplo",
    "rating": 4.5,
    "total_reviews": 120
  },
  "images": [
    {
      "id": "uuid",
      "url": "https://...",
      "is_cover": true
    }
  ],
  "reviews": [
    {
      "id": "uuid",
      "rating": 5,
      "comment": "Excelente producto",
      "buyer": {
        "full_name": "Comprador Ejemplo"
      },
      "created_at": "2025-01-28T00:00:00Z"
    }
  ]
}
```

### POST /api/products
Crea un nuevo producto. Requiere autenticación de vendedor.

**Body:**
```json
{
  "title": "Nuevo Producto",
  "description": "Descripción del producto",
  "price": 25000,
  "compare_price": 30000,
  "category_id": "uuid",
  "stock_quantity": 10,
  "condition": "new",
  "sale_type": "fixed",
  "tags": ["tag1", "tag2"],
  "images": [
    {
      "url": "https://...",
      "is_cover": true
    }
  ]
}
```

**Respuesta:**
```json
{
  "id": "uuid",
  "title": "Nuevo Producto",
  "status": "active",
  "created_at": "2025-01-28T00:00:00Z"
}
```

### PUT /api/products/[id]
Actualiza un producto existente. Requiere autenticación y que seas el vendedor.

**Body:** (mismos campos que POST, todos opcionales)

### DELETE /api/products/[id]
Elimina un producto. Requiere autenticación y que seas el vendedor.

## 🛒 Carrito

### GET /api/cart
Obtiene los items del carrito del usuario autenticado.

**Respuesta:**
```json
{
  "items": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "quantity": 2,
      "product": {
        "id": "uuid",
        "title": "Producto",
        "price": 25000,
        "cover_url": "https://..."
      }
    }
  ],
  "total": 50000
}
```

### POST /api/cart
Agrega un producto al carrito.

**Body:**
```json
{
  "product_id": "uuid",
  "quantity": 1
}
```

### PUT /api/cart/[id]
Actualiza la cantidad de un item del carrito.

**Body:**
```json
{
  "quantity": 3
}
```

### DELETE /api/cart/[id]
Elimina un item del carrito.

## 💳 Órdenes

### GET /api/orders
Obtiene las órdenes del usuario autenticado.

**Query Parameters:**
- `status` (string, opcional): Filtrar por estado
- `page` (number, opcional): Número de página

**Respuesta:**
```json
{
  "orders": [
    {
      "id": "uuid",
      "status": "pending",
      "total": 50000,
      "items": [
        {
          "product_id": "uuid",
          "quantity": 2,
          "price": 25000
        }
      ],
      "created_at": "2025-01-28T00:00:00Z"
    }
  ]
}
```

### POST /api/orders
Crea una nueva orden desde el carrito.

**Body:**
```json
{
  "shipping_address": {
    "street": "Calle Ejemplo 123",
    "city": "Asunción",
    "department": "Asunción",
    "postal_code": "1000"
  },
  "payment_method": "cash_on_delivery"
}
```

**Respuesta:**
```json
{
  "id": "uuid",
  "status": "pending",
  "total": 50000,
  "created_at": "2025-01-28T00:00:00Z"
}
```

### GET /api/orders/[id]
Obtiene los detalles de una orden específica.

### PUT /api/orders/[id]
Actualiza el estado de una orden (solo para vendedores).

**Body:**
```json
{
  "status": "confirmed",
  "tracking_number": "TRACK123456"
}
```

## 👥 Vendedores y Tiendas

### GET /api/sellers
Obtiene una lista de vendedores.

**Query Parameters:**
- `location` (string, opcional)
- `min_rating` (number, opcional)
- `verified` (boolean, opcional)

### GET /api/sellers/[id]
Obtiene el perfil completo de un vendedor.

**Respuesta:**
```json
{
  "id": "uuid",
  "full_name": "Vendedor Ejemplo",
  "store_name": "Tienda Ejemplo",
  "description": "Descripción de la tienda",
  "location": "Asunción",
  "rating": 4.5,
  "total_reviews": 120,
  "total_products": 50,
  "verified": true,
  "avatar_url": "https://...",
  "store_banner": "https://..."
}
```

### GET /api/stores/[slug]
Obtiene información de una tienda por su slug.

## 💬 Chat

### GET /api/chat/conversations
Obtiene todas las conversaciones del usuario.

**Respuesta:**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "participant": {
        "id": "uuid",
        "full_name": "Usuario Ejemplo",
        "avatar_url": "https://..."
      },
      "last_message": {
        "content": "Último mensaje",
        "created_at": "2025-01-28T00:00:00Z"
      },
      "unread_count": 2
    }
  ]
}
```

### GET /api/chat/conversations/[id]/messages
Obtiene los mensajes de una conversación.

**Query Parameters:**
- `page` (number, opcional)
- `limit` (number, opcional)

**Respuesta:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "content": "Mensaje ejemplo",
      "sender_id": "uuid",
      "sender": {
        "full_name": "Usuario Ejemplo",
        "avatar_url": "https://..."
      },
      "created_at": "2025-01-28T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

### POST /api/chat/messages
Envía un nuevo mensaje.

**Body:**
```json
{
  "conversation_id": "uuid",
  "content": "Mensaje de ejemplo"
}
```

## 🔍 Búsqueda

### GET /api/search
Búsqueda avanzada de productos y tiendas.

**Query Parameters:**
- `q` (string, requerido): Término de búsqueda
- `type` (string, opcional): `products` o `stores` (default: `products`)
- `category` (string, opcional)
- `min_price` (number, opcional)
- `max_price` (number, opcional)
- `location` (string, opcional)

**Respuesta:**
```json
{
  "results": [
    {
      "id": "uuid",
      "title": "Producto encontrado",
      "price": 25000,
      "cover_url": "https://...",
      "relevance_score": 0.95
    }
  ],
  "suggestions": ["producto 1", "producto 2"],
  "trending": ["tendencia 1", "tendencia 2"]
}
```

### GET /api/search/suggestions
Obtiene sugerencias de búsqueda.

**Query Parameters:**
- `q` (string, requerido): Término de búsqueda

## 📊 Analytics

### POST /api/analytics/events
Registra un evento de analytics.

**Body:**
```json
{
  "event_type": "page_view",
  "event_name": "product_view",
  "properties": {
    "product_id": "uuid",
    "category": "electronics"
  }
}
```

## ❤️ Reviews

### GET /api/products/[id]/reviews
Obtiene las reseñas de un producto.

**Query Parameters:**
- `page` (number, opcional)
- `limit` (number, opcional)
- `rating` (number, opcional): Filtrar por calificación

### POST /api/products/[id]/reviews
Crea una nueva reseña. Requiere autenticación y haber comprado el producto.

**Body:**
```json
{
  "rating": 5,
  "comment": "Excelente producto, muy recomendado"
}
```

## 🔔 Notificaciones

### GET /api/notifications
Obtiene las notificaciones del usuario.

**Query Parameters:**
- `unread_only` (boolean, opcional)
- `page` (number, opcional)

**Respuesta:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "new_message",
      "title": "Nuevo mensaje",
      "message": "Tienes un nuevo mensaje",
      "is_read": false,
      "created_at": "2025-01-28T00:00:00Z"
    }
  ]
}
```

### PUT /api/notifications/[id]/read
Marca una notificación como leída.

### PUT /api/notifications/read-all
Marca todas las notificaciones como leídas.

## 🔧 Utilidades

### GET /api/health
Health check endpoint.

**Respuesta:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-28T00:00:00Z",
  "version": "1.0.0"
}
```

## ⚠️ Códigos de Error

- `200` - Éxito
- `201` - Creado exitosamente
- `400` - Solicitud inválida
- `401` - No autorizado
- `403` - Prohibido
- `404` - No encontrado
- `429` - Demasiadas solicitudes
- `500` - Error del servidor

## 📝 Notas

- Todos los timestamps están en formato ISO 8601
- Todos los IDs son UUIDs
- Los precios están en Guaraníes (PYG)
- El rate limiting es de 100 requests por minuto por IP

---

**Última actualización**: Enero 2025

