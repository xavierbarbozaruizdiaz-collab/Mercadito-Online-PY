# OAuth 2.0 Implementation - Mercadito Online PY

## 📋 Resumen

Este documento describe la implementación de OAuth 2.0 Authorization Code Flow para permitir que el GPT "Asistente de Compras" pueda actuar en nombre del usuario cuando este lo autorice explícitamente.

**IMPORTANTE:** OAuth es una **CAPA ADICIONAL** que coexiste con Supabase Auth. No reemplaza ni modifica el flujo de autenticación existente.

---

## 🎯 Objetivo

Permitir que el GPT pueda:
- Crear `sourcing_orders` en nombre del usuario
- Listar `sourcing_orders` del usuario
- Consultar detalles de `sourcing_orders` específicos

Todo esto **solo después** de que el usuario autorice explícitamente al GPT.

---

## 🔐 Arquitectura de Seguridad

### Prioridad de Autenticación

Los endpoints de `sourcing_orders` implementan autenticación **dual con prioridad**:

1. **PRIORIDAD 1:** Cookie de Supabase Auth (sesión web/app)
2. **PRIORIDAD 2:** Bearer Token OAuth (si no hay cookie)
3. **FALLBACK:** Token Supabase en header (compatibilidad hacia atrás)

**Regla crítica:** Si hay cookie válida, se usa siempre, ignorando cualquier token OAuth. Esto garantiza que el usuario real siempre tiene prioridad.

### Scopes Permitidos

- `sourcing_orders.read`: Leer sourcing orders del usuario
- `sourcing_orders.write`: Crear sourcing orders en nombre del usuario

### Duración de Tokens

- **Authorization Code:** 10 minutos
- **Access Token:** 1 hora (3600 segundos)
- **NO hay refresh tokens** en MVP (el usuario debe re-autorizar después de 1 hora)

---

## 📊 Flujo Completo OAuth 2.0

### Diagrama Secuencial

```
┌─────────┐         ┌──────────┐         ┌─────────────┐         ┌──────────┐
│  GPT    │         │  Usuario │         │  Mercadito │         │  Supabase│
│         │         │          │         │   Online   │         │   Auth   │
└────┬────┘         └────┬─────┘         └─────┬──────┘         └────┬─────┘
     │                   │                     │                     │
     │ 1. Usuario pide   │                     │                     │
     │    crear pedido   │                     │                     │
     │──────────────────>│                     │                     │
     │                   │                     │                     │
     │ 2. GPT detecta    │                     │                     │
     │    que necesita   │                     │                     │
     │    autorización   │                     │                     │
     │                   │                     │                     │
     │ 3. Redirigir a    │                     │                     │
     │    /oauth/        │                     │                     │
     │    authorize      │                     │                     │
     │────────────────────────────────────────>│                     │
     │                   │                     │                     │
     │                   │ 4. Verificar si     │                     │
     │                   │    usuario está     │                     │
     │                   │    logueado        │                     │
     │                   │<────────────────────┤                     │
     │                   │                     │                     │
     │                   │ 5. Si no está,      │                     │
     │                   │    redirigir a      │                     │
     │                   │    /auth/sign-in    │                     │
     │                   │───────────────────────────────────────────>│
     │                   │                     │                     │
     │                   │ 6. Usuario inicia  │                     │
     │                   │    sesión          │                     │
     │                   │<───────────────────────────────────────────┤
     │                   │                     │                     │
     │                   │ 7. Redirigir de    │                     │
     │                   │    vuelta a         │                     │
     │                   │    /oauth/authorize │                     │
     │                   │────────────────────>│                     │
     │                   │                     │                     │
     │                   │ 8. Generar código  │                     │
     │                   │    de autorización │                     │
     │                   │    (10 min exp)    │                     │
     │                   │<────────────────────┤                     │
     │                   │                     │                     │
     │ 9. Redirigir con  │                     │                     │
     │    código         │                     │                     │
     │<────────────────────────────────────────┤                     │
     │                   │                     │                     │
     │ 10. Intercambiar  │                     │                     │
     │     código por    │                     │                     │
     │     access_token  │                     │                     │
     │────────────────────────────────────────>│                     │
     │                   │                     │                     │
     │ 11. Validar       │                     │                     │
     │     código y      │                     │                     │
     │     generar token │                     │                     │
     │<────────────────────────────────────────┤                     │
     │                   │                     │                     │
     │ 12. Usar token    │                     │                     │
     │     para crear    │                     │                     │
     │     sourcing_order│                     │                     │
     │────────────────────────────────────────>│                     │
     │                   │                     │                     │
     │ 13. Retornar      │                     │                     │
     │     resultado     │                     │                     │
     │<────────────────────────────────────────┤                     │
```

---

## 🔧 Endpoints Implementados

### 1. GET /oauth/authorize

**Descripción:** Inicia el flujo de autorización OAuth.

**Parámetros Query:**
- `client_id` (requerido): ID del cliente OAuth (GPT)
- `redirect_uri` (requerido): URI de redirección después de autorizar
- `response_type` (requerido): Debe ser `"code"`
- `scope` (opcional): Scopes solicitados (ej: `"sourcing_orders.read sourcing_orders.write"`)
- `state` (opcional): Valor para protección CSRF
- `code_challenge` (opcional): Para PKCE
- `code_challenge_method` (opcional): `"plain"` o `"S256"`

**Ejemplo:**
```
GET /oauth/authorize?client_id=gpt-assistant&redirect_uri=https://chat.openai.com/oauth/callback&response_type=code&scope=sourcing_orders.read%20sourcing_orders.write&state=abc123
```

**Flujo:**
1. Valida `client_id` y `redirect_uri`
2. Verifica que el usuario esté autenticado (Supabase Auth)
3. Si no está autenticado, redirige a `/auth/sign-in?redirect_to=/oauth/authorize?...`
4. Si está autenticado, genera código de autorización
5. Guarda código en BD con expiración de 10 minutos
6. Redirige a `redirect_uri?code=<auth_code>&state=<state>`

**Errores:**
- `invalid_client`: Cliente no encontrado o inactivo
- `invalid_request`: Parámetros faltantes o inválidos
- `unsupported_response_type`: `response_type` no es `"code"`
- `invalid_scope`: Scopes inválidos o no autorizados

---

### 2. POST /oauth/token

**Descripción:** Intercambia código de autorización por access token.

**Content-Type:** `application/x-www-form-urlencoded`

**Body (form data):**
- `grant_type` (requerido): Debe ser `"authorization_code"`
- `code` (requerido): Código de autorización recibido
- `redirect_uri` (requerido): Debe coincidir con el usado en `/authorize`
- `client_id` (requerido): ID del cliente OAuth
- `client_secret` (requerido): Secret del cliente
- `code_verifier` (opcional): Para PKCE

**Ejemplo:**
```bash
curl -X POST https://mercadito-online-py.vercel.app/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=abc123&redirect_uri=https://chat.openai.com/oauth/callback&client_id=gpt-assistant&client_secret=secret123"
```

**Respuesta exitosa:**
```json
{
  "access_token": "550e8400-e29b-41d4-a716-446655440000",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "sourcing_orders.read sourcing_orders.write"
}
```

**Errores:**
- `invalid_client`: Cliente o secret inválido
- `invalid_grant`: Código inválido, expirado o ya usado
- `invalid_request`: Parámetros faltantes o inválidos
- `server_error`: Error interno del servidor

---

## 🔑 Uso del Access Token

Una vez obtenido el `access_token`, el GPT debe incluirlo en todas las llamadas a la API:

```http
Authorization: Bearer 550e8400-e29b-41d4-a716-446655440000
```

**Endpoints que aceptan tokens OAuth:**
- `POST /api/assistant/sourcing-orders`
- `GET /api/assistant/sourcing-orders?mode=user`
- `GET /api/assistant/sourcing-orders/[id]`

**Nota:** Si el usuario tiene una sesión activa (cookie), la cookie tiene **prioridad** sobre el token OAuth.

---

## 🗄️ Base de Datos

### Tablas Creadas

#### `oauth_clients`
Almacena clientes OAuth registrados.

```sql
CREATE TABLE oauth_clients (
  id UUID PRIMARY KEY,
  client_id TEXT UNIQUE NOT NULL,
  client_secret TEXT NOT NULL, -- Hash bcrypt (en producción)
  name TEXT NOT NULL,
  redirect_uris TEXT[] NOT NULL,
  scopes TEXT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

#### `oauth_authorization_codes`
Almacena códigos de autorización temporales.

```sql
CREATE TABLE oauth_authorization_codes (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  redirect_uri TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  code_challenge TEXT,
  code_challenge_method TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);
```

#### `oauth_tokens`
Almacena access tokens emitidos.

```sql
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY,
  access_token TEXT UNIQUE NOT NULL,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  scopes TEXT[] NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ
);
```

### RLS (Row Level Security)

- **oauth_clients:** Solo admins pueden ver clientes activos
- **oauth_authorization_codes:** Usuarios solo pueden ver sus propios códigos
- **oauth_tokens:** Usuarios solo pueden ver sus propios tokens activos

**IMPORTANTE:** RLS no afecta las tablas existentes (`users`, `profiles`, `sourcing_orders`, etc.).

---

## 🛡️ Seguridad

### Medidas Implementadas

1. **Códigos de autorización:**
   - Generados con `crypto.randomBytes(32)` (criptográficamente seguros)
   - Expiran en 10 minutos
   - Solo se pueden usar una vez
   - Se validan contra `client_id` y `redirect_uri`
   - **NUNCA se loguean** (solo primeros caracteres para debugging)

2. **Access tokens:**
   - Generados con `crypto.randomBytes(32)` (criptográficamente seguros)
   - Expiran en 1 hora
   - Se pueden revocar manualmente
   - Se valida expiración en cada uso
   - **NUNCA se loguean** (solo primeros caracteres para debugging)

3. **Client secrets:**
   - **SIEMPRE hasheados con bcrypt** (10 rounds)
   - El secret en texto plano **NUNCA** se almacena en BD
   - Validación con `bcrypt.compare()` (seguro contra timing attacks)
   - **NUNCA se loguean** ni se exponen en respuestas
   - No se revela si el `client_id` existe o no (timing attack protection)

4. **PKCE (opcional):**
   - Soporte para `code_challenge` y `code_verifier`
   - Métodos: `plain` y `S256`

5. **Prioridad de autenticación:**
   - Cookie Supabase **SIEMPRE** tiene prioridad
   - Token OAuth solo se usa si no hay cookie
   - Garantiza que el usuario real siempre gana

6. **Logging seguro:**
   - No se loguean: `access_token`, `client_secret`, `authorization_code`, hashes
   - Solo se loguean: IDs truncados (primeros 8 caracteres), mensajes genéricos
   - Errores no revelan información sensible

### Mejoras Implementadas (Producción)

✅ **Generación segura de tokens:** `crypto.randomBytes(32)` en lugar de UUID  
✅ **bcrypt para client_secret:** Hash con 10 rounds, comparación segura  
✅ **Logging seguro:** No se exponen secrets ni tokens en logs  
✅ **Timing attack protection:** No se revela si client_id existe o no  
✅ **Prioridad garantizada:** Cookie siempre gana sobre token OAuth

### Limitaciones MVP (Mejoras Futuras)

1. **Access tokens:** UUIDs base64url (considerar JWT con firma en futuro)
2. **No refresh tokens:** Usuario debe re-autorizar después de 1 hora
3. **No rate limiting:** En validación de tokens (agregar en futuro)
4. **No revocación automática:** Endpoint de revocación manual (agregar en futuro)

**Estas mejoras se implementarán en fases posteriores según necesidad.**

---

## 📝 Configuración del GPT

### 1. Registrar Cliente OAuth

Primero, crear un cliente OAuth en la base de datos:

```sql
INSERT INTO oauth_clients (
  client_id,
  client_secret,
  name,
  redirect_uris,
  scopes,
  is_active
) VALUES (
  'gpt-assistant',
  'tu-secret-aqui', -- Hashear con bcrypt en producción
  'GPT Asistente de Compras',
  ARRAY['https://chat.openai.com/oauth/callback'],
  ARRAY['sourcing_orders.read', 'sourcing_orders.write'],
  true
);
```

### 2. Configurar en GPT Builder

1. Ir a GPT Builder → Actions → Authentication
2. Seleccionar "OAuth"
3. Configurar:
   - **Authorization URL:** `https://mercadito-online-py.vercel.app/oauth/authorize`
   - **Token URL:** `https://mercadito-online-py.vercel.app/oauth/token`
   - **Client ID:** `gpt-assistant`
   - **Client Secret:** `tu-secret-aqui`
   - **Scope:** `sourcing_orders.read sourcing_orders.write`

### 3. Configurar Actions

Las acciones del GPT (`createSourcingOrder`, `listMySourcingOrders`, etc.) deben incluir el `access_token` en el header:

```json
{
  "Authorization": "Bearer {access_token}"
}
```

---

## ✅ Checklist QA

### Validación de Flujo Completo

- [ ] Usuario no autenticado → redirige a login
- [ ] Usuario autenticado → genera código de autorización
- [ ] Código expirado → retorna `invalid_grant`
- [ ] Código usado dos veces → retorna `invalid_grant`
- [ ] `redirect_uri` no coincide → retorna `invalid_request`
- [ ] `client_secret` inválido → retorna `invalid_client`
- [ ] Token OAuth válido → permite crear sourcing_order
- [ ] Token OAuth expirado → retorna 401
- [ ] Cookie Supabase tiene prioridad sobre token OAuth

### Validación de Compatibilidad

- [ ] Login tradicional sigue funcionando
- [ ] `sourcing_orders` funciona con cookie
- [ ] `search-products` sigue público (sin auth)
- [ ] Crear orden desde web sigue funcionando
- [ ] Dashboards siguen funcionando
- [ ] WhatsApp notifications siguen funcionando

### Validación de Seguridad

- [ ] No se loguean secrets
- [ ] No se exponen tokens en respuestas
- [ ] Tokens expiran correctamente
- [ ] Códigos solo se usan una vez
- [ ] RLS funciona correctamente
- [ ] Prioridad cookie > OAuth funciona

---

## 🔄 Reversibilidad

**IMPORTANTE:** Esta implementación es completamente reversible.

Si necesitamos desactivar OAuth:

1. **Desactivar clientes OAuth:**
   ```sql
   UPDATE oauth_clients SET is_active = false;
   ```

2. **Los endpoints seguirán funcionando** con cookies Supabase (prioridad 1)

3. **No se requiere rollback de código** - los endpoints tienen fallback automático

4. **No se afecta Supabase Auth** - sigue funcionando igual que antes

---

## 📚 Referencias

- [RFC 6749 - OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
- [RFC 7636 - PKCE](https://tools.ietf.org/html/rfc7636)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)

---

## 🚀 Próximos Pasos (Futuro)

1. **Implementar bcrypt para client secrets**
2. **Usar JWT para access tokens** (con firma)
3. **Agregar refresh tokens** (para tokens de larga duración)
4. **Implementar rate limiting** en validación de tokens
5. **Agregar endpoint de revocación** de tokens
6. **Panel de gestión** de permisos OAuth para usuarios

---

**Documento creado:** 2024-11-24  
**Versión:** 1.0  
**Autor:** LPMS - Senior Dev Ultra Conservador + Especialista en Seguridad/OAuth

