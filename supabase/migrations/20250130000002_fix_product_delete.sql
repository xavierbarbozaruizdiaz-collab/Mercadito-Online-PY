-- ============================================
-- Función para eliminar productos con verificación de RLS
-- ============================================

-- Crear función que permite eliminar productos verificando que el usuario es el dueño
CREATE OR REPLACE FUNCTION delete_user_product(product_id_to_delete UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_seller_id UUID;
  current_user_id UUID;
BEGIN
  -- Obtener el ID del usuario actual
  current_user_id := auth.uid();
  
  -- Verificar que hay un usuario autenticado
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No hay usuario autenticado';
  END IF;
  
  -- Obtener el seller_id del producto
  SELECT seller_id INTO product_seller_id
  FROM products
  WHERE id = product_id_to_delete;
  
  -- Verificar que el producto existe
  IF product_seller_id IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;
  
  -- Verificar que el usuario es el dueño
  IF product_seller_id != current_user_id THEN
    RAISE EXCEPTION 'No tienes permiso para eliminar este producto';
  END IF;
  
  -- Eliminar el producto
  DELETE FROM products WHERE id = product_id_to_delete;
  
  -- Verificar que se eliminó
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Dar permisos a usuarios autenticados para usar esta función
GRANT EXECUTE ON FUNCTION delete_user_product(UUID) TO authenticated;

-- Comentario
COMMENT ON FUNCTION delete_user_product IS 'Elimina un producto verificando que el usuario autenticado es el dueño';

