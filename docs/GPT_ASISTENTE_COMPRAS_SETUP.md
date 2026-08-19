# Setup del GPT - Asistente de Compras

## 🎯 Resumen

Este documento explica cómo configurar el GPT "Asistente de Compras" en el GPT Builder de OpenAI para que funcione con Mercadito Online PY.

---

## 📋 Prerequisitos

1. Acceso a GPT Builder de OpenAI (requiere cuenta de OpenAI con acceso a GPTs)
2. APIs de Mercadito Online PY expuestas y accesibles
3. Sistema de autenticación configurado (OAuth o API Keys)

---

## 🔧 Paso 1: Crear el GPT

1. Ir a https://chat.openai.com/gpts
2. Click en "Create" o "Crear"
3. Nombre: **"Asistente de Compras - Mercadito Online PY"**
4. Descripción: **"Te ayudo a buscar productos y crear pedidos por conseguir en Mercadito Online PY"**

---

## 📝 Paso 2: Configurar Instrucciones del Sistema

En la sección "Instructions" o "Instrucciones", pegar:

```
Sos el Asistente de Compras de Mercadito Online PY.

Tu trabajo es ayudar a personas en Paraguay a:
- Buscar productos en Mercadito Online
- Comparar opciones según precio, tipo y uso
- Guiarlos para agregar productos al carrito o crear un "pedido por conseguir" cuando no haya stock
- Explicar el estado de esos pedidos especiales si el usuario pregunta

NO sos el sistema de pagos. NO procesás tarjetas ni dinero.
Siempre que haya que pagar, enviás al usuario a la web/app de Mercadito Online.

Lenguaje: español, tono paraguayo-neutral. Tratá al usuario de "vos".
Corto y claro. Podés usar emojis, pero no abuses (1-2 por mensaje máximo).

Reglas importantes:
- No inventes productos. Si searchProducts no devuelve resultados, nunca digas "lo tenemos".
- No inventes precios. Solo usá precios que vengan de la API.
- No prometas tiempos de entrega ni stock garantizado.
- No digas que cobrás ni procesás pago dentro del chat.
- Si alguna acción falla, decí algo tipo: "Ahora mismo no puedo conectarme al sistema de Mercadito Online. Probá desde la web o volvé a intentar más tarde."
```

---

## 🔌 Paso 3: Configurar Acciones (Actions)

En la sección "Actions" o "Acciones", click en "Create new action" o "Crear nueva acción".

### 3.1. Acción: searchProducts

**Authentication:** Configurar según tu sistema (OAuth, API Key, etc.)

**Schema:** Copiar el schema de `searchProducts` del archivo `GPT_ASISTENTE_COMPRAS_SCHEMAS.md`

**URL del endpoint:** 
```
https://mercadito-online-py.vercel.app/api/assistant/search-products
```
(Endpoint ya creado en `src/app/api/assistant/search-products/route.ts`)

**Method:** `POST`

---

### 3.2. Acción: createSourcingOrder

**Authentication:** Mismo que searchProducts

**Schema:** Copiar el schema de `createSourcingOrder` del archivo `GPT_ASISTENTE_COMPRAS_SCHEMAS.md`

**URL del endpoint:**
```
https://mercadito-online-py.vercel.app/api/assistant/sourcing-orders
```

**Method:** `POST`

---

### 3.3. Acción: listMySourcingOrders

**Authentication:** Mismo que las anteriores

**Schema:** Copiar el schema de `listMySourcingOrders` del archivo `GPT_ASISTENTE_COMPRAS_SCHEMAS.md`

**URL del endpoint:**
```
https://mercadito-online-py.vercel.app/api/assistant/sourcing-orders?mode=user
```

**Method:** `GET`

---

### 3.4. Acción: getSourcingOrderById (Opcional)

**Authentication:** Mismo que las anteriores

**Schema:** Copiar el schema de `getSourcingOrderById` del archivo `GPT_ASISTENTE_COMPRAS_SCHEMAS.md`

**URL del endpoint:**
```
https://mercadito-online-py.vercel.app/api/assistant/sourcing-orders/{sourcing_order_id}
```

**Method:** `GET`

---

## 🔐 Paso 4: Configurar Autenticación

### Opción A: OAuth 2.0 (Recomendado)

1. En "Authentication", seleccionar "OAuth"
2. Configurar:
   - **Client ID:** Tu OAuth Client ID
   - **Client Secret:** Tu OAuth Client Secret
   - **Authorization URL:** `https://mercadito-online-py.vercel.app/api/auth/authorize`
   - **Token URL:** `https://mercadito-online-py.vercel.app/api/auth/token`
   - **Scope:** `read:products read:sourcing_orders write:sourcing_orders`

### Opción B: API Key

1. En "Authentication", seleccionar "API Key"
2. Configurar:
   - **Header name:** `Authorization`
   - **Header value:** `Bearer {api_key}` (el GPT reemplazará `{api_key}` con la key del usuario)

**Nota:** Si usas API Key, necesitarás que el usuario configure su API key en el GPT.

---

## 🧪 Paso 5: Testing

### Test 1: Búsqueda de productos

**Prompt:** "Buscame zapatillas nike"

**Resultado esperado:**
- GPT llama `searchProducts({ query: "zapatillas nike" })`
- Muestra resultados con nombres, precios y links

### Test 2: Crear sourcing order

**Prompt:** "Quiero un notebook dell inspiron 15 con 16gb ram, aunque no esté listado"

**Resultado esperado:**
- GPT primero llama `searchProducts`
- Si no hay resultados, llama `createSourcingOrder`
- Confirma que se creó el pedido

### Test 3: Consultar pedidos

**Prompt:** "¿Cómo van mis pedidos por conseguir?"

**Resultado esperado:**
- GPT llama `listMySourcingOrders`
- Muestra lista de pedidos con estados traducidos

---

## 📝 Paso 6: Verificar Endpoints

✅ **Endpoint de búsqueda ya creado:**
- `src/app/api/assistant/search-products/route.ts` - Ya existe y está listo para usar

✅ **Endpoints de sourcing_orders ya existen:**
- `POST /api/assistant/sourcing-orders` - Ya existe
- `GET /api/assistant/sourcing-orders?mode=user` - Ya existe
- `GET /api/assistant/sourcing-orders/[id]` - Ya existe

No necesitás crear endpoints adicionales, todos están listos.

---

## 🎨 Paso 7: Personalizar el GPT (Opcional)

1. **Imagen:** Subir logo de Mercadito Online PY
2. **Capabilities:** 
   - ✅ Web Browsing: Desactivar (no necesario)
   - ✅ Code Interpreter: Desactivar (no necesario)
   - ✅ DALL·E: Desactivar (no necesario)
3. **Knowledge:** No subir archivos (el GPT usa las APIs)

---

## ✅ Checklist Final

- [ ] GPT creado con nombre y descripción correctos
- [ ] Instrucciones del sistema configuradas
- [ ] 4 acciones configuradas (searchProducts, createSourcingOrder, listMySourcingOrders, getSourcingOrderById)
- [ ] Autenticación configurada (OAuth o API Key)
- [ ] Endpoints funcionando y accesibles
- [ ] Tests básicos pasando
- [ ] Usuario puede buscar productos
- [ ] Usuario puede crear sourcing orders
- [ ] Usuario puede consultar estado de pedidos

---

## 🚀 Publicación

Una vez que todo funcione:

1. Click en "Save" o "Guardar"
2. Seleccionar visibilidad:
   - **Solo yo:** Para testing privado
   - **Solo personas con el link:** Para beta testing
   - **Público:** Para lanzamiento (requiere revisión de OpenAI)

---

## 📞 Soporte

Si hay problemas:
1. Revisar logs de los endpoints en Vercel
2. Verificar que la autenticación funciona
3. Probar los endpoints directamente con Postman/curl
4. Revisar la consola del GPT Builder para errores

---

## 🔄 Actualizaciones Futuras

Cuando se agreguen nuevas funcionalidades:
1. Actualizar los schemas en `GPT_ASISTENTE_COMPRAS_SCHEMAS.md`
2. Agregar nuevas acciones en el GPT Builder
3. Actualizar las instrucciones del sistema si cambia el comportamiento
4. Probar todo antes de publicar

