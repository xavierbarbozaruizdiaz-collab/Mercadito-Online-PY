-- ============================================
-- MERCADITO ONLINE PY - FIX is_user_store_owner
-- Remove reference to non-existent stores.status column
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
  ) INTO v_has_store;

  RETURN COALESCE(v_has_store, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_user_store_owner IS 'Verifica si el usuario tiene una tienda activa (tiendas no tienen límites de publicación)';






















