-- ============================================
-- MERCADITO ONLINE PY - MEJORAS DE SEGURIDAD ANTI-TRAMPA
-- Rate limiting, locks transaccionales, versionado, auditoría
-- ============================================

-- ============================================
-- 1. AGREGAR COLUMNAS DE VERSIONADO Y CONTROL
-- ============================================

-- Versionado de lote para prevenir mensajes desactualizados
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS auction_version INTEGER DEFAULT 0;

-- Crear índice para versionado
CREATE INDEX IF NOT EXISTS idx_products_auction_version ON public.products(auction_version) 
WHERE sale_type = 'auction';

-- ============================================
-- 2. AGREGAR IDEMPOTENCY KEY A AUCTION_BIDS
-- ============================================

-- Idempotency key para prevenir pujas duplicadas por retry
ALTER TABLE public.auction_bids
ADD COLUMN IF NOT EXISTS idempotency_key UUID;

-- Índice único para idempotency (solo cuando no es NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bids_idempotency 
ON public.auction_bids(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- ============================================
-- 3. CREAR TABLA DE AUDITORÍA
-- ============================================

CREATE TABLE IF NOT EXISTS public.auction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'BID_PLACED', 
    'BID_REJECTED', 
    'TIMER_EXTENDED', 
    'LOT_CLOSED', 
    'LOT_ACTIVATED',
    'BUY_NOW_EXECUTED'
  )),
  user_id UUID REFERENCES auth.users(id),
  event_data JSONB,
  server_timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para auditoría
CREATE INDEX IF NOT EXISTS idx_auction_events_product ON public.auction_events(product_id);
CREATE INDEX IF NOT EXISTS idx_auction_events_type ON public.auction_events(event_type);
CREATE INDEX IF NOT EXISTS idx_auction_events_user ON public.auction_events(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_events_timestamp ON public.auction_events(server_timestamp DESC);

-- Habilitar RLS
ALTER TABLE public.auction_events ENABLE ROW LEVEL SECURITY;

-- Política: Solo usuarios autenticados pueden ver eventos
DROP POLICY IF EXISTS "Authenticated can view auction events" ON public.auction_events;
CREATE POLICY "Authenticated can view auction events" ON public.auction_events
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- 4. FUNCIÓN MEJORADA: place_bid con seguridad
-- ============================================

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
    p.auction_status,
    p.min_bid_increment,
    p.auto_extend_seconds,
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
  
  -- Actualizar producto: nuevo precio actual, contador de pujas, y VERSIÓN
  UPDATE public.products
  SET 
    current_bid = p_amount,
    total_bids = total_bids + 1,
    auction_version = v_new_version,
    updated_at = NOW()
  WHERE id = p_product_id;
  
  -- ANTI-SNIPING: Extender tiempo si queda poco tiempo
  v_auction_end_at := v_product.auction_end_at;
  v_new_end_at := NULL;
  
  IF v_auction_end_at IS NOT NULL AND v_product.auto_extend_seconds > 0 THEN
    -- Si quedan menos de X segundos, extender
    IF (v_auction_end_at - NOW()) < MAKE_INTERVAL(secs => v_product.auto_extend_seconds) THEN
      v_new_end_at := NOW() + MAKE_INTERVAL(secs => v_product.auto_extend_seconds);
      
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
          'extension_seconds', v_product.auto_extend_seconds
        )
      );
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
      'previous_bid', v_current_bid,
      'new_end_at', v_new_end_at,
      'version', v_new_version,
      'server_timestamp', NOW()
    )
  );
  
  -- Crear notificaciones
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_product.seller_id,
    'order',
    'Nueva puja recibida',
    'Nueva puja de Gs. ' || p_amount::TEXT || ' en tu subasta',
    jsonb_build_object(
      'product_id', p_product_id,
      'bid_id', v_bid_id,
      'amount', p_amount,
      'version', v_new_version
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
        'new_bid', p_amount,
        'version', v_new_version
      )
    );
  END IF;
  
  -- Retornar resultado con información completa
  SELECT jsonb_build_object(
    'success', true,
    'bid_id', v_bid_id,
    'amount', p_amount,
    'previous_bid', v_current_bid,
    'version', v_new_version,
    'end_at', COALESCE(v_new_end_at, v_auction_end_at),
    'server_timestamp', NOW(),
    'is_duplicate', false
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. ACTUALIZAR close_expired_auctions CON AUDITORÍA
-- ============================================

CREATE OR REPLACE FUNCTION public.close_expired_auctions()
RETURNS INTEGER AS $$
DECLARE
  v_closed_count INTEGER := 0;
  v_product RECORD;
  v_winner_id UUID;
  v_winner_bid DECIMAL(10,2);
BEGIN
  -- Cerrar subastas expiradas que aún están activas
  FOR v_product IN
    SELECT 
      p.id,
      p.seller_id,
      p.current_bid,
      p.auction_end_at,
      p.auction_version
    FROM public.products p
    WHERE p.sale_type = 'auction'
      AND p.auction_status = 'active'
      AND p.auction_end_at IS NOT NULL
      AND p.auction_end_at <= NOW()
    FOR UPDATE -- Lock para prevenir condiciones de carrera
  LOOP
    -- Obtener ganador (mayor puja)
    SELECT bidder_id, amount INTO v_winner_id, v_winner_bid
    FROM public.auction_bids
    WHERE product_id = v_product.id
      AND is_retracted = false
    ORDER BY amount DESC, bid_time ASC
    LIMIT 1;
    
    -- Actualizar producto
    UPDATE public.products
    SET 
      auction_status = 'ended',
      winner_id = v_winner_id,
      auction_version = auction_version + 1,
      updated_at = NOW()
    WHERE id = v_product.id;
    
    -- Registrar evento de cierre
    INSERT INTO public.auction_events (
      product_id, event_type, user_id, event_data
    ) VALUES (
      v_product.id, 'LOT_CLOSED', NULL,
      jsonb_build_object(
        'winner_id', v_winner_id,
        'winning_bid', v_winner_bid,
        'version', v_product.auction_version + 1,
        'closed_at', NOW()
      )
    );
    
    v_closed_count := v_closed_count + 1;
  END LOOP;
  
  RETURN v_closed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. FUNCIÓN PARA SCHEDULER AUTOMÁTICO
-- ============================================

-- Esta función se puede llamar desde un cron job o Edge Function
CREATE OR REPLACE FUNCTION public.auto_close_expired_auctions()
RETURNS JSONB AS $$
DECLARE
  v_closed_count INTEGER;
  v_result JSONB;
BEGIN
  v_closed_count := public.close_expired_auctions();
  
  SELECT jsonb_build_object(
    'success', true,
    'closed_count', v_closed_count,
    'timestamp', NOW()
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON COLUMN public.products.auction_version IS 'Versión del lote para prevenir mensajes desactualizados';
COMMENT ON COLUMN public.auction_bids.idempotency_key IS 'Clave única para prevenir pujas duplicadas por retry';
COMMENT ON TABLE public.auction_events IS 'Log de auditoría inmutable de todos los eventos de subasta';
COMMENT ON FUNCTION public.place_bid IS 'Coloca una puja con rate limiting, locks transaccionales, versionado e idempotencia';
COMMENT ON FUNCTION public.auto_close_expired_auctions IS 'Cierra automáticamente subastas expiradas. Llamar cada 5-10 segundos';

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.place_bid TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_close_expired_auctions TO authenticated;
GRANT SELECT ON public.auction_events TO authenticated;

