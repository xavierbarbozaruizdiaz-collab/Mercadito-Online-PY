# 🔍 AUDITORÍA TOTAL LPMS 2025 - SISTEMA DE PRODUCTOS
## Mercadito Online PY - Diagnóstico Completo

**Fecha:** 2025-01-28  
**Rol:** LPMS - Lead Product Manager Senior + Senior Full-Stack Engineer  
**Objetivo:** Identificar todas las inconsistencias en el sistema de productos

---

## 📊 1. AUDITORÍA DEL MODELO DE DATOS

### 1.1. Esquema de la Tabla `products`

**Campos de Estado:**
- `status` (TEXT, DEFAULT 'active')
  - Valores posibles: `'active'`, `'paused'`, `'deleted'`, `'archived'`, `NULL`
  - Definido en: `supabase/migrations/20250128000029_simple_schema_update.sql` (línea 61)
  - **NO tiene constraint CHECK**, puede tener cualquier valor TEXT

- `approval_status` (TEXT, DEFAULT 'pending')
  - Valores posibles: `'pending'`, `'approved'`, `'rejected'`
  - Definido en: `supabase/migrations/20250128000053_product_approval.sql` (línea 8)
  - **SÍ tiene constraint CHECK**: `CHECK (approval_status IN ('pending', 'approved', 'rejected'))`

**Campos que NO existen:**
- ❌ `deleted_at` (timestamp)
- ❌ `archived_at` (timestamp)
- ❌ `is_deleted` (boolean)
- ❌ `is_archived` (boolean)

### 1.2. Representación Actual de Estados

**Producto Activo (visible públicamente):**
```sql
status = 'active' AND approval_status = 'approved' AND status != 'deleted'
```

**Producto Pendiente:**
```sql
approval_status = 'pending' AND status != 'deleted'
```

**Producto Aprobado (pero puede estar pausado):**
```sql
approval_status = 'approved' AND status != 'deleted'
```

**Producto Rechazado:**
```sql
approval_status = 'rejected' AND status != 'deleted'
```

**Producto Pausado:**
```sql
status = 'paused' AND status != 'deleted'
```

**Producto Eliminado:**
```sql
status = 'deleted'
```

### 1.3. Consulta SQL para Verificar Estado Real

```sql
-- Verificar distribución de productos por estado
SELECT 
  status,
  approval_status,
  COUNT(*) as total
FROM products
GROUP BY status, approval_status
ORDER BY total DESC;

-- Verificar productos con status NULL
SELECT COUNT(*) as productos_sin_status
FROM products
WHERE status IS NULL;

-- Verificar productos con approval_status NULL
SELECT COUNT(*) as productos_sin_approval
FROM products
WHERE approval_status IS NULL;
```

---

## 🔍 2. AUDITORÍA DEL FLUJO DE ELIMINACIÓN

### 2.1. Puntos de Eliminación Identificados

#### A) Vendedor - Dashboard (`src/app/dashboard/page.tsx`)

**Función:** `deleteProduct(productId: string)` (línea 883)

**Código Actual:**
```typescript
// SOFT DELETE: Marcar producto como eliminado
const updateResult = await supabase
  .from('products')
  .update({ 
    status: 'deleted',
    updated_at: new Date().toISOString()
  })
  .eq('id', productId);
```

**Estado:** ✅ **CORRECTO** - Usa SOFT DELETE

#### B) Vendedor - Editar Producto (`src/app/dashboard/edit-product/[id]/page.tsx`)

**Función:** `handleDeleteProduct()` (línea 529)

**Código Actual:**
```typescript
// SOFT DELETE: Marcar producto como eliminado
const updateResult = await supabase
  .from('products')
  .update({ 
    status: 'deleted',
    updated_at: new Date().toISOString()
  })
  .eq('id', productId);
```

**Estado:** ✅ **CORRECTO** - Usa SOFT DELETE

#### C) Servicio ProductService (`src/lib/services/productService.ts`)

**Función:** `deleteProduct(id: string)` (línea 315)

**Código Actual:**
```typescript
// SOFT DELETE: Marcar como eliminado
const { error } = await supabase
  .from('products')
  .update({ 
    status: 'deleted',
    updated_at: new Date().toISOString()
  })
  .eq('id', id);
```

**Estado:** ✅ **CORRECTO** - Usa SOFT DELETE

#### D) Admin - ProductAdminService (`src/lib/services/productAdminService.ts`)

**Función:** `deleteProduct(productId: string)` (línea 318)

**Código Actual:**
```typescript
// SOFT DELETE: Marcar producto como eliminado
const { error } = await supabase
  .from('products')
  .update({ 
    status: 'deleted',
    updated_at: new Date().toISOString()
  })
  .eq('id', productId);
```

**Estado:** ✅ **CORRECTO** - Usa SOFT DELETE

### 2.2. Conclusión del Flujo de Eliminación

**Estado Actual:** ✅ **COHERENTE**
- Todos los puntos de eliminación usan **SOFT DELETE**
- Todos actualizan `status = 'deleted'`
- **NO hay HARD DELETE** en el código actual

**Excepción:** Subastas finalizadas con más de 30 días se eliminan físicamente (línea 312 de `dashboard/page.tsx`), pero esto es intencional para limpieza automática.

---

## 🔍 3. AUDITORÍA DE LAS CONSULTAS

### 3.1. PÁGINA PÚBLICA

#### A) `searchService.searchProducts()` ✅ CORRECTO

**Archivo:** `src/lib/services/searchService.ts` (línea 106)

**Query Actual:**
```typescript
let query = supabase
  .from('products')
  .select(`...`)
  .eq('status', 'active')
  .eq('approval_status', 'approved'); // ✅ CORRECTO
```

**Estado:** ✅ **CORRECTO** - Filtra por `status = 'active'` AND `approval_status = 'approved'`

#### B) `ProductsListClient.tsx` ❌ INCORRECTO

**Archivo:** `src/components/ProductsListClient.tsx` (línea 177)

**Query Actual:**
```typescript
let query = supabase
  .from('products')
  .select(`...`)
  .or('status.is.null,status.eq.active'); // ❌ NO filtra por approval_status
```

**Problema:** 
- ❌ Incluye productos con `status IS NULL` (pueden ser antiguos sin status)
- ❌ **NO filtra por `approval_status = 'approved'`**
- ❌ Puede mostrar productos pendientes o rechazados

**Estado:** ❌ **INCORRECTO** - Falta filtro de `approval_status`

#### C) `productService.getProducts()` ❌ INCORRECTO

**Archivo:** `src/lib/services/productService.ts` (línea 375)

**Query Actual:**
```typescript
let query = supabase
  .from('products')
  .select(`...`)
  .eq('status', 'active'); // ❌ NO filtra por approval_status
```

**Problema:**
- ❌ **NO filtra por `approval_status = 'approved'`**
- Puede retornar productos activos pero pendientes de aprobación

**Estado:** ❌ **INCORRECTO** - Falta filtro de `approval_status`

#### D) `productService.getFeaturedProducts()` ❌ INCORRECTO

**Archivo:** `src/lib/services/productService.ts` (línea 525)

**Query Actual:**
```typescript
const { data, error } = await supabase
  .from('products')
  .select(`...`)
  .eq('is_featured', true)
  .eq('status', 'active') // ❌ NO filtra por approval_status
  .order('created_at', { ascending: false })
  .limit(limit);
```

**Problema:**
- ❌ **NO filtra por `approval_status = 'approved'`**

**Estado:** ❌ **INCORRECTO** - Falta filtro de `approval_status`

#### E) `productService.getRecentProducts()` ❌ INCORRECTO

**Archivo:** `src/lib/services/productService.ts` (línea 548)

**Query Actual:**
```typescript
const { data, error } = await supabase
  .from('products')
  .select(`...`)
  .eq('status', 'active') // ❌ NO filtra por approval_status
  .order('created_at', { ascending: false })
  .limit(limit);
```

**Problema:**
- ❌ **NO filtra por `approval_status = 'approved'`**

**Estado:** ❌ **INCORRECTO** - Falta filtro de `approval_status`

#### F) `storeService.getStoreProducts()` ❌ INCORRECTO

**Archivo:** `src/lib/services/storeService.ts` (línea 108)

**Query Actual:**
```typescript
if (options.status) {
  query = query.eq('status', options.status);
} else {
  // Por defecto, solo productos activos
  query = query.eq('status', 'active'); // ❌ NO filtra por approval_status
}
```

**Problema:**
- ❌ **NO filtra por `approval_status = 'approved'`**
- Usado en páginas públicas de tiendas

**Estado:** ❌ **INCORRECTO** - Falta filtro de `approval_status`

#### G) `app/products/[id]/page.tsx` ⚠️ PARCIALMENTE CORRECTO

**Archivo:** `src/app/products/[id]/page.tsx` (línea 140)

**Query Actual:**
```typescript
const { data, error } = await supabase
  .from('products')
  .select(`...`)
  .eq('id', id)
  .single();
```

**Validación en código:**
```typescript
if (error || !data || data.status !== 'active' || data.approval_status !== 'approved') {
  return <Producto no disponible />;
}
```

**Estado:** ⚠️ **PARCIALMENTE CORRECTO** - Filtra en el código, pero debería filtrar en la query

---

### 3.2. PANEL DEL VENDEDOR (Dashboard)

#### A) Dashboard Principal (`src/app/dashboard/page.tsx`)

**Query Principal (línea 158):**
```typescript
const query = supabase
  .from('products')
  .select('id, title, price, image_url:cover_url, created_at, sale_type, auction_status, auction_end_at, status')
  .eq('seller_id', session.session.user.id)
  .neq('status', 'deleted') // ✅ CORRECTO
  .not('status', 'is', null); // ✅ CORRECTO
```

**Estado:** ✅ **CORRECTO** - El vendedor debe ver todos sus productos (incluyendo pendientes) para gestionarlos

#### B) `sellerProfileService.getSellerProducts()` ✅ CORRECTO

**Archivo:** `src/lib/services/sellerProfileService.ts` (línea 139)

**Query Actual:**
```typescript
let query = supabase
  .from('products')
  .select('*, category:categories(name)', { count: 'exact' })
  .eq('seller_id', sellerId)
  .neq('status', 'deleted') // ✅ CORRECTO
  .not('status', 'is', null); // ✅ CORRECTO
```

**Estado:** ✅ **CORRECTO** - El vendedor debe ver todos sus productos

---

### 3.3. PANEL ADMIN

#### A) `productAdminService.getAllProducts()` ✅ CORRECTO (después de fix)

**Archivo:** `src/lib/services/productAdminService.ts` (línea 64)

**Query Actual:**
```typescript
// Excluir eliminados por defecto
if (options.filter !== 'archived') {
  query = query.neq('status', 'deleted').not('status', 'is', null);
}

// Filtro "Activos"
case 'active':
  query = query
    .eq('status', 'active')
    .eq('approval_status', 'approved'); // ✅ CORRECTO
```

**Estado:** ✅ **CORRECTO** - Después de los fixes aplicados

---

## 🔍 4. AUDITORÍA DE LOS CONTADORES

### 4.1. Admin - `getProductStats()`

**Archivo:** `src/lib/services/productAdminService.ts` (línea 341)

#### Contador "Total"
```typescript
supabase.from('products')
  .select('id', { count: 'exact', head: true })
  .neq('status', 'deleted')
  .not('status', 'is', null)
```
**Estado:** ✅ **CORRECTO**

#### Contador "Pendientes"
```typescript
supabase.from('products')
  .select('id', { count: 'exact', head: true })
  .eq('approval_status', 'pending')
  .neq('status', 'deleted')
  .not('status', 'is', null)
```
**Estado:** ✅ **CORRECTO**

#### Contador "Aprobados"
```typescript
supabase.from('products')
  .select('id', { count: 'exact', head: true })
  .eq('approval_status', 'approved')
  .neq('status', 'deleted')
  .not('status', 'is', null)
```
**Estado:** ✅ **CORRECTO**

#### Contador "Rechazados"
```typescript
supabase.from('products')
  .select('id', { count: 'exact', head: true })
  .eq('approval_status', 'rejected')
  .neq('status', 'deleted')
  .not('status', 'is', null)
```
**Estado:** ✅ **CORRECTO**

#### Contador "Activos"
```typescript
supabase.from('products')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'active')
  .eq('approval_status', 'approved') // ✅ CORRECTO (después de fix)
  .neq('status', 'deleted')
  .not('status', 'is', null)
```
**Estado:** ✅ **CORRECTO** (después de fix)

#### Contador "Pausados"
```typescript
supabase.from('products')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'paused')
  .neq('status', 'deleted')
  .not('status', 'is', null)
```
**Estado:** ✅ **CORRECTO**

#### Contador "Eliminados"
```typescript
supabase.from('products')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'deleted')
```
**Estado:** ✅ **CORRECTO**

---

## 🔍 5. AUDITORÍA DE LA UI

### 5.1. Admin Products Page (`src/app/admin/products/page.tsx`)

**Filtros de Pestañas:**
- ✅ Usa `getAllProducts()` con filtros correctos (después de fix)
- ✅ Muestra `status` y `approval_status` en la tabla
- ✅ Permite cambiar `status` y `approval_status` desde la UI

**Estado:** ✅ **CORRECTO** (después de fix)

### 5.2. Dashboard del Vendedor (`src/app/dashboard/page.tsx`)

**Lógica de Separación:**
```typescript
allProductsData.forEach(product => {
  // Excluir productos eliminados
  if (product.status === 'deleted' || !product.status) {
    return;
  }
  
  // Separar por status
  if (product.status === 'paused') {
    paused.push(product);
    return;
  }
  
  // Separar subastas finalizadas
  if (product.sale_type === 'auction' && isEnded) {
    endedAuctions.push(product);
  } else {
    activeProducts.push(product);
  }
});
```

**Estado:** ✅ **CORRECTO** - El vendedor ve todos sus productos para gestionarlos

---

## 💥 6. CAUSAS RAÍZ IDENTIFICADAS

### 6.1. Problema Principal: Falta de Filtro `approval_status` en Consultas Públicas

**Archivos Afectados:**
1. ❌ `src/components/ProductsListClient.tsx` (línea 204)
2. ❌ `src/lib/services/productService.ts` - `getProducts()` (línea 396)
3. ❌ `src/lib/services/productService.ts` - `getFeaturedProducts()` (línea 535)
4. ❌ `src/lib/services/productService.ts` - `getRecentProducts()` (línea 559)
5. ❌ `src/lib/services/storeService.ts` - `getStoreProducts()` (línea 154)

**Causa:**
Estas consultas solo filtran por `status = 'active'` pero **NO filtran por `approval_status = 'approved'`**, lo que permite que productos pendientes o rechazados aparezcan en la página pública.

### 6.2. Problema Secundario: Productos con `status IS NULL`

**Archivo Afectado:**
- ❌ `src/components/ProductsListClient.tsx` (línea 204)

**Código Problemático:**
```typescript
.or('status.is.null,status.eq.active')
```

**Causa:**
Incluye productos antiguos que pueden no tener `status` definido, y estos productos pueden no tener `approval_status = 'approved'`.

### 6.3. Problema Terciario: Inconsistencia entre Servicios

**Situación:**
- ✅ `searchService.searchProducts()` SÍ filtra por `approval_status = 'approved'`
- ❌ `productService.getProducts()` NO filtra por `approval_status = 'approved'`
- ❌ `ProductsListClient.tsx` NO filtra por `approval_status = 'approved'`

**Causa:**
Diferentes servicios usan diferentes lógicas, causando inconsistencias en qué productos se muestran.

---

## 📋 7. LISTA COMPLETA DE ARCHIVOS ANALIZADOS

### Archivos de Servicios:
1. ✅ `src/lib/services/productAdminService.ts` - CORRECTO (después de fix)
2. ❌ `src/lib/services/productService.ts` - **PROBLEMAS EN:**
   - `getProducts()` (línea 396)
   - `getFeaturedProducts()` (línea 535)
   - `getRecentProducts()` (línea 559)
3. ❌ `src/lib/services/storeService.ts` - **PROBLEMA EN:**
   - `getStoreProducts()` (línea 154)
4. ✅ `src/lib/services/searchService.ts` - CORRECTO
5. ✅ `src/lib/services/sellerProfileService.ts` - CORRECTO

### Archivos de Componentes:
6. ❌ `src/components/ProductsListClient.tsx` - **PROBLEMA EN:**
   - `loadProducts()` (línea 204)

### Archivos de Páginas:
7. ✅ `src/app/admin/products/page.tsx` - CORRECTO (después de fix)
8. ✅ `src/app/dashboard/page.tsx` - CORRECTO
9. ⚠️ `src/app/products/[id]/page.tsx` - PARCIALMENTE CORRECTO

### Archivos de Migraciones:
10. ✅ `supabase/migrations/20250128000029_simple_schema_update.sql` - Define `status`
11. ✅ `supabase/migrations/20250128000053_product_approval.sql` - Define `approval_status`

---

## 🔍 8. QUERY POR QUERY - DIAGNÓSTICO DETALLADO

### Query 1: `searchService.searchProducts()`
**Archivo:** `src/lib/services/searchService.ts:130`
```typescript
.eq('status', 'active')
.eq('approval_status', 'approved')
```
**Diagnóstico:** ✅ **CORRECTO** - Filtra ambos campos

### Query 2: `ProductsListClient.loadProducts()`
**Archivo:** `src/components/ProductsListClient.tsx:204`
```typescript
.or('status.is.null,status.eq.active')
```
**Diagnóstico:** ❌ **INCORRECTO**
- Incluye `status IS NULL` (productos antiguos)
- **NO filtra por `approval_status`**
- Puede mostrar productos pendientes/rechazados

### Query 3: `productService.getProducts()`
**Archivo:** `src/lib/services/productService.ts:396`
```typescript
.eq('status', 'active')
```
**Diagnóstico:** ❌ **INCORRECTO**
- **NO filtra por `approval_status`**
- Puede retornar productos pendientes

### Query 4: `productService.getFeaturedProducts()`
**Archivo:** `src/lib/services/productService.ts:535`
```typescript
.eq('is_featured', true)
.eq('status', 'active')
```
**Diagnóstico:** ❌ **INCORRECTO**
- **NO filtra por `approval_status`**
- Puede mostrar productos destacados pero pendientes

### Query 5: `productService.getRecentProducts()`
**Archivo:** `src/lib/services/productService.ts:559`
```typescript
.eq('status', 'active')
```
**Diagnóstico:** ❌ **INCORRECTO**
- **NO filtra por `approval_status`**
- Puede mostrar productos recientes pero pendientes

### Query 6: `storeService.getStoreProducts()`
**Archivo:** `src/lib/services/storeService.ts:154`
```typescript
query = query.eq('status', 'active');
```
**Diagnóstico:** ❌ **INCORRECTO**
- **NO filtra por `approval_status`**
- Usado en páginas públicas de tiendas
- Puede mostrar productos pendientes en la tienda

### Query 7: `productAdminService.getAllProducts()`
**Archivo:** `src/lib/services/productAdminService.ts:124`
```typescript
.eq('status', 'active')
.eq('approval_status', 'approved')
```
**Diagnóstico:** ✅ **CORRECTO** (después de fix)

---

## 📊 9. ESTADO REAL DE LA BASE DE DATOS (HIPÓTESIS)

Basado en el código y las migraciones, el estado probable es:

```sql
-- Distribución probable (hipótesis basada en el problema reportado):
-- Total productos: ~17
-- Productos con status='active' AND approval_status='pending': ~10
-- Productos con status='active' AND approval_status='approved': ~7
-- Productos con status='deleted': ~0 (recién implementado soft delete)
-- Productos con status IS NULL: ~0-2 (productos antiguos)
```

**Por qué la página pública muestra 7:**
- Usa `searchService.searchProducts()` que SÍ filtra por `approval_status = 'approved'`
- Solo muestra los 7 productos realmente aprobados

**Por qué el admin muestra 17:**
- Antes del fix, el contador "Activos" contaba todos los `status = 'active'` sin verificar `approval_status`
- Incluía los 10 productos pendientes + 7 aprobados = 17

---

## 🎯 10. CAUSAS RAÍZ EXACTAS

### Causa Raíz #1: Falta de Filtro `approval_status` en Consultas Públicas

**Problema:**
5 servicios/componentes que alimentan la página pública NO filtran por `approval_status = 'approved'`:
- `ProductsListClient.tsx`
- `productService.getProducts()`
- `productService.getFeaturedProducts()`
- `productService.getRecentProducts()`
- `storeService.getStoreProducts()`

**Impacto:**
- Productos pendientes pueden aparecer en la página pública
- Inconsistencia entre `searchService` (correcto) y otros servicios (incorrectos)

### Causa Raíz #2: Inclusión de Productos con `status IS NULL`

**Problema:**
`ProductsListClient.tsx` usa `.or('status.is.null,status.eq.active')` que incluye productos antiguos sin status definido.

**Impacto:**
- Productos antiguos sin `status` pueden aparecer
- Estos productos pueden no tener `approval_status` correcto

### Causa Raíz #3: Inconsistencia entre Servicios

**Problema:**
Diferentes servicios usan diferentes lógicas:
- `searchService`: ✅ Filtra por `status` Y `approval_status`
- `productService`: ❌ Solo filtra por `status`
- `ProductsListClient`: ❌ Solo filtra por `status` (o NULL)

**Impacto:**
- Dependiendo de qué servicio se use, se muestran diferentes productos
- La página pública puede mostrar productos diferentes según la ruta

---

## 📋 11. LISTA DE ERRORES ENCONTRADOS

### Error #1: `ProductsListClient.tsx` - Falta filtro `approval_status`
- **Archivo:** `src/components/ProductsListClient.tsx:204`
- **Severidad:** 🔴 CRÍTICO
- **Impacto:** Productos pendientes aparecen en página pública

### Error #2: `productService.getProducts()` - Falta filtro `approval_status`
- **Archivo:** `src/lib/services/productService.ts:396`
- **Severidad:** 🔴 CRÍTICO
- **Impacto:** Productos pendientes pueden retornarse

### Error #3: `productService.getFeaturedProducts()` - Falta filtro `approval_status`
- **Archivo:** `src/lib/services/productService.ts:535`
- **Severidad:** 🔴 CRÍTICO
- **Impacto:** Productos destacados pendientes pueden mostrarse

### Error #4: `productService.getRecentProducts()` - Falta filtro `approval_status`
- **Archivo:** `src/lib/services/productService.ts:559`
- **Severidad:** 🔴 CRÍTICO
- **Impacto:** Productos recientes pendientes pueden mostrarse

### Error #5: `storeService.getStoreProducts()` - Falta filtro `approval_status`
- **Archivo:** `src/lib/services/storeService.ts:154`
- **Severidad:** 🔴 CRÍTICO
- **Impacto:** Productos pendientes aparecen en páginas públicas de tiendas

### Error #6: `ProductsListClient.tsx` - Incluye `status IS NULL`
- **Archivo:** `src/components/ProductsListClient.tsx:204`
- **Severidad:** 🟡 MEDIO
- **Impacto:** Productos antiguos sin status pueden aparecer

---

## 📋 12. LISTA DE HIPÓTESIS DESCARTADAS

### ❌ Hipótesis Descartada #1: "El problema es el flujo de eliminación"
**Razón:** El flujo de eliminación está correcto (SOFT DELETE consistente)

### ❌ Hipótesis Descartada #2: "El problema es el contador del admin"
**Razón:** El contador del admin ya fue corregido en fixes anteriores

### ❌ Hipótesis Descartada #3: "El problema es que no se filtra `status = 'deleted'`"
**Razón:** La mayoría de consultas ya filtran `status != 'deleted'`

### ❌ Hipótesis Descartada #4: "El problema es que se usa HARD DELETE"
**Razón:** Todos los puntos de eliminación usan SOFT DELETE correctamente

---

## 📋 13. LISTA DE AJUSTES NECESARIOS

### Ajuste #1: Agregar filtro `approval_status` a `ProductsListClient.tsx`
**Archivo:** `src/components/ProductsListClient.tsx:204`
**Cambio:**
```typescript
// ❌ ANTES:
.or('status.is.null,status.eq.active')

// ✅ DESPUÉS:
.eq('status', 'active')
.eq('approval_status', 'approved')
.neq('status', 'deleted')
```

### Ajuste #2: Agregar filtro `approval_status` a `productService.getProducts()`
**Archivo:** `src/lib/services/productService.ts:396`
**Cambio:**
```typescript
// ❌ ANTES:
.eq('status', 'active')

// ✅ DESPUÉS:
.eq('status', 'active')
.eq('approval_status', 'approved')
.neq('status', 'deleted')
```

### Ajuste #3: Agregar filtro `approval_status` a `productService.getFeaturedProducts()`
**Archivo:** `src/lib/services/productService.ts:535`
**Cambio:**
```typescript
// ❌ ANTES:
.eq('is_featured', true)
.eq('status', 'active')

// ✅ DESPUÉS:
.eq('is_featured', true)
.eq('status', 'active')
.eq('approval_status', 'approved')
.neq('status', 'deleted')
```

### Ajuste #4: Agregar filtro `approval_status` a `productService.getRecentProducts()`
**Archivo:** `src/lib/services/productService.ts:559`
**Cambio:**
```typescript
// ❌ ANTES:
.eq('status', 'active')

// ✅ DESPUÉS:
.eq('status', 'active')
.eq('approval_status', 'approved')
.neq('status', 'deleted')
```

### Ajuste #5: Agregar filtro `approval_status` a `storeService.getStoreProducts()`
**Archivo:** `src/lib/services/storeService.ts:154`
**Cambio:**
```typescript
// ❌ ANTES:
query = query.eq('status', 'active');

// ✅ DESPUÉS:
query = query
  .eq('status', 'active')
  .eq('approval_status', 'approved')
  .neq('status', 'deleted');
```

### Ajuste #6: Mejorar validación en `app/products/[id]/page.tsx`
**Archivo:** `src/app/products/[id]/page.tsx:140`
**Cambio:**
```typescript
// ⚠️ ACTUAL: Filtra en código después de query
// ✅ MEJOR: Filtrar en la query directamente
const { data, error } = await supabase
  .from('products')
  .select(`...`)
  .eq('id', id)
  .eq('status', 'active')
  .eq('approval_status', 'approved')
  .neq('status', 'deleted')
  .single();
```

---

## 📊 14. DIAGRAMA DE FLUJO ACTUAL DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────┐
│                    CREACIÓN DE PRODUCTO                      │
│  status = 'active' (default)                                 │
│  approval_status = 'pending' (default)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              ADMIN APRUEBA/RECHAZA                            │
│  Si aprueba: approval_status = 'approved', status = 'active' │
│  Si rechaza: approval_status = 'rejected', status = 'paused'│
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌──────────────────┐         ┌──────────────────┐
│  VENDEDOR        │         │  ADMIN             │
│  ELIMINA         │         │  ELIMINA           │
│  (SOFT DELETE)   │         │  (SOFT DELETE)     │
└────────┬─────────┘         └────────┬───────────┘
         │                            │
         └────────────┬───────────────┘
                      │
                      ▼
         status = 'deleted'
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌──────────────────┐      ┌──────────────────┐
│  PÁGINA PÚBLICA  │      │  DASHBOARD        │
│                  │      │  VENDEDOR         │
│  ❌ PROBLEMA:     │      │  ✅ CORRECTO:     │
│  Algunas queries │      │  Muestra todos   │
│  NO filtran por  │      │  sus productos    │
│  approval_status │      │  (incluyendo      │
│                  │      │  pendientes)      │
└──────────────────┘      └──────────────────┘
```

---

## 🎯 15. RESUMEN EJECUTIVO

### Problema Principal
**5 servicios/componentes que alimentan la página pública NO filtran por `approval_status = 'approved'`**, permitiendo que productos pendientes aparezcan públicamente.

### Impacto
- **Página pública muestra productos pendientes** (inconsistente)
- **Diferentes rutas muestran diferentes productos** (inconsistencia entre servicios)
- **Productos antiguos con `status IS NULL` pueden aparecer**

### Solución Requerida
Agregar `.eq('approval_status', 'approved')` y `.neq('status', 'deleted')` a todas las consultas públicas.

### Archivos a Modificar
1. `src/components/ProductsListClient.tsx`
2. `src/lib/services/productService.ts` (3 métodos)
3. `src/lib/services/storeService.ts` (1 método)
4. `src/app/products/[id]/page.tsx` (mejora opcional)

### Estado del Sistema
- ✅ Flujo de eliminación: CORRECTO (SOFT DELETE)
- ✅ Admin: CORRECTO (después de fixes)
- ✅ Dashboard vendedor: CORRECTO
- ❌ Página pública: INCORRECTO (falta filtro `approval_status`)

---

## ✅ CONCLUSIÓN

**Diagnóstico Completo:** ✅

El sistema tiene **inconsistencias en las consultas públicas** que permiten que productos pendientes aparezcan en la página pública. El problema NO está en el flujo de eliminación ni en el admin (ya corregidos), sino en **5 servicios/componentes que NO filtran por `approval_status = 'approved'`**.

**Próximo Paso:** Aplicar los 6 ajustes identificados para unificar la lógica de filtrado en todas las consultas públicas.

















