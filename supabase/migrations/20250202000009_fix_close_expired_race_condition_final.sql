-- ============================================
-- MERCADITO ONLINE PY - FIX RACE CONDITION (FINAL)
-- Mejora close_expired_auctions() para prevenir condiciones de carrera
-- con place_bid() usando SELECT FOR UPDATE
-- 
-- Esta migración actualiza la función existente agregando:
-- - SELECT FOR UPDATE SKIP LOCKED para prevenir race conditions
-- - Doble verificación de estado y tiempo
-- - Condiciones adicionales en UPDATE
-- 
-- IMPORTANTE: Esta migración debe ejecutarse DESPUÉS de:
-- - 20250201000004_update_auction_close_with_commissions.sql
-- ============================================

-- Función mejorada que combina:
-- 1. Cálculo de comisiones (de migración anterior)
-- 2. Prevención de race conditions con place_bid()
CREATE OR REPLACE FUNCTION public.close_expired_auctions()
RETURNS INTEGER AS $$
DECLARE
  v_closed_count INTEGER := 0;
  v_auction RECORD;
  v_current_status TEXT;
  v_current_end_at TIMESTAMPTZ;
  v_rows_updated INTEGER;
  v_buyer_commission_percent DECIMAL(5,2);
  v_seller_commission_percent DECIMAL(5,2);
  v_buyer_commission_amount DECIMAL(10,2);
  v_buyer_total DECIMAL(10,2);
  v_seller_commission_amount DECIMAL(10,2);
  v_seller_earnings DECIMAL(10,2);
  v_store_id UUID;
BEGIN
  -- Buscar subastas activas que han expirado
  -- Usar SELECT FOR UPDATE SKIP LOCKED para prevenir condiciones de carrera
  -- Esto previene que place_bid() modifique la subasta mientras se cierra
  FOR v_auction IN
    SELECT 
      p.id,
      p.seller_id,
      p.store_id,
      p.current_bid,
      p.reserve_price,
      p.auction_status,
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
    FOR UPDATE OF p SKIP LOCKED  -- Bloquear fila, pero saltar si ya está bloqueada
  LOOP
    -- Verificar nuevamente el estado dentro del loop (doble verificación)
    -- Esto previene cerrar una subasta que ya fue cerrada o modificada
    -- mientras se procesaba el SELECT FOR UPDATE
    
    -- Bloquear la fila específica y obtener estado actual
    SELECT auction_status, auction_end_at
    INTO v_current_status, v_current_end_at
    FROM public.products
    WHERE id = v_auction.id
    FOR UPDATE;  -- Bloquear la fila específica

    -- Si el estado cambió (ej: place_bid() la cerró o cambió), saltar
    IF v_current_status != 'active' THEN
      CONTINUE;
    END IF;

    -- Verificar nuevamente que no haya expirado (doble verificación de tiempo)
    -- Esto previene cerrar una subasta que place_bid() extendió con anti-sniping
    IF v_current_end_at IS NULL OR v_current_end_at > NOW() THEN
      -- La subasta fue extendida o no tiene fecha de fin, saltar
      CONTINUE;
    END IF;

    -- Cerrar subasta (solo si pasó todas las validaciones)
    -- Usar GET DIAGNOSTICS para verificar si realmente se actualizó
    UPDATE public.products
    SET 
      auction_status = 'ended',
      winner_id = v_auction.winner_id,
      updated_at = NOW()
    WHERE id = v_auction.id
      AND auction_status = 'active'  -- Condición adicional para evitar race condition
      AND (auction_end_at IS NULL OR auction_end_at <= NOW());  -- Verificación final de tiempo

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

    -- Solo procesar notificaciones y comisiones si realmente se cerró (v_rows_updated > 0)
    IF v_rows_updated > 0 THEN
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
          
          -- Calcular comisiones usando función SQL (si existe)
          BEGIN
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
          EXCEPTION
            WHEN OTHERS THEN
              -- Si las funciones de comisiones no existen, usar valores por defecto
              v_buyer_commission_percent := 0;
              v_seller_commission_percent := 0;
              v_buyer_total := v_auction.current_bid;
              v_seller_earnings := v_auction.current_bid;
          END;
          
          -- Notificar al ganador
          INSERT INTO public.notifications (user_id, type, title, message, data)
          VALUES (
            v_auction.winner_id,
            'order',
            '¡Ganaste la subasta!',
            CASE 
              WHEN v_buyer_commission_percent > 0 THEN
                'Felicidades, ganaste la subasta por Gs. ' || COALESCE(v_auction.current_bid, 0)::TEXT || '. Debes pagar Gs. ' || v_buyer_total::TEXT || ' (incluye comisión de ' || v_buyer_commission_percent::TEXT || '%)'
              ELSE
                'Felicidades, ganaste la subasta por Gs. ' || COALESCE(v_auction.current_bid, 0)::TEXT
            END,
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
            CASE 
              WHEN v_seller_commission_percent > 0 THEN
                'Tu subasta finalizó. Ganador asignado. Precio final: Gs. ' || COALESCE(v_auction.current_bid, 0)::TEXT || '. Recibirás Gs. ' || v_seller_earnings::TEXT || ' (después de ' || v_seller_commission_percent::TEXT || '% comisión)'
              ELSE
                'Tu subasta finalizó. Ganador asignado. Precio: Gs. ' || COALESCE(v_auction.current_bid, 0)::TEXT
            END,
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
    END IF;
  END LOOP;
  
  RETURN v_closed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario
COMMENT ON FUNCTION public.close_expired_auctions() IS 
'Cierra subastas expiradas usando SELECT FOR UPDATE SKIP LOCKED para prevenir condiciones de carrera con place_bid(). 
Incluye doble verificación de estado y tiempo para garantizar consistencia. 
Mantiene cálculo de comisiones de migraciones anteriores.';







