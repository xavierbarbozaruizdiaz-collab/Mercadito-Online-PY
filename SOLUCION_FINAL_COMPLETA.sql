-- ============================================
-- SOLUCIÓN FINAL COMPLETA: Todo en un solo script
-- ============================================
-- Ejecuta este script completo de una vez
-- ============================================

-- ============================================
-- PARTE 1: ELIMINAR TODAS LAS VERSIONES
-- ============================================

-- Primero, ver qué firmas exactas existen
SELECT 
  pg_get_function_identity_arguments(p.oid) as firma_exacta
FROM pg_proc p
WHERE p.proname = 'place_bid';

-- Ahora eliminar TODAS las variaciones posibles
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

-- Verificar que se eliminaron todas (debe retornar 0)
SELECT COUNT(*) as funciones_restantes
FROM pg_proc
WHERE proname = 'place_bid';

-- ============================================
-- PARTE 2: CREAR SOLO LA VERSIÓN CORRECTA
-- ============================================
-- (Continúa en el siguiente bloque...)






