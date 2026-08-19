-- ============================================
-- ELIMINAR TODAS LAS VERSIONES DE place_bid()
-- Versión 2: Elimina cada versión específicamente por su firma
-- ============================================

-- PASO 1: Ver todas las versiones que existen
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.oid as function_oid
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'place_bid'
ORDER BY n.nspname, p.proname;

-- PASO 2: Eliminar cada versión específicamente
-- (Ejecuta estas líneas una por una, o todas juntas si PostgreSQL lo permite)

-- Versión con UUID, UUID, DECIMAL(10,2), TEXT
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL(10,2), TEXT);

-- Versión con UUID, UUID, DECIMAL, TEXT
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL, TEXT);

-- Versión con UUID, UUID, DECIMAL (sin idempotency_key)
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, DECIMAL);

-- Versión con UUID, UUID, NUMERIC, TEXT
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC, TEXT);

-- Versión con UUID, UUID, NUMERIC (sin idempotency_key)
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC);

-- Versión con UUID, UUID, NUMERIC(10,2), TEXT
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC(10,2), TEXT);

-- Versión con UUID, UUID, NUMERIC(10,2)
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, NUMERIC(10,2));

-- PASO 3: Verificar que se eliminaron todas
SELECT COUNT(*) as funciones_place_bid_restantes
FROM pg_proc
WHERE proname = 'place_bid';

-- Si el resultado es 0, entonces todas las versiones fueron eliminadas correctamente
-- Si el resultado es > 0, ejecuta la query del PASO 1 de nuevo para ver qué firmas quedan
-- y agrega más DROP FUNCTION con esas firmas específicas






