-- Verificar y corregir la estructura de product_images
-- Primero verificar si la tabla existe y su estructura
DO $$
BEGIN
    -- Verificar si la tabla existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_images' AND table_schema = 'public') THEN
        RAISE NOTICE 'Tabla product_images existe';
        
        -- Verificar columnas existentes
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_images' AND column_name = 'url' AND table_schema = 'public') THEN
            RAISE NOTICE 'Columna url existe';
        ELSE
            RAISE NOTICE 'Columna url NO existe, creándola...';
            ALTER TABLE public.product_images ADD COLUMN url TEXT;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_images' AND column_name = 'image_url' AND table_schema = 'public') THEN
            RAISE NOTICE 'Columna image_url existe';
        ELSE
            RAISE NOTICE 'Columna image_url NO existe, creándola...';
            ALTER TABLE public.product_images ADD COLUMN image_url TEXT;
        END IF;
        
    ELSE
        RAISE NOTICE 'Tabla product_images NO existe, creándola...';
        CREATE TABLE public.product_images (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id UUID NOT NULL,
            image_url TEXT NOT NULL,
            url TEXT, -- Alias para compatibilidad
            is_cover BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
    END IF;
END $$;
