-- ============================================
-- ELIMINAR AMBAS VERSIONES Y RECREAR SOLO LA CORRECTA
-- ============================================

-- PASO 1: Eliminar TODAS las versiones usando NUMERIC (que es lo que muestra la query)
-- PostgreSQL puede tener DECIMAL y NUMERIC como tipos diferentes internamente

-- Versión con NUMERIC (sin especificar precisión)
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC);

-- Versión con NUMERIC(10,2) (con precisión)
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC(10,2), TEXT);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC(10,2));

-- Versión con DECIMAL (por si acaso)
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL(10,2), TEXT);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL, TEXT);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL);

-- PASO 2: Verificar que se eliminaron todas
SELECT COUNT(*) as funciones_place_bid_restantes
FROM pg_proc
WHERE proname = 'place_bid';

-- Si el resultado es 0, entonces todas fueron eliminadas
-- Si el resultado es > 0, ejecuta esto para ver las firmas exactas:
-- SELECT 
--   n.nspname as schema_name,
--   p.proname as function_name,
--   pg_get_function_identity_arguments(p.oid) as arguments,
--   pg_get_functiondef(p.oid) as definition
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE p.proname = 'place_bid';






