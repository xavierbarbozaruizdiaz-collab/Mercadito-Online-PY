-- ============================================
-- MERCADITO ONLINE PY - APROBACIÓN MANUAL DE MEMBRESÍAS
-- Función para aprobar suscripciones pendientes (transferencias bancarias)
-- ============================================

-- Función para aprobar una suscripción pendiente
-- Esta función toma una suscripción pendiente y la activa con la duración especificada
CREATE OR REPLACE FUNCTION approve_pending_membership_subscription(
  p_subscription_id UUID,
  p_duration_days INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_subscription RECORD;
  v_plan RECORD;
  v_duration_days INTEGER;
  v_starts_at TIMESTAMPTZ;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Obtener suscripción pendiente
  SELECT * INTO v_subscription
  FROM membership_subscriptions
  WHERE id = p_subscription_id
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Suscripción no encontrada o ya no está pendiente'
    );
  END IF;
  
  -- Obtener información del plan
  SELECT * INTO v_plan
  FROM membership_plans
  WHERE id = v_subscription.plan_id
    AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Plan de membresía no encontrado o inactivo'
    );
  END IF;
  
  -- Calcular duración
  IF p_duration_days IS NOT NULL AND p_duration_days > 0 THEN
    v_duration_days := p_duration_days;
  ELSE
    -- Usar duración del plan según tipo de suscripción
    v_duration_days := v_plan.duration_days;
    IF v_subscription.subscription_type = 'yearly' THEN
      v_duration_days := v_duration_days * 12;
    END IF;
  END IF;
  
  -- Calcular fechas
  v_starts_at := NOW();
  v_expires_at := NOW() + (v_duration_days || ' days')::INTERVAL;
  
  -- Actualizar suscripción a activa
  UPDATE membership_subscriptions
  SET 
    status = 'active',
    payment_status = 'completed',
    starts_at = v_starts_at,
    expires_at = v_expires_at,
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
      data
    )
    VALUES (
      v_subscription.user_id,
      'system',
      'Membresía aprobada',
      'Tu membresía ' || v_plan.name || ' ha sido aprobada y activada exitosamente',
      'Tu membresía ' || v_plan.name || ' ha sido aprobada. Expira el ' || TO_CHAR(v_expires_at, 'DD/MM/YYYY') || '. ¡Disfruta de todos los beneficios!',
      jsonb_build_object(
        'subscription_id', p_subscription_id,
        'plan_id', v_plan.id,
        'plan_name', v_plan.name,
        'expires_at', v_expires_at,
        'duration_days', v_duration_days
      )
    );
  END IF;
  
  -- Reactivar productos pausados si es una renovación/actualización
  IF EXISTS (SELECT 1 FROM products WHERE seller_id = v_subscription.user_id AND status = 'paused') THEN
    -- Intentar llamar a la función de reactivación si existe
    BEGIN
      PERFORM reactivate_paused_products_on_renewal(v_subscription.user_id);
    EXCEPTION
      WHEN OTHERS THEN
        -- Si la función no existe, no hacer nada
        NULL;
    END;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', p_subscription_id,
    'user_id', v_subscription.user_id,
    'plan_name', v_plan.name,
    'duration_days', v_duration_days,
    'expires_at', v_expires_at,
    'message', 'Suscripción aprobada exitosamente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario
COMMENT ON FUNCTION approve_pending_membership_subscription IS 'Aprueba una suscripción pendiente y activa la membresía del usuario con la duración especificada';

