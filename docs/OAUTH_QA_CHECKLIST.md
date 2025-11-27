# OAuth 2.0 - Checklist QA

## ⚠️ Estado Actual

**OAuth está implementado pero el cliente está inactivo:**
- Cliente `gpt-assistant-mercadito` con `is_active = false`
- `client_secret = 'REVOKED-NEEDS-RESET'` (no es hash bcrypt válido)
- **Ningún flujo OAuth se puede completar** hasta activar manualmente

**El sistema funciona normalmente sin OAuth:**
- ✅ Login tradicional con Supabase funciona
- ✅ Endpoints con cookies funcionan
- ✅ OAuth es completamente opcional

**Para activar OAuth:** Ver `docs/OAUTH_CLIENT_SECRET_ROTATION.md` y `docs/OAUTH_IMPLEMENTATION.md`

---

## ✅ Validación de Flujo Completo

### 1. Flujo de Autorización

- [ ] **GET /oauth/authorize sin autenticación:**
  - [ ] Redirige a `/auth/sign-in?redirect_to=...&oauth_flow=true`
  - [ ] Después de login, redirige de vuelta a `/oauth/authorize` con parámetros originales
  - [ ] Genera código de autorización válido

- [ ] **GET /oauth/authorize con autenticación:**
  - [ ] Valida `client_id` existe y está activo
  - [ ] Valida `redirect_uri` está permitido
  - [ ] Valida `scopes` son válidos y permitidos para el cliente
  - [ ] Genera código de autorización
  - [ ] Redirige a `redirect_uri?code=<auth_code>&state=<state>`

- [ ] **GET /oauth/authorize con parámetros inválidos:**
  - [ ] `client_id` inexistente → `invalid_client`
  - [ ] `redirect_uri` no permitido → `invalid_request`
  - [ ] `response_type` != "code" → `unsupported_response_type`
  - [ ] `scope` inválido → `invalid_scope`

### 2. Flujo de Token

- [ ] **POST /oauth/token con código válido:**
  - [ ] Valida `client_id` y `client_secret` (con bcrypt)
  - [ ] Valida código no expirado, no usado, pertenece al cliente correcto
  - [ ] Valida `redirect_uri` coincide
  - [ ] Genera access token
  - [ ] Marca código como usado
  - [ ] Retorna token según RFC 6749

- [ ] **POST /oauth/token con código inválido:**
  - [ ] Código no existe → `invalid_grant`
  - [ ] Código expirado → `invalid_grant`
  - [ ] Código ya usado → `invalid_grant`
  - [ ] Código no pertenece al cliente → `invalid_grant`
  - [ ] `redirect_uri` no coincide → `invalid_request`

- [ ] **POST /oauth/token con credenciales inválidas:**
  - [ ] `client_secret` incorrecto → `invalid_client`
  - [ ] `client_id` inexistente → `invalid_client`
  - [ ] Mensaje genérico (no revela cuál es el problema)

### 3. Uso de Access Token

- [ ] **POST /api/assistant/sourcing-orders con token OAuth:**
  - [ ] Token válido → crea sourcing_order correctamente
  - [ ] Token expirado → 401
  - [ ] Token revocado → 401
  - [ ] Token inválido → 401

- [ ] **GET /api/assistant/sourcing-orders?mode=user con token OAuth:**
  - [ ] Token válido → lista sourcing_orders del usuario
  - [ ] Token expirado → 401
  - [ ] Token inválido → 401

- [ ] **GET /api/assistant/sourcing-orders/[id] con token OAuth:**
  - [ ] Token válido + usuario es creador → retorna pedido
  - [ ] Token válido + usuario NO es creador → 403
  - [ ] Token expirado → 401

---

## ✅ Validación de Compatibilidad

### 1. Login Tradicional

- [ ] **Login con email/password:**
  - [ ] Usuario puede iniciar sesión normalmente
  - [ ] Sesión se mantiene en cookies
  - [ ] Usuario puede acceder a todas las funcionalidades

- [ ] **Endpoints con cookie:**
  - [ ] `POST /api/assistant/sourcing-orders` funciona con cookie
  - [ ] `GET /api/assistant/sourcing-orders?mode=user` funciona con cookie
  - [ ] `GET /api/assistant/sourcing-orders/[id]` funciona con cookie
  - [ ] `PATCH /api/assistant/sourcing-orders/[id]` funciona con cookie

### 2. Endpoints Públicos

- [ ] **GET /api/assistant/search-products:**
  - [ ] Sigue siendo público (sin auth)
  - [ ] Retorna productos correctamente
  - [ ] Maneja errores gracefully (siempre 200)

### 3. Funcionalidades Existentes

- [ ] **Crear orden desde web:**
  - [ ] Usuario puede crear sourcing_order desde la web
  - [ ] Se asocia correctamente al usuario
  - [ ] WhatsApp notification se envía (si está configurado)

- [ ] **Dashboards:**
  - [ ] Dashboard de vendedor funciona
  - [ ] Dashboard de comprador funciona
  - [ ] Contadores de sourcing_orders se actualizan

- [ ] **WhatsApp notifications:**
  - [ ] Se envían al crear sourcing_order
  - [ ] Se envían al cambiar estado
  - [ ] No se rompen con OAuth

---

## ✅ Validación de Prioridad Cookie > Token

### Test Crítico: Prioridad

- [ ] **Llamar endpoint con cookie Y token OAuth:**
  - [ ] Se usa cookie (prioridad 1)
  - [ ] Se ignora token OAuth
  - [ ] Usuario es el de la cookie, no el del token

- [ ] **Llamar endpoint solo con token OAuth:**
  - [ ] Se usa token OAuth (fallback)
  - [ ] Usuario es el del token OAuth

- [ ] **Llamar endpoint sin cookie ni token:**
  - [ ] Retorna 401
  - [ ] Mensaje: "No autorizado. Debes iniciar sesión."

### Test de Seguridad: Token Override

- [ ] **Intentar usar token OAuth de otro usuario cuando hay cookie:**
  - [ ] Cookie prevalece (usuario real gana)
  - [ ] Token OAuth se ignora completamente

---

## ✅ Validación de Seguridad

### 1. Secrets y Tokens

- [ ] **Verificar que NO se loguean:**
  - [ ] `access_token` completo
  - [ ] `client_secret` (ni en texto plano ni hash)
  - [ ] `authorization_code` completo
  - [ ] Hashes bcrypt

- [ ] **Verificar que solo se loguean:**
  - [ ] IDs truncados (primeros 8 caracteres)
  - [ ] Mensajes genéricos
  - [ ] Errores sin detalles sensibles

### 2. Validación de bcrypt

- [ ] **Client secret hasheado:**
  - [ ] En BD está el hash bcrypt (empieza con `$2a$`, `$2b$`, etc.)
  - [ ] NO está el secret en texto plano
  - [ ] `bcrypt.compare()` funciona correctamente

- [ ] **Comparación segura:**
  - [ ] Si hash no es bcrypt válido → retorna false
  - [ ] Si secret incorrecto → retorna false
  - [ ] Si secret correcto → retorna true
  - [ ] No hay timing attacks (bcrypt.compare es seguro)

### 3. Generación de Tokens

- [ ] **Tokens generados con crypto seguro:**
  - [ ] `generateAuthorizationCode()` usa `crypto.randomBytes(32)`
  - [ ] `generateAccessToken()` usa `crypto.randomBytes(32)`
  - [ ] NO usa `crypto.randomUUID()` ni `Math.random()`
  - [ ] Tokens tienen suficiente entropía (32 bytes)

### 4. Timing Attack Protection

- [ ] **No se revela si client_id existe:**
  - [ ] Mensaje genérico para client_id inexistente
  - [ ] Mensaje genérico para client_secret incorrecto
  - [ ] Mismo tiempo de respuesta (aproximadamente)

---

## ✅ Validación de Estado Actual (Cliente Inactivo)

### Test: Cliente Inactivo (Estado Actual)

- [ ] **Verificar que cliente está inactivo:**
  ```sql
  SELECT client_id, is_active, 
         CASE WHEN client_secret LIKE '$2%' THEN 'Hash bcrypt válido' 
              ELSE 'Secret inválido/revocado' END as secret_status
  FROM oauth_clients 
  WHERE client_id = 'gpt-assistant-mercadito';
  ```
  - [ ] `is_active = false`
  - [ ] `client_secret = 'REVOKED-NEEDS-RESET'` (o similar)

- [ ] **Verificar que OAuth no funciona:**
  - [ ] `GET /oauth/authorize?client_id=gpt-assistant-mercadito&...` → `invalid_client`
  - [ ] `POST /oauth/token` con credenciales → `invalid_client`
  - [ ] No se pueden generar tokens OAuth

- [ ] **Verificar que sistema funciona normalmente:**
  - [ ] Login tradicional con Supabase funciona
  - [ ] Endpoints con cookie siguen funcionando
  - [ ] No se rompe ninguna funcionalidad existente

## ✅ Validación de Reversibilidad

### Test: Desactivar OAuth (Después de Activar)

- [ ] **Desactivar cliente OAuth:**
  ```sql
  UPDATE oauth_clients SET is_active = false WHERE client_id = 'gpt-assistant-mercadito';
  ```

- [ ] **Verificar que:**
  - [ ] Login tradicional sigue funcionando
  - [ ] Endpoints con cookie siguen funcionando
  - [ ] Endpoints con token OAuth retornan 401 (esperado)
  - [ ] No se rompe ninguna funcionalidad existente

### Test: Reactivar OAuth

- [ ] **Reactivar cliente OAuth:**
  ```sql
  UPDATE oauth_clients SET is_active = true WHERE client_id = 'gpt-assistant-mercadito';
  ```

- [ ] **Verificar que:**
  - [ ] OAuth vuelve a funcionar
  - [ ] No se afecta login tradicional
  - [ ] Prioridad cookie > token sigue funcionando

---

## 📝 Notas de Testing

### Ambiente de Pruebas

- **Desarrollo:** Usar cliente OAuth con `is_active = false` inicialmente
- **Staging:** Probar flujo completo antes de producción
- **Producción:** Solo activar después de validar todo

### Datos de Prueba

- **Cliente OAuth:** `gpt-assistant-mercadito`
- **Scopes:** `sourcing_orders.read`, `sourcing_orders.write`
- **Redirect URI:** `https://chat.openai.com/oauth/callback` (ajustar según necesidad)

### Errores Comunes

1. **Token expirado:** Verificar que `expires_at` es correcto (1 hora desde creación)
2. **Código ya usado:** Verificar que `used_at` se marca correctamente
3. **bcrypt no funciona:** Verificar que `bcryptjs` está instalado
4. **Prioridad no funciona:** Verificar que cookie se lee primero

---

**Checklist creado:** 2024-11-24  
**Versión:** 1.0

