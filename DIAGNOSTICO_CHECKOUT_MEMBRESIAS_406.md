# 🔍 DIAGNÓSTICO COMPLETO – ERROR 406 EN CHECKOUT DE MEMBRESÍAS

**Fecha:** 2025-01-XX  
**Problema:** Error 406 (Not Acceptable) al intentar leer configuración bancaria en checkout de membresías  
**Severidad:** Alta (bloquea funcionalidad crítica)

---

## 📋 RESUMEN EJECUTIVO

Al intentar finalizar la compra de una membresía usando "Transferencia bancaria", el sistema muestra:
- **Toast:** "Configuración de cuenta bancaria incompleta. Por favor contactá al administrador o usa otro método de pago."
- **Error en consola:** `GET https://<PROJECT>.supabase.co/rest/v1/site_settings?... 406 (Not Acceptable)`

**Causa raíz identificada:** Falta de políticas RLS públicas para los campos bancarios (`bank_account_number`, `bank_name`, `bank_account_holder`) en la tabla `site_settings`.

---

## 1️⃣ CONTEXTO DEL CHECKOUT

### Archivos involucrados

**Archivo principal:** `src/app/checkout/page.tsx`

**Componente:** `CheckoutContent` (función interna, línea 38)

**Flujo de membresías:**
1. Usuario accede a `/checkout?type=membership&plan_id=XXX&subscription_type=monthly&amount=XXX`
2. Se carga el plan de membresía (línea 112-137)
3. Usuario selecciona método de pago "Transferencia bancaria" (línea 997-1006)
4. Al hacer submit, se ejecuta `handleSubmit` (línea 358)

### Código problemático

```typescript:src/app/checkout/page.tsx
// Líneas 384-394
if (paymentMethod === 'transfer') {
  // Validar que cuenta bancaria esté configurada
  const { getSetting } = await import('@/lib/services/siteSettingsService');
  const bankAccount = await getSetting('bank_account_number', '');
  
  if (!bankAccount) {
    toast.error('Configuración de cuenta bancaria incompleta. Por favor contacta al administrador o usa otro método de pago.');
    setProcessing(false);
    return;
  }
  
  // Mostrar modal de transferencia
  setShowTransferModal(true);
  setProcessing(false);
  return;
}
```

**Problema:** La función `getSetting` falla silenciosamente cuando Supabase devuelve 406, retornando el valor por defecto (`''`), lo que hace que el código interprete que "no hay configuración" cuando en realidad hay un error de acceso.

---

## 2️⃣ LECTURA DE CONFIGURACIÓN BANCARIA

### Servicio utilizado

**Archivo:** `src/lib/services/siteSettingsService.ts`

**Función:** `getSetting(key: string, defaultValue: any = null): Promise<any>`

```typescript:src/lib/services/siteSettingsService.ts
// Líneas 70-82
export async function getSetting(key: string, defaultValue: any = null): Promise<any> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error || !data) {
    return defaultValue;  // ⚠️ PROBLEMA: Devuelve defaultValue sin distinguir entre error y "no existe"
  }

  return parseJsonbValue((data as any).value);
}
```

### Request a Supabase

**Cliente usado:** `supabase` de `@/lib/supabase/client` (cliente del navegador)

**URL generada:**
```
GET https://<PROJECT>.supabase.co/rest/v1/site_settings?key=eq.bank_account_number&select=value
```

**Headers enviados:**
- `apikey`: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clave anónima)
- `Authorization`: `Bearer <JWT_TOKEN>` (si el usuario está autenticado)
- `Accept`: `application/json` (implícito por Supabase JS client)
- `Content-Type`: `application/json`

**Query string:**
- `key=eq.bank_account_number`
- `select=value`

**Método:** `.single()` - espera un solo registro

---

## 3️⃣ ANÁLISIS DEL ERROR 406

### ¿Por qué Supabase devuelve 406?

El error **406 Not Acceptable** en PostgREST (API REST de Supabase) puede ocurrir por:

1. ✅ **Falta de políticas RLS que permitan el acceso** (CAUSA RAÍZ)
2. ❌ Falta de header `Accept: application/json` (NO aplica - Supabase JS lo envía automáticamente)
3. ❌ Content-Type incorrecto (NO aplica - Supabase JS maneja esto)
4. ❌ API key incorrecta (NO aplica - se usa la anon key correcta)
5. ❌ Query mal formada (NO aplica - la query es válida)

### Políticas RLS actuales para `site_settings`

**Migración inicial:** `supabase/migrations/20250128000056_site_settings.sql`

```sql
-- Política restrictiva: Solo admins autenticados pueden leer
CREATE POLICY "admins_can_view_site_settings" 
ON site_settings FOR SELECT 
TO authenticated 
USING (is_current_user_admin());
```

**Políticas públicas agregadas posteriormente:**

1. `public_can_read_site_name` - permite leer `site_name`
2. `public_can_read_site_colors` - permite leer `primary_color`, `secondary_color`
3. `public_can_read_shipping_settings` - permite leer `shipping_cost`, `free_shipping_threshold`
4. `public_can_read_contact_settings` - permite leer `contact_email`, `contact_phone`, `location`
5. `public_can_read_payment_methods` - permite leer `payment_methods`

**❌ NO EXISTE política pública para:**
- `bank_account_number`
- `bank_name`
- `bank_account_holder`
- `whatsapp_number` (usado en TransferBankModal)

### Comportamiento de PostgREST con RLS

Cuando PostgREST evalúa una consulta:
1. Verifica si hay una política RLS que permita el acceso
2. Si no encuentra ninguna política que permita el acceso, devuelve **406 Not Acceptable** (no 403/401)
3. El cliente Supabase JS interpreta esto como un error y lo retorna en `error`

**Resultado:** `getSetting` recibe un error, devuelve `defaultValue` (`''`), y el checkout interpreta que "no hay configuración".

---

## 4️⃣ REVISIÓN DE TABLA Y POLÍTICAS RLS

### Estructura de `site_settings`

```sql
CREATE TABLE site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**RLS habilitado:** ✅ Sí (línea 20 de la migración)

### Políticas RLS aplicadas

**Políticas restrictivas (solo admins):**
- `admins_can_view_site_settings` - SELECT para authenticated + admin
- `admins_can_update_site_settings` - UPDATE para authenticated + admin
- `admins_can_insert_site_settings` - INSERT para authenticated + admin

**Políticas públicas (lectura sin autenticación):**
- `public_can_read_site_name` - `key = 'site_name'`
- `public_can_read_site_colors` - `key IN ('primary_color', 'secondary_color')`
- `public_can_read_shipping_settings` - `key IN ('shipping_cost', 'free_shipping_threshold')`
- `public_can_read_contact_settings` - `key IN ('contact_email', 'contact_phone', 'location')`
- `public_can_read_payment_methods` - `key = 'payment_methods'`

**❌ FALTANTE:** Política pública para campos bancarios

### Análisis de políticas

**Problema identificado:**
- Las políticas públicas son **específicas por key** (usando `USING (key = '...')` o `USING (key IN (...))`)
- No hay una política genérica que permita lectura pública de todos los campos
- Los campos bancarios (`bank_account_number`, `bank_name`, `bank_account_holder`, `whatsapp_number`) no están incluidos en ninguna política pública

**¿Por qué no funciona la política de admins?**
- El checkout puede ejecutarse con usuarios no autenticados o usuarios no-admin
- Incluso si el usuario está autenticado, si no es admin, la política `admins_can_view_site_settings` no aplica
- PostgREST evalúa TODAS las políticas y si ninguna permite el acceso, devuelve 406

---

## 5️⃣ CHECKLIST DE DIAGNÓSTICO

### ✅ Ruta del frontend involucrada

- **Archivo:** `src/app/checkout/page.tsx`
- **Componente:** `CheckoutContent` (función interna)
- **Función:** `handleSubmit` (línea 358)
- **Línea específica:** 387-394

### ✅ Función exacta que lee `site_settings`

- **Servicio:** `src/lib/services/siteSettingsService.ts`
- **Función:** `getSetting(key: string, defaultValue: any)`
- **Línea:** 70-82
- **Llamada desde checkout:** Línea 388 de `checkout/page.tsx`

### ✅ Función que interpreta la configuración bancaria

- **Archivo:** `src/app/checkout/page.tsx`
- **Función:** `handleSubmit`
- **Línea:** 388-394
- **Condición que dispara el mensaje:** `if (!bankAccount)` (línea 390)

### ✅ Request real a Supabase

**Método:** GET  
**URL:** `https://<PROJECT>.supabase.co/rest/v1/site_settings`  
**Query string:** `?key=eq.bank_account_number&select=value`  
**Headers:**
- `apikey`: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `Authorization`: `Bearer <JWT_TOKEN>` (si autenticado)
- `Accept`: `application/json` (implícito)
- `Content-Type`: `application/json` (implícito)

**Select:** `value` (solo el campo value)  
**Filtro:** `key = 'bank_account_number'`  
**Modo:** `.single()` - espera un solo registro

### ✅ Hipótesis de por qué Supabase devuelve 406

**Hipótesis más probable (CONFIRMADA):**
1. **Falta política RLS pública para `bank_account_number`**
   - Las políticas públicas existentes solo cubren campos específicos
   - `bank_account_number` no está incluido en ninguna política pública
   - PostgREST evalúa todas las políticas y si ninguna permite acceso, devuelve 406

**Hipótesis descartadas:**
- ❌ Falta header `Accept`: NO - Supabase JS lo envía automáticamente
- ❌ API key incorrecta: NO - se usa la anon key correcta
- ❌ Query mal formada: NO - la query es válida
- ❌ Content-Type incorrecto: NO - Supabase JS lo maneja

### ✅ Confirmación de datos en BD

**Asumiendo que los datos SÍ existen:**
- Los datos bancarios probablemente están en `site_settings` (configurados por admin)
- El problema NO es que falten datos, sino que **no se pueden leer** por falta de permisos RLS
- El frontend cree que "están incompletos" porque `getSetting` devuelve `''` cuando hay un error, y el código interpreta eso como "no configurado"

**Para verificar:**
```sql
SELECT key, value FROM site_settings 
WHERE key IN ('bank_account_number', 'bank_name', 'bank_account_holder', 'whatsapp_number');
```

---

## 6️⃣ PROPUESTA DE SOLUCIÓN

### Cambios necesarios

#### 1. Crear migración SQL para políticas RLS públicas

**Archivo:** `supabase/migrations/YYYYMMDDHHMMSS_add_public_rls_bank_settings.sql`

**Contenido:**
```sql
-- Política RLS para permitir lectura pública de configuración bancaria
-- Necesario para checkout de membresías con transferencia bancaria
DROP POLICY IF EXISTS "public_can_read_bank_settings" ON public.site_settings;
CREATE POLICY "public_can_read_bank_settings"
ON public.site_settings FOR SELECT
TO public
USING (key IN ('bank_account_number', 'bank_name', 'bank_account_holder', 'whatsapp_number'));
```

**Justificación:**
- Los datos bancarios deben ser públicos para que los usuarios puedan verlos en el checkout
- No hay información sensible adicional expuesta (solo datos necesarios para transferencia)
- Sigue el patrón de otras políticas públicas existentes

#### 2. Mejorar manejo de errores en `siteSettingsService`

**Archivo:** `src/lib/services/siteSettingsService.ts`

**Cambios:**
- Distinguir entre "error de red/RLS" y "dato no existe"
- Lanzar error específico cuando hay problema de acceso (406, 403, etc.)
- Retornar `defaultValue` solo cuando el dato realmente no existe (404 o sin resultados)

**Código propuesto:**
```typescript
export async function getSetting(key: string, defaultValue: any = null): Promise<any> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) {
    // Si es error de acceso (RLS), lanzar error específico
    if (error.code === 'PGRST301' || error.status === 406 || error.status === 403) {
      throw new Error(`No se puede acceder a la configuración '${key}'. Verifica las políticas RLS.`);
    }
    // Si es 404 o "no encontrado", retornar defaultValue
    if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
      return defaultValue;
    }
    // Otros errores: lanzar
    console.error(`Error fetching setting '${key}':`, error);
    throw error;
  }

  if (!data) {
    return defaultValue;
  }

  return parseJsonbValue((data as any).value);
}
```

#### 3. Actualizar checkout para manejo de errores mejorado

**Archivo:** `src/app/checkout/page.tsx`

**Cambios:**
- Capturar errores específicos de `getSetting`
- Mostrar mensaje diferente para "error de servidor" vs "configuración incompleta"
- Loggear errores para debugging

**Código propuesto:**
```typescript
if (paymentMethod === 'transfer') {
  try {
    const { getSetting } = await import('@/lib/services/siteSettingsService');
    const bankAccount = await getSetting('bank_account_number', '');
    
    if (!bankAccount) {
      toast.error('Configuración de cuenta bancaria incompleta. Por favor contacta al administrador o usa otro método de pago.');
      setProcessing(false);
      return;
    }
    
    // Mostrar modal de transferencia
    setShowTransferModal(true);
    setProcessing(false);
    return;
  } catch (error: any) {
    logger.error('Error leyendo configuración bancaria', error);
    // Distinguir entre error de acceso y datos faltantes
    if (error.message?.includes('RLS') || error.status === 406 || error.status === 403) {
      toast.error('Error de servidor al leer configuración. Por favor intenta de nuevo o usa otro método de pago.');
    } else {
      toast.error('Configuración de cuenta bancaria incompleta. Por favor contacta al administrador o usa otro método de pago.');
    }
    setProcessing(false);
    return;
  }
}
```

#### 4. Estrategia de logs y manejo de errores

**Mejoras propuestas:**
- Loggear todos los errores de `getSetting` con contexto (key, error code, status)
- Distinguir en logs entre "error de acceso" y "dato no existe"
- Mostrar mensajes de error más específicos al usuario:
  - "Error de servidor, intenta de nuevo" → para errores 406/403/500
  - "Configuración incompleta" → solo cuando realmente no hay datos

---

## 7️⃣ ARCHIVOS A MODIFICAR

1. ✅ **NUEVO:** `supabase/migrations/YYYYMMDDHHMMSS_add_public_rls_bank_settings.sql`
   - Crear política RLS pública para campos bancarios

2. ✅ **MODIFICAR:** `src/lib/services/siteSettingsService.ts`
   - Mejorar `getSetting` para distinguir errores de acceso vs datos faltantes
   - Agregar logging de errores

3. ✅ **MODIFICAR:** `src/app/checkout/page.tsx`
   - Mejorar manejo de errores en validación de transferencia bancaria
   - Agregar try-catch específico
   - Mensajes de error más descriptivos

---

## 📝 MENSAJE DE COMMIT PROPUESTO

```
fix(checkout): corregir lectura de site_settings y validación de transferencia bancaria

- Agregar política RLS pública para campos bancarios (bank_account_number, bank_name, bank_account_holder, whatsapp_number)
- Mejorar manejo de errores en siteSettingsService.getSetting para distinguir entre errores de acceso y datos faltantes
- Actualizar checkout para mostrar mensajes de error más específicos (error de servidor vs configuración incompleta)
- Agregar logging de errores para debugging

Fixes: Error 406 al leer configuración bancaria en checkout de membresías
```

---

## ✅ VERIFICACIÓN POST-FIX

Después de aplicar los cambios, verificar:

1. ✅ Usuario no autenticado puede leer `bank_account_number` sin error 406
2. ✅ Usuario autenticado (no admin) puede leer campos bancarios
3. ✅ Checkout muestra modal de transferencia cuando hay configuración
4. ✅ Checkout muestra mensaje apropiado cuando NO hay configuración (dato realmente faltante)
5. ✅ Checkout muestra mensaje de "error de servidor" cuando hay problema de red/RLS
6. ✅ Logs muestran errores con contexto adecuado

---

**FIN DEL DIAGNÓSTICO**















