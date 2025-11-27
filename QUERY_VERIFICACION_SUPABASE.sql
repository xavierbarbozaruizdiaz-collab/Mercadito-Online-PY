-- ============================================
-- QUERY DE VERIFICACIÓN PARA SUPABASE
-- Verificar que close_expired_auctions() se creó correctamente
-- ============================================

-- Opción 1: Verificar que la función existe y ver su definición básica
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type,
  prosrc as source_code
FROM pg_proc
WHERE proname = 'close_expired_auctions';

-- Opción 2: Verificar que tiene las mejoras de race condition
-- Buscar en el código fuente las palabras clave importantes
SELECT 
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%FOR UPDATE OF p SKIP LOCKED%' THEN '✅ Tiene SELECT FOR UPDATE SKIP LOCKED'
    ELSE '❌ NO tiene SELECT FOR UPDATE SKIP LOCKED'
  END as has_skip_locked,
  CASE 
    WHEN prosrc LIKE '%GET DIAGNOSTICS v_rows_updated%' THEN '✅ Tiene GET DIAGNOSTICS'
    ELSE '❌ NO tiene GET DIAGNOSTICS'
  END as has_get_diagnostics,
  CASE 
    WHEN prosrc LIKE '%v_current_status%' AND prosrc LIKE '%v_current_end_at%' THEN '✅ Tiene doble verificación'
    ELSE '❌ NO tiene doble verificación'
  END as has_double_check
FROM pg_proc
WHERE proname = 'close_expired_auctions';

-- Opción 3: Ver la definición completa de la función (más detallada)
SELECT pg_get_functiondef(oid) as full_definition
FROM pg_proc 
WHERE proname = 'close_expired_auctions';

-- Opción 4: Verificar que la función se puede ejecutar (solo si hay subastas expiradas)
-- ⚠️ CUIDADO: Esta query ejecutará la función y cerrará subastas expiradas
-- SELECT close_expired_auctions() as subastas_cerradas;







