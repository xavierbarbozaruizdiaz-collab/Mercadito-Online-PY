# ✅ VERIFICAR MIGRACIONES DE CATÁLOGOS

Si ya aplicaste el archivo `APLICAR_MIGRACIONES_CATALOGOS_MANUAL.sql`, verifica que todo esté correcto.

---

## 🔍 PASO 1: Ejecutar Script de Verificación

1. Abre Supabase SQL Editor
2. Abre el archivo: `VERIFICAR_MIGRACIONES_CATALOGOS.sql`
3. Copia TODO el contenido
4. Pégalo en SQL Editor
5. Ejecuta (RUN)

---

## ✅ RESULTADOS ESPERADOS

### 1. Campos en `products` (debe mostrar 5 filas):
- ✅ `catalog_priority` (integer, default 0)
- ✅ `catalog_valid_from` (timestamp with time zone, nullable)
- ✅ `catalog_valid_until` (timestamp with time zone, nullable)
- ✅ `exclude_from_store_catalog` (boolean, default false)
- ✅ `is_in_global_catalog` (boolean, default false)

### 2. Tablas creadas (debe mostrar 2 filas):
- ✅ `store_ad_catalogs`
- ✅ `store_ad_catalog_products`

### 3. Índices (debe mostrar varios):
- ✅ `idx_products_global_catalog_active`
- ✅ `idx_products_catalog_priority`
- ✅ `idx_store_ad_catalogs_store`
- ✅ `uniq_store_ad_catalogs_store_slug`
- ✅ `idx_store_ad_catalog_products_catalog`
- ✅ `idx_store_ad_catalog_products_product`
- ✅ `uniq_store_ad_catalog_products_unique`

### 4. Trigger (debe mostrar 1):
- ✅ `set_updated_at_store_ad_catalogs`

### 5. Políticas RLS (debe mostrar 6):
- ✅ 3 políticas para `store_ad_catalogs` (SELECT, INSERT, UPDATE, DELETE)
- ✅ 3 políticas para `store_ad_catalog_products` (SELECT, INSERT, DELETE)

---

## 🎯 SI TODO ESTÁ CORRECTO

Si ves todos los elementos listados arriba, **las migraciones están aplicadas correctamente**. 

**No necesitas hacer nada más.** El sistema de catálogos está operativo.

---

## ⚠️ SI FALTA ALGO

Si alguna de las verificaciones no muestra los resultados esperados:

1. **Vuelve a ejecutar** el archivo `APLICAR_MIGRACIONES_CATALOGOS_MANUAL.sql`
2. Verifica que no haya errores
3. Ejecuta nuevamente el script de verificación

---

## 📋 SIGUIENTE PASO (Opcional)

Una vez confirmado que todo está aplicado:

1. **Regenerar tipos TypeScript** (recomendado):
   ```bash
   npm run typegen
   ```

2. **Probar el sistema:**
   - Acceder a `/dashboard/marketing/catalogo-mercadito`
   - Activar productos en catálogo
   - Verificar que aparecen en `/vitrina`

---

**✅ Ejecuta el script de verificación y confirma qué resultados obtienes.**


