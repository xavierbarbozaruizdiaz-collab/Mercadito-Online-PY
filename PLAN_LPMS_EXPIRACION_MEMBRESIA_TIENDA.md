# 📋 PLAN LPMS - SOLUCIÓN EXPIRACIÓN MEMBRESÍA TIENDA
**Lead Product Manager Senior + Senior Full-Stack Engineer**  
**Fecha:** 2025-01-30  
**Versión:** 1.0  
**Estado:** ⏳ Pendiente Aprobación

---

## 📊 RESUMEN EJECUTIVO

### **Problema Identificado**
Cuando expira la membresía de tienda (`membership_level = 'store'`), el sistema **NO aplica ninguna restricción automática**, permitiendo que:
- La tienda siga activa y visible
- Los productos sigan activos y visibles
- El vendedor pueda seguir publicando productos sin límites
- No haya notificaciones al vendedor

### **Impacto en Negocio**
- 🔴 **CRÍTICO:** Pérdida de ingresos (vendedores usan plataforma sin pagar)
- 🟡 **ALTO:** Experiencia de usuario degradada (tiendas "fantasma")
- 🟡 **ALTO:** Confianza del sistema de membresías comprometida

### **Solución Propuesta**
Implementar un sistema completo de expiración de membresías de tienda que:
1. ✅ Desactive automáticamente la tienda al expirar
2. ✅ Pause productos de tiendas expiradas
3. ✅ Bloquee publicación de nuevos productos
4. ✅ Oculte tiendas expiradas en página pública
5. ✅ Notifique proactivamente al vendedor

### **Timeline Estimado**
- **Fase 1:** 2-3 días (Backend SQL)
- **Fase 2:** 1-2 días (Frontend/Validaciones)
- **Fase 3:** 1 día (Notificaciones)
- **Fase 4:** 1 día (Testing y QA)
- **Total:** 5-7 días hábiles

---

## 🎯 OBJETIVOS Y ALCANCE

### **Objetivos Principales**
1. **Automático:** El sistema debe detectar y procesar expiraciones sin intervención manual
2. **Completo:** Cubrir todos los puntos de entrada (publicación, visualización, gestión)
3. **Reversible:** Permitir reactivación inmediata al renovar membresía
4. **Transparente:** Notificar al vendedor en cada etapa

### **Alcance del Proyecto**

#### ✅ **INCLUIDO:**
- Modificación de funciones SQL existentes
- Validaciones en frontend (creación de productos)
- Notificaciones proactivas (7 días, 1 día, expiración)
- Ocultamiento de tiendas expiradas en página pública
- Reactivación automática al renovar membresía
- Tests unitarios e integración

#### ❌ **NO INCLUIDO:**
- Migración de datos históricos (solo afecta nuevas expiraciones)
- Cambios en UI de gestión de membresías (ya existe)
- Sistema de grace period (evaluar en futura iteración)
- Refund automático de productos activos (evaluar en futura iteración)

---

## 📐 ARQUITECTURA DE LA SOLUCIÓN

### **Diagrama de Flujo**

```
┌─────────────────────────────────────────────────────────┐
│                    CRON JOB (Diario)                      │
│              /api/cron/expire-memberships                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│    1. check_and_expire_memberships()                     │
│       - Marca suscripciones como 'expired'              │
│       - Actualiza profiles.membership_level = 'free'    │
│       - NUEVO: Desactiva stores.is_active = false       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│    2. pause_products_on_membership_expiration()         │
│       - Verifica is_user_store_owner() (con expiración) │
│       - Si tienda expirada: pausa TODOS los productos   │
│       - Si tienda activa: no hace nada                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│    3. Notificaciones                                     │
│       - Crea notificación al vendedor                   │
│       - Email de expiración (opcional)                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              VALIDACIONES EN TIEMPO REAL                │
└─────────────────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌──────────────────┐    ┌──────────────────┐
│ Publicar        │    │ Ver Tienda       │
│ Producto        │    │ /store/[slug]    │
│                 │    │                  │
│ Valida:         │    │ Valida:          │
│ - can_publish   │    │ - is_active      │
│ - is_store_owner│    │ - membership     │
│ - expiración    │    │   activa         │
└──────────────────┘    └──────────────────┘
```

---

## 🔧 FASES DE IMPLEMENTACIÓN

### **FASE 1: Backend SQL - Funciones Core** ⚠️ CRÍTICA
**Duración:** 2-3 días  
**Prioridad:** P0 (Crítica)

#### **1.1 Modificar `is_user_store_owner()`**
**Archivo:** Nueva migración SQL  
**Objetivo:** Verificar que la membresía "store" esté activa

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
  
  -- Debe tener membership_level = 'store'
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

**Tests:**
- ✅ Usuario con tienda activa y membresía "store" activa → `true`
- ✅ Usuario con tienda activa y membresía "store" expirada → `false`
- ✅ Usuario con tienda activa y membresía "bronze" → `false`
- ✅ Usuario sin tienda → `false`

---

#### **1.2 Modificar `check_and_expire_memberships()`**
**Archivo:** Nueva migración SQL  
**Objetivo:** Desactivar tiendas cuando expira membresía

```sql
CREATE OR REPLACE FUNCTION check_and_expire_memberships()
RETURNS JSONB AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_stores_deactivated INTEGER := 0;
BEGIN
  -- Marcar suscripciones expiradas
  UPDATE membership_subscriptions
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'active'
    AND expires_at <= NOW();
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  -- Actualizar perfiles de usuarios con membresías expiradas
  UPDATE profiles p
  SET 
    membership_level = 'free',
    membership_expires_at = NULL,
    updated_at = NOW()
  FROM membership_subscriptions ms
  WHERE p.id = ms.user_id
    AND ms.status = 'expired'
    AND p.membership_level != 'free';
  
  -- NUEVO: Desactivar tiendas de usuarios con membresía "store" expirada
  UPDATE stores s
  SET 
    is_active = false,
    updated_at = NOW()
  FROM profiles p
  WHERE s.seller_id = p.id
    AND p.membership_level = 'free'
    AND s.is_active = true
    AND EXISTS (
      SELECT 1 FROM membership_subscriptions ms
      WHERE ms.user_id = p.id
        AND ms.status = 'expired'
        AND ms.expires_at <= NOW()
        AND EXISTS (
          SELECT 1 FROM membership_plans mp
          WHERE mp.id = ms.plan_id
            AND mp.level = 'store'
        )
    );
  
  GET DIAGNOSTICS v_stores_deactivated = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'expired_count', v_expired_count,
    'stores_deactivated', v_stores_deactivated,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Tests:**
- ✅ Desactiva tienda cuando expira membresía "store"
- ✅ No desactiva tienda si membresía no es "store"
- ✅ No desactiva tienda si ya está desactivada

---

#### **1.3 Modificar `pause_products_on_membership_expiration()`**
**Archivo:** Modificar migración existente  
**Objetivo:** Pausar productos de tiendas expiradas

```sql
CREATE OR REPLACE FUNCTION pause_products_on_membership_expiration(p_user_id UUID)
RETURNS TABLE (
  products_paused INTEGER,
  products_kept_active INTEGER,
  message TEXT
) AS $$
DECLARE
  v_profile RECORD;
  v_store_owner BOOLEAN;
  v_active_products_count INTEGER;
  v_max_products INTEGER;
  v_paused_count INTEGER;
  v_kept_active INTEGER;
BEGIN
  -- Verificar si es dueño de tienda (con validación de expiración)
  SELECT is_user_store_owner(p_user_id) INTO v_store_owner;
  
  -- Obtener perfil del usuario
  SELECT 
    membership_level,
    membership_expires_at
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;
  
  -- Si es dueño de tienda, verificar si la membresía sigue activa
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
        ('Membresía de tienda expirada. ' || v_paused_count || ' producto(s) pausados. Renueva tu membresía para reactivarlos.')::TEXT as message;
      RETURN;
    END IF;
    
    -- Membresía activa: no hacer nada
    RETURN QUERY SELECT
      0::INTEGER as products_paused,
      count_user_active_products(p_user_id) as products_kept_active,
      'Usuario tiene tienda activa, no se aplican límites'::TEXT as message;
    RETURN;
  END IF;
  
  -- Lógica existente para usuarios no-store...
  -- (código actual sin cambios)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Tests:**
- ✅ Pausa productos cuando expira membresía "store"
- ✅ No pausa productos si membresía "store" sigue activa
- ✅ Mantiene lógica existente para usuarios no-store

---

#### **1.4 Modificar `get_user_publication_limits()`**
**Archivo:** Modificar migración existente  
**Objetivo:** Bloquear publicación en tiendas expiradas

```sql
CREATE OR REPLACE FUNCTION get_user_publication_limits(p_user_id UUID)
RETURNS TABLE (
  can_publish BOOLEAN,
  is_store_owner BOOLEAN,
  membership_level TEXT,
  membership_expires_at TIMESTAMPTZ,
  max_products INTEGER,
  current_products INTEGER,
  can_publish_more BOOLEAN,
  products_remaining INTEGER,
  max_price_base DECIMAL(12,2),
  message TEXT,
  requires_upgrade BOOLEAN,
  suggested_plan_level TEXT,
  suggested_plan_name TEXT
) AS $$
DECLARE
  v_profile RECORD;
  v_store_owner BOOLEAN;
  -- ... resto de variables ...
BEGIN
  -- Verificar si es dueño de tienda (con validación de expiración)
  SELECT is_user_store_owner(p_user_id) INTO v_store_owner;
  
  -- Obtener perfil y membresía
  SELECT 
    p.membership_level,
    p.membership_expires_at
  INTO v_profile
  FROM profiles p
  WHERE p.id = p_user_id;
  
  -- Si es dueño de tienda, verificar si la membresía sigue activa
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
        'Tu membresía de tienda ha expirado. Renueva para continuar publicando productos.'::TEXT as message,
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
  
  -- Lógica existente para usuarios no-store...
  -- (código actual sin cambios)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Tests:**
- ✅ Retorna `can_publish = false` cuando membresía "store" expirada
- ✅ Retorna `is_store_owner = false` cuando membresía "store" expirada
- ✅ Retorna `can_publish = true` cuando membresía "store" activa

---

### **FASE 2: Frontend/Validaciones** 🟡 ALTA
**Duración:** 1-2 días  
**Prioridad:** P1 (Alta)

#### **2.1 Ocultar Tiendas Expiradas en Página Pública**
**Archivo:** `src/lib/services/storeService.ts`

```typescript
export async function getStoreBySlug(storeSlug: string, includeInactive: boolean = false): Promise<Store | null> {
  try {
    let query = supabase
      .from('stores')
      .select(`
        *,
        seller:profiles!stores_seller_id_fkey(
          id,
          membership_level,
          membership_expires_at
        )
      `)
      .eq('slug', storeSlug);
    
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    
    const { data, error } = await query.single();
    
    if (error || !data) return null;
    
    // NUEVO: Verificar si la membresía de tienda está activa
    const seller = (data as any).seller;
    if (seller?.membership_level === 'store' 
        && seller?.membership_expires_at 
        && new Date(seller.membership_expires_at) < new Date()) {
      // Membresía expirada: no mostrar tienda
      return null;
    }
    
    // Verificar que la tienda no esté pausada
    if (data && (data as any).settings?.is_paused === true) {
      return null;
    }
    
    return data as Store;
  } catch (err) {
    logger.error('Error fetching store by slug', err, { storeSlug });
    return null;
  }
}
```

**Tests:**
- ✅ No muestra tienda si membresía "store" expirada
- ✅ Muestra tienda si membresía "store" activa
- ✅ Mantiene lógica existente para tiendas pausadas

---

#### **2.2 Validar en Formulario de Creación de Productos**
**Archivo:** `src/app/dashboard/new-product/page.tsx` (o similar)

```typescript
// Agregar validación antes de crear producto
const limits = await getUserPublicationLimits(userId);

if (!limits.can_publish) {
  // Mostrar error y redirigir a página de membresías
  alert(limits.message);
  router.push(`/memberships?plan=${limits.suggested_plan_level}`);
  return;
}

if (limits.is_store_owner && limits.membership_expires_at) {
  const expiresAt = new Date(limits.membership_expires_at);
  if (expiresAt < new Date()) {
    // Membresía expirada
    alert('Tu membresía de tienda ha expirado. Renueva para continuar publicando.');
    router.push('/memberships?plan=store');
    return;
  }
}
```

**Tests:**
- ✅ Bloquea creación si membresía "store" expirada
- ✅ Muestra mensaje claro al usuario
- ✅ Redirige a página de renovación

---

#### **2.3 Banner de Advertencia en Dashboard de Tienda**
**Archivo:** `src/app/dashboard/store/page.tsx`

```typescript
// Agregar banner si membresía está por expirar
const limits = await getUserPublicationLimits(userId);

if (limits.is_store_owner && limits.membership_expires_at) {
  const expiresAt = new Date(limits.membership_expires_at);
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
    // Mostrar banner de advertencia
    setShowExpiryWarning(true);
    setDaysUntilExpiry(daysUntilExpiry);
  }
}
```

**Tests:**
- ✅ Muestra banner 7 días antes de expirar
- ✅ Muestra banner 1 día antes de expirar
- ✅ No muestra banner si membresía no expira pronto

---

### **FASE 3: Notificaciones Proactivas** 🟢 MEDIA
**Duración:** 1 día  
**Prioridad:** P2 (Media)

#### **3.1 Notificación 7 Días Antes**
**Archivo:** Nueva migración SQL o función en cron

```sql
-- Función para notificar vencimientos próximos
CREATE OR REPLACE FUNCTION notify_upcoming_membership_expiry()
RETURNS JSONB AS $$
DECLARE
  v_notified_count INTEGER := 0;
BEGIN
  -- Notificar usuarios con membresía "store" que expira en 7 días
  INSERT INTO notifications (user_id, type, title, message, content, data)
  SELECT 
    p.id,
    'system',
    'Tu membresía de tienda expira pronto',
    'Tu membresía de tienda expira en 7 días. Renueva para evitar interrupciones.',
    'Tu membresía de tienda expira el ' || 
    TO_CHAR(p.membership_expires_at, 'DD/MM/YYYY') || 
    '. Renueva ahora para mantener tu tienda activa.',
    jsonb_build_object(
      'membership_level', p.membership_level,
      'expires_at', p.membership_expires_at,
      'days_remaining', 7
    )
  FROM profiles p
  WHERE p.membership_level = 'store'
    AND p.membership_expires_at IS NOT NULL
    AND p.membership_expires_at BETWEEN NOW() + INTERVAL '7 days' AND NOW() + INTERVAL '8 days'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = p.id
        AND n.type = 'system'
        AND n.title = 'Tu membresía de tienda expira pronto'
        AND n.created_at > NOW() - INTERVAL '1 day'
    );
  
  GET DIAGNOSTICS v_notified_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'notified_count', v_notified_count,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

#### **3.2 Notificación 1 Día Antes**
Similar a 3.1, pero con `INTERVAL '1 day'` y `INTERVAL '2 days'`

---

#### **3.3 Notificación al Expirar**
**Archivo:** Modificar `src/app/api/cron/expire-memberships/route.ts`

```typescript
// Agregar después de pausar productos
if (user.membership_level === 'store') {
  await supabase.from('notifications').insert({
    user_id: user.id,
    type: 'system',
    title: 'Membresía de tienda expirada',
    message: 'Tu membresía de tienda ha expirado. Tu tienda y productos han sido pausados.',
    content: `Tu membresía de tienda expiró el ${new Date(user.membership_expires_at).toLocaleDateString('es-PY')}. 
               Tu tienda ha sido desactivada y tus productos han sido pausados. 
               Renueva tu membresía para reactivarlos.`,
    data: {
      membership_level: 'store',
      expires_at: user.membership_expires_at,
      action_required: 'renew_membership',
      renewal_link: `/memberships?plan=store`
    }
  });
}
```

---

### **FASE 4: Reactivación Automática** 🟢 MEDIA
**Duración:** 1 día  
**Prioridad:** P2 (Media)

#### **4.1 Reactivar Tienda al Renovar Membresía**
**Archivo:** Modificar función `activate_membership_subscription()` o crear trigger

```sql
-- Trigger o función que se ejecuta al renovar membresía
CREATE OR REPLACE FUNCTION reactivate_store_on_membership_renewal()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se activa una suscripción de plan "store"
  IF EXISTS (
    SELECT 1 FROM membership_plans mp
    WHERE mp.id = NEW.plan_id
      AND mp.level = 'store'
  ) THEN
    -- Reactivar tienda
    UPDATE stores
    SET 
      is_active = true,
      updated_at = NOW()
    WHERE seller_id = NEW.user_id
      AND is_active = false;
    
    -- Reactivar productos pausados
    PERFORM reactivate_paused_products_on_renewal(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
CREATE TRIGGER trigger_reactivate_store_on_renewal
  AFTER INSERT OR UPDATE ON membership_subscriptions
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION reactivate_store_on_membership_renewal();
```

---

## 🧪 PLAN DE TESTING

### **Tests Unitarios (SQL)**
- [ ] `is_user_store_owner()` con membresía activa → `true`
- [ ] `is_user_store_owner()` con membresía expirada → `false`
- [ ] `check_and_expire_memberships()` desactiva tiendas correctamente
- [ ] `pause_products_on_membership_expiration()` pausa productos de tiendas expiradas
- [ ] `get_user_publication_limits()` bloquea publicación en tiendas expiradas

### **Tests de Integración**
- [ ] Flujo completo: expiración → desactivación → pausa → notificación
- [ ] Flujo de renovación: renovar → reactivación → productos activos
- [ ] Validación en frontend: no permite crear productos si expirada
- [ ] Validación en frontend: oculta tienda expirada en página pública

### **Tests Manuales**
- [ ] Crear tienda con membresía "store"
- [ ] Simular expiración (cambiar fecha manualmente)
- [ ] Verificar que cron desactiva tienda
- [ ] Verificar que productos se pausan
- [ ] Verificar que no se puede crear producto nuevo
- [ ] Verificar que tienda no aparece en página pública
- [ ] Renovar membresía
- [ ] Verificar que tienda se reactiva
- [ ] Verificar que productos se reactivan

---

## ⚠️ RIESGOS Y MITIGACIONES

### **Riesgo 1: Productos Activos Perdidos**
**Descripción:** Si un vendedor tiene productos activos cuando expira, pueden perderse ventas.

**Mitigación:**
- ✅ Pausar productos (no eliminar) permite reactivación inmediata
- ✅ Notificar proactivamente 7 días y 1 día antes
- ✅ Permitir renovación rápida para reactivar

**Severidad:** Media  
**Probabilidad:** Baja

---

### **Riesgo 2: Falsos Positivos en Expiración**
**Descripción:** El cron puede marcar como expirada una membresía que no debería.

**Mitigación:**
- ✅ Usar `membership_expires_at < NOW()` (no `<=`)
- ✅ Verificar en múltiples puntos (no solo cron)
- ✅ Logs detallados para debugging
- ✅ Plan de rollback documentado

**Severidad:** Alta  
**Probabilidad:** Muy Baja

---

### **Riesgo 3: Performance del Cron**
**Descripción:** Si hay muchas tiendas, el cron puede ser lento.

**Mitigación:**
- ✅ Procesar solo usuarios con expiración reciente (última hora)
- ✅ Usar índices en `membership_expires_at`
- ✅ Procesar en batches si es necesario

**Severidad:** Media  
**Probabilidad:** Baja

---

### **Riesgo 4: Reactivación Incorrecta**
**Descripción:** Al renovar, puede reactivar productos que no deberían estar activos.

**Mitigación:**
- ✅ Usar función `reactivate_paused_products_on_renewal()` existente
- ✅ Verificar límites antes de reactivar
- ✅ Solo reactivar productos pausados por expiración (no otros)

**Severidad:** Media  
**Probabilidad:** Baja

---

## 🔄 PLAN DE ROLLBACK

### **Si hay Problemas Críticos:**

1. **Revertir Migraciones SQL:**
   ```sql
   -- Restaurar funciones anteriores desde backup
   -- O ejecutar migración de rollback
   ```

2. **Revertir Código Frontend:**
   ```bash
   git revert <commit-hash>
   git push
   ```

3. **Reactivar Tiendas Manualmente:**
   ```sql
   UPDATE stores
   SET is_active = true
   WHERE seller_id IN (
     SELECT id FROM profiles WHERE membership_level = 'store'
   );
   ```

4. **Reactivar Productos Manualmente:**
   ```sql
   UPDATE products
   SET status = 'active'
   WHERE seller_id IN (
     SELECT id FROM profiles WHERE membership_level = 'store'
   )
   AND status = 'paused';
   ```

---

## 📊 MÉTRICAS DE ÉXITO

### **Métricas Técnicas**
- ✅ 100% de tiendas expiradas se desactivan automáticamente
- ✅ 100% de productos de tiendas expiradas se pausan
- ✅ 0% de productos nuevos creados en tiendas expiradas
- ✅ 0% de tiendas expiradas visibles en página pública

### **Métricas de Negocio**
- 📈 Aumento en tasa de renovación de membresías "store"
- 📉 Reducción en uso no pagado de plataforma
- 📈 Mejora en confianza del sistema de membresías

### **Métricas de Usuario**
- ✅ 100% de vendedores notificados 7 días antes
- ✅ 100% de vendedores notificados 1 día antes
- ✅ 100% de vendedores notificados al expirar
- ✅ Tiempo promedio de reactivación < 24 horas

---

## 📅 TIMELINE DETALLADO

### **Semana 1: Backend**
- **Día 1-2:** Fase 1.1 - Modificar `is_user_store_owner()`
- **Día 2-3:** Fase 1.2 - Modificar `check_and_expire_memberships()`
- **Día 3:** Fase 1.3 - Modificar `pause_products_on_membership_expiration()`
- **Día 3-4:** Fase 1.4 - Modificar `get_user_publication_limits()`
- **Día 4:** Testing SQL

### **Semana 1-2: Frontend**
- **Día 5:** Fase 2.1 - Ocultar tiendas expiradas
- **Día 5-6:** Fase 2.2 - Validar en formulario
- **Día 6:** Fase 2.3 - Banner de advertencia

### **Semana 2: Notificaciones y Reactivación**
- **Día 7:** Fase 3 - Notificaciones proactivas
- **Día 8:** Fase 4 - Reactivación automática

### **Semana 2: Testing y Deploy**
- **Día 9:** Testing completo
- **Día 10:** Deploy a producción

---

## 👥 RECURSOS NECESARIOS

### **Equipo**
- ✅ **Backend Developer:** Implementar funciones SQL (2-3 días)
- ✅ **Frontend Developer:** Implementar validaciones UI (1-2 días)
- ✅ **QA:** Testing completo (1 día)
- ✅ **LPMS:** Revisión y aprobación (on-going)

### **Herramientas**
- ✅ Supabase (SQL migrations)
- ✅ Next.js (Frontend)
- ✅ Git (Version control)
- ✅ Testing tools (Jest, SQL tests)

---

## ✅ CHECKLIST DE APROBACIÓN

### **Antes de Implementar:**
- [ ] Plan revisado y aprobado por LPMS
- [ ] Recursos asignados
- [ ] Timeline confirmado
- [ ] Riesgos evaluados y mitigaciones aceptadas

### **Antes de Deploy:**
- [ ] Todos los tests pasando
- [ ] Code review completado
- [ ] Documentación actualizada
- [ ] Plan de rollback probado
- [ ] Notificación a stakeholders

---

## 📝 NOTAS ADICIONALES

### **Consideraciones Futuras**
- **Grace Period:** Evaluar período de gracia (ej: 3 días) antes de desactivar
- **Refund Policy:** Evaluar política de reembolso para productos activos
- **Tiered Expiration:** Evaluar diferentes niveles de restricción según tiempo de expiración

### **Dependencias**
- ✅ Sistema de notificaciones existente
- ✅ Sistema de membresías existente
- ✅ Cron jobs configurados

---

## 🎯 DECISIÓN REQUERIDA

**¿Aprobar este plan para implementación?**

- [ ] ✅ **APROBADO** - Proceder con implementación
- [ ] ⏸️ **PENDIENTE** - Requiere cambios (especificar)
- [ ] ❌ **RECHAZADO** - Motivo: _______________

**Aprobado por:** _________________  
**Fecha:** _________________  
**Comentarios:** _________________

---

*Plan generado por análisis LPMS - Mercadito Online PY*
















