# 🚨 IMPORTANTE: Aplicar Migración SQL

## Problema
La función `approve_pending_membership_subscription` no existe en la base de datos, causando error 404 al aprobar membresías.

## Solución
Ejecutar la siguiente migración SQL en Supabase:

### Opción 1: Desde Supabase Dashboard
1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a "SQL Editor"
4. Copia y pega el contenido completo del archivo:
   `supabase/migrations/20251202000001_fix_approve_pending_membership.sql`
5. Haz clic en "Run"

### Opción 2: Desde CLI
```bash
npx supabase db push
```

### Opción 3: Copiar y pegar directamente

```sql
-- ============================================
-- MERCADITO ONLINE PY - FIX: Aprobar Membresías Pendientes
-- Corrige la función para actualizar suscripciones pendientes en lugar de crear nuevas
-- ============================================

-- Función mejorada que actualiza la suscripción pendiente existente
CREATE OR REPLACE FUNCTION approve_pending_membership_subscription(
  p_subscription_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_subscription RECORD;
  v_plan RECORD;
  v_starts_at TIMESTAMPTZ;
  v_expires_at TIMESTAMPTZ;
  v_duration_days INTEGER;
BEGIN
  -- Obtener la suscripción pendiente
  SELECT * INTO v_subscription
  FROM membership_subscriptions
  WHERE id = p_subscription_id
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Suscripción pendiente no encontrada o ya procesada';
  END IF;
  
  -- Obtener información del plan
  SELECT * INTO v_plan
  FROM membership_plans
  WHERE id = v_subscription.plan_id
    AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan de membresía no encontrado o inactivo';
  END IF;
  
  -- Calcular duración según tipo
  IF v_subscription.subscription_type = 'monthly' THEN
    v_duration_days := v_plan.duration_days;
  ELSIF v_subscription.subscription_type = 'yearly' THEN
    v_duration_days := v_plan.duration_days * 12;
  ELSE -- one_time
    v_duration_days := v_plan.duration_days;
  END IF;
  
  -- Calcular fechas (inicio ahora, expiración según duración)
  v_starts_at := NOW();
  v_expires_at := NOW() + (v_duration_days || ' days')::INTERVAL;
  
  -- Desactivar suscripciones anteriores activas del mismo usuario
  UPDATE membership_subscriptions
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE user_id = v_subscription.user_id
    AND status = 'active'
    AND id != p_subscription_id;
  
  -- ACTUALIZAR la suscripción pendiente a activa (no crear nueva)
  UPDATE membership_subscriptions
  SET 
    status = 'active',
    starts_at = v_starts_at,
    expires_at = v_expires_at,
    payment_status = 'completed',
    paid_at = NOW(),
    updated_at = NOW()
  WHERE id = p_subscription_id;
  
  -- Actualizar perfil del usuario
  UPDATE profiles
  SET 
    membership_level = v_plan.level,
    membership_expires_at = v_expires_at,
    updated_at = NOW()
  WHERE id = v_subscription.user_id;
  
  -- Crear notificación al usuario
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      content,
      data,
      is_read,
      created_at
    )
    VALUES (
      v_subscription.user_id,
      'system',
      '✅ Membresía activada',
      'Tu membresía ' || v_plan.name || ' ha sido activada exitosamente',
      'Tu membresía ' || v_plan.name || ' ha sido activada y ya puedes usar todas las funcionalidades. ' ||
      'Expira el ' || TO_CHAR(v_expires_at, 'DD/MM/YYYY') || '. ' ||
      CASE 
        WHEN v_plan.bid_limit IS NULL THEN 'Límite de puja: Ilimitado. '
        ELSE 'Límite de puja: ' || TO_CHAR(v_plan.bid_limit, 'FM999,999,999') || ' Gs. '
      END ||
      CASE 
        WHEN v_plan.max_products IS NULL THEN ''
        ELSE 'Puedes publicar hasta ' || v_plan.max_products || ' productos. '
      END,
      jsonb_build_object(
        'subscription_id', p_subscription_id,
        'plan_id', v_subscription.plan_id,
        'plan_name', v_plan.name,
        'expires_at', v_expires_at,
        'membership_level', v_plan.level
      ),
      false,
      NOW()
    );
  END IF;
  
  -- Reactivar productos pausados si es una renovación/actualización
  IF EXISTS (SELECT 1 FROM products WHERE seller_id = v_subscription.user_id AND status = 'paused') THEN
    PERFORM reactivate_paused_products_on_renewal(v_subscription.user_id);
  END IF;
  
  RETURN p_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_pending_membership_subscription IS 
  'Aprueba una suscripción pendiente, actualizándola a activa y actualizando el perfil del usuario';
```

## Verificación
Después de aplicar la migración:
1. Ve a `/admin/memberships/pending`
2. Intenta aprobar una membresía pendiente
3. Debe funcionar sin errores 404
4. La suscripción debe desaparecer de la lista de pendientes
5. El usuario debe recibir una notificación













