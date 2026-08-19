-- ============================================
-- VERIFICAR RESULTADO DEL BACKFILL
-- Ejecutar después de ejecutar el backfill
-- ============================================

-- 1. Ver cuántas subastas ahora tienen approval_status = 'pending_approval'
SELECT 
  approval_status,
  COUNT(*) as cantidad
FROM public.products
WHERE sale_type = 'auction'
  AND auction_status = 'ended'
  AND buy_now_price IS NOT NULL
  AND current_bid IS NOT NULL
  AND current_bid < buy_now_price
GROUP BY approval_status
ORDER BY approval_status;

-- 2. Ver detalles de subastas con pending_approval
SELECT 
  id,
  title,
  current_bid,
  buy_now_price,
  approval_status,
  approval_deadline,
  winner_id,
  updated_at
FROM public.products
WHERE sale_type = 'auction'
  AND auction_status = 'ended'
  AND approval_status = 'pending_approval'
ORDER BY approval_deadline ASC
LIMIT 20;

-- 3. Verificar que approval_deadline esté configurado
SELECT 
  COUNT(*) as total_pending_approval,
  COUNT(approval_deadline) as con_deadline,
  COUNT(*) - COUNT(approval_deadline) as sin_deadline
FROM public.products
WHERE sale_type = 'auction'
  AND auction_status = 'ended'
  AND approval_status = 'pending_approval';

-- 4. Verificar notificaciones creadas
SELECT 
  COUNT(*) as notificaciones_enviadas,
  COUNT(DISTINCT user_id) as vendedores_notificados
FROM public.notifications
WHERE type = 'order'
  AND title = 'Aprobación requerida para subasta finalizada'
  AND created_at > NOW() - INTERVAL '1 hour';

