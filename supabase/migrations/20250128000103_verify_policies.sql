-- ============================================
-- [LPMS VERIFICACIÓN] Verificar que las políticas estén correctas
-- ============================================

-- Verificar políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'product_images' 
AND schemaname = 'public';

-- Si no existe la política permisiva, crearla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'product_images' 
        AND schemaname = 'public'
        AND policyname = 'allow_all_inserts_product_images'
    ) THEN
        CREATE POLICY "allow_all_inserts_product_images"
        ON public.product_images
        FOR INSERT
        TO public
        WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'product_images' 
        AND schemaname = 'public'
        AND policyname = 'allow_all_selects_product_images'
    ) THEN
        CREATE POLICY "allow_all_selects_product_images"
        ON public.product_images
        FOR SELECT
        TO public
        USING (true);
    END IF;
END $$;






