# 🔍 ANÁLISIS LPMS - EXPIRACIÓN DE MEMBRESÍA DE TIENDA
**Lead Product Manager Senior + Senior Full-Stack Engineer**  
**Fecha:** 2025-01-30  
**Sistema:** Mercadito Online PY - Flujo de Expiración de Membresía "Store"

---

## 📋 RESUMEN EJECUTIVO

**Pregunta:** ¿Qué pasa cuando fenese la membresía de tienda?

**Respuesta LPMS:**  
Cuando expira la membresía de tienda (`membership_level = 'store'`), el sistema **NO aplica ninguna restricción automática** porque la función `pause_products_on_membership_expiration()` tiene una **excepción explícita para dueños de tienda**. Sin embargo, esto es un **PROBLEMA CRÍTICO** porque:

1. ❌ **No se verifica si la tienda sigue activa** (`stores.is_active`)
2. ❌ **No se pausan productos** cuando expira la membresía
3. ❌ **No se bloquea la publicación** de nuevos productos
4. ❌ **No se desactiva la tienda** automáticamente
5. ⚠️ **La tienda sigue visible** en la página pública aunque la membresía haya expirado

---

## 🔬 ANÁLISIS DETALLADO DEL FLUJO ACTUAL

### 1. **CRON JOB: Expiración de Membresías**

**Archivo:** `src/app/api/cron/expire-memberships/route.ts`

**Flujo:**
1. Ejecuta `check_and_expire_memberships()` (función SQL)
2. Obtiene usuarios cuya membresía expiró en la última hora
3. Para cada usuario, ejecuta `pause_products_on_membership_expiration()`

**Problema identificado:**
```typescript
// Línea 42-47: Obtiene usuarios con membresía expirada
const { data: expiredUsers, error: usersError } = await supabase
  .from('profiles')
  .select('id, membership_level, membership_expires_at')
  .not('membership_level', 'is', null)
  .lt('membership_expires_at', new Date().toISOString())
  .gte('membership_expires_at', new Date(Date.now() - 60 * 60 * 1000)); // Última hora
```

**⚠️ CRÍTICO:** Este query **incluye usuarios con `membership_level = 'store'`**, pero luego la función SQL los excluye del procesamiento.

---

### 2. **FUNCIÓN SQL: `pause_products_on_membership_expiration()`**

**Archivo:** `supabase/migrations/20250202000008_product_expiration_handling.sql`

**Código relevante:**
```sql
-- Líneas 25-35: EXCEPCIÓN PARA DUEÑOS DE TIENDA
SELECT is_user_store_owner(p_user_id) INTO v_store_owner;

IF v_store_owner THEN
  -- Dueño de tienda: no hacer nada
  RETURN QUERY SELECT
    0::INTEGER as products_paused,
    count_user_active_products(p_user_id) as products_kept_active,
    'Usuario tiene tienda activa, no se aplican límites'::TEXT as message;
  RETURN;
END IF;
```

**Análisis LPMS:**
- ✅ **Intención correcta:** Dueños de tienda no tienen límites de productos
- ❌ **Problema:** No verifica si la membresía sigue activa
- ❌ **Problema:** No verifica si `membership_expires_at < NOW()`
- ❌ **Problema:** Asume que si es "store owner", siempre tiene membresía activa

---

### 3. **FUNCIÓN SQL: `check_and_expire_memberships()`**

**Archivo:** `supabase/migrations/20250202000004_membership_plans_system.sql`

**Código relevante:**
```sql
-- Líneas 324-333: Actualiza perfiles con membresías expiradas
UPDATE profiles p
SET 
  membership_level = 'free',
  membership_expires_at = NULL,
  updated_at = NOW()
FROM membership_subscriptions ms
WHERE p.id = ms.user_id
  AND ms.status = 'expired'
  AND p.membership_level != 'free';
```

**Análisis LPMS:**
- ✅ **Funciona correctamente:** Cambia `membership_level` a `'free'` cuando expira
- ⚠️ **Problema:** No diferencia entre planes normales y "store"
- ⚠️ **Problema:** No actualiza `stores.is_active = false`
- ⚠️ **Problema:** No pausa productos de la tienda

---

### 4. **FUNCIÓN SQL: `get_user_publication_limits()`**

**Archivo:** `supabase/migrations/20250202000007_publication_limits_membership.sql`

**Código relevante:**
```sql
-- Líneas 127-147: Verifica si es dueño de tienda
SELECT is_user_store_owner(p_user_id) INTO v_store_owner;

IF v_store_owner THEN
  RETURN QUERY SELECT
    true as can_publish,
    true as is_store_owner,
    'store'::TEXT as membership_level,
    NULL::TIMESTAMPTZ as membership_expires_at,
    NULL::INTEGER as max_products,
    count_user_active_products(p_user_id) as current_products,
    true as can_publish_more,
    NULL::INTEGER as products_remaining,
    NULL::DECIMAL(12,2) as max_price_base,
    'Tienes una tienda activa. Puedes publicar productos sin límites.'::TEXT as message,
    false as requires_upgrade,
    NULL::TEXT as suggested_plan_level,
    NULL::TEXT as suggested_plan_name;
  RETURN;
END IF;
```

**Análisis LPMS:**
- ❌ **PROBLEMA CRÍTICO:** No verifica si `membership_expires_at < NOW()`
- ❌ **PROBLEMA CRÍTICO:** Retorna `can_publish = true` aunque la membresía haya expirado
- ❌ **PROBLEMA CRÍTICO:** Retorna `is_store_owner = true` aunque la membresía haya expirado

---

## 🚨 PROBLEMAS IDENTIFICADOS

### **Problema 1: No se Verifica Expiración en `is_user_store_owner()`**

**Hipótesis:** La función `is_user_store_owner()` solo verifica si existe una tienda asociada, pero **NO verifica si la membresía sigue activa**.

**Impacto:**
- Usuarios con membresía "store" expirada siguen siendo tratados como "store owners"
- Pueden seguir publicando productos sin límites
- La tienda sigue visible en la página pública

---

### **Problema 2: No se Desactiva la Tienda Automáticamente**

**Impacto:**
- La tienda (`stores.is_active = true`) sigue activa aunque la membresía haya expirado
- Los productos de la tienda siguen visibles en la página pública
- Los usuarios pueden seguir accediendo a `/store/[slug]`

---

### **Problema 3: No se Pausan Productos de la Tienda**

**Impacto:**
- Los productos de la tienda siguen con `status = 'active'`
- Siguen apareciendo en búsquedas y listados públicos
- El vendedor puede seguir recibiendo pedidos

---

### **Problema 4: No se Bloquea la Publicación de Nuevos Productos**

**Impacto:**
- El vendedor puede seguir creando productos nuevos
- No hay validación que verifique `membership_expires_at` para tiendas
- Puede publicar productos ilimitados aunque la membresía haya expirado

---

## 📊 FLUJO ACTUAL (PROBLEMÁTICO)

```
┌─────────────────────────────────────────────────────────┐
│ 1. CRON: expire-memberships                             │
│    - Ejecuta check_and_expire_memberships()             │
│    - Cambia membership_level = 'free'                   │
│    - membership_expires_at = NULL                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. CRON: Obtiene usuarios con membresía expirada       │
│    - Incluye usuarios con membership_level = 'store'   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. CRON: Ejecuta pause_products_on_membership_expiration│
│    - Verifica is_user_store_owner()                     │
│    - Si es store owner: NO HACE NADA ❌                 │
│    - Retorna: "Usuario tiene tienda activa"             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. RESULTADO:                                           │
│    ❌ Tienda sigue activa (stores.is_active = true)     │
│    ❌ Productos siguen activos (status = 'active')     │
│    ❌ Puede seguir publicando productos                │
│    ❌ Tienda sigue visible en página pública           │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ SOLUCIÓN PROPUESTA (LPMS)

### **Fase 1: Verificar Expiración en `is_user_store_owner()`**

**Modificar función SQL:**
```sql
CREATE OR REPLACE FUNCTION is_user_store_owner(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_store BOOLEAN;
  v_membership_level TEXT;
  v_membership_expires_at TIMESTAMPTZ;
BEGIN
  -- Verificar si tiene tienda activa
  SELECT EXISTS(
    SELECT 1 FROM stores 
    WHERE seller_id = p_user_id 
      AND is_active = true
  ) INTO v_has_store;
  
  IF NOT v_has_store THEN
    RETURN false;
  END IF;
  
  -- Verificar si tiene membresía "store" activa
  SELECT membership_level, membership_expires_at
  INTO v_membership_level, v_membership_expires_at
  FROM profiles
  WHERE id = p_user_id;
  
  -- Debe tener membership_level = 'store' Y no estar expirada
  IF v_membership_level != 'store' THEN
    RETURN false;
  END IF;
  
  -- Si tiene fecha de expiración, verificar que no haya expirado
  IF v_membership_expires_at IS NOT NULL 
     AND v_membership_expires_at < NOW() THEN
    RETURN false; -- Membresía expirada
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### **Fase 2: Desactivar Tienda al Expirar Membresía**

**Modificar `check_and_expire_memberships()`:**
```sql
-- Agregar después de actualizar profiles
UPDATE stores s
SET 
  is_active = false,
  updated_at = NOW()
FROM profiles p
WHERE s.seller_id = p.id
  AND p.membership_level = 'free'
  AND p.membership_expires_at IS NULL
  AND s.is_active = true
  AND EXISTS (
    SELECT 1 FROM membership_subscriptions ms
    WHERE ms.user_id = p.id
      AND ms.status = 'expired'
      AND ms.expires_at <= NOW()
  );
```

---

### **Fase 3: Pausar Productos de Tienda Expirada**

**Modificar `pause_products_on_membership_expiration()`:**
```sql
-- Agregar lógica para tiendas expiradas
IF v_store_owner THEN
  -- Verificar si la membresía sigue activa
  IF v_profile.membership_expires_at IS NOT NULL 
     AND v_profile.membership_expires_at < NOW() THEN
    -- Membresía expirada: pausar TODOS los productos de la tienda
    UPDATE products
    SET 
      status = 'paused',
      updated_at = NOW()
    WHERE seller_id = p_user_id
      AND status = 'active';
    
    GET DIAGNOSTICS v_paused_count = ROW_COUNT;
    
    RETURN QUERY SELECT
      v_paused_count as products_paused,
      0::INTEGER as products_kept_active,
      ('Membresía de tienda expirada. ' || v_paused_count || ' producto(s) pausados.')::TEXT as message;
    RETURN;
  END IF;
  
  -- Membresía activa: no hacer nada
  RETURN QUERY SELECT
    0::INTEGER as products_paused,
    count_user_active_products(p_user_id) as products_kept_active,
    'Usuario tiene tienda activa, no se aplican límites'::TEXT as message;
  RETURN;
END IF;
```

---

### **Fase 4: Bloquear Publicación en `get_user_publication_limits()`**

**Modificar función:**
```sql
IF v_store_owner THEN
  -- Verificar si la membresía sigue activa
  IF v_profile.membership_expires_at IS NOT NULL 
     AND v_profile.membership_expires_at < NOW() THEN
    -- Membresía expirada: bloquear publicación
    RETURN QUERY SELECT
      false as can_publish,
      false as is_store_owner, -- Ya no es store owner activo
      v_profile.membership_level as membership_level,
      v_profile.membership_expires_at as membership_expires_at,
      0 as max_products,
      count_user_active_products(p_user_id) as current_products,
      false as can_publish_more,
      0 as products_remaining,
      0::DECIMAL(12,2) as max_price_base,
      'Tu membresía de tienda ha expirado. Renueva para continuar publicando.'::TEXT as message,
      true as requires_upgrade,
      'store'::TEXT as suggested_plan_level,
      'Plan Tienda Pro'::TEXT as suggested_plan_name;
    RETURN;
  END IF;
  
  -- Membresía activa: sin límites
  RETURN QUERY SELECT
    true as can_publish,
    true as is_store_owner,
    'store'::TEXT as membership_level,
    v_profile.membership_expires_at as membership_expires_at,
    NULL::INTEGER as max_products,
    count_user_active_products(p_user_id) as current_products,
    true as can_publish_more,
    NULL::INTEGER as products_remaining,
    NULL::DECIMAL(12,2) as max_price_base,
    'Tienes una tienda activa. Puedes publicar productos sin límites.'::TEXT as message,
    false as requires_upgrade,
    NULL::TEXT as suggested_plan_level,
    NULL::TEXT as suggested_plan_name;
  RETURN;
END IF;
```

---

### **Fase 5: Ocultar Tienda en Página Pública**

**Modificar `getStoreBySlug()`:**
```typescript
// En src/lib/services/storeService.ts
export async function getStoreBySlug(storeSlug: string, includeInactive: boolean = false): Promise<Store | null> {
  // ... código existente ...
  
  // Verificar si el vendedor tiene membresía "store" activa
  const { data: sellerProfile } = await supabase
    .from('profiles')
    .select('membership_level, membership_expires_at')
    .eq('id', data.seller_id)
    .single();
  
  // Si la membresía de tienda expiró, no mostrar la tienda
  if (sellerProfile?.membership_level === 'store' 
      && sellerProfile?.membership_expires_at 
      && new Date(sellerProfile.membership_expires_at) < new Date()) {
    return null; // Tienda expirada, no mostrar
  }
  
  // ... resto del código ...
}
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### **Migraciones SQL Necesarias:**
- [ ] Modificar `is_user_store_owner()` para verificar expiración
- [ ] Modificar `check_and_expire_memberships()` para desactivar tiendas
- [ ] Modificar `pause_products_on_membership_expiration()` para pausar productos de tiendas expiradas
- [ ] Modificar `get_user_publication_limits()` para bloquear publicación en tiendas expiradas

### **Código TypeScript/Next.js:**
- [ ] Modificar `getStoreBySlug()` para ocultar tiendas expiradas
- [ ] Agregar validación en formulario de creación de productos
- [ ] Agregar banner de advertencia en dashboard de tienda cuando esté por expirar

### **Notificaciones:**
- [ ] Notificar al vendedor 7 días antes de expirar
- [ ] Notificar al vendedor 1 día antes de expirar
- [ ] Notificar al vendedor cuando expire (con link de renovación)

---

## 🎯 CONCLUSIÓN LPMS

**Estado Actual:**
- ❌ **CRÍTICO:** La expiración de membresía "store" **NO tiene efecto** en el sistema
- ❌ **CRÍTICO:** Las tiendas siguen activas aunque la membresía haya expirado
- ❌ **CRÍTICO:** Los productos siguen visibles aunque la membresía haya expirado
- ❌ **CRÍTICO:** El vendedor puede seguir publicando productos sin límites

**Recomendación:**
1. **URGENTE:** Implementar las 5 fases propuestas
2. **URGENTE:** Agregar validación de expiración en todas las funciones relacionadas con tiendas
3. **IMPORTANTE:** Agregar notificaciones proactivas antes de expirar
4. **IMPORTANTE:** Agregar tests para verificar el flujo completo de expiración

**Impacto en Negocio:**
- **Pérdida de ingresos:** Vendedores pueden seguir usando la plataforma sin pagar
- **Experiencia de usuario:** Compradores pueden ver productos de tiendas "fantasma"
- **Confianza:** Dificulta la gestión de membresías premium

---

*Documento generado por análisis LPMS - Mercadito Online PY*
















