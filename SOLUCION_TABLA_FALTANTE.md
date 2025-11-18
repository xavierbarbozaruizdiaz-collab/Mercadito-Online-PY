# 🔧 SOLUCIÓN: Tabla `store_ad_catalogs` Faltante

## ❌ PROBLEMA DETECTADO

Al verificar las tablas, se encontró que:
- ✅ `store_ad_catalog_products` - **EXISTE**
- ❌ `store_ad_catalogs` - **NO EXISTE**

La tabla principal `store_ad_catalogs` no se creó correctamente.

---

## ✅ SOLUCIÓN

### Paso 1: Ejecutar Script de Creación

1. Abre Supabase SQL Editor: https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea/sql/new

2. Abre el archivo: `CREAR_TABLA_STORE_AD_CATALOGS.sql`

3. Copia **TODO** el contenido

4. Pégalo en el SQL Editor

5. Ejecuta (RUN o `Ctrl+Enter`)

### Paso 2: Verificar Creación

Ejecuta esta consulta para confirmar:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('store_ad_catalogs', 'store_ad_catalog_products');
```

**Resultado esperado:**
- ✅ Debe mostrar **2 filas**: `store_ad_catalogs` y `store_ad_catalog_products`

---

## 🔍 VERIFICACIÓN ADICIONAL

Después de crear la tabla, verifica:

### 1. Índices creados

```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'store_ad_catalogs';
```

**Debe mostrar:**
- `idx_store_ad_catalogs_store`
- `uniq_store_ad_catalogs_store_slug`

### 2. Trigger creado

```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'store_ad_catalogs';
```

**Debe mostrar:**
- `set_updated_at_store_ad_catalogs`

### 3. Políticas RLS creadas

```sql
SELECT policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'store_ad_catalogs';
```

**Debe mostrar 4 políticas:**
- `Sellers can view own store catalogs`
- `Sellers can create own store catalogs`
- `Sellers can update own store catalogs`
- `Sellers can delete own store catalogs`

---

## ⚠️ NOTA IMPORTANTE

Si la tabla `store_ad_catalog_products` ya tiene datos, **NO se perderán**. La tabla `store_ad_catalogs` es independiente y solo se creará si no existe (gracias a `CREATE TABLE IF NOT EXISTS`).

---

## ✅ DESPUÉS DE CREAR LA TABLA

Una vez creada la tabla, el sistema de catálogos de anuncios debería funcionar correctamente. Puedes:

1. Iniciar el servidor: `npm run dev`
2. Acceder a: http://localhost:3000/dashboard/marketing/catalogos-anuncios
3. Crear tu primer catálogo

---

**¡Ejecuta el script y verifica que ambas tablas existan!**


