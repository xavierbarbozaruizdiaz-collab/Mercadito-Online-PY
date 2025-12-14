-- ============================================
-- [LPMS CRÍTICO] Verificar y corregir estructura de product_images
-- ============================================
-- El problema puede ser conflicto de tipos: bigint vs UUID

-- 1. Verificar estructura actual
DO $$
DECLARE
    v_product_id_type TEXT;
    v_id_type TEXT;
BEGIN
    -- Verificar tipo de product_id
    SELECT data_type INTO v_product_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'product_images'
    AND column_name = 'product_id';
    
    -- Verificar tipo de id
    SELECT data_type INTO v_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'product_images'
    AND column_name = 'id';
    
    RAISE NOTICE 'product_id type: %, id type: %', v_product_id_type, v_id_type;
END $$;

-- 2. Si product_id es bigint, necesitamos cambiarlo a UUID
-- PERO primero verificar que products.id sea UUID
DO $$
DECLARE
    v_products_id_type TEXT;
    v_product_images_product_id_type TEXT;
BEGIN
    -- Verificar tipo de products.id
    SELECT data_type INTO v_products_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'products'
    AND column_name = 'id';
    
    -- Verificar tipo de product_images.product_id
    SELECT data_type INTO v_product_images_product_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'product_images'
    AND column_name = 'product_id';
    
    -- Si products.id es UUID pero product_images.product_id es bigint, hay conflicto
    IF v_products_id_type = 'uuid' AND v_product_images_product_id_type = 'bigint' THEN
        RAISE NOTICE 'CONFLICTO DETECTADO: products.id es UUID pero product_images.product_id es bigint';
        RAISE NOTICE 'Necesitamos convertir product_images.product_id a UUID';
        
        -- NO hacer la conversión automáticamente porque puede romper datos existentes
        -- Mejor crear una nueva columna temporal y migrar
    ELSE
        RAISE NOTICE 'Tipos compatibles: products.id = %, product_images.product_id = %', 
            v_products_id_type, v_product_images_product_id_type;
    END IF;
END $$;

-- 3. Asegurar que todas las columnas necesarias existan con los tipos correctos
-- Si la tabla usa UUID, asegurar que todas las columnas estén presentes
DO $$
BEGIN
    -- Verificar si existe thumbnail_url
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'product_images'
        AND column_name = 'thumbnail_url'
    ) THEN
        ALTER TABLE public.product_images ADD COLUMN thumbnail_url TEXT;
        RAISE NOTICE 'Columna thumbnail_url agregada';
    END IF;
    
    -- Verificar si existe alt_text
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'product_images'
        AND column_name = 'alt_text'
    ) THEN
        ALTER TABLE public.product_images ADD COLUMN alt_text TEXT;
        RAISE NOTICE 'Columna alt_text agregada';
    END IF;
    
    -- Verificar si existe sort_order
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'product_images'
        AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE public.product_images ADD COLUMN sort_order INTEGER DEFAULT 0;
        RAISE NOTICE 'Columna sort_order agregada';
    END IF;
    
    -- Verificar si existe is_cover
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'product_images'
        AND column_name = 'is_cover'
    ) THEN
        ALTER TABLE public.product_images ADD COLUMN is_cover BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Columna is_cover agregada';
    END IF;
END $$;






