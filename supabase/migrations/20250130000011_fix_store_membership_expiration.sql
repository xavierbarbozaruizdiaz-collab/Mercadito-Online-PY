-- ============================================
-- MERCADITO ONLINE PY - FIX EXPIRACIÓN MEMBRESÍA TIENDA
-- Solución completa para manejar expiración de membresías "store"
-- Fase 1: Backend SQL - Funciones Core
-- ============================================

-- ============================================
-- 1. MODIFICAR: is_user_store_owner()
-- Verificar que la membresía "store" esté activa (no expirada)
-- ============================================

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

COMMENT ON FUNCTION is_user_store_owner IS 'Verifica si el usuario tiene una tienda activa con membresía "store" activa (no expirada)';

-- ============================================
-- 2. MODIFICAR: check_and_expire_memberships()
-- Desactivar tiendas cuando expira membresía "store"
-- ============================================

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
  INNER JOIN membership_subscriptions ms ON ms.user_id = p.id
  INNER JOIN membership_plans mp ON mp.id = ms.plan_id
  WHERE s.seller_id = p.id
    AND p.membership_level = 'free' -- Ya fue actualizado arriba
    AND s.is_active = true
    AND ms.status = 'expired'
    AND ms.expires_at <= NOW()
    AND mp.level = 'store';
  
  GET DIAGNOSTICS v_stores_deactivated = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'expired_count', v_expired_count,
    'stores_deactivated', v_stores_deactivated,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_and_expire_memberships IS 'Verifica y expira membresías vencidas, desactiva tiendas de membresías "store" expiradas';

-- ============================================
-- 3. MODIFICAR: pause_products_on_membership_expiration()
-- Pausar productos de tiendas expiradas
-- ============================================

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
    -- Si llegamos aquí, la membresía está activa (is_user_store_owner ya validó)
    -- No hacer nada, mantener productos activos
    RETURN QUERY SELECT
      0::INTEGER as products_paused,
      count_user_active_products(p_user_id) as products_kept_active,
      'Usuario tiene tienda activa, no se aplican límites'::TEXT as message;
    RETURN;
  END IF;
  
  -- Si NO es store owner pero tenía membresía "store" expirada, pausar productos
  IF v_profile.membership_level = 'free' 
     AND EXISTS (
       SELECT 1 FROM stores 
       WHERE seller_id = p_user_id 
         AND is_active = false
     ) THEN
    -- Membresía de tienda expirada: pausar TODOS los productos activos
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
  
  -- Lógica existente para usuarios no-store (free, bronze, silver, gold)
  -- Si no tiene perfil o no tiene membresía, tratar como "free" (límite 0)
  IF NOT FOUND OR v_profile.membership_level IS NULL THEN
    v_max_products := 0;
  ELSIF v_profile.membership_expires_at IS NOT NULL 
       AND v_profile.membership_expires_at < NOW() THEN
    -- Membresía expirada: tratar como "free" (límite 0)
    v_max_products := 0;
  ELSE
    -- Membresía activa: obtener límite del plan
    SELECT max_products INTO v_max_products
    FROM membership_plans
    WHERE level = v_profile.membership_level
      AND is_active = true;
    
    -- Si no se encuentra el plan, tratar como "free"
    IF v_max_products IS NULL THEN
      v_max_products := 0;
    END IF;
  END IF;
  
  -- Contar productos activos del usuario
  v_active_products_count := count_user_active_products(p_user_id);
  
  -- Si no excede el límite, no hacer nada
  IF v_active_products_count <= v_max_products THEN
    RETURN QUERY SELECT
      0::INTEGER as products_paused,
      v_active_products_count as products_kept_active,
      ('No se requieren cambios. Productos activos: ' || v_active_products_count || ', Límite: ' || COALESCE(v_max_products::TEXT, '∞'))::TEXT as message;
    RETURN;
  END IF;
  
  -- Calcular cuántos productos pausar
  v_paused_count := v_active_products_count - v_max_products;
  
  -- Pausar productos más recientes que excedan el límite
  UPDATE products
  SET 
    status = 'paused',
    updated_at = NOW()
  WHERE seller_id = p_user_id
    AND (
      status IS NULL OR 
      status = 'active' OR
      (status != 'deleted' AND status != 'archived')
    )
    AND id IN (
      SELECT id
      FROM products
      WHERE seller_id = p_user_id
        AND (
          status IS NULL OR 
          status = 'active' OR
          (status != 'deleted' AND status != 'archived')
        )
      ORDER BY created_at DESC
      LIMIT v_paused_count
    );
  
  GET DIAGNOSTICS v_paused_count = ROW_COUNT;
  
  -- Contar productos que quedaron activos
  v_kept_active := count_user_active_products(p_user_id);
  
  RETURN QUERY SELECT
    v_paused_count as products_paused,
    v_kept_active as products_kept_active,
    ('Se pausaron ' || v_paused_count || ' producto(s). ' || 
     v_kept_active || ' producto(s) siguen activos (dentro del límite de ' || 
     COALESCE(v_max_products::TEXT, '∞') || ')')::TEXT as message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION pause_products_on_membership_expiration IS 'Pausa productos que exceden el límite cuando expira o no tiene membresía. Incluye lógica para tiendas expiradas.';

-- ============================================
-- 4. MODIFICAR: get_user_publication_limits()
-- Bloquear publicación en tiendas expiradas
-- ============================================

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
  v_current_products INTEGER;
  v_plan RECORD;
  v_can_publish BOOLEAN;
  v_can_publish_more BOOLEAN;
  v_products_remaining INTEGER;
  v_requires_upgrade BOOLEAN;
  v_message TEXT;
  v_suggested_plan_level TEXT;
  v_suggested_plan_name TEXT;
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
  
  -- Si NO es store owner pero tenía membresía "store" (expirada), bloquear publicación
  IF v_profile.membership_level = 'free' 
     AND EXISTS (
       SELECT 1 FROM stores 
       WHERE seller_id = p_user_id 
         AND is_active = false
     ) THEN
    -- Membresía de tienda expirada: bloquear publicación
    RETURN QUERY SELECT
      false as can_publish,
      false as is_store_owner, -- Ya no es store owner activo
      'free'::TEXT as membership_level,
      NULL::TIMESTAMPTZ as membership_expires_at,
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
  
  -- Si no tiene perfil, no puede publicar
  IF NOT FOUND OR v_profile.membership_level IS NULL THEN
    RETURN QUERY SELECT
      false as can_publish,
      false as is_store_owner,
      'free'::TEXT as membership_level,
      NULL::TIMESTAMPTZ as membership_expires_at,
      0 as max_products,
      count_user_active_products(p_user_id) as current_products,
      false as can_publish_more,
      0 as products_remaining,
      0::DECIMAL(12,2) as max_price_base,
      'Necesitas una membresía para publicar productos. Las membresías Gratis no pueden publicar.'::TEXT as message,
      true as requires_upgrade,
      'bronze'::TEXT as suggested_plan_level,
      'Bronce'::TEXT as suggested_plan_name;
    RETURN;
  END IF;
  
  -- Verificar si la membresía está expirada
  IF v_profile.membership_expires_at IS NOT NULL 
     AND v_profile.membership_expires_at < NOW() THEN
    RETURN QUERY SELECT
      false as can_publish,
      false as is_store_owner,
      v_profile.membership_level as membership_level,
      v_profile.membership_expires_at as membership_expires_at,
      0 as max_products,
      count_user_active_products(p_user_id) as current_products,
      false as can_publish_more,
      0 as products_remaining,
      0::DECIMAL(12,2) as max_price_base,
      'Tu membresía ' || v_profile.membership_level || ' ha expirado. Renueva para continuar publicando.'::TEXT as message,
      true as requires_upgrade,
      v_profile.membership_level as suggested_plan_level,
      INITCAP(v_profile.membership_level) as suggested_plan_name;
    RETURN;
  END IF;
  
  -- Obtener límites del plan
  SELECT 
    mp.max_products,
    mp.max_price_base,
    mp.level,
    mp.name
  INTO v_plan
  FROM membership_plans mp
  WHERE mp.level = v_profile.membership_level
    AND mp.is_active = true;
  
  -- Si no se encuentra el plan, usar límites por defecto (0)
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false as can_publish,
      false as is_store_owner,
      v_profile.membership_level as membership_level,
      v_profile.membership_expires_at as membership_expires_at,
      0 as max_products,
      count_user_active_products(p_user_id) as current_products,
      false as can_publish_more,
      0 as products_remaining,
      0::DECIMAL(12,2) as max_price_base,
      'Plan de membresía no encontrado. Contacta al administrador.'::TEXT as message,
      true as requires_upgrade,
      NULL::TEXT as suggested_plan_level,
      NULL::TEXT as suggested_plan_name;
    RETURN;
  END IF;
  
  -- Contar productos actuales
  v_current_products := count_user_active_products(p_user_id);
  
  -- Calcular si puede publicar más
  IF v_plan.max_products IS NULL THEN
    -- Ilimitado
    v_can_publish_more := true;
    v_products_remaining := NULL;
    v_requires_upgrade := false;
  ELSIF v_current_products < v_plan.max_products THEN
    v_can_publish_more := true;
    v_products_remaining := v_plan.max_products - v_current_products;
    v_requires_upgrade := false;
  ELSE
    v_can_publish_more := false;
    v_products_remaining := 0;
    v_requires_upgrade := true;
    
    -- Sugerir siguiente plan
    IF v_profile.membership_level = 'bronze' THEN
      v_suggested_plan_level := 'silver';
      v_suggested_plan_name := 'Plata';
    ELSIF v_profile.membership_level = 'silver' THEN
      v_suggested_plan_level := 'gold';
      v_suggested_plan_name := 'Oro';
    END IF;
  END IF;
  
  -- Determinar mensaje
  IF v_can_publish_more THEN
    IF v_products_remaining IS NULL THEN
      v_message := 'Puedes publicar productos ilimitados.';
    ELSE
      v_message := 'Tienes ' || v_products_remaining || ' producto(s) disponible(s) de tu límite de ' || v_plan.max_products || '.';
    END IF;
  ELSE
    v_message := 'Has alcanzado el límite de ' || v_plan.max_products || ' productos de tu plan ' || v_plan.name || '.';
    IF v_suggested_plan_level IS NOT NULL THEN
      v_message := v_message || ' Actualiza a ' || v_suggested_plan_name || ' para publicar más.';
    END IF;
  END IF;
  
  -- Puede publicar si tiene membresía activa (aunque pueda haber alcanzado límite de cantidad)
  v_can_publish := true;
  
  RETURN QUERY SELECT
    v_can_publish,
    false as is_store_owner,
    v_profile.membership_level as membership_level,
    v_profile.membership_expires_at as membership_expires_at,
    v_plan.max_products as max_products,
    v_current_products as current_products,
    v_can_publish_more as can_publish_more,
    v_products_remaining as products_remaining,
    v_plan.max_price_base as max_price_base,
    v_message as message,
    v_requires_upgrade as requires_upgrade,
    v_suggested_plan_level as suggested_plan_level,
    v_suggested_plan_name as suggested_plan_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_publication_limits IS 'Obtiene todos los límites de publicación del usuario (productos y precio). Incluye validación de expiración para tiendas.';





