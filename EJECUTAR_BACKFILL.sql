-- ============================================
-- BACKFILL: Actualizar subastas existentes que requieren aprobación
-- ============================================

-- PASO 1: Verificar cuántas subastas necesitan actualización
SELECT 
  COUNT(*) as subastas_que_necesitan_aprobacion,
  COUNT(CASE WHEN approval_status IS NULL THEN 1 END) as sin_approval_status,
  COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as con_pending,
  COUNT(CASE WHEN approval_status = 'pending_approval' THEN 1 END) as con_pending_approval
FROM public.products
WHERE sale_type = 'auction'
  AND auction_status = 'ended'
  AND buy_now_price IS NOT NULL
  AND current_bid IS NOT NULL
  AND current_bid < buy_now_price
  AND winner_id IS NOT NULL;

-- PASO 2: Ver detalles de las subastas que se actualizarán
SELECT 
  id,
  title,
  current_bid,
  buy_now_price,
  approval_status as estado_actual,
  approval_deadline,
  winner_id
FROM public.products
WHERE sale_type = 'auction'
  AND auction_status = 'ended'
  AND buy_now_price IS NOT NULL
  AND current_bid IS NOT NULL
  AND current_bid < buy_now_price
  AND winner_id IS NOT NULL
  AND (
    approval_status IS NULL 
    OR approval_status = 'pending'
  )
ORDER BY updated_at DESC
LIMIT 20;

-- PASO 3: EJECUTAR EL BACKFILL
-- (Ejecutar el contenido de: supabase/migrations/20250130000004_backfill_approval_status.sql)

-- PASO 4: Verificar resultado después del backfill
SELECT 
  approval_status,
  COUNT(*) as cantidad
FROM public.products
WHERE sale_type = 'auction'
  AND auction_status = 'ended'
  AND buy_now_price IS NOT NULL
  AND current_bid IS NOT NULL
  AND current_bid < buy_now_price
GROUP BY approval_status;

