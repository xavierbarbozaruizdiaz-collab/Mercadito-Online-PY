# ✅ RESUMEN: Herramientas de Debug para Pagopar

## 📦 Archivos Creados/Modificados

### 1. `src/app/api/pagopar/debug-env/route.ts` (NUEVO)
- **Ruta:** `/api/pagopar/debug-env`
- **Método:** `GET`
- **Propósito:** Verificar variables de entorno de Pagopar sin exponer valores
- **Status HTTP:** 200 si todas existen, 500 si falta alguna

### 2. `src/lib/services/pagoparService.ts` (MEJORADO)
- Mejorado `createPagoparToken()`:
  - ✅ Distingue errores de red vs errores de API
  - ✅ Timeout de 30 segundos
  - ✅ Logging detallado de errores
  - ✅ Categorización de errores (network/api/unknown)

- Mejorado `createPagoparInvoice()`:
  - ✅ Mismo mejoramiento que createToken
  - ✅ Logging detallado con previews truncados
  - ✅ Manejo robusto de errores de red

### 3. `src/app/api/payments/pagopar/create-invoice/route.ts` (MEJORADO)
- ✅ Validación previa de envs antes de crear factura
- ✅ Mensaje de error claro si faltan envs: "Pagopar env vars missing"
- ✅ Lista específica de qué envs faltan

### 4. `src/app/api/pagopar/membership/route.ts` (MEJORADO)
- ✅ Mismas mejoras que create-invoice
- ✅ Validación previa de envs

### 5. `GUIA_DEBUG_PAGOPAR.md` (NUEVO)
- Documentación completa de cómo usar las herramientas de debug

---

## 🎯 Ruta del Endpoint de Debug

**Ruta exacta:** `/api/pagopar/debug-env`

**Cómo acceder:**
- Producción: `https://mercadito-online-py.vercel.app/api/pagopar/debug-env`
- Local: `http://localhost:3000/api/pagopar/debug-env`

---

## 📊 Interpretación de la Respuesta del Endpoint

### Respuesta Exitosa (Status 200):

```json
{
  "success": true,
  "message": "All required Pagopar environment variables are configured",
  "envs": {
    "NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN": true,  // ✅ Existe
    "PAGOPAR_PRIVATE_TOKEN": true,              // ✅ Existe
    "PAGOPAR_ENVIRONMENT": true                 // ⚠️ Opcional
  },
  "info": {
    "nodeEnv": "production",
    "vercelEnv": "production",
    "hasPublicTokenVariant": true,
    "hasPrivateTokenVariant": true
  }
}
```

**Significado:**
- `success: true` → Todas las envs requeridas están configuradas ✅
- `envs.*: true` → La variable existe
- `envs.*: false` → La variable no existe
- `info.hasPublicTokenVariant` → Al menos una variante del token público existe
- `info.hasPrivateTokenVariant` → Al menos una variante del token privado existe

### Respuesta con Error (Status 500):

```json
{
  "success": false,
  "message": "Some required Pagopar environment variables are missing",
  "envs": {
    "NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN": false,  // ❌ FALTA
    "PAGOPAR_PRIVATE_TOKEN": true,              // ✅ Existe
    "PAGOPAR_ENVIRONMENT": true
  },
  "info": {
    "nodeEnv": "production",
    "vercelEnv": "production",
    "hasPublicTokenVariant": false,             // ❌ Ninguna variante existe
    "hasPrivateTokenVariant": true
  }
}
```

**Significado:**
- `success: false` → Faltan envs requeridas ❌
- `envs.NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN: false` → Esta env falta
- `info.hasPublicTokenVariant: false` → No existe ninguna variante del token público

**Acción:** Configurar la env faltante en Vercel → Redeploy → Verificar de nuevo

---

## 🚨 Mensajes de Error Nuevos en Logs de Vercel

### 1. Error de Variables de Entorno Faltantes:

```
[pagopar][create-invoice] Pagopar env vars missing
missingEnvs: ["NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN"]
hasPublicToken: false
hasPrivateToken: true
```

**Significado:** Falta configurar `NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN` en Vercel

---

### 2. Error de Red:

```
[pagopar][create-token] network error
errorType: "AbortError"
message: "Failed to connect to Pagopar API"
url: "https://api.pagopar.com/api/token"
```

**Significado:** 
- Problema de conexión con Pagopar
- Posibles causas: timeout, DNS, firewall, Pagopar API caída

---

### 3. Error de API (Status >= 400):

```
[pagopar][create-token] API error response
status: 401
statusText: "Unauthorized"
isClientError: true
isServerError: false
bodyPreview: "..."
```

**Significado:**
- Status 401/403 → Tokens inválidos o expirados
- Status 400 → Payload incorrecto
- Status 500+ → Error del servidor de Pagopar

---

### 4. Error al Leer Respuesta:

```
[pagopar][create-token] error reading response body
error: "Connection closed"
status: 200
```

**Significado:** La conexión se cortó antes de leer la respuesta completa

---

### 5. Error Desconocido:

```
[pagopar][create-token] error creating token
errorType: "unknown"
message: "..."
stack: "..."
```

**Significado:** Error no categorizado, revisar stack trace

---

## 📋 Checklist de Uso Post-Deploy

### ✅ Después de hacer deploy a Vercel:

1. **Verificar envs:**
   ```
   Abrir: https://mercadito-online-py.vercel.app/api/pagopar/debug-env
   ```
   - Si `success: false` → Configurar envs faltantes → Redeploy
   - Si `success: true` → Continuar

2. **Probar crear pago:**
   - Intentar crear un pago con Pagopar
   - Si falla, revisar logs en Vercel Dashboard

3. **Revisar logs:**
   - Buscar logs con prefijo `[pagopar]`
   - Identificar tipo de error según los patrones arriba
   - Diagnosticar según el tipo

4. **Corregir según diagnóstico:**
   - Si falta env → Configurar en Vercel
   - Si error de red → Verificar conectividad
   - Si error de API → Verificar tokens

---

## 🔍 Variables de Entorno Verificadas

El endpoint verifica estas variables:

### Requeridas:
- ✅ `NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN`
- ✅ `PAGOPAR_PRIVATE_TOKEN`

### Opcionales (aliases):
- `PAGOPAR_PUBLIC_TOKEN`
- `PAGOPAR_PUBLIC_KEY`
- `PAGOPAR_PRIVATE_KEY`
- `PAGOPAR_ENVIRONMENT`

---

## 🎯 Próximos Pasos

1. **Deploy a Vercel:**
   ```bash
   git add .
   git commit -m "feat: add Pagopar debug tools"
   git push
   # Vercel deploy automático
   ```

2. **Verificar endpoint:**
   ```
   https://mercadito-online-py.vercel.app/api/pagopar/debug-env
   ```

3. **Corregir envs si falta alguna:**
   - Vercel Dashboard → Project Settings → Environment Variables
   - Agregar variable faltante
   - Redeploy

4. **Probar flujo completo:**
   - Crear pago con Pagopar
   - Revisar logs
   - Diagnosticar según patrones

---

## 📝 Notas Importantes

- ✅ **NUNCA** se exponen valores de tokens (solo flags booleanos)
- ✅ Logging detallado pero seguro (previews truncados)
- ✅ Timeout de 30 segundos para evitar esperas infinitas
- ✅ Categorización de errores para mejor diagnóstico
- ✅ Validación previa antes de intentar crear facturas














