-- ============================================
-- DIAGNÓSTICO: Verificar todas las versiones de place_bid()
-- ============================================

-- Ver todas las funciones place_bid con sus esquemas y firmas
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE 
    WHEN p.prosrc LIKE '%get_bonus_time_config%' THEN '✅ Usa configuración centralizada'
    ELSE '❌ NO usa configuración centralizada'
  END as uses_centralized_config,
  CASE 
    WHEN p.prosrc LIKE '%bonus_applied%' THEN '✅ Retorna información de bonus'
    ELSE '❌ NO retorna información de bonus'
  END as returns_bonus_info
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'place_bid'
ORDER BY n.nspname, p.proname;

-- Ver cuántas funciones place_bid hay en total
SELECT COUNT(*) as total_place_bid_functions
FROM pg_proc
WHERE proname = 'place_bid';






