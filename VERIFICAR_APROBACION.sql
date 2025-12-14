-- ============================================
-- VERIFICACIÓN COMPLETA - SISTEMA DE APROBACIÓN DE SUBASTAS
-- Ejecutar después de todas las migraciones
-- ============================================

-- 1. ✅ Verificar columnas de aprobación
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name LIKE 'approval%'
ORDER BY ordinal_position;

-- 2. ✅ Verificar constraint CHECK de approval_status (debe aceptar ambos valores)
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.products'::regclass 
AND conname LIKE '%approval%';

-- 3. ✅ Verificar índices
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'products' 
AND indexname LIKE '%approval%'
ORDER BY indexname;

-- 4. ✅ Verificar funciones creadas
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('set_auction_approval_if_needed', 'check_auction_approval_needed')
ORDER BY routine_name;

-- 5. ✅ Verificar trigger activo
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_check_auction_approval';

-- 6. ✅ Verificar que close_expired_auctions existe
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'close_expired_auctions';

-- 7. ✅ Verificar subastas que requieren aprobación (ejemplo)
SELECT 
  id,
  title,
  auction_status,
  current_bid,
  buy_now_price,
  approval_status,
  approval_deadline,
  winner_id,
  CASE 
    WHEN buy_now_price IS NOT NULL AND current_bid IS NOT NULL AND current_bid < buy_now_price 
    THEN 'REQUIERE APROBACIÓN' 
    ELSE 'NO REQUIERE' 
  END as estado_aprobacion
FROM public.products
WHERE sale_type = 'auction'
  AND auction_status = 'ended'
  AND buy_now_price IS NOT NULL
  AND current_bid IS NOT NULL
LIMIT 10;

