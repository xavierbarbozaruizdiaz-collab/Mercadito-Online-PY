-- ============================================
-- MERCADITO ONLINE PY - VALIDACIÓN DE MEMBRESÍA PARA PUJAS
-- Los usuarios Free no pueden pujar, solo ver subastas
-- ============================================

-- ============================================
-- ACTUALIZAR FUNCIÓN place_bid() CON VALIDACIÓN DE MEMBRESÍA
-- ============================================

-- Eliminar función antigua si existe
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL(10,2), UUID, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL(10,2));

CREATE OR REPLACE FUNCTION public.place_bid(
  p_product_id UUID,
  p_bidder_id UUID,
  p_amount DECIMAL(10,2),
  p_idempotency_key UUID DEFAULT NULL,
  p_client_sent_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_bid_id UUID;
  v_product RECORD;
  v_current_bid DECIMAL(10,2);
  v_min_increment DECIMAL(10,2);
  v_auction_end_at TIMESTAMPTZ;
  v_new_end_at TIMESTAMPTZ;
  v_previous_bidder_id UUID;
  v_recent_bids INTEGER;
  v_new_version INTEGER;
  v_result JSONB;
  v_time_since_start INTERVAL;
  v_max_duration_seconds INTEGER;
  v_should_extend BOOLEAN := true;
  v_bidder_profile RECORD;
  v_membership_level TEXT;
  v_membership_expires_at TIMESTAMPTZ;
BEGIN
  -- ========================================
  -- VALIDACIÓN DE IDEMPOTENCY
  -- ========================================
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_bid_id
    FROM public.auction_bids
    WHERE idempotency_key = p_idempotency_key;
    
    IF FOUND THEN
      -- Retornar puja existente
      SELECT jsonb_build_object(
        'success', true,
        'bid_id', v_bid_id,
        'message', 'Puja ya procesada (idempotency)',
        'is_duplicate', true
      ) INTO v_result;
      RETURN v_result;
    END IF;
  END IF;
  
  -- ========================================
  -- VALIDACIÓN DE TIMESTAMP CLIENTE (anti-replay)
  -- ========================================
  IF p_client_sent_at IS NOT NULL THEN
    -- Rechazar si el timestamp está más de 30 segundos en el pasado
    IF p_client_sent_at < NOW() - INTERVAL '30 seconds' THEN
      -- Registrar evento rechazado
      INSERT INTO public.auction_events (
        product_id, event_type, user_id, event_data
      ) VALUES (
        p_product_id, 'BID_REJECTED', p_bidder_id,
        jsonb_build_object('reason', 'timestamp_too_old', 'client_sent_at', p_client_sent_at)
      );
      
      RAISE EXCEPTION 'Puja rechazada: timestamp demasiado antiguo';
    END IF;
    
    -- Rechazar si el timestamp está en el futuro (más de 5 segundos)
    IF p_client_sent_at > NOW() + INTERVAL '5 seconds' THEN
      INSERT INTO public.auction_events (
        product_id, event_type, user_id, event_data
      ) VALUES (
        p_product_id, 'BID_REJECTED', p_bidder_id,
        jsonb_build_object('reason', 'timestamp_in_future', 'client_sent_at', p_client_sent_at)
      );
      
      RAISE EXCEPTION 'Puja rechazada: timestamp inválido (futuro)';
    END IF;
  END IF;
  
  -- ========================================
  -- VALIDACIÓN DE MEMBRESÍA (NUEVO)
  -- ========================================
  -- Obtener información de membresía del postor
  SELECT 
    membership_level,
    membership_expires_at
  INTO v_bidder_profile
  FROM public.profiles
  WHERE id = p_bidder_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.auction_events (
      product_id, event_type, user_id, event_data
    ) VALUES (
      p_product_id, 'BID_REJECTED', p_bidder_id,
      jsonb_build_object('reason', 'profile_not_found')
    );
    
    RAISE EXCEPTION 'Perfil de usuario no encontrado';
  END IF;
  
  v_membership_level := COALESCE(v_bidder_profile.membership_level, 'free');
  v_membership_expires_at := v_bidder_profile.membership_expires_at;
  
  -- Validar que no sea Free
  IF v_membership_level = 'free' THEN
    INSERT INTO public.auction_events (
      product_id, event_type, user_id, event_data
    ) VALUES (
      p_product_id, 'BID_REJECTED', p_bidder_id,
      jsonb_build_object('reason', 'membership_required', 'membership_level', v_membership_level)
    );
    
    RAISE EXCEPTION 'Se requiere una membresía activa para pujar. La membresía Gratis solo permite ver subastas.';
  END IF;
  
  -- Validar que la membresía no esté expirada (si tiene fecha de expiración)
  IF v_membership_expires_at IS NOT NULL AND v_membership_expires_at < NOW() THEN
    INSERT INTO public.auction_events (
      product_id, event_type, user_id, event_data
    ) VALUES (
      p_product_id, 'BID_REJECTED', p_bidder_id,
      jsonb_build_object(
        'reason', 'membership_expired',
        'membership_level', v_membership_level,
        'expires_at', v_membership_expires_at
      )
    );
    
    RAISE EXCEPTION 'Tu membresía ha expirado. Renueva tu membresía para continuar pujando.';
  END IF;
  
  -- ========================================
  -- RATE LIMITING: 1 puja/usuario/lote/segundo
  -- ========================================
  SELECT COUNT(*) INTO v_recent_bids
  FROM public.auction_bids
  WHERE bidder_id = p_bidder_id 
    AND product_id = p_product_id
    AND bid_time > NOW() - INTERVAL '1 second';
  
  IF v_recent_bids > 0 THEN
    -- Registrar evento rechazado
    INSERT INTO public.auction_events (
      product_id, event_type, user_id, event_data
    ) VALUES (
      p_product_id, 'BID_REJECTED', p_bidder_id,
      jsonb_build_object('reason', 'rate_limit_exceeded', 'recent_bids', v_recent_bids)
    );
    
    RAISE EXCEPTION 'Demasiadas pujas. Máximo 1 puja por segundo por lote.';
  END IF;
  
  -- ========================================
  -- LOCK TRANSACCIONAL: SELECT FOR UPDATE
  -- ========================================
  -- Obtener información del producto con LOCK para prevenir condiciones de carrera
  SELECT 
    p.id,
    p.seller_id,
    p.current_bid,
    p.auction_end_at,
    p.auction_start_at,
    p.auction_status,
    p.min_bid_increment,
    p.auto_extend_seconds,
    p.auction_version,
    p.auction_max_duration_hours,
    COALESCE((p.attributes->>'auction')::json->>'starting_price', '0')::DECIMAL as starting_price
  INTO v_product
  FROM public.products p
  WHERE p.id = p_product_id AND p.sale_type = 'auction'
  FOR UPDATE; -- 🔒 LOCK CRÍTICO: previene condiciones de carrera
  
  -- Validar que el producto existe y es una subasta
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado o no es una subasta';
  END IF;
  
  -- Validar que el vendedor no puja en su propia subasta
  IF v_product.seller_id = p_bidder_id THEN
    INSERT INTO public.auction_events (
      product_id, event_type, user_id, event_data
    ) VALUES (
      p_product_id, 'BID_REJECTED', p_bidder_id,
      jsonb_build_object('reason', 'seller_cannot_bid')
    );
    
    RAISE EXCEPTION 'No puedes pujar en tus propias subastas';
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
  IF p_amount < (v_current_bid + v_min_increment) THEN
    INSERT INTO public.auction_events (
      product_id, event_type, user_id, event_data
    ) VALUES (
      p_product_id, 'BID_REJECTED', p_bidder_id,
      jsonb_build_object(
        'reason', 'insufficient_amount',
        'amount', p_amount,
        'required', v_current_bid + v_min_increment
      )
    );
    
    RAISE EXCEPTION 'El monto debe ser al menos Gs. % (precio actual + incremento mínimo)', 
      (v_current_bid + v_min_increment);
  END IF;
  
  -- Validar límite de puja según membresía
  IF v_membership_level = 'bronze' AND p_amount > 2500000 THEN
    INSERT INTO public.auction_events (
      product_id, event_type, user_id, event_data
    ) VALUES (
      p_product_id, 'BID_REJECTED', p_bidder_id,
      jsonb_build_object(
        'reason', 'membership_limit_exceeded',
        'membership_level', v_membership_level,
        'amount', p_amount,
        'limit', 2500000
      )
    );
    
    RAISE EXCEPTION 'Tu membresía Bronce tiene un límite de puja de 2,500,000 Gs.';
  END IF;
  
  IF v_membership_level = 'silver' AND p_amount > 10000000 THEN
    INSERT INTO public.auction_events (
      product_id, event_type, user_id, event_data
    ) VALUES (
      p_product_id, 'BID_REJECTED', p_bidder_id,
      jsonb_build_object(
        'reason', 'membership_limit_exceeded',
        'membership_level', v_membership_level,
        'amount', p_amount,
        'limit', 10000000
      )
    );
    
    RAISE EXCEPTION 'Tu membresía Plata tiene un límite de puja de 10,000,000 Gs.';
  END IF;
  
  -- Obtener el bidder anterior para notificaciones
  SELECT bidder_id INTO v_previous_bidder_id
  FROM public.auction_bids
  WHERE product_id = p_product_id
    AND is_retracted = false
  ORDER BY amount DESC, bid_time ASC
  LIMIT 1;
  
  -- Incrementar versión del lote
  v_new_version := COALESCE(v_product.auction_version, 0) + 1;
  
  -- Insertar la nueva puja
  INSERT INTO public.auction_bids (
    product_id,
    bidder_id,
    amount,
    bid_time,
    idempotency_key
  )
  VALUES (
    p_product_id,
    p_bidder_id,
    p_amount,
    NOW(),
    p_idempotency_key
  )
  RETURNING id INTO v_bid_id;
  
  -- Actualizar producto: nuevo precio actual y contador de pujas
  UPDATE public.products
  SET 
    current_bid = p_amount,
    total_bids = total_bids + 1,
    auction_version = v_new_version,
    updated_at = NOW()
  WHERE id = p_product_id;
  
  -- ANTI-SNIPING: Extender tiempo si queda poco tiempo
  v_auction_end_at := v_product.auction_end_at;
  IF v_auction_end_at IS NOT NULL AND v_product.auto_extend_seconds > 0 THEN
    -- Si quedan menos de X segundos, extender
    IF v_auction_end_at - NOW() < INTERVAL '1 minute' THEN
      v_new_end_at := NOW() + (v_product.auto_extend_seconds || INTERVAL '10 seconds');
      
      -- Validar duración máxima
      IF v_product.auction_max_duration_hours IS NOT NULL THEN
        v_time_since_start := NOW() - v_product.auction_start_at;
        v_max_duration_seconds := v_product.auction_max_duration_hours * 3600;
        
        IF EXTRACT(EPOCH FROM v_time_since_start) > v_max_duration_seconds THEN
          v_should_extend := false;
        END IF;
      END IF;
      
      IF v_should_extend THEN
        UPDATE public.products
        SET auction_end_at = v_new_end_at
        WHERE id = p_product_id;
        
        -- Registrar evento de extensión
        INSERT INTO public.auction_events (
          product_id, event_type, user_id, event_data
        ) VALUES (
          p_product_id, 'TIMER_EXTENDED', p_bidder_id,
          jsonb_build_object(
            'old_end_at', v_auction_end_at,
            'new_end_at', v_new_end_at,
            'reason', 'anti_sniping'
          )
        );
      END IF;
    END IF;
  END IF;
  
  -- Registrar evento de puja exitosa
  INSERT INTO public.auction_events (
    product_id, event_type, user_id, event_data
  ) VALUES (
    p_product_id, 'BID_PLACED', p_bidder_id,
    jsonb_build_object(
      'bid_id', v_bid_id,
      'amount', p_amount,
      'membership_level', v_membership_level
    )
  );
  
  -- Retornar resultado exitoso
  SELECT jsonb_build_object(
    'success', true,
    'bid_id', v_bid_id,
    'amount', p_amount,
    'current_bid', p_amount,
    'version', v_new_version,
    'membership_level', v_membership_level
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON FUNCTION public.place_bid IS 
'Coloca una puja en una subasta activa. Valida incrementos mínimos, aplica anti-sniping y valida membresía. Los usuarios Free no pueden pujar.';



