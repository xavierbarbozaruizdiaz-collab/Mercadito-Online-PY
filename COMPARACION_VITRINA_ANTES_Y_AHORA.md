# 📊 COMPARACIÓN: VITRINA ANTES vs AHORA
**Análisis de la refactorización del sistema de catálogo**

---

## 🔴 SISTEMA ANTERIOR (ANTES)

### Campo Utilizado
```sql
-- Campo en products
in_showcase BOOLEAN
showcase_position INTEGER
```

### Cómo Funcionaba

#### 1. **Query Directa en el Componente**
```typescript
// Código anterior en /vitrina/page.tsx
const { data, error } = await supabase
  .from('products')
  .select(`
    id, title, description, price, compare_price, cover_url,
    store_id, showcase_position,
    stores!inner (id, name, slug, logo_url)
  `)
  .eq('in_showcase', true)        // ← Filtro simple booleano
  .eq('status', 'active')
  .order('showcase_position', { ascending: true })  // ← Orden fijo por posición
  .order('created_at', { ascending: false });
```

#### 2. **Características del Sistema Anterior**

✅ **Ventajas:**
- Simple y directo
- Orden predecible (por `showcase_position`)

❌ **Limitaciones:**
- **Sin control de vigencia**: Los productos aparecían siempre que `in_showcase = true`
- **Sin prioridad**: Solo orden por posición manual
- **Sin reparto por tienda**: Podía haber muchos productos de la misma tienda
- **Sin aleatoriedad**: Siempre se mostraban en el mismo orden
- **Sin límite por tienda**: Una tienda podía tener todos los productos destacados
- **Query en el componente**: Lógica de negocio mezclada con UI

#### 3. **Gestión desde Dashboard**
```typescript
// En dashboard/edit-product/[id]/page.tsx
// Toggle simple de in_showcase
updateData.in_showcase = !currentStatus;
updateData.showcase_position = !currentStatus ? null : undefined;
```

**Problemas:**
- No había validación de límite por tienda
- No había control de fechas
- No había prioridad configurable

---

## 🟢 SISTEMA NUEVO (AHORA)

### Campos Utilizados
```sql
-- Nuevos campos en products
is_in_global_catalog BOOLEAN
catalog_valid_from TIMESTAMPTZ
catalog_valid_until TIMESTAMPTZ
catalog_priority INTEGER
exclude_from_store_catalog BOOLEAN
```

### Cómo Funciona Ahora

#### 1. **Servicio Centralizado**
```typescript
// Nuevo servicio: globalCatalogService.ts
export async function getGlobalCatalogProductsForWeb(options) {
  // Lógica compleja centralizada y reutilizable
}
```

#### 2. **Query Mejorada con Múltiples Filtros**
```typescript
// En globalCatalogService.ts
let query = supabase
  .from('products')
  .select(`
    id, title, description, price, compare_price, cover_url,
    is_in_global_catalog,
    catalog_valid_from,      // ← Nuevo: control de vigencia
    catalog_valid_until,      // ← Nuevo: control de vigencia
    catalog_priority,         // ← Nuevo: prioridad
    exclude_from_store_catalog,
    stores (id, name, slug, logo_url, is_active),
    categories (id, name, slug)
  `)
  .eq('is_in_global_catalog', true)
  .eq('status', 'active')
  .eq('exclude_from_store_catalog', false)
  .order('catalog_priority', { ascending: false })  // ← Orden por prioridad
  .order('created_at', { ascending: false });
```

#### 3. **Validación de Vigencia en Memoria**
```typescript
// Filtrado inteligente por fechas
const validProducts = data.filter((product) => {
  // Validar catalog_valid_from
  if (product.catalog_valid_from) {
    const validFrom = new Date(product.catalog_valid_from);
    if (validFrom > nowDate) return false; // Aún no es válido
  }

  // Validar catalog_valid_until
  if (product.catalog_valid_until) {
    const validUntil = new Date(product.catalog_valid_until);
    if (validUntil < nowDate) return false; // Ya expiró
  }

  return true;
});
```

#### 4. **Reparto Inteligente por Tienda**
```typescript
// Distribuye productos limitando a 2 por tienda por página
function distributeByStore(products, maxProducts) {
  const storeCounts = new Map();
  const maxPerStore = 2; // ← Límite por tienda

  for (const product of products) {
    const storeId = product.store_id;
    const currentCount = storeCounts.get(storeId) || 0;
    
    if (currentCount < maxPerStore) {
      distributed.push(product);
      storeCounts.set(storeId, currentCount + 1);
    }
  }
}
```

#### 5. **Aleatoriedad Controlada**
```typescript
// Shuffle ligero para variar resultados
const shuffled = shuffleArray([...validProducts]);
// Mantiene orden por prioridad pero añade variación
```

#### 6. **Uso en la Página**
```typescript
// En /vitrina/page.tsx (refactorizado)
async function loadCatalogProducts() {
  // Usa el servicio centralizado
  const result = await getGlobalCatalogProductsForWeb({
    page,
    pageSize: 24,
  });
  
  // Transforma y muestra productos
  setProducts(transformedProducts);
  setHasMore(result.hasMore);
}
```

---

## 📊 TABLA COMPARATIVA

| Característica | Sistema Anterior | Sistema Nuevo |
|----------------|------------------|---------------|
| **Campo principal** | `in_showcase` (BOOLEAN) | `is_in_global_catalog` (BOOLEAN) |
| **Control de vigencia** | ❌ No | ✅ Sí (`catalog_valid_from`, `catalog_valid_until`) |
| **Prioridad** | ❌ Solo `showcase_position` (manual) | ✅ `catalog_priority` (0-10, configurable) |
| **Reparto por tienda** | ❌ No | ✅ Sí (máx 2 productos por tienda por página) |
| **Aleatoriedad** | ❌ No (orden fijo) | ✅ Sí (shuffle dentro de misma prioridad) |
| **Límite por tienda** | ❌ No | ✅ Sí (máx 2 productos activos por tienda) |
| **Lógica de negocio** | ❌ En el componente | ✅ En servicio reutilizable |
| **Validación de fechas** | ❌ No | ✅ Sí (automática) |
| **Filtro de tiendas activas** | ⚠️ Parcial | ✅ Completo |
| **Paginación** | ⚠️ Básica | ✅ Completa con `hasMore` |
| **Exclusión de productos** | ❌ No | ✅ Sí (`exclude_from_store_catalog`) |

---

## 🔄 FLUJO COMPARATIVO

### ANTES: Flujo Simple
```
Usuario → /vitrina
  ↓
Query directa: in_showcase = true
  ↓
Orden por showcase_position
  ↓
Mostrar productos (siempre igual)
```

### AHORA: Flujo Inteligente
```
Usuario → /vitrina
  ↓
getGlobalCatalogProductsForWeb()
  ↓
Filtros múltiples:
  - is_in_global_catalog = true
  - status = 'active'
  - exclude_from_store_catalog = false
  - stores.is_active = true
  ↓
Validar vigencia (fechas)
  ↓
Ordenar por catalog_priority (desc)
  ↓
Shuffle para aleatoriedad
  ↓
Repartir por tienda (máx 2 por tienda)
  ↓
Paginación inteligente
  ↓
Mostrar productos (variados y balanceados)
```

---

## 🎯 MEJORAS CLAVE

### 1. **Control de Vigencia Temporal**
**Antes:** Los productos aparecían indefinidamente una vez marcados.

**Ahora:** 
- Puedes definir cuándo empieza a aparecer (`catalog_valid_from`)
- Puedes definir cuándo deja de aparecer (`catalog_valid_until`)
- Si no defines fechas, aparece siempre (comportamiento flexible)

**Ejemplo:**
```typescript
// Producto solo visible del 1 al 15 de diciembre
catalog_valid_from: '2025-12-01T00:00:00Z'
catalog_valid_until: '2025-12-15T23:59:59Z'
```

### 2. **Sistema de Prioridad**
**Antes:** Solo `showcase_position` (orden manual, fijo).

**Ahora:**
- `catalog_priority` (0-10)
- Mayor número = mayor prioridad
- Se puede combinar con membresía, calidad, etc.
- Permite ordenamiento automático inteligente

**Ejemplo:**
```typescript
// Producto premium con prioridad alta
catalog_priority: 8

// Producto normal con prioridad baja
catalog_priority: 1
```

### 3. **Reparto Equitativo por Tienda**
**Antes:** Una tienda podía tener todos los productos destacados.

**Ahora:**
- Máximo 2 productos por tienda por página
- Mejor distribución de visibilidad
- Más oportunidades para todas las tiendas

**Ejemplo:**
```
Página 1:
- Tienda A: Producto 1, Producto 2
- Tienda B: Producto 3, Producto 4
- Tienda C: Producto 5
- (No más de 2 por tienda)
```

### 4. **Aleatoriedad Controlada**
**Antes:** Siempre se mostraban en el mismo orden.

**Ahora:**
- Shuffle ligero dentro de la misma prioridad
- Cada visita puede ver productos diferentes
- Mantiene orden por prioridad (productos importantes primero)

**Ejemplo:**
```
Prioridad 8: [Producto A, Producto B, Producto C]
  ↓ (shuffle)
Prioridad 8: [Producto B, Producto C, Producto A]
  ↓
Prioridad 5: [Producto D, Producto E]
```

### 5. **Límite por Tienda**
**Antes:** No había límite, una tienda podía destacar todos sus productos.

**Ahora:**
- Máximo 2 productos activos por tienda
- Validación en cliente y servidor
- Mensaje claro cuando se alcanza el límite

### 6. **Servicio Reutilizable**
**Antes:** Lógica duplicada en componentes.

**Ahora:**
- `getGlobalCatalogProductsForWeb()` centralizado
- Reutilizable en cualquier parte del código
- Fácil de testear y mantener
- Consistencia garantizada

---

## 📝 EJEMPLOS DE USO

### Ejemplo 1: Producto con Oferta Temporal
```typescript
// Vendedor configura:
is_in_global_catalog: true
catalog_valid_from: '2025-12-01T00:00:00Z'  // Empieza 1 de diciembre
catalog_valid_until: '2025-12-31T23:59:59Z'  // Termina 31 de diciembre
catalog_priority: 5

// Resultado:
// - Aparece solo en diciembre
// - Prioridad media
// - Se reparte equitativamente con otras tiendas
```

### Ejemplo 2: Producto Premium Siempre Visible
```typescript
// Vendedor configura:
is_in_global_catalog: true
catalog_valid_from: null  // Sin fecha de inicio = siempre
catalog_valid_until: null  // Sin fecha de fin = siempre
catalog_priority: 10  // Máxima prioridad

// Resultado:
// - Siempre visible
// - Aparece primero (prioridad alta)
// - Máximo 2 productos activos por tienda
```

### Ejemplo 3: Producto Excluido de Catálogos de Tienda
```typescript
// Vendedor configura:
is_in_global_catalog: true
exclude_from_store_catalog: true  // Solo en catálogo global

// Resultado:
// - Aparece en catálogo global (/vitrina)
// - NO aparece en catálogos individuales de tienda
```

---

## 🚀 BENEFICIOS DEL NUEVO SISTEMA

### Para Vendedores:
- ✅ Control de fechas (ofertas temporales)
- ✅ Prioridad configurable
- ✅ Límite justo (2 productos por tienda)
- ✅ Panel de gestión dedicado

### Para Usuarios:
- ✅ Más variedad (reparto por tienda)
- ✅ Contenido fresco (aleatoriedad)
- ✅ Productos relevantes (prioridad)
- ✅ Ofertas temporales visibles

### Para el Sistema:
- ✅ Lógica centralizada y reutilizable
- ✅ Fácil de mantener y extender
- ✅ Mejor performance (índices optimizados)
- ✅ Escalable

---

## ⚠️ MIGRACIÓN NECESARIA

**Importante:** Para que el nuevo sistema funcione, se deben aplicar las migraciones:

1. `20251117000000_add_catalog_fields_to_products.sql`
   - Agrega los nuevos campos a `products`

2. `20251117001000_create_store_ad_catalogs_tables.sql`
   - Crea tablas para catálogos por tienda (futuro)

**Nota:** El campo `in_showcase` puede mantenerse para compatibilidad, pero el nuevo sistema usa `is_in_global_catalog`.

---

## 📊 RESUMEN EJECUTIVO

| Aspecto | Cambio |
|---------|--------|
| **Complejidad** | Simple → Inteligente |
| **Control** | Básico → Avanzado |
| **Flexibilidad** | Limitada → Alta |
| **Equidad** | Sin límite → Con límite |
| **Experiencia** | Estática → Dinámica |
| **Mantenibilidad** | Dispersa → Centralizada |

---

**El nuevo sistema es más robusto, flexible y justo, manteniendo la simplicidad de uso para los vendedores.**



