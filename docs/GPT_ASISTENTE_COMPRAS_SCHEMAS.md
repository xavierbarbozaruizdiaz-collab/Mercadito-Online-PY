# Schemas de Acciones para GPT - Asistente de Compras

## 📋 Configuración en GPT Builder

Estos son los schemas JSON que debés configurar en la sección "Acciones" del GPT Builder de OpenAI.

---

## 1. searchProducts

**Nombre de la acción:** `searchProducts`

**Descripción:** Busca productos disponibles en Mercadito Online PY según criterios de búsqueda y filtros.

**Schema:**

```json
{
  "type": "function",
  "function": {
    "name": "searchProducts",
    "description": "Busca productos disponibles en Mercadito Online PY. Usa esto cuando el usuario quiera comprar o buscar algo específico.",
    "parameters": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "Texto de búsqueda. Ejemplos: 'notebook dell', 'zapatillas nike', 'heladera no frost'"
        },
        "category_id": {
          "type": "string",
          "description": "ID de categoría (opcional). Solo usar si el usuario especifica una categoría específica."
        },
        "min_price": {
          "type": "number",
          "description": "Precio mínimo en guaraníes (opcional). Solo usar si el usuario especifica un presupuesto mínimo."
        },
        "max_price": {
          "type": "number",
          "description": "Precio máximo en guaraníes (opcional). Solo usar si el usuario especifica un presupuesto máximo o dice 'hasta X guaraníes'."
        },
        "condition": {
          "type": "string",
          "enum": ["new", "used", "refurbished"],
          "description": "Condición del producto (opcional). 'new' = nuevo, 'used' = usado, 'refurbished' = reacondicionado."
        },
        "sale_type": {
          "type": "string",
          "enum": ["fixed", "auction", "negotiable"],
          "description": "Tipo de venta (opcional). 'fixed' = precio fijo, 'auction' = subasta, 'negotiable' = negociable."
        },
        "location": {
          "type": "string",
          "description": "Ubicación/ciudad (opcional). Ejemplos: 'Asunción', 'Ciudad del Este', 'Encarnación'."
        },
        "limit": {
          "type": "number",
          "description": "Cantidad máxima de resultados (opcional, default: 12, máximo: 60). Usar 6-12 para mostrar al usuario."
        }
      },
      "required": ["query"]
    }
  }
}
```

**Endpoint interno:** `SearchService.searchProducts()` (llamado desde el backend)

**Ejemplo de uso:**
```json
{
  "query": "notebook dell",
  "max_price": 5000000,
  "condition": "new",
  "limit": 6
}
```

---

## 2. createSourcingOrder

**Nombre de la acción:** `createSourcingOrder`

**Descripción:** Crea un pedido "por conseguir" cuando no hay productos disponibles o el usuario quiere algo específico que no está listado.

**Schema:**

```json
{
  "type": "function",
  "function": {
    "name": "createSourcingOrder",
    "description": "Crea un pedido por conseguir en Mercadito Online. Usa esto cuando searchProducts no devuelve resultados relevantes, o cuando el usuario explícitamente dice 'aunque no esté en la página, conseguímelo' o 'buscámelo aunque no esté listado'.",
    "parameters": {
      "type": "object",
      "properties": {
        "raw_query": {
          "type": "string",
          "description": "El texto original que el usuario pidió. Ejemplos: 'notebook dell inspiron 15 con 16gb ram', 'zapatillas nike air max talla 42', 'heladera no frost 300 litros'"
        },
        "normalized": {
          "type": "object",
          "description": "Objeto con información estructurada extraída del pedido (opcional). Incluir solo si puedes identificar claramente: categoría, marca, modelo, presupuesto, características específicas.",
          "properties": {
            "category": {
              "type": "string",
              "description": "Categoría del producto si se puede identificar"
            },
            "brand": {
              "type": "string",
              "description": "Marca si se menciona"
            },
            "model": {
              "type": "string",
              "description": "Modelo específico si se menciona"
            },
            "budget": {
              "type": "number",
              "description": "Presupuesto en guaraníes si se menciona"
            },
            "features": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "Características específicas mencionadas (ej: ['16gb ram', 'no frost', 'talla 42'])"
            }
          }
        }
      },
      "required": ["raw_query"]
    }
  }
}
```

**Endpoint:** `POST /api/assistant/sourcing-orders`

**Ejemplo de uso:**
```json
{
  "raw_query": "notebook dell inspiron 15 con 16gb ram y SSD",
  "normalized": {
    "category": "Electrónica",
    "brand": "Dell",
    "model": "Inspiron 15",
    "features": ["16gb ram", "SSD"]
  }
}
```

**Nota:** El backend automáticamente agrega `source: "gpt-buyer"` y `channel: "chatgpt"`.

---

## 3. listMySourcingOrders

**Nombre de la acción:** `listMySourcingOrders`

**Descripción:** Lista los pedidos "por conseguir" del usuario autenticado.

**Schema:**

```json
{
  "type": "function",
  "function": {
    "name": "listMySourcingOrders",
    "description": "Obtiene la lista de pedidos por conseguir del usuario. Usa esto cuando el usuario pregunte: '¿Cómo va mi pedido por conseguir?', '¿Qué pedí que me consigan?', 'Mostrame mis pedidos por conseguir', '¿Cuál es el estado de mis pedidos?'",
    "parameters": {
      "type": "object",
      "properties": {
        "status": {
          "type": "string",
          "enum": ["pending_sourcing", "sourcing", "found", "completed", "cancelled"],
          "description": "Filtrar por estado específico (opcional). Si el usuario pregunta por un estado específico, usar este filtro."
        },
        "limit": {
          "type": "number",
          "description": "Cantidad máxima de resultados (opcional, default: 20). Usar 10-20 para mostrar al usuario."
        }
      },
      "required": []
    }
  }
}
```

**Endpoint:** `GET /api/assistant/sourcing-orders?mode=user`

**Ejemplo de uso:**
```json
{
  "status": "sourcing",
  "limit": 10
}
```

---

## 4. getSourcingOrderById

**Nombre de la acción:** `getSourcingOrderById`

**Descripción:** Obtiene los detalles de un pedido "por conseguir" específico por su ID.

**Schema:**

```json
{
  "type": "function",
  "function": {
    "name": "getSourcingOrderById",
    "description": "Obtiene los detalles de un pedido por conseguir específico. Usa esto cuando el usuario mencione un ID de pedido o pregunte por un pedido en particular que ya listaste.",
    "parameters": {
      "type": "object",
      "properties": {
        "sourcing_order_id": {
          "type": "string",
          "description": "ID del sourcing_order (UUID). Usar el ID que se devolvió en listMySourcingOrders."
        }
      },
      "required": ["sourcing_order_id"]
    }
  }
}
```

**Endpoint:** `GET /api/assistant/sourcing-orders/[id]`

**Ejemplo de uso:**
```json
{
  "sourcing_order_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

---

## 🔐 Autenticación

**IMPORTANTE:** Todas las acciones requieren que el usuario esté autenticado en Mercadito Online PY.

El GPT debe:
1. Solicitar al usuario que inicie sesión en Mercadito Online si no está autenticado
2. Usar el token de autenticación del usuario en las llamadas a la API
3. Manejar errores 401 (no autorizado) indicando que debe iniciar sesión

**Configuración en GPT Builder:**
- En "Authentication", configurar OAuth o API Key según cómo expongas las APIs
- Si usas OAuth, el usuario debe autorizar el GPT para acceder a su cuenta de Mercadito Online

---

## 📝 Notas de Implementación

1. **searchProducts** debe llamarse primero siempre que el usuario quiera comprar algo
2. **createSourcingOrder** solo se usa cuando:
   - `searchProducts` no devuelve resultados relevantes
   - El usuario explícitamente pide crear un pedido por conseguir
3. **listMySourcingOrders** y **getSourcingOrderById** son opcionales pero recomendadas para mejor UX
4. Todas las acciones deben manejar errores gracefully y explicar al usuario qué pasó

---

## 🧪 Testing

Para probar las acciones:

1. **searchProducts:**
   - "Buscame notebooks"
   - "Quiero comprar zapatillas nike"
   - "Mostrame heladeras hasta 3 millones"

2. **createSourcingOrder:**
   - Después de una búsqueda sin resultados: "Aunque no esté, conseguímelo"
   - "Quiero un notebook dell inspiron 15 con 16gb ram, aunque no esté listado"

3. **listMySourcingOrders:**
   - "¿Cómo van mis pedidos por conseguir?"
   - "Mostrame mis pedidos que están en búsqueda"

4. **getSourcingOrderById:**
   - Después de listar: "¿Qué pasó con el pedido [ID]?"





