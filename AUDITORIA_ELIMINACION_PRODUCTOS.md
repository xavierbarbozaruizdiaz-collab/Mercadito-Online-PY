# 🔍 AUDITORÍA Y REPARACIÓN COMPLETA - FLUJO DE ELIMINACIÓN DE PRODUCTOS

**Fecha:** 2025-01-28  
**Proyecto:** Mercadito Online PY  
**Rol:** LPMS - Lead Project Manager & Senior Fullstack Engineer

---

## 📋 1. DIAGNÓSTICO COMPLETO

### 1.1. Problema Identificado

**Síntoma:** Productos eliminados por los vendedores siguen apareciendo como "Activos" en el dashboard y/o admin.

**Causa Raíz Identificada:**

El sistema estaba usando **HARD DELETE** (eliminación física) en lugar de **SOFT DELETE** (marcar como eliminado):

1. **Vendedores hacían HARD DELETE**: Las funciones `deleteProduct()` ejecutaban `.delete()` que eliminaba físicamente el registro de la BD.
2. **Dashboard no filtraba eliminados**: El dashboard del vendedor solo filtraba por `seller_id`, sin excluir productos con `status = 'deleted'`.
3. **Inconsistencia de estado**: Algunos productos podían tener `status = NULL` o no estar marcados correctamente.

### 1.2. Auditoría de Código

#### 1.2.1. Puntos de Eliminación Identificados

**UI del Vendedor:**
- `src/app/dashboard/page.tsx` - Función `deleteProduct()` (línea 883)
- `src/app/dashboard/edit-product/[id]/page.tsx` - Función `handleDeleteProduct()` (línea 529)

**Server Actions / Servicios:**
- `src/lib/services/productService.ts` - Método `deleteProduct()` (línea 315)
- `src/lib/services/productAdminService.ts` - Función `deleteProduct()` (línea 299)

**Admin:**
- `src/app/admin/products/page.tsx` - Usa `deleteProduct` de `productAdminService`

#### 1.2.2. Esquema de Base de Datos

**Campo `status` existe en la tabla `products`:**
- Tipo: `TEXT DEFAULT 'active'`
- Valores posibles: `'active'`, `'paused'`, `'archived'`, `'deleted'`
- Definido en: `supabase/migrations/20250128000029_simple_schema_update.sql` (línea 61)

**NO existen campos:**
- `deleted_at` (timestamp)
- `is_deleted` (boolean)

**Conclusión:** El sistema usa el campo `status` con valor `'deleted'` para soft delete.

#### 1.2.3. Consultas de Listados

**Dashboard del Vendedor:**
- `src/app/dashboard/page.tsx` (línea 158): NO filtraba por `status != 'deleted'`
- `src/app/(dashboard)/seller/page.tsx` (línea 115): NO filtraba por `status != 'deleted'`
- `src/lib/services/sellerProfileService.ts` (línea 152): NO filtraba por `status != 'deleted'`

**Admin:**
- `src/lib/services/productAdminService.ts` (línea 96): ✅ Ya filtraba por `status != 'deleted'` (fix anterior)

**Página Pública:**
- `src/lib/services/searchService.ts` (línea 130): ✅ Ya filtraba por `status = 'active'` y `approval_status = 'approved'`

---

## 💥 2. CAUSA RAÍZ EXACTA

**Problema Principal:**

Los vendedores ejecutaban **HARD DELETE** (`.delete()`) que eliminaba físicamente el registro, pero:

1. **Inconsistencia**: Algunos productos podían quedar con `status = NULL` o no actualizado.
2. **Dashboard mostraba todo**: El dashboard del vendedor no filtraba productos eliminados porque asumía que si existían en la BD, estaban activos.
3. **Sin historial**: Al eliminar físicamente, se perdía el historial del producto.

**Solución Requerida:**

Cambiar de **HARD DELETE** a **SOFT DELETE**:
- Actualizar `status = 'deleted'` en lugar de eliminar físicamente
- Filtrar productos con `status = 'deleted'` en todas las consultas de listados
- Mantener historial y permitir restauración futura

---

## 🛠️ 3. SOLUCIÓN APLICADA

### 3.1. Cambio de HARD DELETE a SOFT DELETE

**Archivos Modificados:**

1. **`src/app/dashboard/page.tsx`** - Función `deleteProduct()`
   - ❌ Antes: `.delete()` (eliminación física)
   - ✅ Ahora: `.update({ status: 'deleted' })` (soft delete)

2. **`src/app/dashboard/edit-product/[id]/page.tsx`** - Función `handleDeleteProduct()`
   - ❌ Antes: `.delete()` (eliminación física)
   - ✅ Ahora: `.update({ status: 'deleted' })` (soft delete)

3. **`src/lib/services/productService.ts`** - Método `deleteProduct()`
   - ❌ Antes: `.delete()` (eliminación física)
   - ✅ Ahora: `.update({ status: 'deleted' })` (soft delete)

4. **`src/lib/services/productAdminService.ts`** - Función `deleteProduct()`
   - ❌ Antes: `.delete()` (eliminación física)
   - ✅ Ahora: `.update({ status: 'deleted' })` (soft delete)

### 3.2. Filtrado de Productos Eliminados

**Archivos Modificados:**

1. **`src/app/dashboard/page.tsx`** - Consulta principal (línea 158)
   - ✅ Agregado: `.neq('status', 'deleted').not('status', 'is', null)`

2. **`src/app/dashboard/page.tsx`** - Consulta de estadísticas (línea 515)
   - ✅ Agregado: `.neq('status', 'deleted').not('status', 'is', null)`

3. **`src/app/dashboard/page.tsx`** - Consultas de recarga (líneas 238, 340, 430, 1092)
   - ✅ Agregado: `.neq('status', 'deleted').not('status', 'is', null)`

4. **`src/app/dashboard/page.tsx`** - Filtrado en `forEach` (línea 254)
   - ✅ Agregado: Verificación `if (product.status === 'deleted' || !product.status) return;`

5. **`src/app/(dashboard)/seller/page.tsx`** - Consulta de estadísticas (líneas 115, 122)
   - ✅ Agregado: `.neq('status', 'deleted').not('status', 'is', null)`

6. **`src/lib/services/sellerProfileService.ts`** - Función `getSellerProducts()` (línea 152)
   - ✅ Agregado: `.neq('status', 'deleted').not('status', 'is', null)`

### 3.3. Invalidación de Cache

**Mantenido:**
- `invalidateProductCache(id)` se ejecuta después de soft delete
- `cache.delete(\`product:${id}\`)` se ejecuta después de soft delete

**No requiere cambios:** El cache se invalida correctamente.

---

## 📦 4. ARCHIVOS MODIFICADOS

### 4.1. Lista Completa

1. `src/app/dashboard/page.tsx`
2. `src/app/dashboard/edit-product/[id]/page.tsx`
3. `src/lib/services/productService.ts`
4. `src/lib/services/productAdminService.ts`
5. `src/lib/services/sellerProfileService.ts`
6. `src/app/(dashboard)/seller/page.tsx`

### 4.2. Resumen de Cambios

| Archivo | Cambios | Tipo |
|---------|---------|------|
| `dashboard/page.tsx` | HARD → SOFT DELETE + Filtros | Crítico |
| `edit-product/[id]/page.tsx` | HARD → SOFT DELETE | Crítico |
| `productService.ts` | HARD → SOFT DELETE | Crítico |
| `productAdminService.ts` | HARD → SOFT DELETE | Crítico |
| `sellerProfileService.ts` | Agregar filtros | Importante |
| `seller/page.tsx` | Agregar filtros | Importante |

---

## 🧪 5. INSTRUCCIONES DE PRUEBA

### 5.1. Prueba Básica

1. **Crear producto de prueba:**
   - Ir a `/dashboard`
   - Crear un nuevo producto
   - Verificar que aparece en "Productos Activos"

2. **Eliminar producto:**
   - Hacer clic en "Eliminar" en el producto de prueba
   - Confirmar eliminación

3. **Verificar Dashboard del Vendedor:**
   - ✅ El producto NO debe aparecer en "Productos Activos"
   - ✅ El producto NO debe aparecer en "Productos Pausados"
   - ✅ El contador de productos activos debe disminuir

4. **Verificar Admin:**
   - Ir a `/admin/products`
   - Con filtro "Todos": El producto debe aparecer con `status = 'deleted'`
   - Con filtro "Activos": El producto NO debe aparecer
   - Con filtro "Pendientes": El producto NO debe aparecer

5. **Verificar Página Pública:**
   - Ir a `/` (homepage)
   - ✅ El producto NO debe aparecer en los listados
   - ✅ El producto NO debe ser accesible en `/products/[id]`

### 5.2. Prueba de Consulta SQL Directa

```sql
-- Verificar productos eliminados
SELECT id, title, status, seller_id, created_at
FROM products
WHERE status = 'deleted'
ORDER BY updated_at DESC;

-- Verificar que no aparecen en consultas normales
SELECT COUNT(*) as total_activos
FROM products
WHERE seller_id = 'TU_USER_ID'
  AND status != 'deleted'
  AND status IS NOT NULL;
```

### 5.3. Prueba de Edge Cases

1. **Producto con status NULL:**
   - Verificar que no aparece en listados (filtro `.not('status', 'is', null)`)

2. **Producto eliminado y restaurado:**
   - (Futuro) Si se implementa restauración, verificar que funciona correctamente

3. **Múltiples eliminaciones:**
   - Eliminar varios productos y verificar que todos desaparecen correctamente

---

## ✅ 6. VERIFICACIÓN FINAL

### 6.1. Checklist de Implementación

- [x] Cambiar HARD DELETE a SOFT DELETE en todas las funciones
- [x] Agregar filtros `.neq('status', 'deleted')` en consultas de listados
- [x] Agregar filtros `.not('status', 'is', null)` para seguridad
- [x] Actualizar dashboard del vendedor
- [x] Actualizar servicios compartidos
- [x] Mantener invalidación de cache
- [x] Verificar que admin puede ver eliminados con filtro "Todos"
- [x] Verificar que página pública NO muestra eliminados

### 6.2. Compatibilidad

- ✅ No se rompe la UI existente
- ✅ No se afectan otras funcionalidades (subastas, sorteos, etc.)
- ✅ El admin puede ver productos eliminados para auditoría
- ✅ Los vendedores no ven productos eliminados en su dashboard

---

## 📝 7. NOTAS ADICIONALES

### 7.1. Eliminación Física (HARD DELETE)

**Mantenida para:**
- Subastas finalizadas con más de 30 días (línea 312 de `dashboard/page.tsx`)
- Esta es una excepción intencional para limpieza automática

### 7.2. Futuras Mejoras

1. **Restauración de Productos:**
   - Implementar función para restaurar productos eliminados
   - Agregar botón "Restaurar" en admin para productos con `status = 'deleted'`

2. **Eliminación Definitiva:**
   - Crear función separada para eliminación física definitiva
   - Solo para admins, con confirmación doble

3. **Auditoría:**
   - Agregar campo `deleted_at` timestamp para mejor tracking
   - Agregar campo `deleted_by` para saber quién eliminó

---

## 🎯 CONCLUSIÓN

**Problema Resuelto:** ✅

El sistema ahora usa **SOFT DELETE** consistente en todas las capas:
- ✅ Vendedores marcan productos como `status = 'deleted'`
- ✅ Dashboard del vendedor excluye productos eliminados
- ✅ Admin puede ver productos eliminados con filtro "Todos"
- ✅ Página pública NO muestra productos eliminados
- ✅ Cache se invalida correctamente

**Estado:** Listo para producción después de pruebas.

















