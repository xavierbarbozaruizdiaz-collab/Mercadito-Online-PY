# OAuth Client Secret Rotation - Guía de Seguridad

## ⚠️ IMPORTANTE: Seguridad de Secrets

**NUNCA** subas el `client_secret` en texto plano al repositorio. Este documento explica el procedimiento correcto para generar, hashear y establecer el secret de forma segura.

## 📋 Estado Actual

**El cliente OAuth está actualmente inactivo:**
- Cliente `gpt-assistant-mercadito` con `is_active = false`
- `client_secret = 'REVOKED-NEEDS-RESET'` (no es hash bcrypt válido)
- **Ningún flujo OAuth funciona** hasta que se active manualmente siguiendo este procedimiento

**El sistema funciona normalmente sin OAuth:**
- ✅ Login tradicional con Supabase funciona
- ✅ Endpoints con cookies funcionan
- ✅ OAuth es completamente opcional

---

## 📋 Procedimiento Completo

### Paso 1: Generar un Secret Fuerte

**Opción A: Usando OpenSSL (recomendado)**

```bash
openssl rand -base64 32
```

**Opción B: Usando Node.js**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Resultado:** Obtendrás un string base64 de 32 bytes (ejemplo: `xK9mP2qR7vT4wN8bY5cZ1aD3fG6hJ0kL`)

**⚠️ IMPORTANTE:** Guarda este secret en un lugar seguro (gestor de contraseñas, variables de entorno locales) **ANTES** de hashearlo. Una vez hasheado, no podrás recuperar el original.

---

### Paso 2: Hashear el Secret con bcrypt

**Script Node.js (ejecutar LOCALMENTE, nunca en el repo):**

El proyecto incluye un script local en `scripts/hash-oauth-secret.mjs` que puedes usar para generar el hash bcrypt.

**⚠️ IMPORTANTE:**
- Este archivo está en `.gitignore` y **NUNCA debe commitearse** con el secret real
- El secret real solo debe existir en tu máquina local y en el panel de ChatGPT
- Después de generar el hash, puedes borrar el archivo si lo deseas

**Procedimiento:**

1. **Abrir el script:**
   ```bash
   # El archivo ya existe en: scripts/hash-oauth-secret.mjs
   ```

2. **Reemplazar el placeholder:**
   - Abre `scripts/hash-oauth-secret.mjs` en tu editor
   - Busca la línea: `const secret = "PEGAR_ACA_TU_SECRET_REAL";`
   - Reemplaza `PEGAR_ACA_TU_SECRET_REAL` con el secret real que generaste en el Paso 1
   - **Ejemplo:** `const secret = "xK9mP2qR7vT4wN8bY5cZ1aD3fG6hJ0kL";`

3. **Ejecutar el script:**
   ```bash
   # Asegúrate de tener bcryptjs instalado (ya está en package.json)
   npm install bcryptjs @types/bcryptjs
   
   # Ejecutar el script
   node scripts/hash-oauth-secret.mjs
   ```

4. **Copiar el hash generado:**
   - El script imprimirá el hash bcrypt (comienza con `$2a$`)
   - Copia este hash completo
   - **Ejemplo de salida:**
     ```
     HASH BCRYPT (copiar este valor en Supabase):
     $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
     ```

5. **Limpiar (opcional pero recomendado):**
   - Después de generar el hash, puedes borrar `scripts/hash-oauth-secret.mjs` o revertir el cambio
   - El secret real no debe quedar en ningún archivo del repositorio

**Resultado:** Obtendrás un hash bcrypt (ejemplo: `$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy`)

**⚠️ Recordatorio de seguridad:**
- ✅ El secret real solo va en:
  - `scripts/hash-oauth-secret.mjs` (local, ignorado por git)
  - Panel de configuración del GPT como Client Secret
- ❌ El secret real NUNCA debe guardarse en:
  - El repositorio Git
  - Archivos commiteados
  - Variables de entorno del proyecto (solo el hash va en BD)

---

### Paso 3: Establecer el Hash en la Base de Datos

**SQL para ejecutar en producción (reemplazar `<HASH_BCRYPT_GENERADO_OFFLINE>` con el hash del Paso 2):**

```sql
-- ⚠️ EJECUTAR SOLO EN PRODUCCIÓN, DESPUÉS DE GENERAR EL HASH OFFLINE
-- ⚠️ REEMPLAZAR <HASH_BCRYPT_GENERADO_OFFLINE> CON EL HASH GENERADO EN PASO 2

UPDATE public.oauth_clients
SET
  client_secret = '<HASH_BCRYPT_GENERADO_OFFLINE>',
  is_active = true,
  updated_at = now()
WHERE client_id = 'gpt-assistant-mercadito';
```

**⚠️ IMPORTANTE:**
- Reemplaza `<HASH_BCRYPT_GENERADO_OFFLINE>` con el hash que copiaste del Paso 2
- El hash debe comenzar con `$2a$`, `$2b$` o `$2y$`
- Después de ejecutar este SQL, el cliente OAuth estará activo

**Ejemplo completo:**

```sql
UPDATE public.oauth_clients
SET
  client_secret = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  is_active = true,
  updated_at = now()
WHERE client_id = 'gpt-assistant-mercadito';
```

**Verificación:**

Después de ejecutar el SQL, verifica que el cliente esté activo:

```sql
SELECT client_id, is_active, 
       CASE 
         WHEN client_secret LIKE '$2a$%' OR client_secret LIKE '$2b$%' OR client_secret LIKE '$2y$%' 
         THEN 'Hash bcrypt válido'
         ELSE 'Hash inválido o revocado'
       END as secret_status
FROM public.oauth_clients
WHERE client_id = 'gpt-assistant-mercadito';
```

**Resultado esperado:**
- `is_active = true`
- `secret_status = 'Hash bcrypt válido'`

---

### Resumen del Flujo Completo

1. **Generar secret real:**
   ```bash
   openssl rand -base64 32
   ```

2. **Pegar secret en script:**
   - Abrir `scripts/hash-oauth-secret.mjs`
   - Reemplazar `PEGAR_ACA_TU_SECRET_REAL` con el secret real

3. **Ejecutar script:**
   ```bash
   node scripts/hash-oauth-secret.mjs
   ```

4. **Copiar hash generado:**
   - El hash comienza con `$2a$`
   - Copiar el hash completo

5. **Ejecutar SQL en Supabase:**
   ```sql
   UPDATE public.oauth_clients
   SET
     client_secret = '<HASH_BCRYPT_GENERADO_OFFLINE>',
     is_active = true,
     updated_at = now()
   WHERE client_id = 'gpt-assistant-mercadito';
   ```

6. **Configurar en ChatGPT GPT Builder:**
   - Client Secret: `<SECRET_EN_TEXTO_PLANO>` (el original, NO el hash)

---

**⚠️ Recordatorio final:**
- El secret real **NUNCA** debe guardarse en el repositorio
- El secret real solo va en:
  - `scripts/hash-oauth-secret.mjs` (local, ignorado por git)
  - Panel de configuración del GPT como Client Secret
- Después de generar el hash, el archivo se puede borrar si se desea

---

**Nota:** El archivo `scripts/hash-oauth-secret.mjs` está en `.gitignore` y no se commiteará nunca. Si necesitas regenerar el hash en el futuro, simplemente crea el archivo nuevamente siguiendo el mismo procedimiento.

---

### Paso 4: Configurar el Cliente OAuth en ChatGPT GPT Builder

Una vez que el `client_secret` hasheado esté en la base de datos y el cliente `is_active = true`, configura el GPT:

- **Authorization URL:** `https://mercadito-online-py.vercel.app/oauth/authorize`
- **Token URL:** `https://mercadito-online-py.vercel.app/oauth/token`
- **Client ID:** `gpt-assistant-mercadito`
- **Client Secret:** `<TU_SECRET_EN_TEXTO_PLANO>` (el original, NO el hash bcrypt)
- **Scope:** `sourcing_orders.read sourcing_orders.write`

---

## 🔄 Rotación de Secrets Existentes

Para rotar un `client_secret` ya establecido:

1. **Invalidar secret actual (opcional pero recomendado):**
   ```sql
   UPDATE public.oauth_clients
   SET client_secret = 'REVOKED-NEEDS-RESET', is_active = false
   WHERE client_id = 'gpt-assistant-mercadito';
   ```
   Esto desactiva inmediatamente el cliente y revoca su secret.

2. Sigue los **Pasos 1, 2 y 3** de este documento para generar un nuevo secret, hashearlo y actualizar la base de datos.

3. Actualiza la configuración del cliente en ChatGPT GPT Builder con el nuevo secret en texto plano.

---

## 📝 Estado Actual del Cliente GPT

El cliente `gpt-assistant-mercadito` en la base de datos se encuentra actualmente en un estado **inactivo** y con un `client_secret` marcado como `'REVOKED-NEEDS-RESET'`.

Esto significa que:
- Ningún flujo OAuth puede ser completado para este cliente.
- El servidor rechazará cualquier intento de autorización o emisión de token.

Para activar el cliente y permitir que el GPT funcione, debes seguir los **Pasos 1, 2 y 3** de este documento para generar un nuevo secret, hashearlo y actualizar la base de datos, asegurándote de establecer `is_active = true` en el `UPDATE` final.
SET 
  client_secret = '<HASH_BCRYPT_AQUI>',
  is_active = true,
  updated_at = now()
WHERE client_id = 'gpt-assistant-mercadito';

-- Verificar que se actualizó correctamente (sin mostrar el hash)
SELECT 
  client_id,
  name,
  is_active,
  length(client_secret) as secret_length,
  updated_at
FROM public.oauth_clients
WHERE client_id = 'gpt-assistant-mercadito';
```

**⚠️ IMPORTANTE:**
- Ejecuta este SQL **directamente en la base de datos de producción**
- **NO** lo incluyas en migraciones ni en el repo
- Verifica que `is_active = true` después de actualizar

---

### Paso 4: Invalidar Secret Temporal (si existe)

Si por alguna razón se estableció un secret temporal en desarrollo, invalidarlo:

```sql
-- Invalidar cualquier secret temporal o en texto plano
UPDATE public.oauth_clients
SET 
  client_secret = 'REVOKED-NEEDS-RESET',
  is_active = false
WHERE client_id = 'gpt-assistant-mercadito'
  AND (client_secret LIKE 'gpt-secret%' 
    OR client_secret LIKE 'temp%'
    OR client_secret NOT LIKE '$2a$%'); -- Los hashes bcrypt empiezan con $2a$
```

---

### Paso 5: Configurar el Secret en Variables de Entorno

**Para el backend (opcional, si necesitas validar):**

```bash
# .env.local (NUNCA commitear)
GPT_OAUTH_CLIENT_SECRET="tu-secret-original-del-paso-1"
```

**Para ChatGPT GPT Builder:**

1. Ir a GPT Builder → Actions → Authentication → OAuth
2. Configurar:
   - **Client Secret:** `tu-secret-original-del-paso-1` (el texto plano, NO el hash)
   - ChatGPT usará este secret para autenticarse con nuestro endpoint `/oauth/token`

---

## 🔄 Rotación de Secrets (Cambio Periódico)

Si necesitas rotar el secret (por seguridad o porque se filtró):

1. **Generar nuevo secret** (Paso 1)
2. **Hashear nuevo secret** (Paso 2)
3. **Actualizar en BD** (Paso 3 con nuevo hash)
4. **Actualizar en ChatGPT** (Paso 5 con nuevo secret en texto plano)
5. **Invalidar secret anterior** (opcional, pero recomendado):

```sql
-- Marcar tokens del cliente como revocados (opcional)
UPDATE public.oauth_tokens
SET revoked_at = now()
WHERE client_id = 'gpt-assistant-mercadito'
  AND revoked_at IS NULL;
```

---

## ✅ Checklist de Seguridad

Antes de considerar el secret como "seguro":

- [ ] Secret generado con herramienta criptográficamente segura (openssl/crypto)
- [ ] Secret tiene al menos 32 bytes de entropía
- [ ] Hash bcrypt generado OFFLINE (no en el repo)
- [ ] Hash bcrypt guardado en BD (no el secret en claro)
- [ ] Secret en texto plano solo en:
  - [ ] Variables de entorno locales (`.env.local`, nunca commiteado)
  - [ ] Configuración de ChatGPT GPT Builder
  - [ ] Gestor de contraseñas seguro
- [ ] Secret en texto plano **NUNCA** en:
  - [ ] Código fuente
  - [ ] Migraciones SQL
  - [ ] Logs
  - [ ] Documentación pública
  - [ ] Git (ni siquiera en commits antiguos)
- [ ] Cliente OAuth marcado como `is_active = true` solo después de establecer hash correcto

---

## 🚨 Qué Hacer si se Filtra un Secret

1. **Inmediatamente:** Invalidar el secret en BD:

```sql
UPDATE public.oauth_clients
SET 
  client_secret = 'REVOKED-COMPROMISED',
  is_active = false
WHERE client_id = 'gpt-assistant-mercadito';
```

2. **Revocar todos los tokens activos:**

```sql
UPDATE public.oauth_tokens
SET revoked_at = now()
WHERE client_id = 'gpt-assistant-mercadito'
  AND revoked_at IS NULL;
```

3. **Generar nuevo secret** siguiendo el procedimiento completo
4. **Actualizar en ChatGPT** con el nuevo secret
5. **Revisar logs** para detectar uso no autorizado

---

## 📝 Notas Adicionales

### Por qué bcrypt y no SHA-256?

- **bcrypt** es un algoritmo de hashing diseñado específicamente para passwords/secrets
- Es lento intencionalmente (protege contra fuerza bruta)
- Incluye "salt" automáticamente (previene rainbow tables)
- SHA-256 es rápido y no incluye salt (no es adecuado para secrets)

### Por qué 10 rounds?

- Balance entre seguridad y performance
- 10 rounds = ~100ms de hashing (suficiente para prevenir fuerza bruta)
- Puede aumentarse a 12-14 rounds si se requiere mayor seguridad

### Validación en el Código

El código en `src/lib/auth/oauth.ts` usa `bcrypt.compare()` para validar:

```typescript
const isValid = await bcrypt.compare(providedSecret, storedHash);
```

Esto garantiza que:
- El secret en texto plano nunca se almacena
- La comparación es segura contra timing attacks
- Solo el hash se guarda en BD

---

**Documento creado:** 2024-11-24  
**Versión:** 1.0  
**Autor:** LPMS - Arquitecto Senior + Auditor de Seguridad

