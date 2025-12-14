# 🔍 FASE 5 — PRUEBA DE DIAGNÓSTICO EN PRODUCCIÓN
## Endpoint: `/api/debug/admin-insert-test`

---

## 📋 PREPARACIÓN — Obtener un product_id real

### Opción 1: Desde Supabase Dashboard (Recomendado)
1. Ve a tu proyecto en https://supabase.com/dashboard
2. Abre el SQL Editor
3. Ejecuta:
```sql
SELECT id FROM products LIMIT 1;
```
4. Copia el UUID obtenido (formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### Opción 2: Desde tu aplicación
1. Abre la consola del navegador en tu app
2. Ejecuta:
```javascript
fetch('/api/products?limit=1')
  .then(r => r.json())
  .then(data => console.log('Product ID:', data.data?.[0]?.id));
```

### Opción 3: UUID de prueba (si no tienes productos)
Usa: `00000000-0000-0000-0000-000000000000`

---

## 🚀 EJECUCIÓN DE LA PRUEBA

### Método 1: Consola del Navegador (Recomendado)

Abre la consola del navegador (F12) en tu aplicación en producción y pega:

```javascript
(async () => {
  // ⚠️ REEMPLAZA ESTE UUID con uno real de tu base de datos
  const productId = '00000000-0000-0000-0000-000000000000';
  
  try {
    const response = await fetch('/api/debug/admin-insert-test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productId })
    });
    
    const result = await response.json();
    
    console.log('✅ STATUS:', response.status);
    console.log('📦 RESULTADO:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅✅✅ INSERT EXITOSO — Service role funciona correctamente');
      console.log('📝 Imagen insertada ID:', result.insert?.id);
    } else {
      console.error('❌❌❌ INSERT FALLÓ — Service role NO funciona');
      console.error('🔴 Error:', result.error);
    }
  } catch (error) {
    console.error('💥 ERROR DE RED:', error);
  }
})();
```

**Copia todo el bloque y pégalo completo en la consola.**

---

### Método 2: Terminal (curl)

```bash
# ⚠️ REEMPLAZA LA URL con tu dominio de producción
# ⚠️ REEMPLAZA EL UUID con uno real de tu base de datos

curl -X POST https://tu-app.vercel.app/api/debug/admin-insert-test \
  -H "Content-Type: application/json" \
  -d '{"productId":"00000000-0000-0000-0000-000000000000"}' \
  -v
```

**Con PowerShell (Windows):**
```powershell
# ⚠️ REEMPLAZA LA URL y el UUID

$body = @{productId="00000000-0000-0000-0000-000000000000"} | ConvertTo-Json
Invoke-RestMethod -Uri "https://tu-app.vercel.app/api/debug/admin-insert-test" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

---

## 📊 LOGS A BUSCAR EN VERCEL

1. Ve a: https://vercel.com/dashboard → Tu proyecto → **Functions** → Busca `api/debug/admin-insert-test`

2. O en **Logs** busca líneas que contengan:
   - `admin-insert-test`
   - `service_role`
   - `product_images`
   - El UUID que usaste

3. **Información clave a buscar:**
   - ✅ `success: true` → Service role funciona
   - ❌ `success: false` → Service role falló
   - 🔍 Código de error: `42501` = RLS violation
   - 🔍 Mensaje: Busca "row-level security", "policy", "unauthorized"

---

## 🎯 INTERPRETACIÓN DE RESULTADOS

### ✅ ESCENARIO 1: INSERT EXITOSO (`success: true`)

**Significado:**
- ✅ El `service_role` funciona correctamente
- ✅ Supabase acepta INSERT directo con service_role
- ✅ RLS está deshabilitado o correctamente configurado
- ✅ La tabla `product_images` acepta inserts

**Conclusión:**
- ❌ El problema NO es Supabase/RLS
- ✅ El problema está en el endpoint `/api/products/upload-images`
- ✅ La solución es local (código del endpoint)

**Próximo paso:**
- Revisar el endpoint `upload-images` en detalle
- Verificar que está usando `adminClient` correctamente
- Verificar que no hay conflictos con otros clientes

---

### ❌ ESCENARIO 2: INSERT FALLA (`success: false`)

**Si el error es `42501` (RLS violation):**
```
Error code: 42501
Message: "new row violates row-level security policy"
```

**Significado:**
- ❌ RLS está HABILITADO en `product_images` (a pesar de las migraciones)
- ❌ Las políticas RLS están bloqueando el INSERT
- ❌ El service_role no está bypaseando RLS como debería

**Próximos pasos:**
1. Verificar RLS en Supabase Dashboard:
```sql
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'product_images';
```
2. Si `relrowsecurity = true` → Deshabilitar RLS:
```sql
ALTER TABLE public.product_images DISABLE ROW LEVEL SECURITY;
```
3. Verificar triggers o funciones que puedan interferir:
```sql
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgrelid = 'product_images'::regclass;
```

---

**Si el error es `23503` (Foreign Key violation):**
```
Error code: 23503
Message: "insert or update on table violates foreign key constraint"
```

**Significado:**
- ❌ El `product_id` que usaste no existe en la tabla `products`
- ✅ Service role funciona, pero el dato es inválido

**Solución:**
- Usa un `product_id` que exista en tu tabla `products`

---

**Si el error es otro (ej: `42883`, `42P01`, etc.):**
```
Error code: [código]
Message: [mensaje]
```

**Significado:**
- ❌ Puede ser un problema de esquema, permisos, o metadatos corruptos
- ❌ La tabla puede estar desincronizada

**Próximos pasos:**
1. Verificar que la tabla existe:
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'product_images'
);
```

2. Verificar estructura de la tabla:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'product_images';
```

3. Si la estructura no coincide → Recrear la tabla o aplicar migraciones faltantes

---

## ⚠️ ¿DEBERÍA FUNCIONAR SÍ O SÍ?

**SÍ.** El endpoint `/api/debug/admin-insert-test` DEBE funcionar porque:

1. ✅ Usa `service_role` key que bypasea RLS por diseño
2. ✅ No depende de autenticación de usuario
3. ✅ No depende de cookies o sesiones
4. ✅ Es un INSERT directo sin lógica adicional

**Si este endpoint falla:**
- ❌ El problema es 100% externo a tu código
- ❌ Es un problema de configuración de Supabase
- ❌ Es un problema de metadatos/estructura de base de datos

**Si este endpoint funciona:**
- ✅ El problema está en `/api/products/upload-images`
- ✅ Necesitamos revisar cómo se crea/usaL el `adminClient` en ese endpoint
- ✅ Puede ser un problema de timing, contexto, o configuración del cliente

---

## 🎬 SIGUIENTE PASO DEFINITIVO

### Si el test funciona (`success: true`):
→ **FASE 6:** Revisar endpoint `upload-images` línea por línea
→ Comparar cómo se crea `adminClient` en debug vs upload-images
→ Verificar que no hay conflictos de contexto o timing

### Si el test falla (`success: false`):
→ **FASE 6:** Ejecutar verificaciones SQL en Supabase Dashboard
→ Deshabilitar RLS manualmente si está habilitado
→ Verificar triggers, funciones, y metadatos
→ Considerar recrear la tabla `product_images` desde cero

---

## 📝 TEMPLATE DE REPORTE

Cuando ejecutes la prueba, copia y completa esto:

```
═══════════════════════════════════════════
RESULTADO DE PRUEBA DE DIAGNÓSTICO
═══════════════════════════════════════════

Fecha: [fecha y hora]
Endpoint: /api/debug/admin-insert-test
Product ID usado: [UUID]

RESULTADO:
[ ] ✅ ÉXITO (success: true)
[ ] ❌ FALLO (success: false)

STATUS HTTP: [200/500/etc]

RESPUESTA COMPLETA:
{
  "success": [true/false],
  "insert": {...},
  "error": {...}
}

LOGS EN VERCEL:
[Pega aquí los logs relevantes]

ERROR CODE (si falló): [código]
ERROR MESSAGE (si falló): [mensaje]

INTERPRETACIÓN:
[Describe qué crees que significa el resultado]

═══════════════════════════════════════════
```





