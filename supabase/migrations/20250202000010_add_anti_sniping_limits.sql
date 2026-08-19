-- ============================================
-- MERCADITO ONLINE PY - LÍMITES DE ANTI-SNIPING
-- Agrega límites a la extensión de tiempo por anti-sniping
-- para prevenir extensiones infinitas
-- ============================================

-- Esta migración actualiza place_bid() para incluir límites de anti-sniping
-- que previenen extensiones infinitas del tiempo de subasta

CREATE OR REPLACE FUNCTION public.place_bid(
  p_product_id UUID,
  p_bidder_id UUID,
  p_amount DECIMAL(10,2),
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_product RECORD;
  v_current_bid DECIMAL(10,2);
  v_min_increment DECIMAL(10,2);
  v_bid_id UUID;
  v_new_end_at TIMESTAMPTZ;
  v_auction_end_at TIMESTAMPTZ;
  v_time_since_start INTERVAL;
  v_max_duration_seconds INTEGER;
  v_should_extend BOOLEAN;
  v_extension_count INTEGER;
  v_max_extensions INTEGER := 50; -- Máximo de extensiones permitidas
BEGIN
  -- Obtener información del producto con LOCK para prevenir condiciones de carrera
  SELECT 
    p.id,
    p.seller_id,
    p.current_bid,
    p.auction_end_at,
    p.auction_status,
    p.auction_start_at,
    p.min_bid_increment,
    p.auto_extend_seconds,
    p.auction_max_duration_hours,
    p.auction_version,
    COALESCE((p.attributes->>'auction')::json->>'starting_price', '0')::DECIMAL as starting_price
  INTO v_product
  FROM public.products p
  WHERE p.id = p_product_id AND p.sale_type = 'auction'
  FOR UPDATE; -- 🔒 LOCK CRÍTICO: previene condiciones de carrera
  
  -- Validar que el producto existe y es una subasta
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado o no es una subasta';
  END IF;

  -- Validar que la subasta está activa
  IF v_product.auction_status != 'active' THEN
    INSERT INTO public.auction_events (
      product_id, event_type, user_id, event_data
    ) VALUES (
      p_product_id, 'BID_REJECTED', p_bidder_id,
      jsonb_build_object('reason', 'auction_not_active', 'status', v_product.auction_status)
    );
    
    RAISE EXCEPTION 'La subasta no está activa. Estado actual: %', v_product.auction_status;
  END IF;
  
  -- Validar que la subasta no ha expirado
  IF v_product.auction_end_at IS NOT NULL AND v_product.auction_end_at <= NOW() THEN
    INSERT INTO public.auction_events (
      product_id, event_type, user_id, event_data
    ) VALUES (
      p_product_id, 'BID_REJECTED', p_bidder_id,
      jsonb_build_object('reason', 'auction_expired', 'end_at', v_product.auction_end_at)
    );
    
    RAISE EXCEPTION 'La subasta ya ha finalizado';
  END IF;

  -- Determinar precio base para calcular incremento mínimo
  v_current_bid := COALESCE(v_product.current_bid, v_product.starting_price);
  v_min_increment := COALESCE(v_product.min_bid_increment, calculate_min_bid_increment(v_current_bid));

  -- Validar que el monto es suficiente
  IF p_amount < v_current_bid + v_min_increment THEN
    INSERT INTO public.auction_events (
      product_id, event_type, user_id, event_data
    ) VALUES (
      p_product_id, 'BID_REJECTED', p_bidder_id,
      jsonb_build_object(
        'reason', 'insufficient_bid',
        'current_bid', v_current_bid,
        'min_required', v_current_bid + v_min_increment,
        'offered', p_amount
      )
    );
    
    RAISE EXCEPTION 'El monto debe ser al menos Gs. %', (v_current_bid + v_min_increment);
  END IF;

  -- Verificar idempotencia si se proporciona
  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.auction_bids
      WHERE product_id = p_product_id
        AND idempotency_key = p_idempotency_key
        AND is_retracted = false
    ) THEN
      -- Puja duplicada, retornar la existente
      SELECT 
        jsonb_build_object(
          'bid_id', id,
          'current_bid', p_amount,
          'winner_id', bidder_id,
          'auction_status', 'active',
          'version', (SELECT auction_version FROM public.products WHERE id = p_product_id),
          'duplicate', true
        )
      INTO v_bid_id
      FROM public.auction_bids
      WHERE product_id = p_product_id
        AND idempotency_key = p_idempotency_key
        AND is_retracted = false
      LIMIT 1;
      
      RETURN v_bid_id;
    END IF;
  END IF;

  -- Insertar la puja
  INSERT INTO public.auction_bids (
    product_id, bidder_id, amount, bid_time, idempotency_key
  ) VALUES (
    p_product_id, p_bidder_id, p_amount, NOW(), p_idempotency_key
  ) RETURNING id INTO v_bid_id;

  -- Actualizar producto con nueva puja
  UPDATE public.products
  SET 
    current_bid = p_amount,
    winner_id = p_bidder_id,
    auction_version = COALESCE(auction_version, 0) + 1,
    updated_at = NOW()
  WHERE id = p_product_id;
  
  -- ========================================
  -- ANTI-SNIPING CON LÍMITES
  -- ========================================
  v_auction_end_at := v_product.auction_end_at;
  v_new_end_at := NULL;
  v_should_extend := false;
  
  IF v_auction_end_at IS NOT NULL AND v_product.auto_extend_seconds > 0 THEN
    -- Verificar si debemos extender (si quedan menos de X segundos)
    IF (v_auction_end_at - NOW()) < MAKE_INTERVAL(secs => v_product.auto_extend_seconds) THEN
      v_should_extend := true;
      
      -- ========================================
      -- LÍMITE 1: DURACIÓN MÁXIMA TOTAL
      -- ========================================
      IF v_product.auction_start_at IS NOT NULL AND v_product.auction_max_duration_hours IS NOT NULL THEN
        v_time_since_start := NOW() - v_product.auction_start_at;
        v_max_duration_seconds := v_product.auction_max_duration_hours * 3600;
        
        -- Si ya pasó el máximo, NO extender más
        IF EXTRACT(EPOCH FROM v_time_since_start) >= v_max_duration_seconds THEN
          v_should_extend := false;
          
          -- Registrar evento de límite alcanzado
          INSERT INTO public.auction_events (
            product_id, event_type, user_id, event_data
          ) VALUES (
            p_product_id, 'TIMER_EXTENDED', p_bidder_id,
            jsonb_build_object(
              'old_end_at', v_auction_end_at,
              'reason', 'max_duration_reached',
              'max_hours', v_product.auction_max_duration_hours,
              'time_since_start_seconds', EXTRACT(EPOCH FROM v_time_since_start)
            )
          );
        END IF;
      END IF;
      
      -- ========================================
      -- LÍMITE 2: NÚMERO MÁXIMO DE EXTENSIONES
      -- ========================================
      IF v_should_extend THEN
        -- Contar cuántas extensiones ya se han hecho (eventos TIMER_EXTENDED)
        SELECT COUNT(*) INTO v_extension_count
        FROM public.auction_events
        WHERE product_id = p_product_id
          AND event_type = 'TIMER_EXTENDED'
          AND event_data->>'reason' IS NULL; -- Solo extensiones exitosas, no límites alcanzados
        
        -- Si ya se alcanzó el máximo de extensiones, NO extender más
        IF v_extension_count >= v_max_extensions THEN
          v_should_extend := false;
          
          -- Registrar evento de límite de extensiones alcanzado
          INSERT INTO public.auction_events (
            product_id, event_type, user_id, event_data
          ) VALUES (
            p_product_id, 'TIMER_EXTENDED', p_bidder_id,
            jsonb_build_object(
              'old_end_at', v_auction_end_at,
              'reason', 'max_extensions_reached',
              'max_extensions', v_max_extensions,
              'current_extensions', v_extension_count
            )
          );
        END IF;
      END IF;
      
      -- ========================================
      -- EXTENDER SI PASA TODAS LAS VALIDACIONES
      -- ========================================
      IF v_should_extend THEN
        v_new_end_at := NOW() + MAKE_INTERVAL(secs => v_product.auto_extend_seconds);
        
        UPDATE public.products
        SET auction_end_at = v_new_end_at
        WHERE id = p_product_id;
        
        -- Registrar evento de extensión exitosa
        INSERT INTO public.auction_events (
          product_id, event_type, user_id, event_data
        ) VALUES (
          p_product_id, 'TIMER_EXTENDED', p_bidder_id,
          jsonb_build_object(
            'old_end_at', v_auction_end_at,
            'new_end_at', v_new_end_at,
            'extension_seconds', v_product.auto_extend_seconds,
            'extension_number', v_extension_count + 1
          )
        );
      END IF;
    END IF;
  END IF;
  
  -- Retornar resultado
  RETURN jsonb_build_object(
    'bid_id', v_bid_id,
    'current_bid', p_amount,
    'winner_id', p_bidder_id,
    'auction_status', 'active',
    'auction_end_at', COALESCE(v_new_end_at, v_auction_end_at),
    'version', (SELECT auction_version FROM public.products WHERE id = p_product_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario
COMMENT ON FUNCTION public.place_bid(UUID, UUID, DECIMAL, TEXT) IS 
'Coloca una puja en una subasta activa. Incluye anti-sniping con límites:
- Límite de duración máxima total (auction_max_duration_hours)
- Límite de número máximo de extensiones (50 por defecto)
Estos límites previenen extensiones infinitas del tiempo de subasta.';







