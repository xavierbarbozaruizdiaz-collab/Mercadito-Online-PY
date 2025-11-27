-- ============================================
-- MERCADITO ONLINE PY - CENTRALIZAR CONFIGURACIÓN DE BONUS TIME
-- Crea una tabla de configuración global para valores de anti-sniping
-- y refactoriza place_bid() para usar estos valores centralizados
-- ============================================

-- ============================================
-- 1. CREAR TABLA DE CONFIGURACIÓN GLOBAL
-- ============================================

-- Tabla para almacenar configuración global de bonus time
CREATE TABLE IF NOT EXISTS public.auction_bonus_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  -- Ventana de activación: si alguien puja cuando quedan menos de X segundos, se activa bonus
  bonus_window_seconds INTEGER NOT NULL DEFAULT 10,
  -- Tiempo de extensión: cuántos segundos se extiende cada vez que se activa
  bonus_extend_seconds INTEGER NOT NULL DEFAULT 10,
  -- Máximo número de extensiones permitidas por subasta
  bonus_max_extensions INTEGER NOT NULL DEFAULT 50,
  -- Descripción opcional
  description TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentarios
COMMENT ON TABLE public.auction_bonus_config IS 
'Configuración global de bonus time (anti-sniping) para subastas. 
Valores por defecto que se usan cuando una subasta no tiene configuración específica.';

COMMENT ON COLUMN public.auction_bonus_config.bonus_window_seconds IS 
'Ventana de activación: si alguien puja cuando quedan menos de X segundos antes de auction_end_at, se activa el bonus time.';

COMMENT ON COLUMN public.auction_bonus_config.bonus_extend_seconds IS 
'Tiempo de extensión: cuántos segundos se extiende auction_end_at cada vez que se activa el bonus time.';

COMMENT ON COLUMN public.auction_bonus_config.bonus_max_extensions IS 
'Máximo número de extensiones permitidas por subasta antes de que el bonus time deje de funcionar.';

-- Insertar configuración por defecto
INSERT INTO public.auction_bonus_config (id, bonus_window_seconds, bonus_extend_seconds, bonus_max_extensions, description)
VALUES ('default', 10, 10, 50, 'Configuración por defecto de bonus time: ventana de 10s, extensión de 10s, máximo 50 extensiones')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. FUNCIÓN AUXILIAR PARA OBTENER CONFIGURACIÓN
-- ============================================

CREATE OR REPLACE FUNCTION public.get_bonus_time_config()
RETURNS TABLE (
  bonus_window_seconds INTEGER,
  bonus_extend_seconds INTEGER,
  bonus_max_extensions INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(abc.bonus_window_seconds, 10)::INTEGER,
    COALESCE(abc.bonus_extend_seconds, 10)::INTEGER,
    COALESCE(abc.bonus_max_extensions, 50)::INTEGER
  FROM public.auction_bonus_config abc
  WHERE abc.id = 'default'
  LIMIT 1;
  
  -- Si no hay configuración, retornar valores por defecto
  IF NOT FOUND THEN
    RETURN QUERY SELECT 10::INTEGER, 10::INTEGER, 50::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_bonus_time_config() IS 
'Retorna la configuración global de bonus time. 
Si no existe configuración, retorna valores por defecto (10s ventana, 10s extensión, 50 extensiones máximas).';

-- ============================================
-- 3. ACTUALIZAR place_bid() CON CONFIGURACIÓN CENTRALIZADA
-- ============================================

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
  -- Leer configuración centralizada (valores por defecto si no existe)
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
  -- 3. LÓGICA DE BONUS TIME (ANTI-SNIPING)
  -- ========================================
  -- Si alguien puja dentro de los últimos {bonus_window_seconds} segundos antes de end_time,
  -- se extiende {bonus_extend_seconds} segundos, siempre respetando los límites
  -- (máximo extensiones y duración máxima total).
  
  v_current_end_time := v_product.auction_end_at;
  v_new_end_time := NULL;
  
  -- Usar auto_extend_seconds de la subasta si está definido (compatibilidad),
  -- sino usar valores de configuración centralizada
  -- NOTA: auto_extend_seconds controla tanto ventana como extensión (comportamiento legacy)
  IF v_product.auto_extend_seconds IS NOT NULL AND v_product.auto_extend_seconds > 0 THEN
    -- Si la subasta tiene configuración específica, usarla para ambos valores
    v_bonus_window_seconds := v_product.auto_extend_seconds;
    v_bonus_extend_seconds := v_product.auto_extend_seconds;
  END IF;
  -- Si no tiene auto_extend_seconds, ya tenemos los valores de get_bonus_time_config() arriba
  
  -- Solo procesar bonus time si hay fecha de fin y está habilitado
  IF v_current_end_time IS NOT NULL AND (v_bonus_window_seconds > 0 OR v_product.auto_extend_seconds > 0) THEN
    -- Calcular tiempo restante hasta el fin de la subasta
    v_time_remaining := v_current_end_time - NOW();
    v_time_remaining_seconds := EXTRACT(EPOCH FROM v_time_remaining);
    
    -- PASO 1: Determinar si la puja cae en la ventana de bonus time
    -- Si quedan menos de {bonus_window_seconds} segundos, se activa el bonus
    IF v_time_remaining_seconds < v_bonus_window_seconds THEN
      v_should_apply_bonus := true;
      
      -- PASO 2: Verificar si todavía se puede aplicar bonus
      -- (no superar extensiones máximas ni duración máxima)
      
      -- LÍMITE 1: DURACIÓN MÁXIMA TOTAL
      IF v_product.auction_start_at IS NOT NULL AND v_product.auction_max_duration_hours IS NOT NULL THEN
        v_time_since_start := NOW() - v_product.auction_start_at;
        v_max_duration_seconds := v_product.auction_max_duration_hours * 3600;
        
        -- Si ya pasó el máximo, NO aplicar bonus
        IF EXTRACT(EPOCH FROM v_time_since_start) >= v_max_duration_seconds THEN
          v_should_apply_bonus := false;
          
          -- Registrar evento de límite alcanzado
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
      
      -- LÍMITE 2: NÚMERO MÁXIMO DE EXTENSIONES
      IF v_should_apply_bonus THEN
        -- Contar cuántas extensiones exitosas ya se han hecho
        SELECT COUNT(*) INTO v_extension_count
        FROM public.auction_events
        WHERE product_id = p_product_id
          AND event_type = 'TIMER_EXTENDED'
          AND event_data->>'reason' IS NULL;
        
        -- Si ya se alcanzó el máximo, NO aplicar bonus
        IF v_extension_count >= v_bonus_max_extensions THEN
          v_should_apply_bonus := false;
          
          -- Registrar evento de límite de extensiones alcanzado
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
      
      -- PASO 3: Calcular nuevo end_time si se puede aplicar bonus
      IF v_should_apply_bonus THEN
        -- Nuevo end_time = NOW() + bonus_extend_seconds
        -- Esto significa que si quedaban 3 segundos y bonus_extend_seconds = 10,
        -- la nueva fecha será NOW() + 10s (quedan 10 segundos, no 13)
        v_new_end_time := NOW() + MAKE_INTERVAL(secs => v_bonus_extend_seconds);
        
        -- PASO 4: Actualizar end_time en la base de datos
        UPDATE public.products
        SET auction_end_at = v_new_end_time
        WHERE id = p_product_id;
        
        -- Registrar evento de extensión exitosa
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
  
  -- ========================================
  -- 5. RETORNAR RESULTADO CON INFORMACIÓN DE BONUS
  -- ========================================
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

-- Comentario
COMMENT ON FUNCTION public.place_bid(UUID, UUID, DECIMAL, TEXT) IS 
'Coloca una puja en una subasta activa. Incluye bonus time (anti-sniping) con límites:
- Si alguien puja dentro de los últimos {bonus_window_seconds} segundos, se extiende {bonus_extend_seconds} segundos
- Límite de duración máxima total (auction_max_duration_hours)
- Límite de número máximo de extensiones (bonus_max_extensions, default: 50)
- Retorna bonus_applied: true si se aplicó bonus time en esta puja
- Retorna bonus_new_end_time con la nueva fecha de fin si se aplicó bonus';







