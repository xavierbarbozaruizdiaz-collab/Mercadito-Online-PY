-- Fix: Cambiar 'content' por 'message' en las funciones de subastas
-- La tabla notifications tiene la columna 'message', no 'content'

-- Actualizar función place_bid
CREATE OR REPLACE FUNCTION public.place_bid(
  p_product_id UUID,
  p_bidder_id UUID,
  p_amount DECIMAL(10,2)
)
RETURNS UUID AS $$
DECLARE
  v_bid_id UUID;
  v_product RECORD;
  v_current_bid DECIMAL(10,2);
  v_min_increment DECIMAL(10,2);
  v_auction_end_at TIMESTAMPTZ;
  v_new_end_at TIMESTAMPTZ;
  v_previous_bidder_id UUID;
BEGIN
  -- Obtener información del producto/subasta
  SELECT 
    p.id,
    p.seller_id,
    p.current_bid,
    p.auction_end_at,
    p.auction_status,
    p.min_bid_increment,
    p.auto_extend_seconds,
    COALESCE((p.attributes->>'auction')::json->>'starting_price', '0')::DECIMAL as starting_price
  INTO v_product
  FROM public.products p
  WHERE p.id = p_product_id AND p.sale_type = 'auction';
  
  -- Validar que el producto existe y es una subasta
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado o no es una subasta';
  END IF;
  
  -- Validar que el vendedor no puja en su propia subasta
  IF v_product.seller_id = p_bidder_id THEN
    RAISE EXCEPTION 'No puedes pujar en tus propias subastas';
  END IF;
  
  -- Validar que la subasta está activa
  IF v_product.auction_status != 'active' THEN
    RAISE EXCEPTION 'La subasta no está activa. Estado actual: %', v_product.auction_status;
  END IF;
  
  -- Validar que la subasta no ha expirado
  IF v_product.auction_end_at IS NOT NULL AND v_product.auction_end_at <= NOW() THEN
    RAISE EXCEPTION 'La subasta ya ha finalizado';
  END IF;
  
  -- Determinar precio base para calcular incremento mínimo
  v_current_bid := COALESCE(v_product.current_bid, v_product.starting_price);
  v_min_increment := COALESCE(v_product.min_bid_increment, calculate_min_bid_increment(v_current_bid));
  
  -- Validar que el monto es suficiente
  IF p_amount < (v_current_bid + v_min_increment) THEN
    RAISE EXCEPTION 'El monto debe ser al menos Gs. % (precio actual + incremento mínimo)', 
      (v_current_bid + v_min_increment);
  END IF;
  
  -- Obtener el bidder anterior para notificaciones
  SELECT bidder_id INTO v_previous_bidder_id
  FROM public.auction_bids
  WHERE product_id = p_product_id
    AND is_retracted = false
  ORDER BY amount DESC, bid_time ASC
  LIMIT 1;
  
  -- Insertar la nueva puja
  INSERT INTO public.auction_bids (
    product_id,
    bidder_id,
    amount,
    bid_time
  )
  VALUES (
    p_product_id,
    p_bidder_id,
    p_amount,
    NOW()
  )
  RETURNING id INTO v_bid_id;
  
  -- Actualizar producto: nuevo precio actual y contador de pujas
  UPDATE public.products
  SET 
    current_bid = p_amount,
    total_bids = total_bids + 1,
    updated_at = NOW()
  WHERE id = p_product_id;
  
  -- ANTI-SNIPING: Extender tiempo si queda poco tiempo
  v_auction_end_at := v_product.auction_end_at;
  IF v_auction_end_at IS NOT NULL AND v_product.auto_extend_seconds > 0 THEN
    -- Si quedan menos de X segundos, extender
    IF (v_auction_end_at - NOW()) < MAKE_INTERVAL(secs => v_product.auto_extend_seconds) THEN
      v_new_end_at := NOW() + MAKE_INTERVAL(secs => v_product.auto_extend_seconds);
      
      UPDATE public.products
      SET auction_end_at = v_new_end_at
      WHERE id = p_product_id;
    END IF;
  END IF;
  
  -- Crear notificaciones (usando 'message' en lugar de 'content')
  -- Notificar al vendedor
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_product.seller_id,
    'order',
    'Nueva puja recibida',
    'Nueva puja de Gs. ' || p_amount::TEXT || ' en tu subasta',
    jsonb_build_object(
      'product_id', p_product_id,
      'bid_id', v_bid_id,
      'amount', p_amount
    )
  );
  
  -- Notificar al postor anterior si fue superado
  IF v_previous_bidder_id IS NOT NULL AND v_previous_bidder_id != p_bidder_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_previous_bidder_id,
      'order',
      'Puja superada',
      'Tu puja fue superada. Nueva puja: Gs. ' || p_amount::TEXT,
      jsonb_build_object(
        'product_id', p_product_id,
        'your_bid', v_current_bid,
        'new_bid', p_amount
      )
    );
  END IF;
  
  RETURN v_bid_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

