# 📋 RESUMEN FINAL - MIGRACIONES DE CATÁLOGOS Y PUBLICIDAD
**Fecha:** 2025-11-17  
**Rol:** Senior Backend LPMS  
**Estado:** ✅ COMPLETADO

---

## 🎯 OBJETIVO GENERAL

Implementar sistema de catálogos de publicidad para Mercadito Online PY, permitiendo:
1. **Catálogo General de Mercadito** - Productos destacados para publicidad global
2. **Catálogos por Tienda** - Configuración de catálogos individuales por tienda para publicidad

---

## 📦 MIGRACIÓN 1: Campos de Catálogo General en Products

### Archivo:
```
supabase/migrations/20251117000000_add_catalog_fields_to_products.sql
```

### Objetivo:
Agregar campos a `public.products` para manejar el "Catálogo General de Mercadito" sin duplicar funcionalidades existentes.

### Campos Agregados:

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `is_in_global_catalog` | BOOLEAN NOT NULL | FALSE | Indica si el producto participa en el Catálogo General |
| `catalog_valid_from` | TIMESTAMPTZ | NULL | Fecha desde la cual el producto es válido en catálogo |
| `catalog_valid_until` | TIMESTAMPTZ | NULL | Fecha hasta la cual el producto es válido en catálogo |
| `catalog_priority` | INTEGER NOT NULL | 0 | Prioridad para ordenar en el feed (mayor = más prioridad) |
| `exclude_from_store_catalog` | BOOLEAN NOT NULL | FALSE | Excluir producto de catálogos individuales de tienda |

### Índices Creados:

1. **`idx_products_global_catalog_active`**
   - Tipo: Índice parcial compuesto
   - Columnas: `(is_in_global_catalog, catalog_valid_from, catalog_valid_until)`
   - Filtro: `WHERE is_in_global_catalog = TRUE`
   - Propósito: Optimizar consultas de productos activos en catálogo global

2. **`idx_products_catalog_priority`**
   - Tipo: Índice parcial
   - Columnas: `catalog_priority DESC`
   - Filtro: `WHERE is_in_global_catalog = TRUE`
   - Propósito: Optimizar ordenamiento por prioridad en feeds

### Características:

✅ **Idempotente**: Usa `ADD COLUMN IF NOT EXISTS` y `CREATE INDEX IF NOT EXISTS`  
✅ **No destructivo**: No modifica campos existentes (`is_featured` se mantiene intacto)  
✅ **Documentado**: Comentarios SQL en cada columna  
✅ **Verificado**: Bloque de verificación al final de la migración  
✅ **Optimizado**: Índices parciales para mejor rendimiento

### Diferenciación con `is_featured`:

- **`is_featured`**: Destacado en UI/UX (homepage, secciones especiales)
- **`is_in_global_catalog`**: Incluido en catálogo global para publicidad/feeds

---

## 📦 MIGRACIÓN 2: Tablas de Catálogos por Tienda

### Archivo:
```
supabase/migrations/20251117001000_create_store_ad_catalogs_tables.sql
```

### Objetivo:
Crear estructura para que cada tienda tenga sus propios catálogos de productos para publicidad (ej: "default", "ofertas", "nuevos"), sin duplicar la funcionalidad de `product_catalog_sync`.

### Tabla 1: `store_ad_catalogs`

**Propósito**: Configuración de catálogos de publicidad por tienda (configuración de negocio, no sincronización técnica).

#### Campos:

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `id` | UUID | `gen_random_uuid()` | Primary key |
| `store_id` | UUID NOT NULL | - | Tienda propietaria (FK → stores.id) |
| `slug` | TEXT NOT NULL | - | Identificador interno único por tienda |
| `name` | TEXT NOT NULL | - | Nombre visible en panel |
| `type` | TEXT NOT NULL | 'default' | Tipo: 'default' \| 'collection' \| 'promotional' |
| `filters` | JSONB NOT NULL | '{}' | Criterios de filtrado automático |
| `is_active` | BOOLEAN NOT NULL | TRUE | Estado activo/inactivo |
| `last_generated_at` | TIMESTAMPTZ | NULL | Última regeneración del catálogo |
| `products_count` | INTEGER NOT NULL | 0 | Contador de productos incluidos |
| `created_at` | TIMESTAMPTZ NOT NULL | NOW() | Timestamp de creación |
| `updated_at` | TIMESTAMPTZ NOT NULL | NOW() | Timestamp de actualización |

#### Índices:

1. **`idx_store_ad_catalogs_store`** - Búsqueda por tienda
2. **`uniq_store_ad_catalogs_store_slug`** - Único por (store_id, slug) - Evita duplicados

### Tabla 2: `store_ad_catalog_products`

**Propósito**: Relación muchos a muchos entre catálogos y productos (selección manual).

#### Campos:

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `id` | UUID | `gen_random_uuid()` | Primary key |
| `catalog_id` | UUID NOT NULL | - | Catálogo (FK → store_ad_catalogs.id) |
| `product_id` | UUID NOT NULL | - | Producto (FK → products.id) |
| `created_at` | TIMESTAMPTZ NOT NULL | NOW() | Timestamp de agregado |

#### Índices:

1. **`idx_store_ad_catalog_products_catalog`** - Búsqueda por catálogo
2. **`idx_store_ad_catalog_products_product`** - Búsqueda por producto
3. **`uniq_store_ad_catalog_products_unique`** - Único por (catalog_id, product_id) - Evita duplicados

### Características:

✅ **Idempotente**: Usa `CREATE TABLE IF NOT EXISTS`  
✅ **No duplica funcionalidad**: Separado de `product_catalog_sync` (configuración vs sincronización)  
✅ **RLS Habilitado**: Row Level Security con políticas completas  
✅ **Trigger de timestamp**: Usa `public.update_updated_at_column()` (función global existente)  
✅ **Documentado**: Comentarios SQL en tablas y columnas  
✅ **Verificado**: Bloque de verificación al final

### Políticas RLS Implementadas:

#### Para `store_ad_catalogs`:
- ✅ SELECT: Vendedores ven sus catálogos, admins ven todos
- ✅ INSERT: Vendedores crean para sus tiendas, admins para cualquier tienda
- ✅ UPDATE: Vendedores actualizan sus catálogos, admins todos
- ✅ DELETE: Vendedores eliminan sus catálogos, admins todos

#### Para `store_ad_catalog_products`:
- ✅ SELECT: Vendedores ven productos de sus catálogos, admins todos
- ✅ INSERT: Vendedores agregan a sus catálogos, admins a cualquier catálogo
- ✅ DELETE: Vendedores quitan de sus catálogos, admins de cualquier catálogo

### Diferenciación con `product_catalog_sync`:

- **`product_catalog_sync`**: Sincronización técnica con plataformas externas (Meta, TikTok, etc.)
- **`store_ad_catalogs`**: Configuración de negocio (qué productos incluir, filtros, etc.)

---

## 🔍 VERIFICACIONES REALIZADAS

### ✅ No se modificó:
- ❌ `is_featured` en `products` (se mantiene intacto)
- ❌ Tabla `promotions` (no se tocó)
- ❌ Tabla `product_catalog_sync` (no se tocó)
- ❌ Funciones de timestamp existentes (se reutilizó `update_updated_at_column()`)

### ✅ No se duplicó:
- ❌ Funcionalidad de `is_featured` (diferente propósito)
- ❌ Funcionalidad de `product_catalog_sync` (diferente propósito)
- ❌ Funciones de timestamp (se reutilizó la existente)

### ✅ Se reutilizó:
- ✅ Función `public.update_updated_at_column()` para trigger de `updated_at`
- ✅ Estructura existente de `stores` y `products` (tipos UUID)

---

## 📊 ESTRUCTURA FINAL

### Relaciones:

```
stores (1) ──< (N) store_ad_catalogs (1) ──< (N) store_ad_catalog_products (N) >── (1) products
```

### Flujo de Uso:

1. **Catálogo General**:
   - Productos con `is_in_global_catalog = TRUE` aparecen en catálogo global
   - Se controla vigencia con `catalog_valid_from` y `catalog_valid_until`
   - Se ordena por `catalog_priority`

2. **Catálogos por Tienda**:
   - Tienda crea catálogo en `store_ad_catalogs` (ej: "ofertas")
   - Define filtros automáticos en `filters` (JSONB)
   - O selecciona productos manualmente en `store_ad_catalog_products`
   - El catálogo se puede sincronizar con plataformas usando `product_catalog_sync`

---

## 🚀 PRÓXIMOS PASOS SUGERIDOS

1. **Aplicar migraciones** en Supabase (en orden cronológico)
2. **Actualizar tipos TypeScript** en `src/types/database.ts`
3. **Crear servicios/APIs** para:
   - Gestionar productos en catálogo global
   - Gestionar catálogos por tienda
   - Generar feeds desde catálogos
4. **Integrar con `product_catalog_sync`** para sincronización técnica
5. **Crear funciones PL/pgSQL** para:
   - Regenerar catálogos automáticamente según filtros
   - Validar vigencia de productos en catálogo global
   - Actualizar `products_count` en catálogos

---

## 📝 NOTAS IMPORTANTES

1. **Idempotencia**: Ambas migraciones son idempotentes y se pueden ejecutar múltiples veces sin errores.

2. **RLS**: Las políticas RLS están configuradas para permitir que vendedores gestionen solo sus propios catálogos, y admins gestionen todos.

3. **Índices Parciales**: Los índices en `products` son parciales (con `WHERE`) para optimizar consultas solo sobre productos activos en catálogo.

4. **JSONB Filters**: El campo `filters` en `store_ad_catalogs` permite flexibilidad para diferentes criterios de filtrado sin modificar el esquema.

5. **Separación de Responsabilidades**:
   - `is_featured` = UI/UX
   - `is_in_global_catalog` = Publicidad/Feeds global
   - `store_ad_catalogs` = Configuración de negocio por tienda
   - `product_catalog_sync` = Sincronización técnica

---

## ✅ ESTADO FINAL

**Migraciones creadas**: 2/2  
**Errores de lint**: 0  
**Conflictos detectados**: 0  
**Funcionalidades duplicadas**: 0  
**Listo para aplicar**: ✅ SÍ

---

**Fin del resumen**




