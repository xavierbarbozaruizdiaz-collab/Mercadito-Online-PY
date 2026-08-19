-- ============================================
-- MERCADITO ONLINE PY - ACTUALIZAR CIERRE DE SUBASTAS
-- Integrar cálculo de comisiones al finalizar subastas
-- ============================================

-- ============================================
-- 1. ACTUALIZAR FUNCIÓN: CLOSE_EXPIRED_AUCTIONS
-- Calcular comisiones al cerrar subasta
-- ============================================

CREATE OR REPLACE FUNCTION public.close_expired_auctions()
RETURNS INTEGER AS $$
DECLARE
  v_closed_count INTEGER := 0;
  v_auction RECORD;
  v_buyer_commission_percent DECIMAL(5,2);
  v_seller_commission_percent DECIMAL(5,2);
  v_buyer_commission_amount DECIMAL(10,2);
  v_buyer_total DECIMAL(10,2);
  v_seller_commission_amount DECIMAL(10,2);
  v_seller_earnings DECIMAL(10,2);
  v_store_id UUID;
BEGIN
  -- Buscar subastas activas que han expirado
  FOR v_auction IN
    SELECT 
      p.id,
      p.seller_id,
      p.store_id,
      p.current_bid,
      p.reserve_price,
      (
        SELECT bidder_id 
        FROM public.auction_bids 
        WHERE product_id = p.id 
          AND is_retracted = false
        ORDER BY amount DESC, bid_time ASC 
        LIMIT 1
      ) as winner_id,
      (
        SELECT COUNT(*) 
        FROM public.auction_bids 
        WHERE product_id = p.id 
          AND is_retracted = false
      ) as total_bids_count
    FROM public.products p
    WHERE p.sale_type = 'auction'
      AND p.auction_status = 'active'
      AND p.auction_end_at IS NOT NULL
      AND p.auction_end_at <= NOW()
  LOOP
    -- Cerrar subasta
    UPDATE public.products
    SET 
      auction_status = 'ended',
      winner_id = v_auction.winner_id,
      updated_at = NOW()
    WHERE id = v_auction.id;
    
    -- Si hay ganador y cumple precio de reserva (si existe)
    IF v_auction.winner_id IS NOT NULL AND v_auction.total_bids_count > 0 THEN
      -- Verificar precio de reserva
      IF v_auction.reserve_price IS NULL OR v_auction.current_bid >= v_auction.reserve_price THEN
        -- Obtener store_id si no existe
        v_store_id := v_auction.store_id;
        IF v_store_id IS NULL THEN
          SELECT id INTO v_store_id
          FROM public.stores
          WHERE seller_id = v_auction.seller_id
          LIMIT 1;
        END IF;
        
        -- Calcular comisiones usando función SQL
        SELECT 
          buyer_commission_percent,
          seller_commission_percent
        INTO 
          v_buyer_commission_percent,
          v_seller_commission_percent
        FROM get_auction_commissions(v_auction.seller_id, v_store_id);
        
        -- Calcular montos de comisión
        SELECT 
          buyer_commission_amount,
          buyer_total_paid,
          seller_commission_amount,
          seller_earnings
        INTO 
          v_buyer_commission_amount,
          v_buyer_total,
          v_seller_commission_amount,
          v_seller_earnings
        FROM calculate_auction_commissions(
          v_auction.current_bid,
          v_buyer_commission_percent,
          v_seller_commission_percent
        );
        
        -- Pre-crear platform_fees (se completará cuando se cree la orden)
        -- Por ahora solo guardamos la información en un campo temporal o esperamos a que se cree la orden
        -- Las comisiones se registrarán cuando el ganador complete el checkout
        
        -- Notificar al ganador
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
          v_auction.winner_id,
          'order',
          '¡Ganaste la subasta!',
          'Felicidades, ganaste la subasta por Gs. ' || COALESCE(v_auction.current_bid, 0)::TEXT || '. Debes pagar Gs. ' || v_buyer_total::TEXT || ' (incluye comisión de ' || v_buyer_commission_percent::TEXT || '%)',
          jsonb_build_object(
            'product_id', v_auction.id,
            'winning_bid', v_auction.current_bid,
            'buyer_total_paid', v_buyer_total,
            'buyer_commission_amount', v_buyer_commission_amount,
            'buyer_commission_percent', v_buyer_commission_percent
          )
        );
        
        -- Notificar al vendedor
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
          v_auction.seller_id,
          'order',
          'Subasta finalizada',
          'Tu subasta finalizó. Ganador asignado. Precio final: Gs. ' || COALESCE(v_auction.current_bid, 0)::TEXT || '. Recibirás Gs. ' || v_seller_earnings::TEXT || ' (después de ' || v_seller_commission_percent::TEXT || '% comisión)',
          jsonb_build_object(
            'product_id', v_auction.id,
            'winner_id', v_auction.winner_id,
            'final_price', v_auction.current_bid,
            'seller_earnings', v_seller_earnings,
            'seller_commission_amount', v_seller_commission_amount,
            'seller_commission_percent', v_seller_commission_percent
          )
        );
        
        -- Notificar a otros postores que perdieron
        INSERT INTO public.notifications (user_id, type, title, message, data)
        SELECT 
          bidder_id,
          'order',
          'Subasta finalizada',
          'La subasta finalizó. Precio final: Gs. ' || COALESCE(v_auction.current_bid, 0)::TEXT,
          jsonb_build_object(
            'product_id', v_auction.id,
            'final_price', v_auction.current_bid
          )
        FROM public.auction_bids
        WHERE product_id = v_auction.id
          AND bidder_id != v_auction.winner_id
          AND is_retracted = false;
      ELSE
        -- Precio de reserva no alcanzado - notificar al vendedor
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
          v_auction.seller_id,
          'order',
          'Subasta finalizada sin cumplir reserva',
          'Tu subasta finalizó pero el precio de reserva no fue alcanzado',
          jsonb_build_object(
            'product_id', v_auction.id,
            'reserve_price', v_auction.reserve_price,
            'final_bid', v_auction.current_bid
          )
        );
      END IF;
    ELSE
      -- No hay ganador (sin pujas)
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (
        v_auction.seller_id,
        'order',
        'Subasta finalizada sin ganador',
        'Tu subasta finalizó sin recibir pujas',
        jsonb_build_object(
          'product_id', v_auction.id
        )
      );
    END IF;
    
    v_closed_count := v_closed_count + 1;
  END LOOP;
  
  RETURN v_closed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. FUNCIÓN: CREAR ORDEN DE SUBASTA CON COMISIONES
-- Para cuando el ganador completa el checkout
-- ============================================

CREATE OR REPLACE FUNCTION public.create_auction_order(
  p_product_id UUID,
  p_buyer_id UUID,
  p_shipping_address JSONB,
  p_payment_method TEXT DEFAULT 'cash',
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_auction RECORD;
  v_buyer_commission_percent DECIMAL(5,2);
  v_seller_commission_percent DECIMAL(5,2);
  v_buyer_commission_amount DECIMAL(10,2);
  v_buyer_total DECIMAL(10,2);
  v_seller_commission_amount DECIMAL(10,2);
  v_seller_earnings DECIMAL(10,2);
  v_store_id UUID;
  v_order_item_id UUID;
  v_commission_setting_id UUID;
BEGIN
  -- Obtener información de la subasta
  SELECT 
    p.id,
    p.seller_id,
    p.store_id,
    p.current_bid,
    p.winner_id,
    p.auction_status
  INTO v_auction
  FROM public.products p
  WHERE p.id = p_product_id
    AND p.sale_type = 'auction';
  
  -- Validar que existe y es subasta
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado o no es una subasta';
  END IF;
  
  -- Validar que está finalizada
  IF v_auction.auction_status != 'ended' THEN
    RAISE EXCEPTION 'La subasta no ha finalizado';
  END IF;
  
  -- Validar que el comprador es el ganador
  IF v_auction.winner_id != p_buyer_id THEN
    RAISE EXCEPTION 'No eres el ganador de esta subasta';
  END IF;
  
  -- Obtener store_id si no existe
  v_store_id := v_auction.store_id;
  IF v_store_id IS NULL THEN
    SELECT id INTO v_store_id
    FROM public.stores
    WHERE seller_id = v_auction.seller_id
    LIMIT 1;
  END IF;
  
  -- Calcular comisiones
  SELECT 
    buyer_commission_percent,
    seller_commission_percent
  INTO 
    v_buyer_commission_percent,
    v_seller_commission_percent
  FROM get_auction_commissions(v_auction.seller_id, v_store_id);
  
  -- Calcular montos
  SELECT 
    buyer_commission_amount,
    buyer_total_paid,
    seller_commission_amount,
    seller_earnings
  INTO 
    v_buyer_commission_amount,
    v_buyer_total,
    v_seller_commission_amount,
    v_seller_earnings
  FROM calculate_auction_commissions(
    v_auction.current_bid,
    v_buyer_commission_percent,
    v_seller_commission_percent
  );
  
  -- Crear orden con el total que incluye comisión del comprador
  INSERT INTO public.orders (buyer_id, shipping_address, payment_method, notes, total_amount)
  VALUES (p_buyer_id, p_shipping_address, p_payment_method, p_notes, v_buyer_total)
  RETURNING id INTO v_order_id;
  
  -- Crear order_item con el precio de la subasta (sin comisión)
  INSERT INTO public.order_items (order_id, product_id, seller_id, quantity, unit_price, total_price)
  VALUES (v_order_id, p_product_id, v_auction.seller_id, 1, v_auction.current_bid, v_auction.current_bid)
  RETURNING id INTO v_order_item_id;
  
  -- Obtener commission_setting_id usado
  SELECT id INTO v_commission_setting_id
  FROM commission_settings
  WHERE (
    (scope_type = 'seller' AND seller_id = v_auction.seller_id) OR
    (scope_type = 'store' AND store_id = v_store_id) OR
    (scope_type = 'global')
  )
  AND is_active = true
  AND (effective_until IS NULL OR effective_until > NOW())
  AND applies_to IN ('auction_only', 'both')
  ORDER BY 
    CASE scope_type 
      WHEN 'seller' THEN 1
      WHEN 'store' THEN 2
      WHEN 'global' THEN 3
    END
  LIMIT 1;
  
  -- Crear platform_fees
  INSERT INTO public.platform_fees (
    order_id,
    order_item_id,
    seller_id,
    buyer_id,
    store_id,
    transaction_type,
    auction_final_price,
    buyer_commission_percent,
    buyer_commission_amount,
    buyer_total_paid,
    seller_commission_percent,
    seller_commission_amount,
    seller_earnings,
    commission_setting_id,
    status,
    payment_status
  ) VALUES (
    v_order_id,
    v_order_item_id,
    v_auction.seller_id,
    p_buyer_id,
    v_store_id,
    'auction',
    v_auction.current_bid,
    v_buyer_commission_percent,
    v_buyer_commission_amount,
    v_buyer_total,
    v_seller_commission_percent,
    v_seller_commission_amount,
    v_seller_earnings,
    v_commission_setting_id,
    'pending',
    'escrowed'
  );
  
  -- Actualizar balance del vendedor
  INSERT INTO public.seller_balance (seller_id, store_id, pending_balance)
  VALUES (v_auction.seller_id, v_store_id, v_seller_earnings)
  ON CONFLICT (seller_id) 
  DO UPDATE SET 
    pending_balance = seller_balance.pending_balance + v_seller_earnings,
    total_earnings = seller_balance.total_earnings + v_seller_earnings,
    updated_at = NOW();
  
  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_auction_order IS 'Crea orden de subasta con cálculo de comisiones (comprador y vendedor)';

