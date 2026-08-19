-- ============================================
-- SOLUCIÓN FINAL: Eliminar ambas versiones y crear solo la correcta
-- ============================================

-- PASO 1: Eliminar TODAS las versiones (incluyendo NUMERIC)
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC(10,2), TEXT);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC(10,2));
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL(10,2), TEXT);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL, TEXT);
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL);

-- PASO 2: Verificar que se eliminaron todas
SELECT COUNT(*) as funciones_place_bid_restantes
FROM pg_proc
WHERE proname = 'place_bid';
-- Debe retornar 0

-- PASO 3: Ahora ejecuta el archivo EJECUTAR_SQL_BONUS_TIME.sql
-- O copia solo la parte del CREATE FUNCTION desde la línea 81 en adelante






