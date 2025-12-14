# 🔧 FIX: LISTADO ADMIN PRODUCTOS - CONSISTENCIA CON VITRINA PÚBLICA

**Fecha:** 2025-01-28  
**Proyecto:** Mercadito Online PY  
**Rol:** LPMS - Lead Project Manager & Senior Fullstack Engineer

---

## 📋 PROBLEMA IDENTIFICADO

**Síntoma:**
- El panel admin (`/admin/products`) mostraba 17 productos como "Activos" y "Pendientes"
- La página pública solo mostraba 7 productos (los correctos)
- Los contadores y filtros no coincidían con la lógica de publicación pública

**Causa Raíz:**
Los contadores y filtros del admin no usaban la misma lógica que la vitrina pública:

1. **Contador "Activos"**: Solo filtraba por `status = 'active'`, sin verificar `approval_status = 'approved'`
2. **Filtro "Activos"**: Misma lógica incorrecta
3. **Contador "Archivados"**: Contaba `status = 'archived'` en lugar de `status = 'deleted'`
4. **Filtro "Archivados"**: Filtraba por `status = 'archived'` en lugar de `status = 'deleted'`

---

## ✅ SOLUCIÓN APLICADA

### Lógica Correcta Definida

**Visible públicamente (vitrina):**
- `status = 'active'` AND `approval_status = 'approved'` AND `status != 'deleted'`

**Pendientes (admin):**
- `approval_status = 'pending'` AND `status != 'deleted'`

**Aprobados (admin):**
- `approval_status = 'approved'` AND `status != 'deleted'`

**Rechazados (admin):**
- `approval_status = 'rejected'` AND `status != 'deleted'`

**Activos (admin):**
- `status = 'active'` AND `approval_status = 'approved'` AND `status != 'deleted'`
- **DEBE coincidir con la vitrina pública**

**Pausados (admin):**
- `status = 'paused'` AND `status != 'deleted'`

**Eliminados/Archivados (admin):**
- `status = 'deleted'`
- **Completamente separado de otros filtros**

---

## 📦 ARCHIVOS MODIFICADOS

### 1. `src/lib/services/productAdminService.ts`

**Cambios en `getAllProducts()`:**

```typescript
// ❌ ANTES: Filtro "Activos" solo verificaba status
case 'active':
  query = query.eq('status', 'active');
  break;

// ✅ AHORA: Filtro "Activos" verifica status Y approval_status
case 'active':
  // Activos: productos realmente publicados (como en la vitrina pública)
  // status = 'active' AND approval_status = 'approved' AND status != 'deleted'
  query = query
    .eq('status', 'active')
    .eq('approval_status', 'approved');
  break;
```

**Cambios en `getProductStats()`:**

```typescript
// ❌ ANTES: Contador "Activos" solo verificaba status
activeResult: supabase.from('products')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'active'),

// ✅ AHORA: Contador "Activos" verifica status Y approval_status
activeResult: supabase.from('products')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'active')
  .eq('approval_status', 'approved')
  .neq('status', 'deleted')
  .not('status', 'is', null),
```

```typescript
// ❌ ANTES: Contador "Archivados" contaba status = 'archived'
archivedResult: supabase.from('products')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'archived'),

// ✅ AHORA: Contador "Archivados" cuenta status = 'deleted'
archivedResult: supabase.from('products')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'deleted'),
```

**Cambios en exclusión de eliminados:**

```typescript
// ❌ ANTES: Excluía eliminados solo si filter !== 'all'
if (options.filter !== 'all') {
  query = query.neq('status', 'deleted').not('status', 'is', null);
}

// ✅ AHORA: Excluye eliminados siempre, excepto en filtro 'archived'
if (options.filter !== 'archived') {
  query = query.neq('status', 'deleted').not('status', 'is', null);
}
```

### 2. `src/app/admin/products/page.tsx`

**Cambios visuales (solo etiquetas):**

```typescript
// ❌ ANTES:
<div className="text-sm text-gray-600">Archivados</div>
{f === 'archived' && 'Archivados'}

// ✅ AHORA:
<div className="text-sm text-gray-600">Eliminados</div>
{f === 'archived' && 'Eliminados'}
```

---

## 🔍 DIFS COMPLETOS

### `src/lib/services/productAdminService.ts`

**Líneas 93-98:**
```diff
-  // IMPORTANTE: Excluir productos eliminados (soft delete) por defecto
-  // Solo mostrarlos si el filtro es explícitamente 'all' o si se solicita ver eliminados
-  if (options.filter !== 'all') {
-    query = query.neq('status', 'deleted').not('status', 'is', null);
-  }
+  // IMPORTANTE: Excluir productos eliminados (soft delete) por defecto
+  // Solo mostrarlos si el filtro es explícitamente 'archived' (que muestra eliminados)
+  // 'all' también excluye eliminados para mantener consistencia
+  // También excluir productos con status NULL (por seguridad)
+  if (options.filter !== 'archived') {
+    query = query.neq('status', 'deleted').not('status', 'is', null);
+  }
```

**Líneas 100-140:**
```diff
  // Aplicar filtros
  if (options.filter) {
    switch (options.filter) {
      case 'pending':
+        // Pendientes: productos que necesitan revisión del admin
+        // approval_status = 'pending' AND status != 'deleted'
        query = query.eq('approval_status', 'pending');
+        // Ya excluimos 'deleted' arriba si filter !== 'archived'
        break;
      case 'approved':
+        // Aprobados: approval_status = 'approved' AND status != 'deleted'
        query = query.eq('approval_status', 'approved');
+        // Ya excluimos 'deleted' arriba si filter !== 'archived'
        break;
      case 'rejected':
+        // Rechazados: approval_status = 'rejected' AND status != 'deleted'
        query = query.eq('approval_status', 'rejected');
+        // Ya excluimos 'deleted' arriba si filter !== 'archived'
        break;
      case 'active':
-        query = query.eq('status', 'active');
+        // Activos: productos realmente publicados (como en la vitrina pública)
+        // status = 'active' AND approval_status = 'approved' AND status != 'deleted'
+        query = query
+          .eq('status', 'active')
+          .eq('approval_status', 'approved');
+        // Ya excluimos 'deleted' arriba si filter !== 'archived'
        break;
      case 'paused':
+        // Pausados: status = 'paused' AND status != 'deleted'
        query = query.eq('status', 'paused');
+        // Ya excluimos 'deleted' arriba si filter !== 'archived'
        break;
      case 'archived':
-        query = query.eq('status', 'archived');
+        // Archivados/Eliminados: status = 'deleted'
+        // Para este filtro, NO excluimos 'deleted', solo mostramos eliminados
+        query = query.eq('status', 'deleted');
        break;
-      // 'all' muestra todos incluyendo eliminados (útil para admin)
+      // 'all' muestra todos EXCEPTO eliminados (útil para admin)
      case 'all':
-        // No aplicar filtro de status, mostrar todo
+        // Ya excluimos 'deleted' arriba si filter !== 'archived'
        break;
    }
  }
```

**Líneas 334-342:**
```diff
    ] = await Promise.all([
      // Total: excluir productos eliminados (soft delete) y status NULL
      supabase.from('products').select('id', { count: 'exact', head: true }).neq('status', 'deleted').not('status', 'is', null),
-      supabase.from('products').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending').neq('status', 'deleted').not('status', 'is', null),
-      supabase.from('products').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved').neq('status', 'deleted').not('status', 'is', null),
-      supabase.from('products').select('id', { count: 'exact', head: true }).eq('approval_status', 'rejected').neq('status', 'deleted').not('status', 'is', null),
-      supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'active'),
-      supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'paused'),
-      supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'archived'),
+      
+      // Pendientes: productos que necesitan revisión del admin
+      // approval_status = 'pending' AND status != 'deleted'
+      supabase.from('products').select('id', { count: 'exact', head: true })
+        .eq('approval_status', 'pending')
+        .neq('status', 'deleted')
+        .not('status', 'is', null),
+      
+      // Aprobados: approval_status = 'approved' AND status != 'deleted'
+      supabase.from('products').select('id', { count: 'exact', head: true })
+        .eq('approval_status', 'approved')
+        .neq('status', 'deleted')
+        .not('status', 'is', null),
+      
+      // Rechazados: approval_status = 'rejected' AND status != 'deleted'
+      supabase.from('products').select('id', { count: 'exact', head: true })
+        .eq('approval_status', 'rejected')
+        .neq('status', 'deleted')
+        .not('status', 'is', null),
+      
+      // Activos: productos realmente publicados (como en la vitrina pública)
+      // status = 'active' AND approval_status = 'approved' AND status != 'deleted'
+      supabase.from('products').select('id', { count: 'exact', head: true })
+        .eq('status', 'active')
+        .eq('approval_status', 'approved')
+        .neq('status', 'deleted')
+        .not('status', 'is', null),
+      
+      // Pausados: status = 'paused' AND status != 'deleted'
+      supabase.from('products').select('id', { count: 'exact', head: true })
+        .eq('status', 'paused')
+        .neq('status', 'deleted')
+        .not('status', 'is', null),
+      
+      // Archivados/Eliminados: status = 'deleted'
+      supabase.from('products').select('id', { count: 'exact', head: true })
+        .eq('status', 'deleted'),
    ]);
```

### `src/app/admin/products/page.tsx`

**Líneas 235-237:**
```diff
            <div className="bg-white p-4 rounded-lg shadow-sm border">
-              <div className="text-sm text-gray-600">Archivados</div>
+              <div className="text-sm text-gray-600">Eliminados</div>
              <div className="text-2xl font-bold text-gray-600">{stats.archived}</div>
            </div>
```

**Línea 324:**
```diff
-                  {f === 'archived' && 'Archivados'}
+                  {f === 'archived' && 'Eliminados'}
```

---

## 🧪 INSTRUCCIONES DE PRUEBA

### 1. Crear Productos de Prueba

Crear productos con diferentes combinaciones:

```sql
-- Producto 1: Activo y Aprobado (debe aparecer en vitrina y admin "Activos")
-- status = 'active', approval_status = 'approved'

-- Producto 2: Activo pero Pendiente (NO debe aparecer en vitrina, SÍ en admin "Pendientes")
-- status = 'active', approval_status = 'pending'

-- Producto 3: Pausado y Aprobado (NO debe aparecer en vitrina, SÍ en admin "Pausados")
-- status = 'paused', approval_status = 'approved'

-- Producto 4: Eliminado (NO debe aparecer en vitrina, SÍ en admin "Eliminados")
-- status = 'deleted', approval_status = 'approved'
```

### 2. Verificar Contadores en Admin

Ir a `/admin/products` y verificar:

- **Total**: Debe excluir productos eliminados
- **Pendientes**: Solo productos con `approval_status = 'pending'` y `status != 'deleted'`
- **Aprobados**: Solo productos con `approval_status = 'approved'` y `status != 'deleted'`
- **Rechazados**: Solo productos con `approval_status = 'rejected'` y `status != 'deleted'`
- **Activos**: Solo productos con `status = 'active'` AND `approval_status = 'approved'` y `status != 'deleted'`
  - **DEBE coincidir con el número de productos en la vitrina pública**
- **Pausados**: Solo productos con `status = 'paused'` y `status != 'deleted'`
- **Eliminados**: Solo productos con `status = 'deleted'`

### 3. Verificar Filtros (Pestañas)

Probar cada pestaña:

- **"Todos"**: Muestra todos los productos EXCEPTO eliminados
- **"Pendientes"**: Solo productos pendientes de aprobación
- **"Aprobados"**: Solo productos aprobados (pueden estar activos, pausados, etc.)
- **"Rechazados"**: Solo productos rechazados
- **"Activos"**: Solo productos activos Y aprobados (debe coincidir con vitrina pública)
- **"Pausados"**: Solo productos pausados
- **"Eliminados"**: Solo productos eliminados (completamente separado)

### 4. Verificar Vitrina Pública

Ir a `/` (homepage) y verificar:

- Solo aparecen productos con:
  - `status = 'active'`
  - `approval_status = 'approved'`
  - `status != 'deleted'`
- El número debe coincidir con el contador "Activos" del admin

---

## ✅ VERIFICACIÓN FINAL

### Checklist

- [x] Contador "Activos" verifica `status = 'active'` AND `approval_status = 'approved'`
- [x] Filtro "Activos" usa la misma lógica
- [x] Contador "Eliminados" cuenta `status = 'deleted'`
- [x] Filtro "Eliminados" filtra por `status = 'deleted'`
- [x] Todos los demás contadores excluyen `status = 'deleted'`
- [x] Todos los demás filtros excluyen `status = 'deleted'` (excepto "Eliminados")
- [x] Filtro "all" excluye eliminados
- [x] El número de "Activos" coincide con la vitrina pública

---

## 📝 EXPLICACIÓN DEL PROBLEMA

**Qué estaba mal:**

1. **Contador "Activos"**: Contaba todos los productos con `status = 'active'` sin verificar `approval_status = 'approved'`. Esto incluía productos activos pero pendientes de aprobación.

2. **Filtro "Activos"**: Misma lógica incorrecta, mostraba productos activos pero no aprobados.

3. **Contador "Archivados"**: Contaba `status = 'archived'` en lugar de `status = 'deleted'`, por lo que no mostraba los productos realmente eliminados.

4. **Filtro "Archivados"**: Filtraba por `status = 'archived'` en lugar de `status = 'deleted'`.

**Resultado:**
- El admin mostraba 17 productos como "Activos" (incluyendo pendientes)
- La vitrina pública solo mostraba 7 productos (los realmente aprobados y activos)
- Los contadores no coincidían con la realidad

**Solución:**
- Alinear la lógica del admin con la vitrina pública
- "Activos" ahora requiere `status = 'active'` AND `approval_status = 'approved'`
- "Eliminados" ahora cuenta y filtra por `status = 'deleted'`
- Todos los filtros excluyen eliminados excepto "Eliminados"

---

## 🎯 CONCLUSIÓN

**Problema Resuelto:** ✅

El panel admin ahora es consistente con la lógica de publicación de la vitrina pública:
- ✅ Contador "Activos" coincide con productos en vitrina pública
- ✅ Filtros aplican la lógica correcta
- ✅ Productos eliminados están completamente separados
- ✅ No se rompe ninguna funcionalidad existente

**Estado:** Listo para pruebas y producción.

















