-- Corregir slugs mal generados en categorías existentes
-- Regenerar slugs correctamente para todas las categorías

DO $$
DECLARE
    rec RECORD;
    generated_slug TEXT;
    final_slug TEXT;
    counter INTEGER;
BEGIN
    RAISE NOTICE 'Iniciando corrección de slugs...';
    
    FOR rec IN SELECT id, name, slug FROM public.categories ORDER BY name LOOP
        -- Generar slug desde el nombre usando la misma lógica que en JavaScript
        generated_slug := LOWER(rec.name);
        
        -- Normalizar caracteres (quitar acentos)
        generated_slug := TRANSLATE(
            generated_slug,
            'áàâäéèêëíìîïóòôöúùûüñç',
            'aaaeeeeiiiiooouuuunc'
        );
        
        -- Remover caracteres especiales, mantener solo letras, números y espacios
        generated_slug := REGEXP_REPLACE(generated_slug, '[^a-z0-9\s-]', '', 'g');
        
        -- Reemplazar espacios y múltiples guiones con un solo guion
        generated_slug := REGEXP_REPLACE(generated_slug, '\s+', '-', 'g');
        generated_slug := REGEXP_REPLACE(generated_slug, '-+', '-', 'g');
        
        -- Eliminar guiones al inicio y final
        generated_slug := TRIM(BOTH '-' FROM generated_slug);
        
        -- Si el slug está vacío, usar 'categoria' como base
        IF generated_slug = '' OR generated_slug IS NULL THEN
            generated_slug := 'categoria';
        END IF;
        
        -- Verificar que sea único y generar variante si es necesario
        final_slug := generated_slug;
        counter := 1;
        
        WHILE EXISTS (
            SELECT 1 FROM public.categories 
            WHERE slug = final_slug AND id != rec.id
        ) LOOP
            final_slug := generated_slug || '-' || counter::TEXT;
            counter := counter + 1;
        END LOOP;
        
        -- Actualizar el slug
        UPDATE public.categories 
        SET slug = final_slug 
        WHERE id = rec.id;
        
        RAISE NOTICE 'Categoría "%" (ID: %): Slug actualizado a "%"', rec.name, rec.id, final_slug;
    END LOOP;
    
    RAISE NOTICE 'Corrección de slugs completada';
END $$;

-- Verificar que todos los slugs están correctos
DO $$
DECLARE
    total_cats INTEGER;
    cats_with_slug INTEGER;
    cats_without_slug INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_cats FROM public.categories;
    SELECT COUNT(*) INTO cats_with_slug FROM public.categories WHERE slug IS NOT NULL AND slug != '';
    SELECT COUNT(*) INTO cats_without_slug FROM public.categories WHERE slug IS NULL OR slug = '';
    
    RAISE NOTICE 'Total de categorías: %', total_cats;
    RAISE NOTICE 'Categorías con slug: %', cats_with_slug;
    RAISE NOTICE 'Categorías sin slug: %', cats_without_slug;
    
    IF cats_without_slug > 0 THEN
        RAISE WARNING 'Hay % categorías sin slug válido', cats_without_slug;
    END IF;
END $$;
