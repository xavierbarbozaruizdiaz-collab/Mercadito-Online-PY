# 🚀 APLICAR MIGRACIONES DE CATÁLOGOS
**Guía para aplicar las nuevas migraciones del sistema de catálogos**

---

## 📋 MIGRACIONES A APLICAR

1. **`20251117000000_add_catalog_fields_to_products.sql`**
   - Agrega campos de catálogo global a la tabla `products`

2. **`20251117001000_create_store_ad_catalogs_tables.sql`**
   - Crea tablas para catálogos de publicidad por tienda

---

## ✅ PREREQUISITOS

### 1. Verificar Supabase CLI instalado
```bash
supabase --version
```

Si no está instalado:
```bash
npm install -g supabase
# o
npm install supabase --save-dev
```

### 2. Verificar que estás logueado en Supabase
```bash
supabase login
```

Si no estás logueado, te pedirá autenticarte en el navegador.

### 3. Verificar que el proyecto está linkeado
```bash
supabase projects list
```

Si no ves tu proyecto o necesitas linkearlo:
```bash
supabase link --project-ref hqdatzhliaordlsqtjea
```

**Nota:** El project-ref puede variar. Verifica en tu Supabase Dashboard.

---

## 🎯 COMANDO PARA APLICAR MIGRACIONES

### Opción 1: Usando npm script (RECOMENDADO)
```bash
npm run db:push
```

### Opción 2: Usando Supabase CLI directamente
```bash
npx supabase db push
```

### Opción 3: Aplicar todas las migraciones (incluyendo otras pendientes)
```bash
npm run db:push:all
# o
npx supabase db push --include-all
```

---

## 📝 PASOS DETALLADOS

### Paso 1: Verificar migraciones pendientes (opcional)
```bash
# Ver qué migraciones se aplicarán
npx supabase migration list
```

### Paso 2: Aplicar migraciones
```bash
# Desde la raíz del proyecto
npm run db:push
```

**Salida esperada:**
```
Applying migration 20251117000000_add_catalog_fields_to_products.sql...
Applying migration 20251117001000_create_store_ad_catalogs_tables.sql...
Finished supabase db push.
```

### Paso 3: Verificar que se aplicaron correctamente

**Opción A: Desde Supabase Dashboard**
1. Ve a: https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea/database/migrations
2. Verifica que las migraciones aparecen como aplicadas

**Opción B: Desde SQL Editor**
```sql
-- Verificar campos en products
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products'
  AND column_name IN (
    'is_in_global_catalog',
    'catalog_valid_from',
    'catalog_valid_until',
    'catalog_priority',
    'exclude_from_store_catalog'
  );

-- Verificar tablas creadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('store_ad_catalogs', 'store_ad_catalog_products');
```

---

## 🔍 VERIFICACIÓN POST-MIGRACIÓN

### 1. Verificar campos en `products`
```sql
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products'
  AND column_name LIKE 'catalog%'
ORDER BY column_name;
```

**Debes ver:**
- ✅ `is_in_global_catalog` (boolean, default false)
- ✅ `catalog_valid_from` (timestamp with time zone, nullable)
- ✅ `catalog_valid_until` (timestamp with time zone, nullable)
- ✅ `catalog_priority` (integer, default 0)
- ✅ `exclude_from_store_catalog` (boolean, default false)

### 2. Verificar tablas creadas
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('store_ad_catalogs', 'store_ad_catalog_products');
```

**Debes ver:**
- ✅ `store_ad_catalogs`
- ✅ `store_ad_catalog_products`

### 3. Verificar índices creados
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE '%catalog%' 
    OR tablename IN ('store_ad_catalogs', 'store_ad_catalog_products')
  );
```

### 4. Verificar triggers
```sql
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'store_ad_catalogs';
```

**Debes ver:**
- ✅ `set_updated_at_store_ad_catalogs`

---

## ⚠️ TROUBLESHOOTING

### Error: "Not logged in"
```bash
supabase login
```

### Error: "Project not linked"
```bash
supabase link --project-ref TU_PROJECT_REF
```

Para obtener tu project-ref:
1. Ve a Supabase Dashboard
2. Selecciona tu proyecto
3. Ve a Settings → General
4. Copia el "Reference ID"

### Error: "Migration already applied"
Si una migración ya está aplicada, Supabase la saltará automáticamente. Esto es normal.

### Error: "Column already exists"
Las migraciones usan `IF NOT EXISTS`, así que no debería haber conflictos. Si aparece este error, verifica que la migración esté bien formada.

### Error: "Permission denied"
Verifica que:
1. Estás logueado con una cuenta que tiene permisos en el proyecto
2. El proyecto está correctamente linkeado

---

## 🔄 ALTERNATIVA: Aplicar Manualmente desde Dashboard

Si prefieres aplicar manualmente:

### 1. Migración 1: Campos en products
1. Ve a: https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea/sql/new
2. Abre: `supabase/migrations/20251117000000_add_catalog_fields_to_products.sql`
3. Copia TODO el contenido
4. Pégalo en SQL Editor
5. Ejecuta (RUN)

### 2. Migración 2: Tablas de catálogos
1. En el mismo SQL Editor (o nuevo query)
2. Abre: `supabase/migrations/20251117001000_create_store_ad_catalogs_tables.sql`
3. Copia TODO el contenido
4. Pégalo y ejecuta

---

## 📊 RESUMEN

**Comando principal:**
```bash
npm run db:push
```

**Prerequisitos:**
- ✅ Supabase CLI instalado
- ✅ Logueado en Supabase (`supabase login`)
- ✅ Proyecto linkeado (`supabase link`)

**Verificación:**
- ✅ Campos agregados a `products`
- ✅ Tablas `store_ad_catalogs` y `store_ad_catalog_products` creadas
- ✅ Índices y triggers configurados

---

## 🎯 SIGUIENTE PASO

Después de aplicar las migraciones:

1. **Regenerar tipos TypeScript** (opcional pero recomendado):
   ```bash
   npm run typegen
   ```

2. **Probar el sistema:**
   - Acceder a `/dashboard/marketing/catalogo-mercadito`
   - Verificar que se pueden activar productos en catálogo
   - Verificar que aparecen en `/vitrina`

---

**¡Listo! Las migraciones están aplicadas y el sistema de catálogos está operativo.**



