-- ============================================
-- SCRIPT INMEDIATO: Eliminar image_url y asegurar cover_url
-- ============================================
-- Ejecutar este script directamente en Supabase SQL Editor
-- NO requiere creación de migración, solo ejecuta directamente

-- Paso 1: Asegurar que cover_url existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'cover_url' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.products ADD COLUMN cover_url TEXT;
    RAISE NOTICE 'Columna cover_url agregada';
  ELSE
    RAISE NOTICE 'Columna cover_url ya existe';
  END IF;
END $$;

-- Paso 2: Migrar datos de image_url a cover_url si image_url existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'image_url' 
    AND table_schema = 'public'
  ) THEN
    -- Copiar datos
    UPDATE public.products 
    SET cover_url = image_url 
    WHERE cover_url IS NULL AND image_url IS NOT NULL;
    
    RAISE NOTICE 'Datos migrados de image_url a cover_url';
  ELSE
    RAISE NOTICE 'Columna image_url no existe, no hay nada que migrar';
  END IF;
END $$;

-- Paso 3: Eliminar image_url si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'image_url' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.products DROP COLUMN image_url;
    RAISE NOTICE 'Columna image_url eliminada';
  ELSE
    RAISE NOTICE 'Columna image_url ya fue eliminada';
  END IF;
END $$;

-- Paso 4: Forzar refresh de PostgREST (CRÍTICO)
NOTIFY pgrst, 'reload schema';

-- Paso 5: Verificación final
DO $$
DECLARE
  image_url_count INTEGER;
  cover_url_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO image_url_count
  FROM information_schema.columns 
  WHERE table_name = 'products' 
  AND column_name = 'image_url' 
  AND table_schema = 'public';
  
  SELECT COUNT(*) INTO cover_url_count
  FROM information_schema.columns 
  WHERE table_name = 'products' 
  AND column_name = 'cover_url' 
  AND table_schema = 'public';
  
  IF image_url_count > 0 THEN
    RAISE WARNING '❌ PROBLEMA: image_url todavía existe!';
  ELSE
    RAISE NOTICE '✅ image_url no existe (correcto)';
  END IF;
  
  IF cover_url_count > 0 THEN
    RAISE NOTICE '✅ cover_url existe (correcto)';
  ELSE
    RAISE WARNING '❌ PROBLEMA: cover_url no existe!';
  END IF;
END $$;


