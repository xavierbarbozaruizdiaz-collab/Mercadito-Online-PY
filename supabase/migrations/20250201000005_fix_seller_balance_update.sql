-- ============================================
-- MERCADITO ONLINE PY - FIX SELLER BALANCE UPDATE
-- Función para actualizar balance del vendedor
-- ============================================

-- Función para actualizar balance del vendedor
CREATE OR REPLACE FUNCTION update_seller_balance(
  p_seller_id UUID,
  p_amount DECIMAL(10,2),
  p_is_pending BOOLEAN DEFAULT true,
  p_store_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO seller_balance (
    seller_id,
    store_id,
    pending_balance,
    available_balance,
    total_earnings,
    updated_at
  )
  VALUES (
    p_seller_id,
    p_store_id,
    CASE WHEN p_is_pending THEN p_amount ELSE 0 END,
    CASE WHEN p_is_pending THEN 0 ELSE p_amount END,
    p_amount,
    NOW()
  )
  ON CONFLICT (seller_id) DO UPDATE SET
    pending_balance = seller_balance.pending_balance + CASE WHEN p_is_pending THEN p_amount ELSE 0 END,
    available_balance = seller_balance.available_balance + CASE WHEN p_is_pending THEN 0 ELSE p_amount END,
    total_earnings = seller_balance.total_earnings + p_amount,
    updated_at = NOW();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_seller_balance IS 'Actualiza el balance del vendedor (pendiente o disponible)';

