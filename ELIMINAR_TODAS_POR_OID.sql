-- ============================================
-- ELIMINAR TODAS LAS VERSIONES DINÁMICAMENTE POR OID
-- ============================================
-- Este script elimina TODAS las versiones sin importar sus firmas
-- ============================================

-- Método 1: Eliminar todas las versiones usando un bloque DO
DO $$
DECLARE
  func_record RECORD;
  drop_stmt TEXT;
BEGIN
  -- Iterar sobre todas las versiones de place_bid
  FOR func_record IN 
    SELECT 
      p.oid,
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as arguments
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'place_bid'
  LOOP
    -- Construir el comando DROP FUNCTION con la firma exacta
    drop_stmt := format(
      'DROP FUNCTION IF EXISTS %I.%I(%s)',
      func_record.schema_name,
      func_record.function_name,
      func_record.arguments
    );
    
    -- Ejecutar el DROP
    EXECUTE drop_stmt;
    
    -- Log (opcional, para debugging)
    RAISE NOTICE 'Eliminada función: %', drop_stmt;
  END LOOP;
END $$;

-- Verificar que se eliminaron todas (debe retornar 0)
SELECT COUNT(*) as funciones_place_bid_restantes
FROM pg_proc
WHERE proname = 'place_bid';

-- Si el resultado es 0, entonces todas fueron eliminadas correctamente
-- Ahora puedes ejecutar el CREATE FUNCTION de SOLUCION_DEFINITIVA_PLACE_BID.sql






