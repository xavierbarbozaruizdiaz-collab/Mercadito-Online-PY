-- ============================================
-- MERCADITO ONLINE PY - UPDATE CLOSE_EXPIRED_AUCTIONS WITH APPROVAL
-- Actualizar función para establecer approval_status cuando monto < buy_now_price
-- ============================================

-- Esta migración actualiza la función close_expired_auctions() para:
-- 1. Establecer approval_status = 'pending_approval' cuando current_bid < buy_now_price
-- 2. Establecer approval_deadline = NOW() + 48 horas
-- 3. Mantener toda la lógica existente de cierre de subastas

-- NOTA: Esta migración debe ejecutarse DESPUÉS de:
-- - 20250130000001_auction_approval_status.sql (agregar columnas)
-- - La última versión de close_expired_auctions()

-- IMPORTANTE: Esta migración modifica la función close_expired_auctions()
-- agregando lógica de aprobación en el UPDATE que cierra la subasta.
-- Si la función cambia en el futuro, esta lógica debe mantenerse.

-- Agregar lógica de aprobación al UPDATE que cierra la subasta
-- Esto se hace modificando el UPDATE en la línea ~91-98 de la función
-- para incluir approval_status y approval_deadline cuando corresponda

-- Como no podemos modificar directamente la función sin reemplazarla completamente,
-- creamos una función auxiliar que se llamará después del cierre
-- O mejor aún, modificamos el UPDATE directamente agregando CASE WHEN

-- Función auxiliar para establecer approval_status después de cerrar
CREATE OR REPLACE FUNCTION public.set_auction_approval_if_needed(
  p_product_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_current_bid DECIMAL(10,2);
  v_buy_now_price DECIMAL(10,2);
  v_approval_status TEXT;
  v_approval_deadline TIMESTAMPTZ;
BEGIN
  -- Obtener current_bid y buy_now_price de la subasta cerrada
  SELECT current_bid, buy_now_price
  INTO v_current_bid, v_buy_now_price
  FROM public.products
  WHERE id = p_product_id
    AND auction_status = 'ended';
  
  -- Si hay buy_now_price y current_bid es menor, requiere aprobación
  IF v_buy_now_price IS NOT NULL 
     AND v_current_bid IS NOT NULL 
     AND v_current_bid < v_buy_now_price 
     AND NOT EXISTS (
       SELECT 1 FROM public.products 
       WHERE id = p_product_id 
       AND approval_status IS NOT NULL
     ) THEN
    v_approval_status := 'pending_approval';
    v_approval_deadline := NOW() + INTERVAL '48 hours';
    
    UPDATE public.products
    SET 
      approval_status = v_approval_status,
      approval_deadline = v_approval_deadline
    WHERE id = p_product_id;
    
    -- Notificar al vendedor que requiere aprobación
    INSERT INTO public.notifications (user_id, type, title, message, data)
    SELECT 
      seller_id,
      'order',
      'Aprobación requerida para subasta finalizada',
      'El monto ganador (' || v_current_bid::TEXT || ') es menor al precio de compra inmediata (' || v_buy_now_price::TEXT || '). Requiere tu aprobación.',
      jsonb_build_object(
        'product_id', p_product_id,
        'winning_bid', v_current_bid,
        'buy_now_price', v_buy_now_price,
        'approval_deadline', v_approval_deadline
      )
    FROM public.products
    WHERE id = p_product_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario
COMMENT ON FUNCTION public.set_auction_approval_if_needed IS 
'Establece approval_status cuando monto ganador < buy_now_price. Llamar después de cerrar subasta.';

-- NOTA: Para que esto funcione automáticamente, necesitamos modificar close_expired_auctions()
-- para llamar a esta función después de cerrar cada subasta. Esto se puede hacer en una migración
-- posterior que reemplace completamente close_expired_auctions() o agregando un trigger.

-- Agregar llamada a set_auction_approval_if_needed() en close_expired_auctions()
-- Esto se hace modificando la función para llamar a esta función después de cerrar cada subasta
-- Justo antes de incrementar v_closed_count (línea ~239)

-- Crear trigger que se ejecute después de actualizar auction_status a 'ended'
-- Esto es más seguro que modificar la función completa
CREATE OR REPLACE FUNCTION public.check_auction_approval_needed()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar si la subasta acaba de cambiar a 'ended'
  IF NEW.auction_status = 'ended' AND (OLD.auction_status IS NULL OR OLD.auction_status != 'ended') THEN
    -- Llamar a la función de aprobación
    PERFORM public.set_auction_approval_if_needed(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_check_auction_approval ON public.products;
CREATE TRIGGER trigger_check_auction_approval
  AFTER UPDATE OF auction_status ON public.products
  FOR EACH ROW
  WHEN (NEW.auction_status = 'ended' AND (OLD.auction_status IS NULL OR OLD.auction_status != 'ended'))
  EXECUTE FUNCTION public.check_auction_approval_needed();

-- Comentario
COMMENT ON FUNCTION public.check_auction_approval_needed IS 
'Trigger que verifica si una subasta cerrada requiere aprobación (monto < buy_now_price)';

