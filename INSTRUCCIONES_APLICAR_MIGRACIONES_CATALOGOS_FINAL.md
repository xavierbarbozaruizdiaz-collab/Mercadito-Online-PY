# 🚨 APLICACIÓN MANUAL DE MIGRACIONES DE CATÁLOGOS

**Situación:** Hay un conflicto de sincronización entre migraciones locales y remotas. La mejor solución es aplicar las migraciones de catálogos manualmente.

---

## ✅ SOLUCIÓN: Aplicar Manualmente desde Supabase Dashboard

### Paso 1: Abrir SQL Editor
1. Ve a: https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea/sql/new
2. O navega: Dashboard → SQL Editor → New Query

### Paso 2: Copiar y Ejecutar el Script
1. Abre el archivo: `APLICAR_MIGRACIONES_CATALOGOS_MANUAL.sql`
2. Copia **TODO** el contenido
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **RUN** (o presiona `Ctrl+Enter`)

### Paso 3: Verificar
Deberías ver el mensaje:
```
✅ Migraciones de catálogos aplicadas correctamente
```

---

## 📋 CONTENIDO DEL SCRIPT

El archivo `APLICAR_MIGRACIONES_CATALOGOS_MANUAL.sql` contiene:

1. **Migración 1:** Campos de catálogo en `products`
   - `is_in_global_catalog`
   - `catalog_valid_from`
   - `catalog_valid_until`
   - `catalog_priority`
   - `exclude_from_store_catalog`

2. **Migración 2:** Tablas de catálogos por tienda
   - `store_ad_catalogs`
   - `store_ad_catalog_products`
   - Índices y políticas RLS

---

## 🔍 VERIFICACIÓN POST-APLICACIÓN

Ejecuta en SQL Editor:

```sql
-- Verificar campos en products
SELECT column_name, data_type, column_default
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

**Debes ver:**
- ✅ 5 columnas en `products`
- ✅ 2 tablas nuevas

---

## ⚠️ NOTA SOBRE SINCRONIZACIÓN

Después de aplicar manualmente, las migraciones quedarán aplicadas en la base de datos pero el CLI local puede seguir mostrándolas como pendientes. Esto es normal y no afecta la funcionalidad.

Si quieres sincronizar el estado del CLI, puedes:
1. Marcar las migraciones como aplicadas manualmente en la tabla `supabase_migrations.schema_migrations`
2. O esperar a que se resuelvan los conflictos de las migraciones anteriores

---

**✅ Una vez aplicado el script, las migraciones de catálogos estarán operativas.**


