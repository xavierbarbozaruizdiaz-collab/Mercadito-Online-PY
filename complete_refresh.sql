-- ============================================
-- SCRIPT COMPLETO DE REFRESH - Mercadito Online PY
-- ============================================
-- Ejecutar este script completo en Supabase SQL Editor
-- Este script hace TODO lo necesario para refrescar la base de datos

-- ============================================
-- PASO 1: VERIFICACIÓN INICIAL
-- ============================================

DO $$
DECLARE
    image_url_exists BOOLEAN;
    cover_url_exists BOOLEAN;
BEGIN
    -- Verificar image_url
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'image_url' 
        AND table_schema = 'public'
    ) INTO image_url_exists;
    
    -- Verificar cover_url
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'cover_url' 
        AND table_schema = 'public'
    ) INTO cover_url_exists;
    
    RAISE NOTICE '=== ESTADO INICIAL ===';
    RAISE NOTICE 'image_url existe: %', image_url_exists;
    RAISE NOTICE 'cover_url existe: %', cover_url_exists;
END $$;

-- ============================================
-- PASO 2: Asegurar que cover_url existe
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
-- PASO 3: Migrar datos de image_url a cover_url
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
-- PASO 4: Eliminar image_url si existe
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
-- PASO 5: FORZAR REFRESH DE POSTGREST (CRÍTICO)
-- ============================================

-- Este es el paso MÁS IMPORTANTE
NOTIFY pgrst, 'reload schema';

-- ============================================
-- PASO 6: VERIFICACIÓN FINAL
-- ============================================

DO $$
DECLARE
    image_url_count INTEGER;
    cover_url_count INTEGER;
    total_products INTEGER;
    products_with_cover INTEGER;
BEGIN
    -- Contar columnas
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
    
    -- Contar productos
    SELECT COUNT(*) INTO total_products FROM public.products;
    SELECT COUNT(*) INTO products_with_cover 
    FROM public.products 
    WHERE cover_url IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== ESTADO FINAL ===';
    RAISE NOTICE 'image_url existe: %', CASE WHEN image_url_count > 0 THEN '❌ SÍ (PROBLEMA!)' ELSE '✅ NO (Correcto)' END;
    RAISE NOTICE 'cover_url existe: %', CASE WHEN cover_url_count > 0 THEN '✅ SÍ (Correcto)' ELSE '❌ NO (PROBLEMA!)' END;
    RAISE NOTICE 'Total productos: %', total_products;
    RAISE NOTICE 'Productos con cover_url: %', products_with_cover;
    RAISE NOTICE '';
    
    IF image_url_count > 0 THEN
        RAISE WARNING '⚠️ PROBLEMA: image_url todavía existe después de la migración';
    END IF;
    
    IF cover_url_count = 0 THEN
        RAISE WARNING '⚠️ PROBLEMA: cover_url no existe después de la migración';
    END IF;
    
    IF image_url_count = 0 AND cover_url_count > 0 THEN
        RAISE NOTICE '✅✅✅ TODO CORRECTO: image_url eliminada, cover_url existe';
    END IF;
END $$;

-- ============================================
-- PASO 7: Test de Query (simula ProductsListClient)
-- ============================================

-- Esta query simula exactamente lo que hace ProductsListClient
SELECT 
    id, 
    title, 
    description, 
    price, 
    cover_url,
    condition,
    sale_type,
    category_id,
    seller_id,
    store_id,
    created_at,
    auction_status,
    auction_start_at,
    auction_end_at,
    current_bid,
    total_bids,
    attributes
FROM products
WHERE (status IS NULL OR status = 'active')
AND sale_type != 'auction'
LIMIT 3;

-- Si esta query funciona → La base de datos está correcta
-- Si esta query falla → Revisa el error y compártelo

