-- ============================================
-- VERIFICACIÓN COMPLETA DE MIGRACIÓN BONUS TIME
-- Ejecuta estas queries para confirmar que todo está correcto
-- ============================================

-- 1. Verificar que la tabla se creó
SELECT * FROM public.auction_bonus_config WHERE id = 'default';

-- 2. Verificar que la función auxiliar existe
SELECT proname FROM pg_proc WHERE proname = 'get_bonus_time_config';

-- 3. Verificar que place_bid() tiene la nueva lógica
-- (debe retornar información sobre bonus time)
SELECT 
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%get_bonus_time_config%' THEN '✅ Usa configuración centralizada'
    ELSE '❌ NO usa configuración centralizada'
  END as uses_centralized_config,
  CASE 
    WHEN prosrc LIKE '%bonus_window_seconds%' THEN '✅ Tiene ventana de activación'
    ELSE '❌ NO tiene ventana de activación'
  END as has_bonus_window,
  CASE 
    WHEN prosrc LIKE '%bonus_extend_seconds%' THEN '✅ Tiene tiempo de extensión'
    ELSE '❌ NO tiene tiempo de extensión'
  END as has_bonus_extend,
  CASE 
    WHEN prosrc LIKE '%bonus_applied%' THEN '✅ Retorna información de bonus'
    ELSE '❌ NO retorna información de bonus'
  END as returns_bonus_info
FROM pg_proc
WHERE proname = 'place_bid';

-- 4. Probar la función de configuración
SELECT * FROM public.get_bonus_time_config();






