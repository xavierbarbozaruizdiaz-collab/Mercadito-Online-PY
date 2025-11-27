-- ============================================
-- SOLUCIÓN: Asegurar que place_bid() use la nueva lógica
-- ============================================
-- Si hay múltiples versiones, esto reemplazará TODAS con la versión correcta
-- ============================================

-- ============================================
-- PASO 1: ELIMINAR TODAS LAS VERSIONES EXISTENTES
-- ============================================
-- PostgreSQL requiere especificar la firma completa cuando hay múltiples versiones
-- Eliminamos todas las posibles firmas que puedan existir

-- Versión estándar: UUID, UUID, DECIMAL(10,2), TEXT
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL(10,2), TEXT);

-- Otras posibles firmas (por compatibilidad)
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL, TEXT);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC(10,2), TEXT);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC(10,2));

-- Verificar que se eliminaron todas (debe retornar 0)
-- SELECT COUNT(*) FROM pg_proc WHERE proname = 'place_bid';

-- Ahora crear la versión correcta con la nueva lógica
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
  
  -- Variables para bonus time (anti-sniping)
  v_current_end_time TIMESTAMPTZ;
  v_new_end_time TIMESTAMPTZ;
  v_time_remaining INTERVAL;
  v_time_remaining_seconds NUMERIC;
  v_should_apply_bonus BOOLEAN := false;
  v_bonus_applied BOOLEAN := false;
  
  -- Configuración de bonus time (centralizada)
  v_bonus_window_seconds INTEGER;
  v_bonus_extend_seconds INTEGER;
  v_bonus_max_extensions INTEGER;
  
  -- Límites de bonus time
  v_time_since_start INTERVAL;
  v_max_duration_seconds INTEGER;
  v_extension_count INTEGER;
  
  -- Resultado
  v_result JSONB;
BEGIN
  -- ========================================
  -- 1. OBTENER CONFIGURACIÓN DE BONUS TIME
  -- ========================================
  SELECT 
    bonus_window_seconds,
    bonus_extend_seconds,
    bonus_max_extensions
  INTO 
    v_bonus_window_seconds,
    v_bonus_extend_seconds,
    v_bonus_max_extensions
  FROM public.get_bonus_time_config();
  
  -- ========================================
  -- 2. OBTENER INFORMACIÓN DEL PRODUCTO CON LOCK
  -- ========================================
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
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado o no es una subasta';
  END IF;

  IF v_product.auction_status != 'active' THEN
    INSERT INTO public.auction_events (
      product_id, event_type, user_id, event_data
    ) VALUES (
      p_product_id, 'BID_REJECTED', p_bidder_id,
      jsonb_build_object('reason', 'auction_not_active', 'status', v_product.auction_status)
    );
    RAISE EXCEPTION 'La subasta no está activa. Estado actual: %', v_product.auction_status;
  END IF;
  
  IF v_product.auction_end_at IS NOT NULL AND v_product.auction_end_at <= NOW() THEN
    INSERT INTO public.auction_events (
      product_id, event_type, user_id, event_data
    ) VALUES (
      p_product_id, 'BID_REJECTED', p_bidder_id,
      jsonb_build_object('reason', 'auction_expired', 'end_at', v_product.auction_end_at)
    );
    RAISE EXCEPTION 'La subasta ya ha finalizado';
  END IF;

  v_current_bid := COALESCE(v_product.current_bid, v_product.starting_price);
  v_min_increment := COALESCE(v_product.min_bid_increment, calculate_min_bid_increment(v_current_bid));

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

  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.auction_bids
      WHERE product_id = p_product_id
        AND idempotency_key = p_idempotency_key
        AND is_retracted = false
    ) THEN
      SELECT 
        jsonb_build_object(
          'bid_id', id,
          'current_bid', p_amount,
          'winner_id', bidder_id,
          'auction_status', 'active',
          'version', (SELECT auction_version FROM public.products WHERE id = p_product_id),
          'duplicate', true,
          'bonus_applied', false
        )
      INTO v_result
      FROM public.auction_bids
      WHERE product_id = p_product_id
        AND idempotency_key = p_idempotency_key
        AND is_retracted = false
      LIMIT 1;
      RETURN v_result;
    END IF;
  END IF;

  INSERT INTO public.auction_bids (
    product_id, bidder_id, amount, bid_time, idempotency_key
  ) VALUES (
    p_product_id, p_bidder_id, p_amount, NOW(), p_idempotency_key
  ) RETURNING id INTO v_bid_id;

  UPDATE public.products
  SET 
    current_bid = p_amount,
    winner_id = p_bidder_id,
    auction_version = COALESCE(auction_version, 0) + 1,
    updated_at = NOW()
  WHERE id = p_product_id;
  
  -- ========================================
  -- 3. LÓGICA DE BONUS TIME (ANTI-SNIPING)
  -- ========================================
  v_current_end_time := v_product.auction_end_at;
  v_new_end_time := NULL;
  
  IF v_product.auto_extend_seconds IS NOT NULL AND v_product.auto_extend_seconds > 0 THEN
    v_bonus_window_seconds := v_product.auto_extend_seconds;
    v_bonus_extend_seconds := v_product.auto_extend_seconds;
  END IF;
  
  IF v_current_end_time IS NOT NULL AND (v_bonus_window_seconds > 0 OR v_product.auto_extend_seconds > 0) THEN
    v_time_remaining := v_current_end_time - NOW();
    v_time_remaining_seconds := EXTRACT(EPOCH FROM v_time_remaining);
    
    IF v_time_remaining_seconds < v_bonus_window_seconds THEN
      v_should_apply_bonus := true;
      
      IF v_product.auction_start_at IS NOT NULL AND v_product.auction_max_duration_hours IS NOT NULL THEN
        v_time_since_start := NOW() - v_product.auction_start_at;
        v_max_duration_seconds := v_product.auction_max_duration_hours * 3600;
        
        IF EXTRACT(EPOCH FROM v_time_since_start) >= v_max_duration_seconds THEN
          v_should_apply_bonus := false;
          INSERT INTO public.auction_events (
            product_id, event_type, user_id, event_data
          ) VALUES (
            p_product_id, 'TIMER_EXTENDED', p_bidder_id,
            jsonb_build_object(
              'old_end_at', v_current_end_time,
              'reason', 'max_duration_reached',
              'max_hours', v_product.auction_max_duration_hours,
              'time_since_start_seconds', EXTRACT(EPOCH FROM v_time_since_start)
            )
          );
        END IF;
      END IF;
      
      IF v_should_apply_bonus THEN
        SELECT COUNT(*) INTO v_extension_count
        FROM public.auction_events
        WHERE product_id = p_product_id
          AND event_type = 'TIMER_EXTENDED'
          AND event_data->>'reason' IS NULL;
        
        IF v_extension_count >= v_bonus_max_extensions THEN
          v_should_apply_bonus := false;
          INSERT INTO public.auction_events (
            product_id, event_type, user_id, event_data
          ) VALUES (
            p_product_id, 'TIMER_EXTENDED', p_bidder_id,
            jsonb_build_object(
              'old_end_at', v_current_end_time,
              'reason', 'max_extensions_reached',
              'max_extensions', v_bonus_max_extensions,
              'current_extensions', v_extension_count
            )
          );
        END IF;
      END IF;
      
      IF v_should_apply_bonus THEN
        v_new_end_time := NOW() + MAKE_INTERVAL(secs => v_bonus_extend_seconds);
        
        UPDATE public.products
        SET auction_end_at = v_new_end_time
        WHERE id = p_product_id;
        
        INSERT INTO public.auction_events (
          product_id, event_type, user_id, event_data
        ) VALUES (
          p_product_id, 'TIMER_EXTENDED', p_bidder_id,
          jsonb_build_object(
            'old_end_at', v_current_end_time,
            'new_end_at', v_new_end_time,
            'extension_seconds', v_bonus_extend_seconds,
            'window_seconds', v_bonus_window_seconds,
            'extension_number', v_extension_count + 1
          )
        );
        
        v_bonus_applied := true;
      END IF;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'bid_id', v_bid_id,
    'current_bid', p_amount,
    'winner_id', p_bidder_id,
    'auction_status', 'active',
    'auction_end_at', COALESCE(v_new_end_time, v_current_end_time),
    'version', (SELECT auction_version FROM public.products WHERE id = p_product_id),
    'bonus_applied', v_bonus_applied,
    'bonus_new_end_time', CASE WHEN v_bonus_applied THEN v_new_end_time ELSE NULL END,
    'bonus_extension_seconds', CASE WHEN v_bonus_applied THEN v_bonus_extend_seconds ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.place_bid(UUID, UUID, DECIMAL, TEXT) IS 
'Coloca una puja en una subasta activa. Incluye bonus time (anti-sniping) con límites:
- Si alguien puja dentro de los últimos {bonus_window_seconds} segundos, se extiende {bonus_extend_seconds} segundos
- Límite de duración máxima total (auction_max_duration_hours)
- Límite de número máximo de extensiones (bonus_max_extensions, default: 50)
- Retorna bonus_applied: true si se aplicó bonus time en esta puja
- Retorna bonus_new_end_time con la nueva fecha de fin si se aplicó bonus';

