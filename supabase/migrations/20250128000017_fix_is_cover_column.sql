-- Asegurar que la columna is_cover existe en product_images
DO $$ 
BEGIN
    -- Verificar si la tabla product_images existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_images' AND table_schema = 'public') THEN
        RAISE NOTICE 'Tabla product_images existe';
        
        -- Verificar si la columna 'is_cover' existe, si no, agregarla
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_images' AND column_name = 'is_cover' AND table_schema = 'public') THEN
            ALTER TABLE public.product_images ADD COLUMN is_cover BOOLEAN DEFAULT FALSE;
            RAISE NOTICE 'Columna is_cover agregada';
        ELSE
            RAISE NOTICE 'Columna is_cover ya existe';
        END IF;
        
        -- Verificar si la columna 'url' existe, si no, agregarla
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_images' AND column_name = 'url' AND table_schema = 'public') THEN
            ALTER TABLE public.product_images ADD COLUMN url TEXT;
            RAISE NOTICE 'Columna url agregada';
        ELSE
            RAISE NOTICE 'Columna url ya existe';
        END IF;
        
        -- Verificar si la columna 'image_url' existe, si no, agregarla
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_images' AND column_name = 'image_url' AND table_schema = 'public') THEN
            ALTER TABLE public.product_images ADD COLUMN image_url TEXT;
            RAISE NOTICE 'Columna image_url agregada';
        ELSE
            RAISE NOTICE 'Columna image_url ya existe';
        END IF;
        
    ELSE
        RAISE NOTICE 'Tabla product_images NO existe. Creándola...';
        
        -- Crear la tabla product_images completa
        CREATE TABLE public.product_images (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            product_id UUID NOT NULL,
            image_url TEXT NOT NULL,
            url TEXT,
            is_cover BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        
        -- Habilitar RLS
        ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
        
        -- Crear políticas básicas
        CREATE POLICY "product_images_select_public" ON public.product_images FOR SELECT TO public USING (true);
        CREATE POLICY "product_images_insert_seller" ON public.product_images FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.products WHERE id = product_id AND seller_id = auth.uid()));
        CREATE POLICY "product_images_delete_seller" ON public.product_images FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.products WHERE id = product_id AND seller_id = auth.uid()));
        
        RAISE NOTICE 'Tabla product_images creada con todas las columnas';
    END IF;
END $$;
