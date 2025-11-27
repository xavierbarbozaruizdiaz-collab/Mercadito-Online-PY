# Flujo Completo - GPT Asistente de Compras

## 📊 Diagrama de Flujo (Texto)

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO INICIA CHAT                       │
│              "Quiero comprar X" / "Buscame Y"               │
└───────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
         ┌──────────────────────────────────────┐
         │   GPT DETECTA INTENCIÓN DE COMPRA   │
         │   - Extrae: producto, precio, etc.  │
         └────────────────┬─────────────────────┘
                         │
                         ▼
         ┌──────────────────────────────────────┐
         │   LLAMAR: searchProducts(query, ...)  │
         │   Buscar productos en catálogo       │
         └────────────────┬─────────────────────┘
                         │
            ┌────────────┴────────────┐
            │                        │
            ▼                        ▼
    ┌───────────────┐      ┌──────────────────┐
    │ HAY RESULTADOS│      │ NO HAY RESULTADOS │
    │ (≥1 producto) │      │ (0 productos)     │
    └───────┬───────┘      └────────┬─────────┘
            │                       │
            ▼                       ▼
    ┌──────────────────┐   ┌──────────────────────────┐
    │ MOSTRAR 3-6      │   │ EXPLICAR: "No encuentro │
    │ PRODUCTOS        │   │ productos listados..."   │
    │ - Nombre         │   └──────────┬───────────────┘
    │ - Precio         │              │
    │ - Link           │              ▼
    │ - 1-2 puntos     │   ┌──────────────────────────┐
    │                  │   │ PREGUNTAR: "¿Querés que │
    └────────┬─────────┘   │ creemos un pedido por     │
             │             │ conseguir?"              │
             │             └──────────┬────────────────┘
             │                       │
             │              ┌────────┴────────┐
             │              │                 │
             │              ▼                 ▼
             │      ┌──────────────┐  ┌──────────────┐
             │      │ USUARIO DICE │  │ USUARIO DICE │
             │      │ "SÍ"         │  │ "NO"         │
             │      └──────┬───────┘  └──────┬───────┘
             │             │                  │
             │             ▼                  │
             │    ┌─────────────────────┐     │
             │    │ LLAMAR:             │     │
             │    │ createSourcingOrder │     │
             │    │ (raw_query, ...)    │     │
             │    └──────────┬──────────┘     │
             │               │                │
             │               ▼                │
             │    ┌─────────────────────┐     │
             │    │ CONFIRMAR:          │     │
             │    │ "Listo ✅ Creamos    │     │
             │    │ tu pedido por       │     │
             │    │ conseguir..."       │     │
             │    └──────────┬──────────┘     │
             │                │               │
             └────────────────┴───────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   FIN DE FLUJO      │
                    │   (Esperar más      │
                    │   interacciones)    │
                    └─────────────────────┘
```

---

## 🔄 Flujo Secundario: Consulta de Estado

```
┌─────────────────────────────────────────────────────────────┐
│     USUARIO PREGUNTA POR ESTADO DE PEDIDOS                 │
│  "¿Cómo va mi pedido?" / "Mostrame mis pedidos"            │
└───────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
         ┌──────────────────────────────────────┐
         │   LLAMAR: listMySourcingOrders(...) │
         │   Obtener lista de pedidos           │
         └────────────────┬─────────────────────┘
                         │
                         ▼
         ┌──────────────────────────────────────┐
         │   MOSTRAR TABLA/RESUMEN:             │
         │   - Fecha                            │
         │   - Resumen (raw_query)             │
         │   - Estado (traducido a humano)      │
         └────────────────┬─────────────────────┘
                         │
            ┌────────────┴────────────┐
            │                        │
            ▼                        ▼
    ┌───────────────┐      ┌──────────────────┐
    │ USUARIO PIDE  │      │ USUARIO SATISFECHO│
    │ DETALLES DE   │      │ CON LA INFO       │
    │ UN PEDIDO     │      │                   │
    │ ESPECÍFICO    │      │                   │
    └───────┬───────┘      └──────────────────┘
            │
            ▼
    ┌──────────────────────┐
    │ LLAMAR:             │
    │ getSourcingOrderById│
    │ (sourcing_order_id) │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │ MOSTRAR DETALLES     │
    │ COMPLETOS DEL PEDIDO │
    └──────────────────────┘
```

---

## 📝 Traducción de Estados

| Estado en BD | Traducción Humana | Descripción |
|-------------|-------------------|-------------|
| `pending_sourcing` | "Registrado, esperando que el equipo lo revise" | El pedido fue creado pero aún no se asignó a la tienda fallback |
| `sourcing` | "Lo están buscando" | La tienda fallback está activamente buscando el producto |
| `found` | "Encontraron una opción, revisá la app para detalles/precio" | Se encontró una opción, el usuario debe revisar en la app |
| `completed` | "Pedido cerrado con éxito" | El pedido fue completado exitosamente |
| `cancelled` | "Pedido cancelado" | El pedido fue cancelado |

---

## 🎯 Casos de Uso Detallados

### Caso 1: Usuario busca producto que SÍ existe

**Usuario:** "Quiero comprar zapatillas nike"

**GPT:**
1. Llama `searchProducts({ query: "zapatillas nike", limit: 6 })`
2. Recibe 4 resultados
3. Muestra:
   ```
   Encontré 4 opciones de zapatillas Nike:
   
   1. Nike Air Max 90 - 450.000 Gs.
      Tienda: Deportes PY
      Link: https://mercadito-online-py.vercel.app/productos/...
   
   2. Nike Revolution 6 - 320.000 Gs.
      Tienda: Calzados Asunción
      Link: https://mercadito-online-py.vercel.app/productos/...
   
   ... (más opciones)
   
   ¿Querés que te recomiende uno según lo que buscás, o preferís ver más detalles de alguno?
   ```

### Caso 2: Usuario busca producto que NO existe

**Usuario:** "Buscame un notebook dell inspiron 15 con 16gb ram"

**GPT:**
1. Llama `searchProducts({ query: "notebook dell inspiron 15 16gb", limit: 6 })`
2. Recibe 0 resultados
3. Responde:
   ```
   Ahora mismo no encuentro productos listados que coincidan con lo que pedís.
   
   ¿Querés que creemos un pedido por conseguir para que Mercadito Online trate de conseguirlo igual? 
   Te vamos a avisar cuando empecemos a buscarlo o encontremos una opción.
   ```

**Usuario:** "Sí, conseguímelo"

**GPT:**
1. Llama `createSourcingOrder({ 
     raw_query: "notebook dell inspiron 15 con 16gb ram",
     normalized: {
       category: "Electrónica",
       brand: "Dell",
       model: "Inspiron 15",
       features: ["16gb ram"]
     }
   })`
2. Recibe confirmación
3. Responde:
   ```
   Listo ✅ Creamos tu pedido por conseguir en Mercadito Online. 
   Te vamos a avisar por los canales configurados cuando empecemos a buscarlo o encontremos una opción.
   ```

### Caso 3: Usuario consulta estado de pedidos

**Usuario:** "¿Cómo van mis pedidos por conseguir?"

**GPT:**
1. Llama `listMySourcingOrders({ limit: 20 })`
2. Recibe 3 pedidos
3. Muestra:
   ```
   Tenés 3 pedidos por conseguir:
   
   1. 📅 15/11/2024
      "notebook dell inspiron 15 con 16gb ram"
      Estado: Lo están buscando 🔍
   
   2. 📅 10/11/2024
      "zapatillas nike air max talla 42"
      Estado: Encontraron una opción, revisá la app para detalles/precio 🎉
   
   3. 📅 05/11/2024
      "heladera no frost 300 litros"
      Estado: Pedido cerrado con éxito ✅
   
   ¿Querés más detalles de alguno en particular?
   ```

### Caso 4: Usuario pregunta por pedido específico

**Usuario:** "¿Qué pasó con el pedido del notebook?"

**GPT:**
1. Identifica que se refiere al pedido "notebook dell inspiron 15"
2. Llama `getSourcingOrderById({ sourcing_order_id: "123e4567-..." })`
3. Muestra detalles completos:
   ```
   Pedido: notebook dell inspiron 15 con 16gb ram
   Estado: Lo están buscando 🔍
   Creado: 15/11/2024
   Última actualización: 18/11/2024
   
   La tienda asignada está buscando este producto. Te vamos a avisar cuando encuentren una opción.
   ```

---

## ⚠️ Manejo de Errores

### Error: Usuario no autenticado (401)

**Respuesta del GPT:**
```
Para buscar productos y crear pedidos, necesitás iniciar sesión en Mercadito Online PY.

Podés hacerlo desde la web o la app, y luego volver acá para continuar.
```

### Error: API no disponible (500, timeout)

**Respuesta del GPT:**
```
Ahora mismo no puedo conectarme al sistema de Mercadito Online. 

Probá desde la web o la app, o volvé a intentar más tarde.
```

### Error: Búsqueda sin resultados pero usuario no quiere crear sourcing_order

**Respuesta del GPT:**
```
Entendido. Si cambiás de opinión o querés buscar algo más, avisame.

También podés revisar directamente en la web de Mercadito Online para ver más opciones.
```

---

## 🔒 Reglas LPMS para el GPT

1. **No inventar productos:** Solo mostrar resultados reales de la API
2. **No inventar precios:** Solo usar precios que vengan de la API
3. **No prometer tiempos:** No decir "llegará en X días", solo "depende del vendedor"
4. **No procesar pagos:** Siempre redirigir a la web/app para pagar
5. **No hablar de WhatsApp como propio:** Decir "Mercadito Online te puede avisar por WhatsApp"
6. **Manejar errores gracefully:** Nunca mostrar errores técnicos al usuario, solo mensajes amigables

---

## 📱 Integración con Web/App

El GPT debe siempre:
- Incluir links a productos: `https://mercadito-online-py.vercel.app/productos/[id]`
- Sugerir usar la web/app para:
  - Ver más detalles
  - Agregar al carrito
  - Completar la compra
  - Ver estado completo de pedidos

---

## 🚀 Próximos Pasos (Futuro)

Cuando se implemente "Instant Checkout / Agentic Commerce":
- El GPT podrá crear órdenes directamente desde el chat
- El GPT podrá procesar pagos (con autorización explícita del usuario)
- El GPT podrá actualizar estados de sourcing_orders automáticamente

Por ahora, el GPT solo:
- Busca productos
- Crea sourcing_orders
- Consulta estados
- Redirige a web/app para completar compras





