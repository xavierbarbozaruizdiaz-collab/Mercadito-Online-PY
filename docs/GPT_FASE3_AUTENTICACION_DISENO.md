# GPT Fase 3 - Diseño de Autenticación

## 📋 Resumen Ejecutivo

Este documento presenta una auditoría completa del sistema de autenticación actual de Mercadito Online PY y propone 3 opciones de diseño para permitir que el GPT "Asistente de Compras" pueda crear y consultar `sourcing_orders` sin comprometer la seguridad ni duplicar lógicas.

**Estado actual:** Los endpoints de `sourcing_orders` requieren autenticación de usuario (401 si no hay sesión). El GPT no puede autenticarse actualmente, por lo que las acciones `createSourcingOrder`, `listMySourcingOrders` y `getSourcingOrderById` fallan.

**Objetivo:** Diseñar un sistema que permita al GPT actuar en nombre del usuario de forma segura, sin romper la arquitectura existente ni exponer vulnerabilidades.

---

## 🔍 FASE 0 - AUDITORÍA DE AUTENTICACIÓN

### 1. Mapa de Auth Actual (Web + APIs)

#### 1.1. Autenticación en la Web

**Mecanismo:**
- **Proveedor:** Supabase Auth
- **Persistencia:** 
  - Cliente: `localStorage` (cliente de Supabase en `src/lib/supabase/client.ts`)
  - Servidor: Cookies HTTP-only (cliente de servidor en `src/lib/supabase/server.ts`)
- **Flujo:**
  1. Usuario inicia sesión → Supabase Auth genera JWT (access_token + refresh_token)
  2. Cliente guarda tokens en `localStorage`
  3. Servidor lee tokens de cookies HTTP-only
  4. Ambos clientes usan `supabase.auth.getUser()` o `supabase.auth.getSession()` para validar

**Helpers principales:**
- `src/lib/supabase/client.ts`:
  - `getCurrentUser()`: Obtiene usuario completo con perfil desde cliente
  - `supabase.auth.getSession()`: Obtiene sesión actual
- `src/lib/supabase/server.ts`:
  - `createServerClient()`: Crea cliente de servidor que lee cookies
- `src/lib/hooks/useAuth.ts`:
  - `useAuth()`: Hook React para obtener usuario en componentes cliente

#### 1.2. Autenticación en API Routes

**Patrón actual (dual):**

Los endpoints de `sourcing_orders` implementan un patrón híbrido:

1. **Intento 1:** Leer `Authorization: Bearer <token>` del header
   - Si existe, crear cliente Supabase con ese token
   - Validar con `supabase.auth.getUser(token)`
   - Establecer sesión con `supabase.auth.setSession()` para que RLS funcione

2. **Intento 2 (fallback):** Si no hay header, usar `createServerClient()`
   - Lee cookies HTTP-only
   - Valida con `supabase.auth.getUser()`

**Código de ejemplo (de `src/app/api/assistant/sourcing-orders/route.ts`):**
```typescript
const authHeader = request.headers.get('authorization');
let user: any = null;
let supabase: any;

if (authHeader && authHeader.startsWith('Bearer ')) {
  const token = authHeader.substring(7);
  // Crear cliente con token
  supabase = createClient(supabaseUrl, supabaseKey, {...});
  const { data: { user: userFromToken }, error: tokenError } = await supabase.auth.getUser(token);
  // Establecer sesión para RLS
  await supabase.auth.setSession({ access_token: token, refresh_token: token });
  user = userFromToken;
} else {
  // Fallback a cookies
  supabase = await createServerClient();
  const { data: { user: userFromCookies } } = await supabase.auth.getUser();
  user = userFromCookies;
}

if (!user) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}
```

#### 1.3. Endpoints que Requieren Autenticación

**Endpoints protegidos identificados:**

1. **`POST /api/assistant/sourcing-orders`**
   - Requiere: Usuario autenticado (no vendedor)
   - Retorna: 401 si no hay sesión
   - Asocia `user_id` al sourcing_order

2. **`GET /api/assistant/sourcing-orders?mode=user`**
   - Requiere: Usuario autenticado
   - Retorna: 401 si no hay sesión
   - Filtra por `user_id` del usuario autenticado

3. **`GET /api/assistant/sourcing-orders?mode=store`**
   - Requiere: Usuario autenticado + ser dueño de tienda fallback
   - Retorna: 401 si no hay sesión, 403 si no es dueño
   - Filtra por `assigned_store_id` de la tienda del usuario

4. **`GET /api/assistant/sourcing-orders/[id]`**
   - Requiere: Usuario autenticado + ser creador o dueño de tienda asignada
   - Retorna: 401 si no hay sesión, 403 si no tiene permisos

5. **`PATCH /api/assistant/sourcing-orders/[id]`**
   - Requiere: Usuario autenticado + ser dueño de tienda asignada
   - Retorna: 401 si no hay sesión, 403 si no es dueño

6. **`POST /api/assistant/search-products`**
   - **NO requiere autenticación** (público, solo lectura)
   - Retorna siempre 200 (incluso con errores internos)

**Otros endpoints protegidos (no relacionados con GPT):**
- `/api/products/upload-images` → 401 si no hay sesión
- `/api/auctions/[id]/bid` → 401 si no hay sesión
- `/api/stores/[id]/marketing` → 401/403 según permisos
- Endpoints de cron → Validación por header secreto

### 2. Auth en `/api/assistant/sourcing-orders`

#### 2.1. Verificación de Usuario

**Método:** Patrón dual (header Bearer token o cookies)

**Flujo:**
1. Leer `Authorization: Bearer <token>` del header
2. Si existe, validar token con `supabase.auth.getUser(token)`
3. Si no existe, leer cookies con `createServerClient()`
4. Si no hay usuario válido → 401

**Código de error:**
```json
{
  "error": "No autorizado. Debes iniciar sesión."
}
```
Status: `401 Unauthorized`

#### 2.2. Asociación a Usuario y Tienda

**Asociación a `user_id`:**
- El `sourcing_order` se crea con `user_id: user.id` (del usuario autenticado)
- RLS garantiza que solo el usuario creador puede ver sus propios pedidos

**Asociación a tienda fallback:**
- El sistema busca automáticamente una tienda con `is_fallback_store = true` y `is_active = true`
- Asigna `assigned_store_id` a esa tienda
- Si no hay tienda fallback → 404

**Código relevante:**
```typescript
// Buscar tienda fallback
const { data: fallbackStores } = await supabase
  .from('stores')
  .select('id')
  .eq('is_fallback_store', true)
  .eq('is_active', true)
  .order('created_at', { ascending: true })
  .limit(1);

const assignedStoreId = fallbackStores[0].id;

// Crear sourcing_order
const sourcingOrderData = {
  user_id: user.id,  // ← Asociado al usuario autenticado
  assigned_store_id: assignedStoreId,  // ← Asociado a tienda fallback
  // ...
};
```

### 3. Auth en `/api/assistant/search-products`

#### 3.1. Verificación

**Estado:** **NO requiere autenticación**

**Razón:** Es un endpoint de solo lectura que busca productos públicos. No modifica estado ni expone datos sensibles.

**Código:**
```typescript
export async function POST(req: NextRequest) {
  // No hay verificación de auth
  const body = await req.json();
  const { query, max_results } = body;
  // ... buscar productos
  return NextResponse.json({ items: [...] }, { status: 200 });
}
```

#### 3.2. Confirmación de Uso Público

✅ **Este endpoint está OK para uso público del GPT**

- No requiere autenticación
- Solo lectura
- No modifica estado
- Maneja errores gracefully (siempre retorna 200 con `items: []`)

### 4. Documentación del GPT

#### 4.1. Acciones Definidas

Según `docs/GPT_ASISTENTE_COMPRAS_SCHEMAS.md`, el GPT espera poder hacer:

1. **`searchProducts`**
   - ✅ **Funciona actualmente** (endpoint público)
   - Endpoint: `POST /api/assistant/search-products`
   - No requiere auth

2. **`createSourcingOrder`**
   - ❌ **Falla actualmente** (requiere auth)
   - Endpoint: `POST /api/assistant/sourcing-orders`
   - Requiere: Usuario autenticado
   - Error esperado: 401 si no hay sesión

3. **`listMySourcingOrders`**
   - ❌ **Falla actualmente** (requiere auth)
   - Endpoint: `GET /api/assistant/sourcing-orders?mode=user`
   - Requiere: Usuario autenticado
   - Error esperado: 401 si no hay sesión

4. **`getSourcingOrderById`**
   - ❌ **Falla actualmente** (requiere auth)
   - Endpoint: `GET /api/assistant/sourcing-orders/[id]`
   - Requiere: Usuario autenticado + permisos
   - Error esperado: 401 si no hay sesión, 403 si no tiene permisos

#### 4.2. Gaps Identificados

**Gap principal:** El GPT no puede autenticarse como usuario real.

**Problemas específicos:**

1. **`createSourcingOrder`:**
   - El GPT llama al endpoint sin token
   - El endpoint retorna 401
   - El GPT no puede crear pedidos

2. **`listMySourcingOrders`:**
   - El GPT llama al endpoint sin token
   - El endpoint retorna 401
   - El GPT no puede listar pedidos del usuario

3. **`getSourcingOrderById`:**
   - Similar a los anteriores
   - El GPT no puede consultar detalles

**Nota en documentación:**
La documentación en `GPT_ASISTENTE_COMPRAS_SCHEMAS.md` menciona:
> "IMPORTANTE: Todas las acciones requieren que el usuario esté autenticado en Mercadito Online PY."
> "El GPT debe: 1. Solicitar al usuario que inicie sesión... 2. Usar el token de autenticación..."

Pero **no hay implementación de OAuth ni API Key** en el GPT actualmente.

---

## ⚠️ FASE 1 - PUNTOS CRÍTICOS Y RIESGOS

### 1. Acciones del GPT que HOY Fallan por Auth

#### 1.1. `createSourcingOrder`

**Error actual:**
- Status: `401 Unauthorized`
- Mensaje: `"No autorizado. Debes iniciar sesión."`

**Flujo esperado por el GPT (según docs):**
1. Usuario dice: "Quiero un notebook dell inspiron 15"
2. GPT llama `searchProducts` → 0 resultados
3. GPT pregunta: "¿Querés que lo busquemos por vos?"
4. Usuario: "Sí"
5. GPT llama `createSourcingOrder` → **FALLA con 401**

**Impacto:** El GPT no puede crear pedidos, rompiendo el flujo principal.

#### 1.2. `listMySourcingOrders`

**Error actual:**
- Status: `401 Unauthorized`
- Mensaje: `"No autorizado. Debes iniciar sesión."`

**Flujo esperado por el GPT:**
1. Usuario pregunta: "¿Cómo van mis pedidos?"
2. GPT llama `listMySourcingOrders` → **FALLA con 401**

**Impacto:** El GPT no puede mostrar el estado de los pedidos del usuario.

#### 1.3. `getSourcingOrderById`

**Error actual:**
- Status: `401 Unauthorized` (si no hay sesión)
- Status: `403 Forbidden` (si hay sesión pero no tiene permisos)

**Flujo esperado:**
1. Usuario pregunta: "¿Qué pasó con el pedido X?"
2. GPT llama `getSourcingOrderById` → **FALLA con 401/403**

**Impacto:** El GPT no puede mostrar detalles de pedidos específicos.

### 2. Riesgos si Abriéramos Endpoints sin Auth

#### 2.1. Spam de `sourcing_orders` Anónimos

**Riesgo:** Cualquiera desde internet podría crear pedidos sin autenticación.

**Impacto:**
- Base de datos llena de pedidos basura
- Tienda fallback recibe pedidos falsos
- Costo de procesamiento inútil
- Posible DoS si se automatiza

**Mitigación necesaria:**
- Rate limiting por IP
- Validación de entrada estricta
- Límite de pedidos por día/hora
- Logging y monitoreo

#### 2.2. Carga sobre el Equipo

**Riesgo:** Sin autenticación, no hay forma de identificar quién hizo el pedido.

**Impacto:**
- Tienda fallback no sabe a quién contactar
- No se puede enviar WhatsApp (no hay teléfono asociado)
- No se puede hacer seguimiento
- Pedidos huérfanos sin dueño

**Mitigación necesaria:**
- Requerir datos mínimos (teléfono, email) en el pedido
- Crear "usuario guest" temporal
- Sistema de verificación posterior

#### 2.3. Problemas Legales / Trazabilidad

**Riesgo:** Sin asociación a usuario real, no hay trazabilidad.

**Impacto:**
- No se puede probar quién hizo el pedido
- Problemas de privacidad (GDPR/LOPD)
- Imposible auditar acciones
- Riesgo de fraude

**Mitigación necesaria:**
- Siempre asociar a algún tipo de identidad (usuario real o guest con datos)
- Logging completo de acciones
- Políticas de retención de datos

### 3. Mecanismos de Auth Existentes que Podríamos Reutilizar

#### 3.1. API Key Interna

**Estado actual:** ❌ No existe

**Búsqueda realizada:**
- No hay variables de entorno tipo `SERVICE_API_KEY` o `GPT_API_KEY`
- No hay middleware que valide API keys
- No hay tabla de API keys en la base de datos

**Conclusión:** Tendríamos que crear este mecanismo desde cero.

#### 3.2. Tokens / Headers para Integraciones Externas

**Estado actual:** ❌ No existe

**Búsqueda realizada:**
- No hay endpoints que acepten tokens especiales para bots
- No hay sistema de "service accounts" o "bot users"
- El único patrón es: usuario real autenticado o nada

**Conclusión:** Tendríamos que crear este mecanismo desde cero.

#### 3.3. OAuth / Refresh Tokens

**Estado actual:** ⚠️ Parcialmente disponible

**Lo que existe:**
- Supabase Auth genera `access_token` y `refresh_token` automáticamente
- Los tokens son JWT estándar
- Se pueden validar con `supabase.auth.getUser(token)`

**Lo que NO existe:**
- Endpoints OAuth 2.0 (`/api/auth/authorize`, `/api/auth/token`)
- Flujo de autorización para terceros
- Sistema de scopes/permisos granulares
- Refresh token automático para el GPT

**Conclusión:** Podríamos reutilizar la infraestructura de Supabase Auth, pero necesitaríamos crear los endpoints OAuth y el flujo de autorización.

---

## 🧱 FASE 2 - DISEÑO DE OPCIONES

### Opción A: API Key de Servicio (GPT como "Bot" Interno)

#### Descripción

Definir una `SERVICE_API_KEY` (o `GPT_API_KEY`) que solo el GPT conoce. Cuando el GPT llama a `createSourcingOrder`, manda `Authorization: Bearer <SERVICE_API_KEY>`. El backend valida esa key y crea el `sourcing_order` a nombre de:

- **Opción A1:** Un "usuario bot GPT" fijo (un UUID de usuario en `auth.users` y `profiles` que representa al GPT)
- **Opción A2:** Un usuario "guest GPT" con datos mínimos (se crea dinámicamente si no existe)

**Flujo:**
1. GPT llama `POST /api/assistant/sourcing-orders` con `Authorization: Bearer <SERVICE_API_KEY>`
2. Backend valida la key (comparación simple o hash)
3. Si es válida, crea `sourcing_order` con `user_id` del bot/guest
4. Opcionalmente, se puede pasar `user_email` o `user_phone` en el body para asociar al usuario real

#### Impacto en Seguridad

**Pros:**
- ✅ Implementación simple (solo validar string)
- ✅ No requiere OAuth ni flujos complejos
- ✅ Control total sobre quién puede usar la key

**Contras:**
- ⚠️ Si se filtra la key, cualquiera puede crear pedidos (mitigable con rate limiting y logging)
- ⚠️ No hay asociación directa a usuario real (mitigable con `user_email` en body)
- ⚠️ No se puede revocar fácilmente (solo cambiando la key en env vars)

**Mitigaciones:**
- Rate limiting estricto por IP
- Logging de todas las acciones con IP y timestamp
- Validación de `user_email` o `user_phone` en el body
- Rotación periódica de la key

#### Impacto en UX

**Pros:**
- ✅ El usuario no tiene que hacer nada (no sale del chat)
- ✅ Flujo "mágico": el GPT crea el pedido directamente

**Contras:**
- ⚠️ El pedido no aparece en "Mis pedidos" del usuario (a menos que se asocie por email/teléfono)
- ⚠️ El usuario no puede ver el estado desde la web (a menos que se implemente búsqueda por email/teléfono)

**Mitigaciones:**
- Agregar campo `user_email` o `user_phone` en `sourcing_orders`
- Crear endpoint `GET /api/assistant/sourcing-orders?email=<email>` para búsqueda
- Mostrar pedidos asociados por email en `/orders`

#### Impacto en Complejidad Técnica

**Nivel:** 🟢 Baja

**Cambios necesarios:**

1. **Variables de entorno:**
   - Agregar `GPT_SERVICE_API_KEY` o `SERVICE_API_KEY` en `.env`

2. **Middleware/helper de validación:**
   - Crear `src/lib/auth/validateServiceKey.ts`:
     ```typescript
     export function validateServiceKey(key: string): boolean {
       return key === process.env.GPT_SERVICE_API_KEY;
     }
     ```

3. **Modificar endpoints:**
   - En `POST /api/assistant/sourcing-orders/route.ts`:
     - Agregar validación de service key antes de validar usuario
     - Si es service key válida, usar `user_id` del bot/guest
     - Opcionalmente, leer `user_email` del body y asociar

4. **Crear usuario bot (opcional):**
   - Migración SQL para crear usuario bot en `auth.users` y `profiles`
   - O crear dinámicamente si no existe

5. **Modificar RLS (si es necesario):**
   - Asegurar que el usuario bot puede crear `sourcing_orders`
   - O usar Service Role Key para bypass RLS en creación

**Estimación:** 2-4 horas de desarrollo + testing

#### Compatibilidad con lo Existente

**✅ Compatible:**
- No rompe endpoints existentes (solo agrega validación adicional)
- No modifica RLS (o solo agrega excepción para bot)
- No afecta dashboards ni WhatsApp (solo cambia `user_id`)

**⚠️ Consideraciones:**
- Los pedidos creados por el GPT tendrán `user_id` del bot, no del usuario real
- Necesitamos forma de asociar pedidos a usuarios reales (email/teléfono)
- Los dashboards pueden necesitar ajustes para mostrar pedidos "del GPT"

---

### Opción B: OAuth 2.0 / "Iniciar Sesión con Mercadito Online"

#### Descripción

Implementar un flujo OAuth 2.0 (Authorization Code + PKCE) para que el usuario pueda loguearse desde el GPT. El GPT obtiene un `access_token` válido para ese usuario. El GPT manda `Authorization: Bearer <access_token>` en `createSourcingOrder` y otros endpoints. El backend valida el token y actúa a nombre del usuario real.

**Flujo:**
1. Usuario inicia chat con el GPT
2. GPT detecta que necesita auth → redirige a `https://mercadito-online-py.vercel.app/api/auth/authorize?client_id=<gpt_client_id>&redirect_uri=<gpt_redirect>&scope=read:sourcing_orders write:sourcing_orders`
3. Usuario inicia sesión en Mercadito Online (si no está logueado)
4. Usuario autoriza al GPT (pantalla de consentimiento)
5. Backend genera `authorization_code` y redirige a `redirect_uri` con el code
6. GPT intercambia `authorization_code` por `access_token` en `POST /api/auth/token`
7. GPT guarda `access_token` (en memoria, no persistente)
8. GPT usa `access_token` en todas las llamadas a la API
9. Cuando el token expira, GPT solicita nuevo token (o refresh token)

#### Impacto en Seguridad

**Pros:**
- ✅ Máxima seguridad: el usuario autoriza explícitamente
- ✅ Tokens con expiración (típicamente 1 hora)
- ✅ Scopes granulares (solo permisos necesarios)
- ✅ Revocable (el usuario puede revocar acceso)
- ✅ Trazabilidad completa (cada acción está asociada a usuario real)

**Contras:**
- ⚠️ Implementación compleja (OAuth 2.0 + PKCE)
- ⚠️ Manejo de refresh tokens
- ⚠️ Gestión de expiración de tokens
- ⚠️ Riesgo si el GPT no maneja tokens correctamente (puede exponer tokens)

**Mitigaciones:**
- Usar PKCE para prevenir ataques de interceptación
- Tokens de corta duración (1 hora)
- Refresh tokens seguros (rotación)
- Logging de todas las autorizaciones

#### Impacto en UX

**Pros:**
- ✅ Pedidos quedan realmente asociados a la cuenta del usuario
- ✅ El usuario puede ver sus pedidos en la web/app
- ✅ El usuario puede gestionar permisos del GPT desde su perfil
- ✅ Experiencia "nativa": el GPT actúa como extensión del usuario

**Contras:**
- ⚠️ El usuario debe autorizar al GPT (flujo adicional)
- ⚠️ Si el token expira, el usuario debe re-autorizar (a menos que haya refresh token)
- ⚠️ Menos "mágico": requiere interacción del usuario

**Mitigaciones:**
- Refresh tokens automáticos (el GPT renueva sin intervención del usuario)
- Autorización "una vez" (el GPT guarda el refresh token)
- UI clara de autorización (explicar qué permisos se solicitan)

#### Impacto en Complejidad Técnica

**Nivel:** 🔴 Alta

**Cambios necesarios:**

1. **Endpoints OAuth:**
   - `GET /api/auth/authorize`:
     - Validar `client_id`, `redirect_uri`, `scope`
     - Verificar que el usuario está autenticado
     - Mostrar pantalla de consentimiento
     - Generar `authorization_code` (UUID o JWT)
     - Guardar code en cache/DB con expiración (10 minutos)
     - Redirigir a `redirect_uri?code=<code>&state=<state>`

   - `POST /api/auth/token`:
     - Validar `client_id`, `client_secret`, `code`, `redirect_uri`
     - Verificar que el code existe y no expiró
     - Generar `access_token` (JWT con `user_id`, `scope`, `exp`)
     - Generar `refresh_token` (UUID o JWT)
     - Guardar refresh token en DB (asociado a `user_id` y `client_id`)
     - Retornar tokens

   - `POST /api/auth/refresh` (opcional):
     - Validar `refresh_token`
     - Generar nuevo `access_token`
     - Opcionalmente, rotar `refresh_token`

2. **Validación de tokens en endpoints:**
   - Crear helper `validateOAuthToken(token: string): { user_id: string, scope: string[] }`
   - Modificar endpoints para aceptar tokens OAuth además de tokens de Supabase
   - Validar scopes (ej: `write:sourcing_orders` para POST)

3. **Base de datos:**
   - Tabla `oauth_clients` (opcional, o hardcodear client_id/client_secret):
     ```sql
     CREATE TABLE oauth_clients (
       id UUID PRIMARY KEY,
       client_id TEXT UNIQUE NOT NULL,
       client_secret TEXT NOT NULL,
       name TEXT,
       redirect_uris TEXT[],
       created_at TIMESTAMPTZ DEFAULT NOW()
     );
     ```
   - Tabla `oauth_authorizations` (opcional, para tracking):
     ```sql
     CREATE TABLE oauth_authorizations (
       id UUID PRIMARY KEY,
       user_id UUID REFERENCES auth.users(id),
       client_id TEXT,
       scope TEXT[],
       authorized_at TIMESTAMPTZ DEFAULT NOW(),
       revoked_at TIMESTAMPTZ
     );
     ```
   - Tabla `oauth_refresh_tokens`:
     ```sql
     CREATE TABLE oauth_refresh_tokens (
       id UUID PRIMARY KEY,
       user_id UUID REFERENCES auth.users(id),
       client_id TEXT,
       token TEXT UNIQUE NOT NULL,
       expires_at TIMESTAMPTZ,
       created_at TIMESTAMPTZ DEFAULT NOW()
     );
     ```

4. **Configuración del GPT:**
   - Registrar `client_id` y `client_secret` en GPT Builder
   - Configurar `redirect_uri` (debe ser una URL que el GPT maneje)
   - Configurar scopes: `read:sourcing_orders write:sourcing_orders`

5. **Manejo de expiración:**
   - El GPT debe detectar 401 y solicitar nuevo token
   - O implementar refresh automático

**Estimación:** 8-16 horas de desarrollo + testing + documentación

#### Compatibilidad con lo Existente

**✅ Compatible:**
- No rompe endpoints existentes (solo agrega validación adicional)
- Los tokens de Supabase siguen funcionando
- No afecta dashboards ni WhatsApp

**⚠️ Consideraciones:**
- Necesitamos mantener compatibilidad con tokens de Supabase (para web/app)
- Los endpoints deben validar ambos tipos de tokens
- RLS debe funcionar con tokens OAuth (puede requerir ajustes)

---

### Opción C: Flujo Híbrido "Guest + Web" (Flujo Actual Mejorado)

#### Descripción

Mantener `createSourcingOrder` protegido como ahora (requiere login por web). El GPT **NUNCA** crea directamente el pedido. El GPT solo:

1. Busca productos (`searchProducts` - ya funciona)
2. Cuando quiere crear pedido y no hay auth, genera un "resumen" y le da al usuario un **link a una página pre-rellena** en la web con esos datos
3. El usuario completa el flujo en la web (ya está logueado o se loguea ahí)
4. El pedido se crea desde la web con el usuario real autenticado

**Flujo:**
1. Usuario: "Quiero un notebook dell inspiron 15"
2. GPT llama `searchProducts` → 0 resultados
3. GPT: "No encuentro productos listados. ¿Querés que lo busquemos por vos? Te voy a dar un link para que completes el pedido."
4. GPT genera link: `https://mercadito-online-py.vercel.app/sourcing/create?query=notebook+dell+inspiron+15&normalized={"category":"Electrónica","brand":"Dell"}`
5. Usuario hace clic en el link
6. Web carga página `/sourcing/create` con datos pre-rellenos
7. Usuario confirma (o se loguea si no está)
8. Web llama `POST /api/assistant/sourcing-orders` con usuario autenticado
9. Pedido creado ✅

#### Impacto en Seguridad

**Pros:**
- ✅ Máxima seguridad: el usuario siempre está autenticado
- ✅ No se toca auth en backend
- ✅ No hay riesgo de tokens expuestos
- ✅ Trazabilidad completa

**Contras:**
- ⚠️ El usuario debe salir del chat y entrar a la web
- ⚠️ Menos "mágico" que las otras opciones

**Mitigaciones:**
- Link abre en nueva pestaña (el usuario no pierde el chat)
- Página pre-rellena (solo un clic para confirmar)
- Redirección automática de vuelta al chat después de crear

#### Impacto en UX

**Pros:**
- ✅ El usuario ve exactamente qué se va a crear antes de confirmar
- ✅ El usuario puede editar la query antes de crear
- ✅ El usuario puede ver el pedido inmediatamente en "Mis pedidos"

**Contras:**
- ⚠️ Requiere salir del chat (aunque sea momentáneamente)
- ⚠️ Menos fluido que crear directamente desde el chat
- ⚠️ El GPT no puede ver el estado del pedido creado (a menos que se pase el ID en el link)

**Mitigaciones:**
- Link con `?return_to_chat=true` que redirige de vuelta al GPT después
- Página optimizada para móvil (responsive)
- Mensaje claro: "Solo un clic para confirmar"

#### Impacto en Complejidad Técnica

**Nivel:** 🟡 Media

**Cambios necesarios:**

1. **Nueva página:**
   - `src/app/sourcing/create/page.tsx`:
     - Leer query params: `query`, `normalized` (JSON)
     - Mostrar resumen del pedido
     - Botón "Crear pedido"
     - Si no está logueado, mostrar "Iniciar sesión" primero
     - Después de crear, redirigir a `/orders?tab=sourcing` o al chat

2. **Modificar GPT:**
   - En lugar de llamar `createSourcingOrder`, generar link
   - Mensaje: "Te voy a dar un link para que completes el pedido"

3. **Opcional - Endpoint de "preview":**
   - `GET /api/assistant/sourcing-orders/preview?query=...`:
     - No requiere auth
     - Retorna resumen del pedido que se crearía
     - Para que el GPT pueda mostrar preview antes de dar el link

**Estimación:** 4-6 horas de desarrollo + testing

#### Compatibilidad con lo Existente

**✅ Totalmente compatible:**
- No toca auth en backend
- No modifica endpoints existentes
- No afecta dashboards ni WhatsApp
- Reutiliza toda la infraestructura existente

**✅ Ventaja adicional:**
- El usuario puede ver/editar el pedido antes de crearlo
- Mejor UX para usuarios que quieren control

---

## 📊 Comparación de Opciones

| Criterio | Opción A (API Key) | Opción B (OAuth) | Opción C (Híbrido) |
|----------|-------------------|------------------|-------------------|
| **Seguridad** | 🟡 Media | 🟢 Alta | 🟢 Alta |
| **UX** | 🟢 Excelente | 🟡 Buena | 🟡 Aceptable |
| **Complejidad** | 🟢 Baja | 🔴 Alta | 🟡 Media |
| **Tiempo de desarrollo** | 2-4 horas | 8-16 horas | 4-6 horas |
| **Trazabilidad** | 🟡 Parcial | 🟢 Completa | 🟢 Completa |
| **Escalabilidad** | 🟡 Limitada | 🟢 Alta | 🟢 Alta |
| **Mantenimiento** | 🟢 Bajo | 🟡 Medio | 🟢 Bajo |

---

## 🎯 Recomendación LPMS

### Recomendación: **Opción C (Híbrido) ahora, Opción B (OAuth) a futuro**

#### Justificación

**Por qué Opción C ahora:**

1. **Riesgo mínimo:** No toca auth, no rompe nada existente
2. **Implementación rápida:** 4-6 horas vs 8-16 horas de OAuth
3. **Seguridad máxima:** El usuario siempre está autenticado
4. **Compatible con LPMS:** Cambios aditivos, reutiliza todo lo existente
5. **Permite validar demanda:** Ver si los usuarios realmente usan el GPT antes de invertir en OAuth

**Por qué Opción B a futuro:**

1. **Mejor UX a largo plazo:** El GPT puede crear pedidos directamente
2. **Escalable:** Permite agregar más acciones del GPT (crear órdenes, ver perfil, etc.)
3. **Estándar de la industria:** OAuth 2.0 es el estándar para integraciones de terceros
4. **Preparado para el futuro:** Cuando se implemente "Instant Checkout", OAuth será necesario

#### Plan de Implementación Sugerido

**Fase 1 (Ahora): Opción C**
1. Crear página `/sourcing/create` con datos pre-rellenos
2. Modificar documentación del GPT para generar links
3. Testing y deploy
4. Monitorear uso y feedback

**Fase 2 (3-6 meses): Opción B (si hay demanda)**
1. Implementar endpoints OAuth
2. Configurar GPT con OAuth
3. Migrar usuarios de Opción C a Opción B
4. Mantener Opción C como fallback

**Fase 3 (Futuro): Mejoras**
1. Refresh tokens automáticos
2. Scopes granulares
3. Panel de gestión de permisos para usuarios
4. Integración con más acciones del GPT

---

## ✅ Checklist de Implementación (Opción C)

- [ ] Crear página `src/app/sourcing/create/page.tsx`
- [ ] Leer query params (`query`, `normalized`)
- [ ] Validar que el usuario está autenticado (redirigir a login si no)
- [ ] Mostrar resumen del pedido
- [ ] Botón "Crear pedido" que llama `POST /api/assistant/sourcing-orders`
- [ ] Redirección después de crear (a `/orders?tab=sourcing` o al chat)
- [ ] Actualizar documentación del GPT para generar links
- [ ] Testing end-to-end
- [ ] Deploy a producción

---

## 📝 Notas Finales

- **No modificar código en esta fase:** Este documento es solo diseño
- **Siguiente fase:** Implementar Opción C según recomendación
- **Monitoreo:** Después de implementar, monitorear uso y feedback
- **Iteración:** Ajustar según necesidades reales

---

**Documento creado:** 2024-11-24  
**Autor:** LPMS - Senior Dev Ultra Conservador  
**Versión:** 1.0























