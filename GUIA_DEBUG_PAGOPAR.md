# 🔍 Guía de Debug para Pagopar

## ✅ Herramientas de Debug Implementadas

### 1. Endpoint de Debug de Variables de Entorno

**Ruta:** `/api/pagopar/debug-env`

**Método:** `GET`

**Descripción:** Verifica qué variables de entorno de Pagopar están configuradas sin exponer sus valores.

#### Cómo usar:

1. **En producción (Vercel):**
   ```
   https://mercadito-online-py.vercel.app/api/pagopar/debug-env
   ```

2. **En local:**
   ```
   http://localhost:3000/api/pagopar/debug-env
   ```

#### Respuesta de ejemplo (éxito):

```json
{
  "success": true,
  "message": "All required Pagopar environment variables are configured",
  "envs": {
    "NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN": true,
    "PAGOPAR_PRIVATE_TOKEN": true,
    "PAGOPAR_PUBLIC_TOKEN": false,
    "PAGOPAR_PUBLIC_KEY": false,
    "PAGOPAR_PRIVATE_KEY": false,
    "PAGOPAR_ENVIRONMENT": true
  },
  "info": {
    "nodeEnv": "production",
    "vercelEnv": "production",
    "hasPublicTokenVariant": true,
    "hasPrivateTokenVariant": true
  }
}
```

#### Respuesta de ejemplo (falta alguna env):

```json
{
  "success": false,
  "message": "Some required Pagopar environment variables are missing",
  "envs": {
    "NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN": false,  // ❌ FALTA ESTA
    "PAGOPAR_PRIVATE_TOKEN": true,
    "PAGOPAR_PUBLIC_TOKEN": false,
    "PAGOPAR_PUBLIC_KEY": false,
    "PAGOPAR_PRIVATE_KEY": false,
    "PAGOPAR_ENVIRONMENT": true
  },
  "info": {
    "nodeEnv": "production",
    "vercelEnv": "production",
    "hasPublicTokenVariant": false,
    "hasPrivateTokenVariant": true
  }
}
```

#### Interpretación de la respuesta:

- **`success: true`** → Todas las envs requeridas están configuradas
- **`success: false`** → Faltan envs requeridas
- **`envs.*`** → `true` = existe, `false` = no existe
- **`info.hasPublicTokenVariant`** → `true` si existe al menos una variante del token público
- **`info.hasPrivateTokenVariant`** → `true` si existe al menos una variante del token privado

**Status HTTP:**
- `200` → Todas las envs están configuradas
- `500` → Faltan envs requeridas

---

## 📊 Logging Mejorado en Servicios

### 2. Logs de Creación de Token

Ahora los logs distinguen entre:

#### **Errores de Red:**
```
[pagopar][create-token] network error
errorType: "AbortError" | "TypeError" | etc.
message: "Failed to connect..."
```

**Causas posibles:**
- Timeout (más de 30 segundos)
- DNS no resuelve
- Firewall bloqueando conexión
- Pagopar API caída

#### **Errores de API (status >= 400):**
```
[pagopar][create-token] API error response
status: 401 | 403 | 500 | etc.
isClientError: true/false
isServerError: true/false
bodyPreview: "..."
```

**Causas posibles:**
- Tokens inválidos (401/403)
- Payload incorrecto (400)
- Error del servidor de Pagopar (500+)

### 3. Logs de Creación de Factura

Similar a los logs de token, pero con contexto de factura:
```
[pagopar][create-invoice] network error
[pagopar][create-invoice] API error response
```

---

## 🚨 Validaciones Previas en Endpoints

### 4. Validación de Envs antes de crear factura

Los endpoints ahora verifican que las envs existan ANTES de intentar crear facturas:

#### En `/api/payments/pagopar/create-invoice`:
```typescript
// Si faltan envs, retorna:
{
  "error": "Pagopar env vars missing",
  "details": "Missing environment variables: NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN, PAGOPAR_PRIVATE_TOKEN"
}
Status: 500
```

#### En `/api/pagopar/membership`:
```typescript
// Mismo comportamiento
```

---

## 📋 Checklist de Debug

### Paso 1: Verificar Variables de Entorno

1. Abrir: `https://mercadito-online-py.vercel.app/api/pagopar/debug-env`
2. Verificar que `success: true`
3. Si `success: false`, ver qué env falta y configurarla en Vercel

### Paso 2: Revisar Logs de Vercel

Cuando intentas crear un pago y falla, revisar logs en Vercel Dashboard:

#### Buscar estos patrones:

1. **"[pagopar][create-token] network error"**
   - Problema de conexión con Pagopar
   - Verificar que Pagopar API esté online
   - Verificar timeout

2. **"[pagopar][create-token] API error response"**
   - Status 401/403 → Tokens inválidos
   - Status 400 → Payload incorrecto
   - Status 500+ → Error del servidor de Pagopar

3. **"[pagopar][create-invoice] Pagopar env vars missing"**
   - Falta configurar envs en Vercel
   - Ver Paso 1

4. **"Error creating Pagopar token"** (sin categoría)
   - Error desconocido, revisar stack trace

### Paso 3: Interpretar Mensajes de Error

Los nuevos mensajes de error son más descriptivos:

#### Mensajes que verás en los logs:

```
✅ "[pagopar][create-token] creating token" 
   → Intento de crear token iniciado

❌ "[pagopar][create-token] network error"
   → Error de conexión con Pagopar
   → Verificar: timeout, DNS, firewall

❌ "[pagopar][create-token] API error response"
   → Pagopar rechazó la request
   → Status 401/403: tokens inválidos
   → Status 400: formato incorrecto
   → Status 500+: error del servidor de Pagopar

❌ "[pagopar][create-invoice] Pagopar env vars missing"
   → Falta configurar variables de entorno
   → Usar /api/pagopar/debug-env para ver cuáles faltan
```

---

## 🔧 Variables de Entorno Requeridas

### En Vercel, configurar:

1. **`NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN`** ✅ Requerida
   - Token público de Pagopar
   - Visible en el cliente (prefijo NEXT_PUBLIC_)

2. **`PAGOPAR_PRIVATE_TOKEN`** ✅ Requerida
   - Token privado de Pagopar
   - Solo en servidor

3. **`PAGOPAR_ENVIRONMENT`** ⚠️ Opcional
   - `sandbox` (default) o `production`
   - Si no se configura, usa `sandbox`

### Aliases Soportados (fallback):

- `PAGOPAR_PUBLIC_TOKEN` (alias de NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN)
- `PAGOPAR_PUBLIC_KEY` (alias de NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN)
- `PAGOPAR_PRIVATE_KEY` (alias de PAGOPAR_PRIVATE_TOKEN)

**Nota:** Se recomienda usar los nombres principales (`NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN` y `PAGOPAR_PRIVATE_TOKEN`).

---

## 🚀 Flujo de Debug Recomendado

### Si ves el error "Error al crear token Pagopar" (502/500):

1. **Primero:** Abrir `/api/pagopar/debug-env`
   - Si falta alguna env → Configurarla en Vercel → Redeploy → Probar de nuevo
   - Si todas existen → Continuar al paso 2

2. **Segundo:** Intentar crear un pago y revisar logs de Vercel
   - Buscar logs con prefijo `[pagopar]`
   - Identificar tipo de error (network vs API)
   - Si es network error → Verificar conectividad con Pagopar
   - Si es API error → Verificar tokens (pueden estar incorrectos)

3. **Tercero:** Si los tokens parecen correctos pero falla
   - Verificar que sean tokens de producción (no sandbox)
   - Verificar que `PAGOPAR_ENVIRONMENT=production` en Vercel
   - Contactar soporte de Pagopar con los logs

---

## 📝 Ejemplo de Uso Completo

### 1. Verificar envs en producción:

```bash
curl https://mercadito-online-py.vercel.app/api/pagopar/debug-env
```

**Respuesta esperada:**
```json
{
  "success": true,
  "envs": {
    "NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN": true,
    "PAGOPAR_PRIVATE_TOKEN": true
  }
}
```

### 2. Si falta alguna:

1. Ir a Vercel Dashboard → Project Settings → Environment Variables
2. Agregar la variable faltante
3. Redeploy
4. Verificar de nuevo con `/api/pagopar/debug-env`

### 3. Si todas existen pero sigue fallando:

1. Intentar crear pago
2. Revisar logs en Vercel Dashboard
3. Buscar patrones mencionados arriba
4. Diagnosticar según el tipo de error

---

## 🎯 Resumen de Endpoints de Debug

| Endpoint | Método | Propósito | Status |
|----------|--------|-----------|--------|
| `/api/pagopar/debug-env` | GET | Verificar envs configuradas | ✅ Implementado |

---

## 🔒 Seguridad

- ✅ **NUNCA** se exponen valores de tokens en logs
- ✅ Solo se muestran flags booleanos (existe/no existe)
- ✅ Solo se muestran longitudes de tokens (no valores)
- ✅ Solo se muestran previews truncados de respuestas de error
- ✅ Stack traces solo en desarrollo

---

## 📞 Soporte

Si después de seguir esta guía el problema persiste:

1. Recopilar logs de Vercel (últimos intentos de pago)
2. Recopilar respuesta de `/api/pagopar/debug-env`
3. Contactar al equipo de desarrollo con esta información














