# 🔄 FORZAR RECARGA COMPLETA DE LA WEB

## 🎯 ACCIONES PARA RECARGAR TODO

### 1. **Forzar Refresh de PostgREST en Supabase**

Ejecuta en **Supabase SQL Editor**:

```sql
-- Paso 1: Verificar estado actual
SELECT 
    column_name, 
    CASE 
        WHEN column_name = 'image_url' THEN '❌ PROBLEMA'
        WHEN column_name = 'cover_url' THEN '✅ OK'
        ELSE 'ℹ️ Otra columna'
    END as status
FROM information_schema.columns 
WHERE table_name = 'products' 
AND table_schema = 'public'
AND column_name IN ('image_url', 'cover_url')
ORDER BY column_name;

-- Paso 2: Si image_url existe, eliminarlo
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'image_url' 
        AND table_schema = 'public'
    ) THEN
        UPDATE public.products SET cover_url = image_url WHERE cover_url IS NULL AND image_url IS NOT NULL;
        ALTER TABLE public.products DROP COLUMN image_url;
        RAISE NOTICE '✅ image_url eliminada';
    ELSE
        RAISE NOTICE '✅ image_url ya no existe';
    END IF;
END $$;

-- Paso 3: FORZAR REFRESH DE POSTGREST (CRÍTICO)
NOTIFY pgrst, 'reload schema';

-- Paso 4: Verificación final
SELECT 
    CASE 
        WHEN COUNT(*) FILTER (WHERE column_name = 'image_url') > 0 THEN '❌ image_url todavía existe'
        WHEN COUNT(*) FILTER (WHERE column_name = 'cover_url') > 0 THEN '✅ cover_url existe correctamente'
        ELSE '❌ cover_url no existe'
    END as estado_final
FROM information_schema.columns 
WHERE table_name = 'products' 
AND table_schema = 'public'
AND column_name IN ('image_url', 'cover_url');
```

---

### 2. **Limpiar Caché de Vercel**

**Opción A: Redeployear**
- Vercel Dashboard → Deployments → Último deployment → "..." → **Redeploy**

**Opción B: Invalidar Build Cache**
- Vercel Dashboard → Settings → Build & Development Settings
- Agregar variable de entorno: `VERCEL_FORCE_NO_BUILD_CACHE=1`
- Hacer un nuevo deployment
- Remover la variable después

---

### 3. **Verificar Variables de Entorno**

En **Vercel Dashboard → Settings → Environment Variables**:

✅ Verificar que existan:
```
NEXT_PUBLIC_SUPABASE_URL=https://hqdatzhliaordlsqtjea.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[tu-key-aqui]
```

❌ **IMPORTANTE**: Si modificaste variables, **DEBES redeployear**

---

### 4. **Forzar Recarga en el Navegador**

**En el sitio de producción, abre la consola (F12) y ejecuta:**

```javascript
// Forzar recarga completa sin caché
location.reload(true);

// O si eso no funciona, usar:
window.location.href = window.location.href + '?nocache=' + Date.now();
```

**O manualmente:**
1. `Ctrl + Shift + Delete` (Windows) o `Cmd + Shift + Delete` (Mac)
2. Seleccionar "Cached images and files"
3. Limpiar
4. Hard refresh: `Ctrl + Shift + R` (Windows) o `Cmd + Shift + R` (Mac)

---

### 5. **Verificar Build Status**

**Vercel Dashboard → Deployments:**

1. Verifica que el último deployment esté **Ready** (verde)
2. Si hay errores, revisa los **Build Logs**
3. Si está "Building", espera a que termine

---

### 6. **Test Directo de la Query**

En **Supabase SQL Editor**, ejecuta:

```sql
-- Test la query exacta que usa ProductsListClient
SELECT 
    id, 
    title, 
    description, 
    price, 
    cover_url,
    condition,
    sale_type,
    category_id,
    seller_id,
    store_id,
    created_at,
    auction_status,
    auction_start_at,
    auction_end_at,
    current_bid,
    total_bids,
    attributes
FROM products
WHERE (status IS NULL OR status = 'active')
AND sale_type != 'auction'
LIMIT 5;
```

**Si esta query funciona** → El problema NO es la base de datos
**Si esta query falla** → Hay un problema con el esquema

---

## 🔍 DIAGNÓSTICO PASO A PASO

### Paso 1: Verificar que el sitio responde

```bash
curl -I https://mercadito-online-py.vercel.app
```

**Debe retornar**: `200 OK`

---

### Paso 2: Verificar HTML

1. Abre el sitio
2. Clic derecho → "Ver código fuente"
3. Busca `<title>Mercadito Online PY</title>`

**Si el HTML está vacío o tiene errores** → Problema de build

---

### Paso 3: Verificar JavaScript en Consola

**F12 → Console:**

```javascript
// Verificar que Supabase está configurado
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

// Verificar que React está cargado
console.log('React loaded:', typeof window !== 'undefined' && window.__NEXT_DATA__);

// Verificar errores
window.addEventListener('error', (e) => {
    console.error('ERROR CAPTURADO:', e.message, e.filename, e.lineno);
});
```

---

### Paso 4: Test Directo de API

**F12 → Network → Haz una búsqueda de productos**

Busca la request:
```
GET ...supabase.co/rest/v1/products?select=...
```

**Revisa:**
- Status: ¿200 o 400?
- Response: ¿Qué dice?

---

## 🚨 PROBLEMAS COMUNES

### Problema: "Página en blanco"

**Causas posibles:**
1. Error de JavaScript silencioso
2. CSP bloqueando recursos
3. Build fallido

**Solución:**
1. Revisar consola del navegador
2. Revisar Network tab
3. Revisar build logs en Vercel

---

### Problema: "Error: column products.image_url does not exist"

**Causa**: PostgREST tiene el schema cacheado

**Solución:**
1. Ejecutar `NOTIFY pgrst, 'reload schema';` en Supabase
2. Esperar 30-60 segundos
3. Recargar el sitio
4. Si persiste, redeployear en Vercel

---

### Problema: "No se cargan productos"

**Causas:**
1. Error en la query
2. RLS bloqueando
3. Variables de entorno incorrectas

**Solución:**
1. Verificar Network tab → Response de request a productos
2. Verificar políticas RLS en Supabase
3. Verificar variables de entorno en Vercel

---

## ✅ CHECKLIST FINAL

1. ✅ Ejecutar SQL de refresh de PostgREST
2. ✅ Verificar variables de entorno en Vercel
3. ✅ Redeployear en Vercel si modificaste algo
4. ✅ Limpiar caché del navegador
5. ✅ Hard refresh (`Ctrl + Shift + R`)
6. ✅ Verificar consola del navegador (F12)
7. ✅ Verificar Network tab (requests fallidas)
8. ✅ Test directo de query en Supabase

---

## 📋 ORDEN DE EJECUCIÓN

1. **Supabase SQL Editor** → Ejecutar script de arriba
2. **Vercel Dashboard** → Verificar variables → Redeploy si necesario
3. **Navegador** → Limpiar caché → Hard refresh
4. **Consola (F12)** → Verificar errores
5. **Network tab** → Verificar requests a Supabase

---

## 🔧 SCRIPT DE EMERGENCIA

Si nada funciona, ejecuta esto en **Supabase SQL Editor**:

```sql
-- NUCLEAR: Forzar refresh completo
NOTIFY pgrst, 'reload schema';

-- Esperar 1 segundo
SELECT pg_sleep(1);

-- Verificar estado
SELECT 
    'Estado Final' as check,
    COUNT(*) FILTER (WHERE column_name = 'image_url') as image_url_exists,
    COUNT(*) FILTER (WHERE column_name = 'cover_url') as cover_url_exists
FROM information_schema.columns 
WHERE table_name = 'products' 
AND table_schema = 'public'
AND column_name IN ('image_url', 'cover_url');
```



