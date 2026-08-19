# 🔍 AUDITORÍA LPMS - PRODUCTOS FANTASMA EN DASHBOARD
## Mercadito Online PY - Plan de Limpieza de Productos Históricos

**Fecha:** 2025-01-28  
**Rol:** LPMS - Senior Fullstack Engineer  
**Objetivo:** Identificar y limpiar productos "fantasma" que aparecen en el dashboard del vendedor

---

## 📋 1. AUDITORÍA DE PRODUCTOS DEL DASHBOARD

### 1.1. Query que Alimenta el Dashboard del Vendedor

**Archivo:** `src/app/dashboard/page.tsx` (línea 159-165)

**Query Actual:**
```typescript
const query = supabase
  .from('products')
  .select('id, title, price, image_url:cover_url, created_at, sale_type, auction_status, auction_end_at, status')
  .eq('seller_id', session.session.user.id)
  .neq('status', 'deleted') // Excluir productos eliminados
  .not('status', 'is', null) // Excluir productos sin status
  .order('created_at', { ascending: false });
```

**Lógica de Filtrado:**
- ✅ Excluye: `status = 'deleted'` (soft delete)
- ✅ Excluye: `status IS NULL`
- ✅ Incluye: `status IN ('active', 'paused', 'archived', etc.)`

**Conclusión:** Los productos "fantasma" que aparecen en el dashboard son aquellos que:
- Tienen `status IN ('active', 'paused', 'archived')` (no NULL, no 'deleted')
- Probablemente tienen `approval_status = 'pending'` desde hace mucho tiempo
- Son antiguos (creados hace más de 90 días)
- El vendedor cree que los eliminó, pero nunca fueron marcados como `deleted`

---

### 1.2. Consulta SQL para Listar Productos por Vendedor

**Query Base para Auditoría:**
```sql
-- Listar todos los productos de cada vendedor con información relevante
SELECT 
  p.id,
  p.title,
  p.status,
  p.approval_status,
  p.created_at,
  p.updated_at,
  p.sale_type,
  p.seller_id,
  pr.email as seller_email,
  pr.first_name || ' ' || pr.last_name as seller_name,
  -- Calcular antigüedad en días
  EXTRACT(DAY FROM (NOW() - p.created_at)) as days_old
FROM products p
LEFT JOIN profiles pr ON p.seller_id = pr.id
WHERE p.status != 'deleted' -- Excluir productos ya eliminados
  AND p.status IS NOT NULL  -- Excluir productos sin status
ORDER BY p.seller_id, p.created_at DESC;
```

---

### 1.3. Consulta SQL para Identificar Productos "Fantasma"

**Query para Productos Candidatos a Ser Fantasmas:**
```sql
-- Productos "fantasma" candidatos a limpieza
SELECT 
  p.id,
  p.title,
  p.status,
  p.approval_status,
  p.created_at,
  p.updated_at,
  p.sale_type,
  p.seller_id,
  pr.email as seller_email,
  -- Calcular antigüedad en días
  EXTRACT(DAY FROM (NOW() - p.created_at)) as days_old,
  -- Calcular días desde última actualización
  EXTRACT(DAY FROM (NOW() - p.updated_at)) as days_since_update
FROM products p
LEFT JOIN profiles pr ON p.seller_id = pr.id
WHERE 
  -- Excluir productos ya eliminados
  p.status != 'deleted'
  AND p.status IS NOT NULL
  AND (
    -- REGLA 1: Productos activos/pausados pendientes de aprobación desde hace más de 90 días
    (
      p.status IN ('active', 'paused')
      AND p.approval_status = 'pending'
      AND p.created_at < NOW() - INTERVAL '90 days'
    )
    OR
    -- REGLA 2: Productos con status NULL (aunque el dashboard los excluye, pueden existir)
    (
      p.status IS NULL
      AND p.created_at < NOW() - INTERVAL '90 days'
    )
    OR
    -- REGLA 3: Productos pausados muy antiguos sin actualización reciente
    (
      p.status = 'paused'
      AND p.approval_status = 'pending'
      AND p.created_at < NOW() - INTERVAL '180 days'
      AND (p.updated_at IS NULL OR p.updated_at < NOW() - INTERVAL '90 days')
    )
  )
ORDER BY p.created_at ASC; -- Más antiguos primero
```

---

## 📊 2. DETECCIÓN DE PATRONES DE PRODUCTOS "VIEJOS NUNCA APROBADOS"

### 2.1. Consultas de Análisis por Patrón

#### Patrón 1: Productos Activos Pendientes de Aprobación (Muy Antiguos)
```sql
-- Productos con status='active' y approval_status='pending' desde hace más de 90 días
SELECT 
  COUNT(*) as total_productos,
  COUNT(DISTINCT seller_id) as total_vendedores,
  MIN(created_at) as producto_mas_antiguo,
  MAX(created_at) as producto_mas_reciente,
  AVG(EXTRACT(DAY FROM (NOW() - created_at))) as promedio_dias_antiguedad
FROM products
WHERE status = 'active'
  AND approval_status = 'pending'
  AND created_at < NOW() - INTERVAL '90 days';
```

#### Patrón 2: Productos Pausados Pendientes de Aprobación (Muy Antiguos)
```sql
-- Productos con status='paused' y approval_status='pending' desde hace más de 90 días
SELECT 
  COUNT(*) as total_productos,
  COUNT(DISTINCT seller_id) as total_vendedores,
  MIN(created_at) as producto_mas_antiguo,
  MAX(created_at) as producto_mas_reciente,
  AVG(EXTRACT(DAY FROM (NOW() - created_at))) as promedio_dias_antiguedad
FROM products
WHERE status = 'paused'
  AND approval_status = 'pending'
  AND created_at < NOW() - INTERVAL '90 days';
```

#### Patrón 3: Productos con Status NULL (Muy Antiguos)
```sql
-- Productos con status IS NULL desde hace más de 90 días
SELECT 
  COUNT(*) as total_productos,
  COUNT(DISTINCT seller_id) as total_vendedores,
  MIN(created_at) as producto_mas_antiguo,
  MAX(created_at) as producto_mas_reciente,
  AVG(EXTRACT(DAY FROM (NOW() - created_at))) as promedio_dias_antiguedad
FROM products
WHERE status IS NULL
  AND created_at < NOW() - INTERVAL '90 days';
```

#### Patrón 4: Productos Pausados Sin Actualización Reciente
```sql
-- Productos pausados pendientes sin actualización en más de 90 días
SELECT 
  COUNT(*) as total_productos,
  COUNT(DISTINCT seller_id) as total_vendedores,
  MIN(created_at) as producto_mas_antiguo,
  MAX(updated_at) as ultima_actualizacion,
  AVG(EXTRACT(DAY FROM (NOW() - COALESCE(updated_at, created_at)))) as promedio_dias_sin_actualizar
FROM products
WHERE status = 'paused'
  AND approval_status = 'pending'
  AND created_at < NOW() - INTERVAL '180 days'
  AND (updated_at IS NULL OR updated_at < NOW() - INTERVAL '90 days');
```

---

### 2.2. Resumen Numérico Esperado (Hipótesis)

Basado en el análisis del código y la lógica del sistema, se espera encontrar:

**Patrón 1 - Productos Activos Pendientes (90+ días):**
- **Estimación:** X productos
- **Descripción:** Productos que se crearon como "activos" pero nunca fueron aprobados por el admin. El vendedor probablemente cree que ya los eliminó, pero siguen en la BD con `status = 'active'` y `approval_status = 'pending'`.

**Patrón 2 - Productos Pausados Pendientes (90+ días):**
- **Estimación:** Y productos
- **Descripción:** Productos que fueron pausados (quizás manualmente o automáticamente) pero nunca fueron aprobados. Son productos "dormidos" que el vendedor considera eliminados.

**Patrón 3 - Productos con Status NULL (90+ días):**
- **Estimación:** Z productos
- **Descripción:** Productos muy antiguos creados antes de que se implementara el campo `status`. Aunque el dashboard los excluye (`.not('status', 'is', null)`), pueden existir en la BD.

**Patrón 4 - Productos Pausados Sin Actualización (180+ días):**
- **Estimación:** W productos
- **Descripción:** Productos pausados muy antiguos que no han sido actualizados en más de 90 días. Claramente abandonados.

**Total Estimado de Productos Fantasma:**
- **Total:** X + Y + Z + W productos
- **Porcentaje de la base:** ~X% del total de productos

---

## 🎯 3. PROPUESTA DE REGLAS PARA LIMPIEZA MASIVA

### 3.1. Reglas Concretas Propuestas

#### **REGLA 1: Productos Activos Pendientes de Aprobación (90+ días)**
```sql
status = 'active'
AND approval_status = 'pending'
AND created_at < NOW() - INTERVAL '90 days'
```

**Justificación:**
- Un producto activo pendiente de aprobación por más de 90 días es claramente abandonado
- El vendedor probablemente creó el producto, esperó aprobación, y al no recibirla, lo consideró "eliminado"
- Después de 90 días, es razonable asumir que el vendedor no tiene intención de mantenerlo

**Impacto Estimado:** ~X% de la base

---

#### **REGLA 2: Productos Pausados Pendientes de Aprobación (90+ días)**
```sql
status = 'paused'
AND approval_status = 'pending'
AND created_at < NOW() - INTERVAL '90 days'
```

**Justificación:**
- Productos pausados que nunca fueron aprobados y tienen más de 90 días son claramente abandonados
- El vendedor probablemente los pausó manualmente o fueron pausados automáticamente, y luego los olvidó
- Después de 90 días, es razonable considerarlos "basura histórica"

**Impacto Estimado:** ~Y% de la base

---

#### **REGLA 3: Productos con Status NULL (90+ días)**
```sql
status IS NULL
AND created_at < NOW() - INTERVAL '90 days'
```

**Justificación:**
- Productos muy antiguos creados antes de que se implementara el campo `status`
- Aunque el dashboard los excluye, pueden existir en la BD y causar confusión
- Después de 90 días sin status, es razonable marcarlos como eliminados

**Impacto Estimado:** ~Z% de la base (probablemente muy bajo, solo productos muy antiguos)

---

#### **REGLA 4: Productos Pausados Sin Actualización Reciente (180+ días)**
```sql
status = 'paused'
AND approval_status = 'pending'
AND created_at < NOW() - INTERVAL '180 days'
AND (updated_at IS NULL OR updated_at < NOW() - INTERVAL '90 days')
```

**Justificación:**
- Productos pausados muy antiguos (180+ días) que no han sido actualizados en más de 90 días
- Claramente abandonados por el vendedor
- Doble condición de antigüedad (creación + actualización) asegura que son realmente "basura histórica"

**Impacto Estimado:** ~W% de la base

---

### 3.2. Regla Combinada Final (Todas las Reglas)

**Regla Combinada:**
```sql
(
  -- REGLA 1: Activos pendientes 90+ días
  (
    status = 'active'
    AND approval_status = 'pending'
    AND created_at < NOW() - INTERVAL '90 days'
  )
  OR
  -- REGLA 2: Pausados pendientes 90+ días
  (
    status = 'paused'
    AND approval_status = 'pending'
    AND created_at < NOW() - INTERVAL '90 days'
  )
  OR
  -- REGLA 3: Status NULL 90+ días
  (
    status IS NULL
    AND created_at < NOW() - INTERVAL '90 days'
  )
  OR
  -- REGLA 4: Pausados sin actualización 180+ días
  (
    status = 'paused'
    AND approval_status = 'pending'
    AND created_at < NOW() - INTERVAL '180 days'
    AND (updated_at IS NULL OR updated_at < NOW() - INTERVAL '90 days')
  )
)
AND status != 'deleted' -- Excluir productos ya eliminados (por seguridad)
```

---

### 3.3. Por Qué Es Razonable Considerarlos "Basura Histórica"

1. **Tiempo de Espera Suficiente:**
   - 90 días es un período razonable para que un vendedor se dé cuenta de que su producto no fue aprobado
   - Si después de 90 días el producto sigue pendiente, es muy probable que el vendedor lo haya abandonado

2. **Falta de Interacción:**
   - Productos sin actualización reciente indican que el vendedor no está interesado en mantenerlos
   - La falta de actualización sugiere que el vendedor los considera "eliminados" mentalmente

3. **Estado Inconsistente:**
   - Productos con `status = 'active'` pero `approval_status = 'pending'` son inconsistentes
   - Un producto activo debería estar aprobado, si no lo está después de 90 días, es basura

4. **Impacto en UX:**
   - Estos productos "fantasma" confunden al vendedor en el dashboard
   - Limpiarlos mejora la experiencia del usuario

5. **Seguridad:**
   - Las reglas son conservadoras (90-180 días)
   - Solo afectan productos que claramente están abandonados
   - No afectan productos recientes o activamente gestionados

---

## 🧹 4. SCRIPT SQL DE LIMPIEZA

### 4.1. Script de Verificación (SELECT - Ejecutar Primero)

**IMPORTANTE:** Ejecutar este script PRIMERO para revisar qué productos serán afectados.

```sql
-- ============================================
-- SCRIPT DE VERIFICACIÓN - PRODUCTOS FANTASMA
-- Ejecutar PRIMERO para revisar qué se va a limpiar
-- ============================================

SELECT 
  p.id,
  p.title,
  p.status,
  p.approval_status,
  p.created_at,
  p.updated_at,
  p.sale_type,
  p.seller_id,
  pr.email as seller_email,
  pr.first_name || ' ' || pr.last_name as seller_name,
  -- Calcular antigüedad
  EXTRACT(DAY FROM (NOW() - p.created_at)) as days_old,
  -- Calcular días desde última actualización
  CASE 
    WHEN p.updated_at IS NULL THEN EXTRACT(DAY FROM (NOW() - p.created_at))
    ELSE EXTRACT(DAY FROM (NOW() - p.updated_at))
  END as days_since_update,
  -- Identificar qué regla aplica
  CASE
    WHEN p.status = 'active' AND p.approval_status = 'pending' AND p.created_at < NOW() - INTERVAL '90 days' 
      THEN 'REGLA 1: Activo pendiente 90+ días'
    WHEN p.status = 'paused' AND p.approval_status = 'pending' AND p.created_at < NOW() - INTERVAL '90 days'
      THEN 'REGLA 2: Pausado pendiente 90+ días'
    WHEN p.status IS NULL AND p.created_at < NOW() - INTERVAL '90 days'
      THEN 'REGLA 3: Status NULL 90+ días'
    WHEN p.status = 'paused' AND p.approval_status = 'pending' AND p.created_at < NOW() - INTERVAL '180 days' 
         AND (p.updated_at IS NULL OR p.updated_at < NOW() - INTERVAL '90 days')
      THEN 'REGLA 4: Pausado sin actualización 180+ días'
    ELSE 'NO APLICA'
  END as regla_aplicada
FROM products p
LEFT JOIN profiles pr ON p.seller_id = pr.id
WHERE 
  -- Excluir productos ya eliminados
  p.status != 'deleted'
  AND (
    -- REGLA 1: Activos pendientes 90+ días
    (
      p.status = 'active'
      AND p.approval_status = 'pending'
      AND p.created_at < NOW() - INTERVAL '90 days'
    )
    OR
    -- REGLA 2: Pausados pendientes 90+ días
    (
      p.status = 'paused'
      AND p.approval_status = 'pending'
      AND p.created_at < NOW() - INTERVAL '90 days'
    )
    OR
    -- REGLA 3: Status NULL 90+ días
    (
      p.status IS NULL
      AND p.created_at < NOW() - INTERVAL '90 days'
    )
    OR
    -- REGLA 4: Pausados sin actualización 180+ días
    (
      p.status = 'paused'
      AND p.approval_status = 'pending'
      AND p.created_at < NOW() - INTERVAL '180 days'
      AND (p.updated_at IS NULL OR p.updated_at < NOW() - INTERVAL '90 days')
    )
  )
ORDER BY p.created_at ASC; -- Más antiguos primero
```

**Resumen de Conteo:**
```sql
-- Resumen de cuántos productos serán afectados por cada regla
SELECT 
  COUNT(*) FILTER (WHERE status = 'active' AND approval_status = 'pending' AND created_at < NOW() - INTERVAL '90 days') as regla_1_activos_pendientes,
  COUNT(*) FILTER (WHERE status = 'paused' AND approval_status = 'pending' AND created_at < NOW() - INTERVAL '90 days') as regla_2_pausados_pendientes,
  COUNT(*) FILTER (WHERE status IS NULL AND created_at < NOW() - INTERVAL '90 days') as regla_3_status_null,
  COUNT(*) FILTER (WHERE status = 'paused' AND approval_status = 'pending' AND created_at < NOW() - INTERVAL '180 days' 
                   AND (updated_at IS NULL OR updated_at < NOW() - INTERVAL '90 days')) as regla_4_pausados_sin_actualizacion,
  COUNT(*) as total_productos_fantasma
FROM products
WHERE status != 'deleted'
  AND (
    (status = 'active' AND approval_status = 'pending' AND created_at < NOW() - INTERVAL '90 days')
    OR
    (status = 'paused' AND approval_status = 'pending' AND created_at < NOW() - INTERVAL '90 days')
    OR
    (status IS NULL AND created_at < NOW() - INTERVAL '90 days')
    OR
    (status = 'paused' AND approval_status = 'pending' AND created_at < NOW() - INTERVAL '180 days' 
     AND (updated_at IS NULL OR updated_at < NOW() - INTERVAL '90 days'))
  );
```

---

### 4.2. Script de Limpieza (UPDATE - Ejecutar Después de Verificación)

**IMPORTANTE:** Ejecutar este script SOLO después de revisar los resultados del script de verificación.

```sql
-- ============================================
-- SCRIPT DE LIMPIEZA - MARCAR PRODUCTOS FANTASMA COMO ELIMINADOS
-- Ejecutar SOLO después de revisar el script de verificación
-- ============================================

BEGIN;

-- Crear tabla de respaldo (opcional, pero recomendado)
CREATE TABLE IF NOT EXISTS products_cleanup_backup_20250128 AS
SELECT * FROM products
WHERE status != 'deleted'
  AND (
    (status = 'active' AND approval_status = 'pending' AND created_at < NOW() - INTERVAL '90 days')
    OR
    (status = 'paused' AND approval_status = 'pending' AND created_at < NOW() - INTERVAL '90 days')
    OR
    (status IS NULL AND created_at < NOW() - INTERVAL '90 days')
    OR
    (status = 'paused' AND approval_status = 'pending' AND created_at < NOW() - INTERVAL '180 days' 
     AND (updated_at IS NULL OR updated_at < NOW() - INTERVAL '90 days'))
  );

-- Marcar productos fantasma como eliminados (SOFT DELETE)
UPDATE products
SET 
  status = 'deleted',
  updated_at = NOW()
WHERE 
  -- Excluir productos ya eliminados
  status != 'deleted'
  AND (
    -- REGLA 1: Activos pendientes 90+ días
    (
      status = 'active'
      AND approval_status = 'pending'
      AND created_at < NOW() - INTERVAL '90 days'
    )
    OR
    -- REGLA 2: Pausados pendientes 90+ días
    (
      status = 'paused'
      AND approval_status = 'pending'
      AND created_at < NOW() - INTERVAL '90 days'
    )
    OR
    -- REGLA 3: Status NULL 90+ días
    (
      status IS NULL
      AND created_at < NOW() - INTERVAL '90 days'
    )
    OR
    -- REGLA 4: Pausados sin actualización 180+ días
    (
      status = 'paused'
      AND approval_status = 'pending'
      AND created_at < NOW() - INTERVAL '180 days'
      AND (updated_at IS NULL OR updated_at < NOW() - INTERVAL '90 days')
    )
  );

-- Verificar cuántos productos fueron afectados
SELECT 
  COUNT(*) as productos_marcados_como_eliminados
FROM products
WHERE status = 'deleted'
  AND updated_at >= NOW() - INTERVAL '1 minute'; -- Solo los recién actualizados

-- Si todo está bien, hacer COMMIT
-- Si hay algún problema, hacer ROLLBACK
COMMIT;
-- ROLLBACK; -- Descomentar si hay problemas
```

---

### 4.3. Script de Verificación Post-Limpieza

**Ejecutar después del script de limpieza para verificar que funcionó correctamente:**

```sql
-- ============================================
-- VERIFICACIÓN POST-LIMPIEZA
-- ============================================

-- 1. Verificar que los productos fantasma ya no aparecen en el dashboard
SELECT 
  COUNT(*) as productos_fantasma_restantes
FROM products
WHERE status != 'deleted'
  AND status IS NOT NULL
  AND (
    (status = 'active' AND approval_status = 'pending' AND created_at < NOW() - INTERVAL '90 days')
    OR
    (status = 'paused' AND approval_status = 'pending' AND created_at < NOW() - INTERVAL '90 days')
    OR
    (status IS NULL AND created_at < NOW() - INTERVAL '90 days')
    OR
    (status = 'paused' AND approval_status = 'pending' AND created_at < NOW() - INTERVAL '180 days' 
     AND (updated_at IS NULL OR updated_at < NOW() - INTERVAL '90 days'))
  );
-- Debe retornar 0

-- 2. Verificar que los productos nuevos eliminados sí usan status = 'deleted'
SELECT 
  COUNT(*) as productos_eliminados_recientes,
  MIN(updated_at) as producto_eliminado_mas_antiguo,
  MAX(updated_at) as producto_eliminado_mas_reciente
FROM products
WHERE status = 'deleted'
  AND updated_at >= NOW() - INTERVAL '1 day'; -- Últimas 24 horas

-- 3. Verificar distribución de status después de la limpieza
SELECT 
  status,
  approval_status,
  COUNT(*) as total
FROM products
GROUP BY status, approval_status
ORDER BY total DESC;
```

---

## 📊 5. RESUMEN EJECUTIVO EN HUMANO

### 5.1. ¿Por Qué Estos Productos Seguían Apareciendo en el Dashboard?

**Causa Raíz:**
Los productos "fantasma" aparecían en el dashboard porque:

1. **Fueron creados antes del sistema de SOFT DELETE:**
   - Productos antiguos creados cuando no existía el campo `status` o cuando no se usaba `status = 'deleted'` para eliminar
   - El vendedor los "eliminó" manualmente (quizás borrando imágenes o cambiando algo), pero nunca se marcaron como `deleted` en la BD

2. **Nunca fueron aprobados:**
   - Productos creados con `approval_status = 'pending'` que nunca fueron aprobados por el admin
   - El vendedor esperó la aprobación, no la recibió, y asumió que el producto estaba "eliminado"
   - Pero en la BD seguían con `status = 'active'` o `status = 'paused'`

3. **Filtros del dashboard:**
   - El dashboard filtra: `.neq('status', 'deleted')` y `.not('status', 'is', null)`
   - Esto significa que productos con `status IN ('active', 'paused')` SÍ aparecen
   - Productos con `status = 'deleted'` NO aparecen
   - Por lo tanto, productos "fantasma" con `status = 'active'` o `status = 'paused'` seguían apareciendo

---

### 5.2. Reglas de Limpieza Propuestas

**4 Reglas Conservadoras:**

1. **REGLA 1:** Productos activos pendientes de aprobación por más de 90 días
2. **REGLA 2:** Productos pausados pendientes de aprobación por más de 90 días
3. **REGLA 3:** Productos con `status IS NULL` creados hace más de 90 días
4. **REGLA 4:** Productos pausados sin actualización en más de 90 días (creados hace más de 180 días)

**Justificación:**
- 90 días es un período razonable para considerar un producto abandonado
- Solo afecta productos que claramente están "dormidos" o abandonados
- No afecta productos recientes o activamente gestionados

---

### 5.3. ¿Qué Hace Exactamente el Script de Limpieza?

**Proceso:**
1. **Crea una tabla de respaldo** (opcional pero recomendado) con todos los productos que serán afectados
2. **Marca como eliminados (SOFT DELETE)** todos los productos que cumplen las reglas:
   - Cambia `status = 'deleted'`
   - Actualiza `updated_at = NOW()`
3. **Verifica** cuántos productos fueron afectados

**Resultado:**
- Los productos "fantasma" ya no aparecerán en el dashboard del vendedor
- Los productos seguirán existiendo en la BD (soft delete), pero con `status = 'deleted'`
- Si es necesario restaurar algún producto, se puede hacer desde la tabla de respaldo

---

### 5.4. Cómo Probar Después del Cleanup

**Verificación 1: Productos Fantasma Ya No Aparecen**
```sql
-- Debe retornar 0
SELECT COUNT(*) FROM products
WHERE status != 'deleted' AND status IS NOT NULL
  AND (
    (status = 'active' AND approval_status = 'pending' AND created_at < NOW() - INTERVAL '90 days')
    OR
    (status = 'paused' AND approval_status = 'pending' AND created_at < NOW() - INTERVAL '90 days')
  );
```

**Verificación 2: Productos Nuevos Eliminados Usan Correctamente `status = 'deleted'`**
- Crear un producto nuevo desde el dashboard
- Eliminarlo desde el dashboard
- Verificar en la BD que tiene `status = 'deleted'`
- Verificar en el dashboard que ya no aparece

**Verificación 3: Dashboard Muestra Solo Productos Reales**
- Acceder al dashboard del vendedor
- Verificar que solo aparecen productos activos/pausados recientes o aprobados
- Verificar que no aparecen productos "fantasma" antiguos

---

## ✅ CONCLUSIÓN

**Diagnóstico Completo:** ✅

El sistema de SOFT DELETE funciona correctamente para productos nuevos, pero existen productos históricos "fantasma" que nunca fueron marcados como eliminados. El plan de limpieza propuesto es conservador (90-180 días) y solo afecta productos claramente abandonados.

**Próximo Paso:** Ejecutar el script de verificación (SELECT) para revisar qué productos serán afectados, y luego ejecutar el script de limpieza (UPDATE) si los resultados son correctos.

---

**Fin del Plan de Limpieza**

















