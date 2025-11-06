-- ============================================
-- Asegurar que las políticas RLS de products permitan actualizaciones
-- ============================================

-- Eliminar políticas de UPDATE existentes para recrearlas
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
DROP POLICY IF EXISTS "products_update_owner" ON public.products;

-- Crear política de UPDATE que permita a los vendedores actualizar sus productos
CREATE POLICY "products_update_owner" ON public.products
FOR UPDATE
TO authenticated
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

-- Verificar que el trigger de price_history existe y funciona
DO $$
BEGIN
    -- Verificar si el trigger existe
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'product_price_change_trigger'
    ) THEN
        -- Recrear el trigger si no existe
        CREATE TRIGGER product_price_change_trigger
            AFTER UPDATE OF price ON public.products
            FOR EACH ROW
            EXECUTE FUNCTION record_price_change();
        
        RAISE NOTICE '✅ Trigger product_price_change_trigger recreado';
    ELSE
        RAISE NOTICE '✅ Trigger product_price_change_trigger ya existe';
    END IF;
END $$;

