-- Agregar columnas faltantes a la tabla categories
-- slug, is_active, sort_order

-- 1. Agregar columna slug si no existe
ALTER TABLE public.categories 
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Crear índice único para slug (permitir NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug_unique 
  ON public.categories(slug) 
  WHERE slug IS NOT NULL;

-- 3. Agregar columna is_active si no existe (default true)
ALTER TABLE public.categories 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- 4. Agregar columna sort_order si no existe (default 0)
ALTER TABLE public.categories 
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0 NOT NULL;

-- 5. Generar slugs para categorías existentes que no tienen slug
DO $$
DECLARE
    rec RECORD;
    generated_slug TEXT;
BEGIN
    FOR rec IN SELECT id, name FROM public.categories WHERE slug IS NULL LOOP
        -- Generar slug desde el nombre
        generated_slug := LOWER(REGEXP_REPLACE(
            REGEXP_REPLACE(rec.name, '[áàâä]', 'a', 'gi'),
            '[^a-z0-9]+', '-', 'g'
        ));
        generated_slug := TRIM(BOTH '-' FROM generated_slug);
        
        -- Asegurar que sea único
        WHILE EXISTS (SELECT 1 FROM public.categories WHERE slug = generated_slug AND id != rec.id) LOOP
            generated_slug := generated_slug || '-' || FLOOR(RANDOM() * 1000)::TEXT;
        END LOOP;
        
        UPDATE public.categories 
        SET slug = generated_slug 
        WHERE id = rec.id;
    END LOOP;
    
    RAISE NOTICE 'Slugs generados para categorías existentes';
END $$;

-- 6. Verificar que las columnas se agregaron
DO $$
DECLARE
    has_slug BOOLEAN;
    has_is_active BOOLEAN;
    has_sort_order BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'categories' 
        AND column_name = 'slug'
    ) INTO has_slug;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'categories' 
        AND column_name = 'is_active'
    ) INTO has_is_active;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'categories' 
        AND column_name = 'sort_order'
    ) INTO has_sort_order;
    
    RAISE NOTICE 'Columna slug: %', CASE WHEN has_slug THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'Columna is_active: %', CASE WHEN has_is_active THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'Columna sort_order: %', CASE WHEN has_sort_order THEN '✅' ELSE '❌' END;
END $$;
