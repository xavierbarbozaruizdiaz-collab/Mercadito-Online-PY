# 📋 AUDITORÍA DE CÓDIGO EXISTENTE - PUBLICIDAD Y CATÁLOGOS
**Fecha:** 2025-01-XX  
**Rol:** Senior Backend LPMS  
**Objetivo:** Auditar código existente antes de crear migraciones para publicidad y catálogos

---

## A) CAMPOS EXISTENTES RELEVANTES EN `products`

### Campos que podrían solaparse con funcionalidad de catálogo global/publicidad:

1. **`is_featured`** (BOOLEAN, DEFAULT FALSE)
   - **Ubicación:** `supabase/migrations/20250128000029_simple_schema_update.sql` (línea 60)
   - **Uso previsto:** Marcar productos como destacados/featured
   - **Índice:** `idx_products_featured` existe en la misma migración (línea 196)
   - **Riesgo de solapamiento:** ⚠️ **ALTO** - Si "catálogo global" implica "productos destacados", este campo ya existe

2. **`status`** (TEXT, DEFAULT 'active')
   - **Ubicación:** `supabase/migrations/20250128000029_simple_schema_update.sql` (línea 61)
   - **Valores posibles:** 'active', 'paused', 'archived', 'sold' (según tipos TypeScript)
   - **Uso previsto:** Controlar visibilidad y estado del producto
   - **Índice:** `idx_products_status` existe (línea 197)
   - **Riesgo de solapamiento:** ⚠️ **MEDIO** - Podría usarse para excluir productos de ciertas vistas

3. **`store_id`** (UUID, REFERENCES stores(id))
   - **Ubicación:** `supabase/migrations/20250128000029_simple_schema_update.sql` (línea 51)
   - **Uso previsto:** Relacionar producto con tienda
   - **Riesgo de solapamiento:** ✅ **BAJO** - Campo necesario, no conflictivo

### Campos NO encontrados (que se mencionaron en la búsqueda):
- ❌ `is_in_global_catalog` - **NO EXISTE**
- ❌ `global_catalog` - **NO EXISTE**
- ❌ `catalogo` - **NO EXISTE**
- ❌ `ad_catalog` - **NO EXISTE**

### Otros campos relevantes en `products`:
- `created_at`, `updated_at` (TIMESTAMPTZ) - Para control de vigencia
- `tags` (TEXT[]) - Podría usarse para categorización adicional
- `seo_title`, `seo_description` - Para SEO y feeds

---

## B) TABLAS RELACIONADAS CON PUBLICIDAD / CATÁLOGO / PROMOCIONES

### 1. **`promotions`** ✅ EXISTE
   - **Ubicación:** `supabase/migrations/20250128000042_coupons_system.sql` (líneas 40-58)
   - **Propósito:** Promociones automáticas (descuentos sin cupón)
   - **Campos relevantes:**
     - `store_id` (UUID) - Promoción por tienda
     - `product_id` (UUID) - Promoción por producto
     - `category_id` (UUID) - Promoción por categoría
     - `valid_from`, `valid_until` (TIMESTAMPTZ) - Control de vigencia
     - `is_active` (BOOLEAN) - Estado activo/inactivo
     - `priority` (INTEGER) - Prioridad cuando hay múltiples promociones
   - **RLS:** Habilitado, políticas para admins y store owners
   - **Función relacionada:** `get_active_promotions()` (líneas 196-236)

### 2. **`product_catalog_sync`** ✅ EXISTE
   - **Ubicación:** `supabase/migrations/20250203000001_marketing_system.sql` (líneas 56-69)
   - **Propósito:** Sincronización de productos con plataformas externas (Meta, TikTok, Instagram, Google)
   - **Campos relevantes:**
     - `product_id` (UUID) - Producto a sincronizar
     - `platform` (VARCHAR) - Plataforma externa ('meta', 'tiktok', 'instagram', 'google')
     - `external_id` (VARCHAR) - ID en la plataforma externa
     - `sync_status` (VARCHAR) - Estado: 'pending', 'synced', 'error', 'syncing'
     - `last_synced_at` (TIMESTAMP) - Última sincronización
     - `sync_data` (JSONB) - Datos adicionales de sincronización
   - **RLS:** Habilitado, políticas para sellers (sus productos) y admins (todos)
   - **Riesgo de solapamiento:** ⚠️ **ALTO** - Si "catálogo de publicidad" implica sincronización con plataformas, esta tabla ya existe

### 3. **`marketing_campaigns`** ✅ EXISTE
   - **Ubicación:** `supabase/migrations/20250203000001_marketing_system.sql` (líneas 6-23)
   - **Propósito:** Campañas de marketing centralizadas e individuales
   - **Campos relevantes:**
     - `store_id` (UUID) - Tienda asociada (NULL para campañas generales)
     - `campaign_type` (VARCHAR) - 'general' o 'individual'
     - `meta_campaign_id` (VARCHAR) - ID de campaña en Meta
     - `status` (VARCHAR) - 'draft', 'active', 'paused', 'archived'
   - **RLS:** Habilitado, políticas para admins y sellers

### 4. **`campaign_metrics`** ✅ EXISTE
   - **Ubicación:** `supabase/migrations/20250203000001_marketing_system.sql` (líneas 25-39)
   - **Propósito:** Métricas diarias de campañas (impressions, clicks, spend, conversions, CTR, CPC, CPM)

### 5. **`campaign_targeting`** ✅ EXISTE
   - **Ubicación:** `supabase/migrations/20250203000001_marketing_system.sql` (líneas 41-54)
   - **Propósito:** Configuración de targeting para campañas (edad, género, ubicación, intereses, etc.)

### Tablas NO encontradas:
- ❌ `store_ad_catalogs` - **NO EXISTE**
- ❌ `ad_slots` - **NO EXISTE**
- ❌ Tabla específica para "catálogo por tienda" - **NO EXISTE** (pero `product_catalog_sync` tiene relación con productos)

---

## C) FUNCIONES/TRIGGERS DE TIMESTAMPS EXISTENTES

### Funciones globales (reutilizables):

1. **`public.update_updated_at_column()`** ✅ EXISTE
   - **Ubicación:** `supabase/migrations/20250128000008_complete_setup.sql` (líneas 55-61)
   - **Tipo:** Función PL/pgSQL global
   - **Uso:** Actualiza `updated_at = NOW()` en cualquier tabla
   - **Usada en:**
     - `products` (trigger `update_products_updated_at`)
     - `orders` (trigger `update_orders_updated_at`)
     - `cart_items` (trigger `update_cart_items_updated_at`)
     - `stores` (trigger `update_stores_updated_at`)
     - `payments` (trigger `update_payments_updated_at`)
     - `shipments` (trigger `update_shipments_updated_at`)

2. **`public.tg_set_updated_at()`** ✅ EXISTE
   - **Ubicación:** `supabase/migrations/20251030_hero_carousel.sql` (líneas 31-37)
   - **Tipo:** Función PL/pgSQL específica para hero_slides
   - **Uso:** Similar a `update_updated_at_column()`, pero con nombre diferente
   - **Usada en:**
     - `hero_slides` (trigger `set_updated_at_hero_slides`)
     - `site_stats` (trigger `set_updated_at_site_stats`)

3. **`public.update_simple_updated_at()`** ✅ EXISTE
   - **Ubicación:** `supabase/migrations/20250128000041_reviews_system.sql` (líneas 281-287)
   - **Tipo:** Función PL/pgSQL auxiliar
   - **Uso:** Similar a las anteriores, pero definida en contexto de reviews
   - **Usada en:**
     - `coupons` (trigger `coupons_updated_at`)
     - `promotions` (trigger `promotions_updated_at`)

### Funciones específicas por tabla (no reutilizables):
- `update_marketing_campaigns_updated_at()` - Para `marketing_campaigns`
- `update_product_catalog_sync_updated_at()` - Para `product_catalog_sync`
- `update_membership_plans_updated_at()` - Para `membership_plans`
- `update_seller_delivery_penalties_updated_at()` - Para `seller_delivery_penalties`
- Y muchas otras específicas...

### ⚠️ PROBLEMA DETECTADO:
**Hay 3 funciones diferentes que hacen lo mismo:**
- `update_updated_at_column()` (global, más usada)
- `tg_set_updated_at()` (específica para hero)
- `update_simple_updated_at()` (auxiliar)

**Recomendación:** Usar `public.update_updated_at_column()` como estándar, ya que es la más extendida y está en una migración temprana.

---

## D) RIESGOS DE DUPLICACIÓN

### Si agregamos campos nuevos relacionados a catálogo global de productos:

#### ⚠️ RIESGO ALTO:
1. **`is_in_global_catalog` (BOOLEAN)**
   - **Conflicto con:** `is_featured` (ya existe)
   - **Problema:** Ambos podrían usarse para "destacar producto"
   - **Solución:** Definir claramente la diferencia:
     - `is_featured` = Destacado en homepage/secciones especiales
     - `is_in_global_catalog` = Incluido en catálogo global para publicidad/feeds

2. **Campo de vigencia para catálogo**
   - **Conflicto con:** `status` (ya existe)
   - **Problema:** `status` controla visibilidad general, pero no específicamente para catálogo
   - **Solución:** Si se necesita vigencia específica para catálogo, agregar campos:
     - `catalog_valid_from` (TIMESTAMPTZ)
     - `catalog_valid_until` (TIMESTAMPTZ)

#### ✅ RIESGO BAJO:
- Campos como `catalog_priority`, `catalog_tags`, etc. no tienen conflictos

### Si creamos tabla `store_ad_catalogs` o similar:

#### ⚠️ RIESGO ALTO:
1. **Tabla `store_ad_catalogs`**
   - **Conflicto con:** `product_catalog_sync` (ya existe)
   - **Problema:** Ambas manejan relación producto-catálogo-plataforma
   - **Análisis:**
     - `product_catalog_sync`: Sincronización técnica con plataformas externas (Meta, TikTok, etc.)
     - `store_ad_catalogs`: Podría ser configuración de qué productos incluir en catálogo de publicidad por tienda
   - **Solución:** 
     - Si `store_ad_catalogs` es solo configuración (qué productos incluir), podría ser complementaria
     - Si `store_ad_catalogs` también sincroniza, sería duplicación
     - **Recomendación:** Usar `product_catalog_sync` y extenderla si es necesario, o crear `store_ad_catalogs` con propósito diferente (configuración vs sincronización)

2. **Tabla para "catálogo por tienda"**
   - **Conflicto con:** `product_catalog_sync` + relación `products.store_id`
   - **Problema:** Ya existe relación producto-tienda, y sincronización por producto
   - **Solución:** Evaluar si realmente se necesita tabla adicional o si se puede usar la estructura existente

#### ✅ RIESGO BAJO:
- Tablas para configuración de feeds, slots de publicidad, etc. no tienen conflictos directos

---

## E) SUGERENCIAS

### 1. Para campos en `products`:

#### Opción A: **REUTILIZAR `is_featured`** (NO recomendado)
- ❌ **Problema:** `is_featured` ya tiene un propósito (destacar en homepage)
- ❌ **Confusión:** Mezclar conceptos de "destacado" y "en catálogo global"

#### Opción B: **EXTENDER con campos específicos** (RECOMENDADO)
- ✅ Agregar `is_in_global_catalog` (BOOLEAN, DEFAULT FALSE)
- ✅ Agregar `catalog_valid_from` (TIMESTAMPTZ, NULLABLE)
- ✅ Agregar `catalog_valid_until` (TIMESTAMPTZ, NULLABLE)
- ✅ Agregar `catalog_priority` (INTEGER, DEFAULT 0) - Para ordenamiento en catálogo
- ✅ Mantener `is_featured` para su propósito original

**Justificación:**
- Separación clara de responsabilidades
- `is_featured` = UI/UX (destacar visualmente)
- `is_in_global_catalog` = Publicidad/Feeds (incluir en catálogo para ads)

### 2. Para tabla de catálogos de publicidad:

#### Opción A: **EXTENDER `product_catalog_sync`** (NO recomendado)
- ❌ **Problema:** `product_catalog_sync` es para sincronización técnica con plataformas externas
- ❌ **Confusión:** Mezclar sincronización técnica con configuración de catálogo

#### Opción B: **CREAR `store_ad_catalogs`** (RECOMENDADO con ajustes)
- ✅ Crear tabla con propósito claro: **Configuración de catálogo de publicidad por tienda**
- ✅ Estructura sugerida:
  ```sql
  CREATE TABLE store_ad_catalogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Nombre del catálogo (ej: "Catálogo Navidad 2025")
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    settings JSONB DEFAULT '{}', -- Configuraciones adicionales
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- ✅ Crear tabla de relación (muchos a muchos):
  ```sql
  CREATE TABLE store_ad_catalog_products (
    catalog_id UUID REFERENCES store_ad_catalogs(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (catalog_id, product_id)
  );
  ```

**Justificación:**
- Separación clara: `product_catalog_sync` = sincronización técnica, `store_ad_catalogs` = configuración de negocio
- Permite múltiples catálogos por tienda
- Permite agregar/quitar productos sin afectar sincronización

### 3. Para función de timestamps:

#### ✅ **REUTILIZAR `public.update_updated_at_column()`**
- Ya existe y está bien establecida
- Usada en múltiples tablas
- No crear nuevas funciones similares

**Ejemplo de uso:**
```sql
CREATE TRIGGER update_store_ad_catalogs_updated_at
  BEFORE UPDATE ON store_ad_catalogs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

---

## RESUMEN EJECUTIVO

### ✅ Lo que YA EXISTE y se puede REUTILIZAR:
1. Función `public.update_updated_at_column()` para timestamps
2. Tabla `product_catalog_sync` para sincronización técnica
3. Tabla `promotions` para promociones
4. Campo `is_featured` en products (pero con propósito diferente)

### ⚠️ Lo que REQUIERE ATENCIÓN:
1. **Campo `is_featured`** - Definir diferencia con `is_in_global_catalog`
2. **Tabla `product_catalog_sync`** - Asegurar que no se duplique funcionalidad
3. **Múltiples funciones de timestamp** - Estandarizar en `update_updated_at_column()`

### ✅ Lo que se puede CREAR SIN RIESGO:
1. Campo `is_in_global_catalog` en `products` (con campos de vigencia opcionales)
2. Tabla `store_ad_catalogs` (con propósito de configuración, no sincronización)
3. Tabla `store_ad_catalog_products` (relación muchos a muchos)

### 📝 RECOMENDACIÓN FINAL:
**Crear migración nueva con:**
- Campos en `products`: `is_in_global_catalog`, `catalog_valid_from`, `catalog_valid_until`, `catalog_priority`
- Tabla `store_ad_catalogs` (configuración de catálogos por tienda)
- Tabla `store_ad_catalog_products` (relación productos-catálogos)
- Usar `public.update_updated_at_column()` para triggers
- **NO duplicar** funcionalidad de `product_catalog_sync` ni `is_featured`

---

**Fin del informe de auditoría**




