-- ============================================
-- Prevenir que vendedores agreguen sus propios productos al carrito
-- ============================================

-- Crear función para validar que el usuario no sea el vendedor del producto
CREATE OR REPLACE FUNCTION check_user_not_seller()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar que el usuario que agrega el producto al carrito
  -- NO sea el vendedor (seller_id) del producto
  IF EXISTS (
    SELECT 1 FROM public.products 
    WHERE id = NEW.product_id 
    AND seller_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'No puedes agregar tus propios productos al carrito';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger que ejecuta la validación antes de INSERT o UPDATE
DROP TRIGGER IF EXISTS prevent_own_product_in_cart ON public.cart_items;
CREATE TRIGGER prevent_own_product_in_cart
  BEFORE INSERT OR UPDATE ON public.cart_items
  FOR EACH ROW
  EXECUTE FUNCTION check_user_not_seller();

-- Comentario para documentar
COMMENT ON FUNCTION check_user_not_seller() IS 'Valida que un usuario no pueda agregar sus propios productos al carrito';
COMMENT ON TRIGGER prevent_own_product_in_cart ON public.cart_items IS 'Previene que vendedores agreguen sus propios productos al carrito';

