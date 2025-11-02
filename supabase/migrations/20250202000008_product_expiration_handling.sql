-- ============================================
-- MERCADITO ONLINE PY - MANEJO DE PRODUCTOS AL EXPIRAR MEMBRESÍAS
-- Pausar productos cuando expira membresía y reactivar al renovar
-- ============================================

-- ============================================
-- 1. FUNCIÓN: pause_products_on_membership_expiration()
-- Pausa productos que exceden el límite cuando expira la membresía
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
  -- Verificar si es dueño de tienda (tiendas no tienen límites)
  SELECT is_user_store_owner(p_user_id) INTO v_store_owner;
  
  IF v_store_owner THEN
    -- Dueño de tienda: no hacer nada
    RETURN QUERY SELECT
      0::INTEGER as products_paused,
      count_user_active_products(p_user_id) as products_kept_active,
      'Usuario tiene tienda activa, no se aplican límites'::TEXT as message;
    RETURN;
  END IF;
  
  -- Obtener perfil del usuario
  SELECT 
    membership_level,
    membership_expires_at
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;
  
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
  -- Ordenar por created_at DESC para pausar los más recientes primero
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

COMMENT ON FUNCTION pause_products_on_membership_expiration IS 'Pausa productos que exceden el límite cuando expira o no tiene membresía';

-- ============================================
-- 2. FUNCIÓN: reactivate_paused_products_on_renewal()
-- Reactiva productos pausados cuando renueva/actualiza membresía
-- ============================================

CREATE OR REPLACE FUNCTION reactivate_paused_products_on_renewal(p_user_id UUID)
RETURNS TABLE (
  products_reactivated INTEGER,
  message TEXT
) AS $$
DECLARE
  v_limits RECORD;
  v_paused_products_count INTEGER;
  v_can_reactivate INTEGER;
  v_reactivated_count INTEGER;
BEGIN
  -- Obtener límites actuales del usuario
  SELECT * INTO v_limits
  FROM get_user_publication_limits(p_user_id);
  
  -- Si es dueño de tienda, reactivar todos los productos pausados
  IF v_limits.is_store_owner THEN
    UPDATE products
    SET 
      status = 'active',
      updated_at = NOW()
    WHERE seller_id = p_user_id
      AND status = 'paused';
    
    GET DIAGNOSTICS v_reactivated_count = ROW_COUNT;
    
    RETURN QUERY SELECT
      v_reactivated_count as products_reactivated,
      ('Usuario tiene tienda activa. ' || v_reactivated_count || ' producto(s) reactivados.')::TEXT as message;
    RETURN;
  END IF;
  
  -- Si no puede publicar (sin membresía o expirada), no reactivar nada
  IF NOT v_limits.can_publish THEN
    RETURN QUERY SELECT
      0::INTEGER as products_reactivated,
      ('No se pueden reactivar productos. ' || v_limits.message)::TEXT as message;
    RETURN;
  END IF;
  
  -- Contar productos pausados
  SELECT COUNT(*) INTO v_paused_products_count
  FROM products
  WHERE seller_id = p_user_id
    AND status = 'paused';
  
  -- Si no hay productos pausados, no hacer nada
  IF v_paused_products_count = 0 THEN
    RETURN QUERY SELECT
      0::INTEGER as products_reactivated,
      'No hay productos pausados para reactivar'::TEXT as message;
    RETURN;
  END IF;
  
  -- Calcular cuántos productos puede reactivar según límite actual
  IF v_limits.max_products IS NULL THEN
    -- Ilimitado: reactivar todos
    v_can_reactivate := v_paused_products_count;
  ELSE
    -- Tiene límite: reactivar solo los que quepan
    v_can_reactivate := GREATEST(0, v_limits.max_products - v_limits.current_products);
    -- No reactivar más de los que están pausados
    IF v_can_reactivate > v_paused_products_count THEN
      v_can_reactivate := v_paused_products_count;
    END IF;
  END IF;
  
  -- Si no puede reactivar ninguno (alcanzó el límite), informar
  IF v_can_reactivate = 0 THEN
    RETURN QUERY SELECT
      0::INTEGER as products_reactivated,
      ('No se pueden reactivar productos. Límite alcanzado: ' || 
       v_limits.current_products || '/' || 
       COALESCE(v_limits.max_products::TEXT, '∞'))::TEXT as message;
    RETURN;
  END IF;
  
  -- Reactivar productos pausados más antiguos primero (los que fueron pausados primero)
  UPDATE products
  SET 
    status = 'active',
    updated_at = NOW()
  WHERE seller_id = p_user_id
    AND status = 'paused'
    AND id IN (
      SELECT id
      FROM products
      WHERE seller_id = p_user_id
        AND status = 'paused'
      ORDER BY updated_at ASC, created_at ASC
      LIMIT v_can_reactivate
    );
  
  GET DIAGNOSTICS v_reactivated_count = ROW_COUNT;
  
  RETURN QUERY SELECT
    v_reactivated_count as products_reactivated,
    ('Se reactivaron ' || v_reactivated_count || ' producto(s). ' ||
     (v_paused_products_count - v_reactivated_count) || ' producto(s) siguen pausados.')::TEXT as message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reactivate_paused_products_on_renewal IS 'Reactiva productos pausados cuando el usuario renueva o actualiza su membresía';

-- ============================================
-- 3. ACTUALIZAR FUNCIÓN: check_and_expire_memberships()
-- Agregar lógica para pausar productos cuando expiran membresías
-- ============================================

-- Nota: Esta función ya existe, pero necesitamos llamar a pause_products_on_membership_expiration
-- para cada usuario cuya membresía expira. Lo haremos en el cron job directamente.

-- ============================================
-- 4. ACTUALIZAR FUNCIÓN: activate_membership_subscription()
-- Agregar lógica para reactivar productos al renovar
-- ============================================

-- Vamos a modificar la función existente para que llame a reactivate_paused_products_on_renewal
-- al final de la activación

-- Primero, leer la función actual completa
-- (Nota: Esto se hará en el siguiente paso modificando el archivo de migración original)



