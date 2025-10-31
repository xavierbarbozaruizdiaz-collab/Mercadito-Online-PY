-- ============================================
-- MERCADITO ONLINE PY - SISTEMA DE SUBASTAS
-- Migración completa para sistema de subastas
-- ============================================

-- ============================================
-- 1. CREAR TABLA DE PUJAS (AUCTION_BIDS)
-- ============================================

CREATE TABLE IF NOT EXISTS public.auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  bid_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_auto_bid BOOLEAN DEFAULT FALSE,
  max_auto_bid DECIMAL(10,2), -- máximo para auto-bid (futuro)
  is_retracted BOOLEAN DEFAULT FALSE,
  retracted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Índices para performance
  CONSTRAINT fk_bids_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
  CONSTRAINT fk_bids_bidder FOREIGN KEY (bidder_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_bids_product ON public.auction_bids(product_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON public.auction_bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_time ON public.auction_bids(bid_time DESC);
CREATE INDEX IF NOT EXISTS idx_bids_product_amount ON public.auction_bids(product_id, amount DESC);

-- ============================================
-- 2. AGREGAR COLUMNAS A PRODUCTS PARA SUBASTAS
-- ============================================

-- Columnas para gestionar subastas
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS auction_end_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auction_start_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auction_status TEXT DEFAULT 'scheduled' 
  CHECK (auction_status IN ('scheduled', 'active', 'ended', 'cancelled')),
ADD COLUMN IF NOT EXISTS current_bid DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS min_bid_increment DECIMAL(10,2) DEFAULT 1000,
ADD COLUMN IF NOT EXISTS buy_now_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS reserve_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS total_bids INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_extend_seconds INTEGER DEFAULT 10; -- segundos de extensión anti-sniping

-- Índices para subastas
CREATE INDEX IF NOT EXISTS idx_products_auction_status ON public.products(auction_status) 
  WHERE sale_type = 'auction';
CREATE INDEX IF NOT EXISTS idx_products_auction_end_at ON public.products(auction_end_at) 
  WHERE sale_type = 'auction' AND auction_status = 'active';

-- ============================================
-- 3. HABILITAR RLS EN AUCTION_BIDS
-- ============================================

ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede ver pujas (público)
DROP POLICY IF EXISTS "Public can view bids" ON public.auction_bids;
CREATE POLICY "Public can view bids" ON public.auction_bids
FOR SELECT
TO public
USING (true);

-- Política: Usuarios autenticados pueden crear pujas
DROP POLICY IF EXISTS "Authenticated can create bids" ON public.auction_bids;
CREATE POLICY "Authenticated can create bids" ON public.auction_bids
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = bidder_id);

-- Política: Usuarios pueden retraer sus propias pujas (solo si aún no es la ganadora)
DROP POLICY IF EXISTS "Users can retract own bids" ON public.auction_bids;
CREATE POLICY "Users can retract own bids" ON public.auction_bids
FOR UPDATE
TO authenticated
USING (auth.uid() = bidder_id AND is_retracted = false)
WITH CHECK (auth.uid() = bidder_id);

-- ============================================
-- 4. FUNCIONES DE BASE DE DATOS
-- ============================================

-- 4.1 Función para calcular incremento mínimo de puja
CREATE OR REPLACE FUNCTION public.calculate_min_bid_increment(current_bid_amount DECIMAL)
RETURNS DECIMAL(10,2) AS $$
BEGIN
  IF current_bid_amount < 10000 THEN
    RETURN 1000;
  ELSIF current_bid_amount < 50000 THEN
    RETURN 5000;
  ELSIF current_bid_amount < 100000 THEN
    RETURN 10000;
  ELSE
    RETURN ROUND(current_bid_amount * 0.10, 0); -- 10% del precio actual
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4.2 Función para colocar una puja (place_bid)
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
      
      -- Emitir evento para actualizar timer en tiempo real
      -- (Esto se manejará con Supabase Realtime)
    END IF;
  END IF;
  
  -- Crear notificaciones
  -- Notificar al vendedor
  INSERT INTO public.notifications (user_id, type, title, content, data)
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
    INSERT INTO public.notifications (user_id, type, title, content, data)
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

-- 4.3 Función para compra ahora (buy_now)
CREATE OR REPLACE FUNCTION public.buy_now_auction(
  p_product_id UUID,
  p_buyer_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_product RECORD;
  v_order_id UUID;
  v_buyer_price DECIMAL(10,2);
  v_all_bidders UUID[];
BEGIN
  -- Obtener información del producto
  SELECT 
    p.id,
    p.seller_id,
    p.buy_now_price,
    p.auction_status,
    p.auction_end_at,
    COALESCE((p.attributes->>'auction')::json->>'buy_now_price', '0')::DECIMAL as buy_now_from_attrs
  INTO v_product
  FROM public.products p
  WHERE p.id = p_product_id AND p.sale_type = 'auction';
  
  -- Validar que existe y es subasta
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado o no es una subasta';
  END IF;
  
  -- Validar que tiene precio de compra ahora
  v_buyer_price := COALESCE(v_product.buy_now_price, v_product.buy_now_from_attrs);
  IF v_buyer_price IS NULL OR v_buyer_price <= 0 THEN
    RAISE EXCEPTION 'Esta subasta no tiene opción de compra ahora';
  END IF;
  
  -- Validar que el comprador no es el vendedor
  IF v_product.seller_id = p_buyer_id THEN
    RAISE EXCEPTION 'No puedes comprar tu propia subasta';
  END IF;
  
  -- Validar que está activa
  IF v_product.auction_status != 'active' THEN
    RAISE EXCEPTION 'La subasta no está activa';
  END IF;
  
  -- Obtener lista de postores para notificaciones
  SELECT ARRAY_AGG(DISTINCT bidder_id) INTO v_all_bidders
  FROM public.auction_bids
  WHERE product_id = p_product_id
    AND is_retracted = false;
  
  -- Cerrar subasta inmediatamente
  UPDATE public.products
  SET 
    auction_status = 'ended',
    auction_end_at = NOW(),
    winner_id = p_buyer_id,
    current_bid = v_buyer_price,
    updated_at = NOW()
  WHERE id = p_product_id;
  
  -- Crear orden directamente (simplificado - usar función existente si está disponible)
  -- Por ahora, solo asignamos winner_id
  
  -- Notificar a todos los postores
  IF v_all_bidders IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, content, data)
    SELECT 
      bidder_id,
      'order',
      'Compra ahora realizada',
      'La subasta fue comprada directamente por Gs. ' || v_buyer_price::TEXT,
      jsonb_build_object(
        'product_id', p_product_id,
        'amount', v_buyer_price
      )
    FROM UNNEST(v_all_bidders) AS bidder_id
    WHERE bidder_id != p_buyer_id;
  END IF;
  
  -- Notificar al vendedor
  INSERT INTO public.notifications (user_id, type, title, content, data)
  VALUES (
    v_product.seller_id,
    'order',
    'Compra ahora realizada',
    'Alguien compró tu subasta directamente por Gs. ' || v_buyer_price::TEXT,
    jsonb_build_object(
      'product_id', p_product_id,
      'buyer_id', p_buyer_id,
      'amount', v_buyer_price
    )
  );
  
  RETURN p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.4 Función para cerrar subastas expiradas (auto-cierre)
CREATE OR REPLACE FUNCTION public.close_expired_auctions()
RETURNS INTEGER AS $$
DECLARE
  v_closed_count INTEGER := 0;
  v_auction RECORD;
BEGIN
  -- Buscar subastas activas que han expirado
  FOR v_auction IN
    SELECT 
      p.id,
      p.seller_id,
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
        -- Notificar al ganador
        INSERT INTO public.notifications (user_id, type, title, content, data)
        VALUES (
          v_auction.winner_id,
          'order',
          '¡Ganaste la subasta!',
          'Felicidades, ganaste la subasta por Gs. ' || COALESCE(v_auction.current_bid, 0)::TEXT,
          jsonb_build_object(
            'product_id', v_auction.id,
            'winning_bid', v_auction.current_bid
          )
        );
        
        -- Notificar al vendedor
        INSERT INTO public.notifications (user_id, type, title, content, data)
        VALUES (
          v_auction.seller_id,
          'order',
          'Subasta finalizada',
          'Tu subasta finalizó. Ganador asignado. Precio: Gs. ' || COALESCE(v_auction.current_bid, 0)::TEXT,
          jsonb_build_object(
            'product_id', v_auction.id,
            'winner_id', v_auction.winner_id,
            'final_price', v_auction.current_bid
          )
        );
        
        -- Notificar a otros postores que perdieron
        INSERT INTO public.notifications (user_id, type, title, content, data)
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
        INSERT INTO public.notifications (user_id, type, title, content, data)
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
      INSERT INTO public.notifications (user_id, type, title, content, data)
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

-- 4.5 Función para activar subastas programadas (iniciar cuando llegue start_date)
CREATE OR REPLACE FUNCTION public.activate_scheduled_auctions()
RETURNS INTEGER AS $$
DECLARE
  v_activated_count INTEGER := 0;
  v_auction RECORD;
  v_duration_minutes INTEGER;
  v_end_at TIMESTAMPTZ;
BEGIN
  -- Buscar subastas programadas que deben iniciar
  FOR v_auction IN
    SELECT 
      p.id,
      p.auction_start_at,
      (p.attributes->>'auction')::json->>'duration_minutes' as duration_from_attrs,
      (p.attributes->>'auction')::json->>'starting_price' as starting_price_from_attrs
    FROM public.products p
    WHERE p.sale_type = 'auction'
      AND p.auction_status = 'scheduled'
      AND p.auction_start_at IS NOT NULL
      AND p.auction_start_at <= NOW()
  LOOP
    -- Calcular fecha de fin (por defecto 24 horas = 1440 minutos)
    v_duration_minutes := COALESCE(
      (v_auction.duration_from_attrs::TEXT)::INTEGER,
      1440
    );
    v_end_at := COALESCE(v_auction.auction_start_at, NOW()) + MAKE_INTERVAL(mins => v_duration_minutes);
    
    -- Obtener precio inicial
    DECLARE
      v_starting_price DECIMAL(10,2);
    BEGIN
      SELECT COALESCE(
        (v_auction.starting_price_from_attrs::TEXT)::DECIMAL,
        price
      ) INTO v_starting_price
      FROM public.products
      WHERE id = v_auction.id;
      
      -- Activar subasta
      UPDATE public.products
      SET 
        auction_status = 'active',
        auction_start_at = COALESCE(v_auction.auction_start_at, NOW()),
        auction_end_at = v_end_at,
        current_bid = v_starting_price,
        updated_at = NOW()
      WHERE id = v_auction.id;
      
      v_activated_count := v_activated_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        -- Continuar con siguiente subasta si hay error
        CONTINUE;
    END;
  END LOOP;
  
  RETURN v_activated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. TRIGGERS Y TAREAS PROGRAMADAS
-- ============================================

-- Trigger para actualizar updated_at en auction_bids
CREATE OR REPLACE FUNCTION public.update_auction_bids_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_auction_bids_updated_at ON public.auction_bids;
CREATE TRIGGER trigger_update_auction_bids_updated_at
BEFORE UPDATE ON public.auction_bids
FOR EACH ROW
EXECUTE FUNCTION public.update_auction_bids_updated_at();

-- Nota: Para auto-cierre e inicio automático, necesitarás:
-- 1. Edge Function de Supabase que ejecute cada minuto
-- 2. O un cron job externo que llame a estas funciones
-- Por ahora, las funciones están listas para ser llamadas

-- ============================================
-- 6. COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE public.auction_bids IS 'Registro de todas las pujas realizadas en subastas';
COMMENT ON COLUMN public.auction_bids.amount IS 'Monto de la puja en guaraníes';
COMMENT ON COLUMN public.auction_bids.is_auto_bid IS 'Indica si es una puja automática (para implementación futura)';
COMMENT ON COLUMN public.auction_bids.is_retracted IS 'Indica si la puja fue retraída por el usuario';

COMMENT ON FUNCTION public.place_bid IS 'Coloca una puja en una subasta activa. Valida incrementos mínimos y aplica anti-sniping';
COMMENT ON FUNCTION public.buy_now_auction IS 'Compra inmediata de una subasta (buy now). Cierra la subasta automáticamente';
COMMENT ON FUNCTION public.close_expired_auctions IS 'Cierra subastas que han expirado y asigna ganadores';
COMMENT ON FUNCTION public.activate_scheduled_auctions IS 'Activa subastas programadas cuando llega su fecha de inicio';

