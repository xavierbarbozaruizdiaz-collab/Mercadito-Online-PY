-- ============================================
-- Arreglar políticas RLS para price_history
-- ============================================

-- Eliminar políticas existentes que puedan estar bloqueando
DROP POLICY IF EXISTS "Anyone can view price history" ON public.price_history;

-- Políticas RLS para price_history
-- SELECT: Cualquiera puede ver el historial de precios (público)
CREATE POLICY "price_history_select_public" ON public.price_history
FOR SELECT
TO public
USING (true);

-- INSERT: Permitir a vendedores insertar historial de sus propios productos
CREATE POLICY "price_history_insert_owner" ON public.price_history
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.products 
    WHERE products.id = price_history.product_id 
    AND products.seller_id = auth.uid()
  )
);

-- Modificar la función del trigger para usar SECURITY DEFINER
-- Esto permite que el trigger bypasse RLS al insertar
DROP FUNCTION IF EXISTS public.record_price_change() CASCADE;

CREATE OR REPLACE FUNCTION record_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Esto permite que la función bypasse RLS
AS $$
BEGIN
    -- Solo registrar si el precio cambió
    IF OLD.price IS DISTINCT FROM NEW.price THEN
        INSERT INTO public.price_history (product_id, price)
        VALUES (NEW.id, NEW.price)
        ON CONFLICT (product_id, recorded_date) DO UPDATE
        SET price = EXCLUDED.price, recorded_at = now();
        
        -- Verificar alertas de precio
        UPDATE public.price_alerts
        SET current_price = NEW.price,
            notified = CASE 
                WHEN NEW.price <= target_price AND is_active AND NOT notified THEN true
                ELSE notified
            END
        WHERE product_id = NEW.id
        AND is_active = true
        AND NEW.price <= target_price
        AND NOT notified;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Recrear el trigger
DROP TRIGGER IF EXISTS product_price_change_trigger ON public.products;
CREATE TRIGGER product_price_change_trigger
    AFTER UPDATE OF price ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION record_price_change();

