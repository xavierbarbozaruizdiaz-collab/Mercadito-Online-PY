-- ============================================
-- ELIMINAR TODAS LAS VERSIONES DE place_bid()
-- ============================================
-- Este script elimina TODAS las versiones existentes, sin importar sus firmas
-- ============================================

-- Primero, ver todas las versiones que existen
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.oid as function_oid
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'place_bid'
ORDER BY n.nspname, p.proname;

-- Eliminar TODAS las versiones usando CASCADE
-- Esto eliminará todas las versiones sin importar sus firmas
DROP FUNCTION IF EXISTS public.place_bid CASCADE;

-- Verificar que se eliminaron todas
SELECT COUNT(*) as funciones_place_bid_restantes
FROM pg_proc
WHERE proname = 'place_bid';

-- Si el resultado es 0, entonces todas las versiones fueron eliminadas correctamente






