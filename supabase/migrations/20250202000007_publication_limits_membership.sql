-- ============================================
-- MERCADITO ONLINE PY - LÍMITES DE PUBLICACIÓN POR MEMBRESÍA
-- Sistema para restringir publicación de productos según membresía
-- Las tiendas pueden publicar sin restricciones
-- ============================================

-- ============================================
-- 1. ACTUALIZAR TABLA MEMBERSHIP_PLANS
-- Agregar campos para límites de publicación
-- ============================================

ALTER TABLE membership_plans
ADD COLUMN IF NOT EXISTS max_products INTEGER, -- NULL = ilimitado
ADD COLUMN IF NOT EXISTS max_price_base DECIMAL(12,2); -- NULL = ilimitado (precio base, no final)

COMMENT ON COLUMN membership_plans.max_products IS 'Límite máximo de productos activos. NULL = ilimitado';
COMMENT ON COLUMN membership_plans.max_price_base IS 'Límite máximo de precio base (antes de comisiones). NULL = ilimitado';

-- Actualizar planes con límites según especificación
-- Bronce: 20,000 Gs, hasta 5 artículos, precio máximo 2,500,000 Gs
UPDATE membership_plans
SET 
  max_products = 5,
  max_price_base = 2500000,
  price_monthly = 20000
WHERE level = 'bronze';

-- Plata: 50,000 Gs, hasta 10 artículos, precio máximo 10,000,000 Gs
UPDATE membership_plans
SET 
  max_products = 10,
  max_price_base = 10000000,
  price_monthly = 50000
WHERE level = 'silver';

-- Oro: Sin límite de productos ni precio
UPDATE membership_plans
SET 
  max_products = NULL, -- Ilimitado
  max_price_base = NULL, -- Ilimitado
  price_monthly = COALESCE(price_monthly, 100000) -- Mantener o establecer precio
WHERE level = 'gold';

-- ============================================
-- 2. FUNCIÓN: count_user_active_products()
-- Cuenta productos activos de un usuario
-- ============================================

CREATE OR REPLACE FUNCTION count_user_active_products(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM products
  WHERE seller_id = p_user_id
    AND (
      status IS NULL OR 
      status = 'active' OR
      (status != 'deleted' AND status != 'archived')
    );
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION count_user_active_products IS 'Cuenta productos activos de un usuario (excluye pausados, archivados, eliminados)';

-- ============================================
-- 3. FUNCIÓN: is_user_store_owner()
-- Verifica si el usuario es dueño de una tienda activa
-- ============================================

CREATE OR REPLACE FUNCTION is_user_store_owner(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_store BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM stores
    WHERE seller_id = p_user_id
      AND is_active = true
      AND (status IS NULL OR status = 'active')
  ) INTO v_has_store;
  
  RETURN COALESCE(v_has_store, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_user_store_owner IS 'Verifica si el usuario tiene una tienda activa (tiendas no tienen límites de publicación)';

-- ============================================
-- 4. FUNCIÓN: get_user_publication_limits()
-- Obtiene todos los límites de publicación del usuario
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
  -- Verificar si es dueño de tienda
  SELECT is_user_store_owner(p_user_id) INTO v_store_owner;
  
  -- Si es dueño de tienda, no hay límites
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
  
  -- Obtener perfil y membresía
  SELECT 
    p.membership_level,
    p.membership_expires_at
  INTO v_profile
  FROM profiles p
  WHERE p.id = p_user_id;
  
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

COMMENT ON FUNCTION get_user_publication_limits IS 'Obtiene todos los límites de publicación del usuario (productos y precio)';

-- ============================================
-- 5. FUNCIÓN: check_can_publish_product()
-- Valida si puede publicar un producto específico
-- ============================================

CREATE OR REPLACE FUNCTION check_can_publish_product(
  p_user_id UUID,
  p_price_base DECIMAL(12,2)
)
RETURNS TABLE (
  can_publish BOOLEAN,
  reason TEXT,
  suggested_plan_level TEXT,
  suggested_plan_name TEXT,
  current_products INTEGER,
  max_products INTEGER,
  can_publish_more_products BOOLEAN,
  price_exceeds_limit BOOLEAN,
  max_price_base DECIMAL(12,2)
) AS $$
DECLARE
  v_limits RECORD;
  v_price_exceeds BOOLEAN;
  v_can_publish_result BOOLEAN;
  v_reason TEXT;
BEGIN
  -- Obtener límites del usuario
  SELECT * INTO v_limits
  FROM get_user_publication_limits(p_user_id);
  
  -- Si es dueño de tienda, siempre puede publicar
  IF v_limits.is_store_owner THEN
    RETURN QUERY SELECT
      true as can_publish,
      'Tienes una tienda activa'::TEXT as reason,
      NULL::TEXT as suggested_plan_level,
      NULL::TEXT as suggested_plan_name,
      v_limits.current_products as current_products,
      NULL::INTEGER as max_products,
      true as can_publish_more_products,
      false as price_exceeds_limit,
      NULL::DECIMAL(12,2) as max_price_base;
    RETURN;
  END IF;
  
  -- Verificar si puede publicar por membresía
  IF NOT v_limits.can_publish THEN
    RETURN QUERY SELECT
      false as can_publish,
      v_limits.message as reason,
      v_limits.suggested_plan_level as suggested_plan_level,
      v_limits.suggested_plan_name as suggested_plan_name,
      v_limits.current_products as current_products,
      v_limits.max_products as max_products,
      false as can_publish_more_products,
      false as price_exceeds_limit,
      v_limits.max_price_base as max_price_base;
    RETURN;
  END IF;
  
  -- Verificar límite de cantidad
  IF NOT v_limits.can_publish_more THEN
    RETURN QUERY SELECT
      false as can_publish,
      'Has alcanzado el límite de ' || v_limits.max_products || ' productos'::TEXT as reason,
      v_limits.suggested_plan_level as suggested_plan_level,
      v_limits.suggested_plan_name as suggested_plan_name,
      v_limits.current_products as current_products,
      v_limits.max_products as max_products,
      false as can_publish_more_products,
      false as price_exceeds_limit,
      v_limits.max_price_base as max_price_base;
    RETURN;
  END IF;
  
  -- Verificar límite de precio
  IF v_limits.max_price_base IS NOT NULL AND p_price_base > v_limits.max_price_base THEN
    v_price_exceeds := true;
    v_reason := 'El precio base (' || TO_CHAR(p_price_base, 'FM999G999G999D00') || ' Gs.) excede el límite de tu plan ' || v_limits.membership_level || ' (' || TO_CHAR(v_limits.max_price_base, 'FM999G999G999D00') || ' Gs.)';
    
    -- Sugerir plan superior
    IF v_limits.membership_level = 'bronze' THEN
      v_reason := v_reason || '. Actualiza a Plata para publicar hasta 10,000,000 Gs.';
      RETURN QUERY SELECT
        false as can_publish,
        v_reason as reason,
        'silver'::TEXT as suggested_plan_level,
        'Plata'::TEXT as suggested_plan_name,
        v_limits.current_products as current_products,
        v_limits.max_products as max_products,
        true as can_publish_more_products,
        true as price_exceeds_limit,
        v_limits.max_price_base as max_price_base;
      RETURN;
    ELSIF v_limits.membership_level = 'silver' THEN
      v_reason := v_reason || '. Actualiza a Oro para publicar sin límite de precio.';
      RETURN QUERY SELECT
        false as can_publish,
        v_reason as reason,
        'gold'::TEXT as suggested_plan_level,
        'Oro'::TEXT as suggested_plan_name,
        v_limits.current_products as current_products,
        v_limits.max_products as max_products,
        true as can_publish_more_products,
        true as price_exceeds_limit,
        v_limits.max_price_base as max_price_base;
      RETURN;
    END IF;
  ELSE
    v_price_exceeds := false;
  END IF;
  
  -- Todo está bien, puede publicar
  RETURN QUERY SELECT
    true as can_publish,
    'Puedes publicar este producto'::TEXT as reason,
    NULL::TEXT as suggested_plan_level,
    NULL::TEXT as suggested_plan_name,
    v_limits.current_products as current_products,
    v_limits.max_products as max_products,
    true as can_publish_more_products,
    v_price_exceeds as price_exceeds_limit,
    v_limits.max_price_base as max_price_base;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_can_publish_product IS 'Valida si un usuario puede publicar un producto específico (verifica cantidad y precio)';

-- ============================================
-- 6. ACTUALIZAR PRECIOS DE PLANES
-- ============================================

-- Los precios ya se actualizaron arriba, pero asegurémonos:
UPDATE membership_plans
SET price_monthly = 20000
WHERE level = 'bronze' AND price_monthly != 20000;

UPDATE membership_plans
SET price_monthly = 50000
WHERE level = 'silver' AND price_monthly != 50000;

-- ============================================
-- 7. ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

CREATE INDEX IF NOT EXISTS idx_products_seller_status 
ON products(seller_id, status) 
WHERE status IS NULL OR status = 'active';

CREATE INDEX IF NOT EXISTS idx_stores_seller_active 
ON stores(seller_id, is_active) 
WHERE is_active = true;




