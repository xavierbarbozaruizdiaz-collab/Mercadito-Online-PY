-- ============================================
-- MERCADITO ONLINE PY - NOTIFICACIONES Y REACTIVACIÓN
-- Fase 3: Notificaciones proactivas
-- Fase 4: Reactivación automática
-- ============================================

-- ============================================
-- 1. FUNCIÓN: notify_upcoming_membership_expiry()
-- Notificar usuarios con membresía "store" que expira pronto
-- ============================================

CREATE OR REPLACE FUNCTION notify_upcoming_membership_expiry()
RETURNS JSONB AS $$
DECLARE
  v_notified_7days INTEGER := 0;
  v_notified_1day INTEGER := 0;
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
    '. Renueva ahora para mantener tu tienda activa y evitar que tus productos sean pausados.',
    jsonb_build_object(
      'membership_level', 'store',
      'expires_at', p.membership_expires_at,
      'days_remaining', 7,
      'action_required', 'renew_membership',
      'renewal_link', '/memberships?plan=store'
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
        AND n.data->>'days_remaining' = '7'
        AND n.created_at > NOW() - INTERVAL '1 day'
    );
  
  GET DIAGNOSTICS v_notified_7days = ROW_COUNT;
  
  -- Notificar usuarios con membresía "store" que expira en 1 día
  INSERT INTO notifications (user_id, type, title, message, content, data)
  SELECT 
    p.id,
    'system',
    'Tu membresía de tienda expira mañana',
    'Tu membresía de tienda expira en 1 día. Renueva ahora para evitar que tu tienda sea desactivada.',
    'Tu membresía de tienda expira mañana (' || 
    TO_CHAR(p.membership_expires_at, 'DD/MM/YYYY') || 
    '). Renueva ahora para mantener tu tienda activa y evitar que tus productos sean pausados automáticamente.',
    jsonb_build_object(
      'membership_level', 'store',
      'expires_at', p.membership_expires_at,
      'days_remaining', 1,
      'action_required', 'renew_membership',
      'renewal_link', '/memberships?plan=store',
      'urgent', true
    )
  FROM profiles p
  WHERE p.membership_level = 'store'
    AND p.membership_expires_at IS NOT NULL
    AND p.membership_expires_at BETWEEN NOW() + INTERVAL '1 day' AND NOW() + INTERVAL '2 days'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = p.id
        AND n.type = 'system'
        AND n.title = 'Tu membresía de tienda expira mañana'
        AND n.data->>'days_remaining' = '1'
        AND n.created_at > NOW() - INTERVAL '1 day'
    );
  
  GET DIAGNOSTICS v_notified_1day = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'notified_7days', v_notified_7days,
    'notified_1day', v_notified_1day,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_upcoming_membership_expiry IS 'Notifica a usuarios con membresía "store" que expira en 7 días y 1 día';

-- ============================================
-- 2. FUNCIÓN: reactivate_store_on_membership_renewal()
-- Reactiva tienda y productos al renovar membresía "store"
-- ============================================

CREATE OR REPLACE FUNCTION reactivate_store_on_membership_renewal()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_level TEXT;
  v_reactivated_stores INTEGER := 0;
  v_reactivated_products INTEGER := 0;
BEGIN
  -- Solo procesar si la suscripción está activa
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;
  
  -- Obtener el nivel del plan
  SELECT level INTO v_plan_level
  FROM membership_plans
  WHERE id = NEW.plan_id;
  
  -- Si se activa una suscripción de plan "store"
  IF v_plan_level = 'store' THEN
    -- Reactivar tienda
    UPDATE stores
    SET 
      is_active = true,
      updated_at = NOW()
    WHERE seller_id = NEW.user_id
      AND is_active = false;
    
    GET DIAGNOSTICS v_reactivated_stores = ROW_COUNT;
    
    -- Reactivar productos pausados usando función existente
    PERFORM reactivate_paused_products_on_renewal(NEW.user_id);
    
    -- Actualizar perfil del usuario
    UPDATE profiles
    SET 
      membership_level = 'store',
      membership_expires_at = NEW.expires_at,
      updated_at = NOW()
    WHERE id = NEW.user_id;
    
    -- Crear notificación de reactivación
    INSERT INTO notifications (user_id, type, title, message, content, data)
    VALUES (
      NEW.user_id,
      'system',
      'Tienda reactivada',
      'Tu membresía de tienda ha sido renovada. Tu tienda y productos han sido reactivados.',
      'Tu membresía de tienda ha sido renovada exitosamente. Tu tienda está activa nuevamente y todos tus productos pausados han sido reactivados.',
      jsonb_build_object(
        'membership_level', 'store',
        'expires_at', NEW.expires_at,
        'stores_reactivated', v_reactivated_stores,
        'action', 'store_reactivated'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reactivate_store_on_membership_renewal IS 'Reactiva tienda y productos cuando se renueva membresía "store"';

-- ============================================
-- 3. CREAR TRIGGER: trigger_reactivate_store_on_renewal
-- Se ejecuta automáticamente al insertar/actualizar suscripciones
-- ============================================

DROP TRIGGER IF EXISTS trigger_reactivate_store_on_renewal ON membership_subscriptions;

CREATE TRIGGER trigger_reactivate_store_on_renewal
  AFTER INSERT OR UPDATE ON membership_subscriptions
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION reactivate_store_on_membership_renewal();

COMMENT ON TRIGGER trigger_reactivate_store_on_renewal ON membership_subscriptions IS 'Reactiva tienda y productos automáticamente al renovar membresía "store"';





