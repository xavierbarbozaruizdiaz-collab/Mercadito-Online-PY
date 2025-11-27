-- ============================================
-- PASO 1: IDENTIFICAR FIRMAS EXACTAS DE LAS VERSIONES QUE QUEDAN
-- ============================================

SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments_exactos,
  p.oid as function_oid,
  CASE 
    WHEN prosrc LIKE '%get_bonus_time_config%' THEN '✅ Nueva'
    ELSE '❌ Antigua'
  END as version_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'place_bid'
ORDER BY version_type;

-- ============================================
-- PASO 2: ELIMINAR ESPECÍFICAMENTE CADA VERSIÓN
-- ============================================
-- Copia la firma exacta de arriba y úsala en el DROP FUNCTION

-- Ejemplo (reemplaza con las firmas exactas que veas arriba):
-- DROP FUNCTION IF EXISTS public.place_bid([FIRMA_EXACTA_AQUI]);

-- ============================================
-- PASO 3: ELIMINAR TODAS LAS POSIBLES VARIACIONES
-- ============================================

-- Eliminar TODAS las variaciones posibles (más exhaustivo)
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC(10,2), TEXT);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC(10,2));
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC(10,0), TEXT);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC(10,0));
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC(12,2), TEXT);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC(12,2));
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL(10,2), TEXT);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL, TEXT);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL(10,0), TEXT);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL(10,0));
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL(12,2), TEXT);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL(12,2));

-- Si aún quedan versiones, usa esto para eliminarlas por OID:
-- DO $$
-- DECLARE
--   func_oid OID;
-- BEGIN
--   FOR func_oid IN 
--     SELECT oid FROM pg_proc WHERE proname = 'place_bid'
--   LOOP
--     EXECUTE format('DROP FUNCTION IF EXISTS %s', pg_get_function_identity_arguments(func_oid));
--   END LOOP;
-- END $$;

-- Verificar que se eliminaron todas
SELECT COUNT(*) as funciones_place_bid_restantes
FROM pg_proc
WHERE proname = 'place_bid';

-- Debe retornar 0

