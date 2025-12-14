-- ============================================
-- MERCADITO ONLINE PY - BACKFILL APPROVAL_STATUS
-- Actualizar subastas existentes que requieren aprobación
-- ============================================

-- Este script actualiza subastas que fueron cerradas ANTES de crear el trigger
-- y que cumplen los criterios: current_bid < buy_now_price

-- Actualizar subastas que requieren aprobación pero no tienen approval_status configurado
UPDATE public.products
SET 
  approval_status = 'pending_approval',
  approval_deadline = COALESCE(
    approval_deadline,  -- Si ya tiene deadline, mantenerlo
    NOW() + INTERVAL '48 hours'  -- Si no, establecer 48 horas desde ahora
  )
WHERE sale_type = 'auction'
  AND auction_status = 'ended'
  AND buy_now_price IS NOT NULL
  AND current_bid IS NOT NULL
  AND current_bid < buy_now_price
  AND winner_id IS NOT NULL  -- Solo si hay ganador
  AND (
    approval_status IS NULL 
    OR approval_status = 'pending'  -- Actualizar las que tienen 'pending' del sistema anterior
  )
  AND approval_deadline IS NULL;  -- Solo actualizar las que no tienen deadline

-- Notificar a los vendedores sobre subastas que requieren aprobación
-- (Solo para las que acabamos de actualizar)
INSERT INTO public.notifications (user_id, type, title, message, data)
SELECT DISTINCT
  p.seller_id,
  'order',
  'Aprobación requerida para subasta finalizada',
  'El monto ganador (' || p.current_bid::TEXT || ') es menor al precio de compra inmediata (' || p.buy_now_price::TEXT || '). Requiere tu aprobación.',
  jsonb_build_object(
    'product_id', p.id,
    'winning_bid', p.current_bid,
    'buy_now_price', p.buy_now_price,
    'approval_deadline', p.approval_deadline
  )
FROM public.products p
WHERE p.sale_type = 'auction'
  AND p.auction_status = 'ended'
  AND p.approval_status = 'pending_approval'
  AND p.approval_deadline IS NOT NULL
  AND NOT EXISTS (
    -- Solo crear notificación si no existe ya una similar reciente
    SELECT 1 
    FROM public.notifications n 
    WHERE n.user_id = p.seller_id 
      AND n.type = 'order'
      AND n.data->>'product_id' = p.id::TEXT
      AND n.created_at > NOW() - INTERVAL '1 hour'
  );

-- Reporte de actualización
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_updated_count
  FROM public.products
  WHERE sale_type = 'auction'
    AND auction_status = 'ended'
    AND approval_status = 'pending_approval';
  
  RAISE NOTICE '✅ Backfill completado. Subastas con approval_status = pending_approval: %', v_updated_count;
END $$;

