-- ============================================
-- ALINEACIÓN DE ESQUEMA PROD - Mercadito Online PY
-- Migración: image_url -> cover_url
-- ============================================
-- Generado automáticamente para alinear schema local con producción
-- Basado en complete_refresh.sql

-- ============================================
-- PASO 1: Asegurar que cover_url existe
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'cover_url' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.products ADD COLUMN cover_url TEXT;
        RAISE NOTICE '✅ cover_url agregado';
    ELSE
        RAISE NOTICE '✅ cover_url ya existe';
    END IF;
END $$;

-- ============================================
-- PASO 2: Migrar datos de image_url a cover_url
-- ============================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'image_url' 
        AND table_schema = 'public'
    ) THEN
        -- Migrar datos
        UPDATE public.products 
        SET cover_url = image_url 
        WHERE cover_url IS NULL 
        AND image_url IS NOT NULL;
        
        RAISE NOTICE '✅ Datos migrados de image_url a cover_url';
    ELSE
        RAISE NOTICE 'ℹ️ image_url no existe, no hay datos que migrar';
    END IF;
END $$;

-- ============================================
-- PASO 3: Eliminar image_url si existe
-- ============================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'image_url' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.products DROP COLUMN image_url;
        RAISE NOTICE '✅ image_url eliminada';
    ELSE
        RAISE NOTICE '✅ image_url ya fue eliminada';
    END IF;
END $$;

-- ============================================
-- PASO 4: FORZAR REFRESH DE POSTGREST (CRÍTICO)
-- ============================================

NOTIFY pgrst, 'reload schema';


