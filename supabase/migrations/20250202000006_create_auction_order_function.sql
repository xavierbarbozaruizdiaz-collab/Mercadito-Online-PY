-- ============================================
-- MERCADITO ONLINE PY - FUNCIÓN PARA CREAR ORDEN DE SUBASTA
-- Crear orden directamente desde subasta ganada
-- ============================================

-- Función para crear orden de subasta (alternativa a carrito)
CREATE OR REPLACE FUNCTION create_auction_order(
  p_buyer_id UUID,
  p_auction_id UUID,
  p_shipping_address JSONB,
  p_payment_method TEXT DEFAULT 'cash',
  p_notes TEXT DEFAULT NULL,
  p_total_amount DECIMAL(10,2)
)
RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_product RECORD;
  v_setting RECORD;
BEGIN
  -- Verificar que la subasta existe y el usuario es el ganador
  SELECT * INTO v_product
  FROM products
  WHERE id = p_auction_id
    AND sale_type = 'auction'
    AND auction_status = 'ended'
    AND winner_id = p_buyer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subasta no encontrada, no finalizada, o el usuario no es el ganador';
  END IF;
  
  -- Obtener configuración de entregas
  SELECT * INTO v_setting
  FROM seller_delivery_settings
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Crear la orden marcada como subasta
  INSERT INTO orders (
    buyer_id,
    shipping_address,
    payment_method,
    notes,
    total_amount,
    status,
    is_auction_order,
    auction_id
  )
  VALUES (
    p_buyer_id,
    p_shipping_address,
    p_payment_method,
    p_notes,
    p_total_amount,
    'pending',
    true,
    p_auction_id
  )
  RETURNING id INTO v_order_id;
  
  -- Si hay configuración, establecer fecha límite (trigger también lo hará, pero esto es explícito)
  IF v_setting IS NOT NULL THEN
    UPDATE orders
    SET 
      delivery_deadline = NOW() + (v_setting.max_delivery_days || ' days')::INTERVAL,
      expected_delivery_date = NOW() + (v_setting.max_delivery_days || ' days')::INTERVAL
    WHERE id = v_order_id;
  END IF;
  
  -- Crear item de orden
  INSERT INTO order_items (
    order_id,
    product_id,
    seller_id,
    quantity,
    unit_price,
    total_price
  )
  VALUES (
    v_order_id,
    p_auction_id,
    v_product.seller_id,
    1,
    p_total_amount,
    p_total_amount
  );
  
  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON FUNCTION create_auction_order IS 'Crea una orden directamente desde una subasta ganada, marcándola como is_auction_order=true';





