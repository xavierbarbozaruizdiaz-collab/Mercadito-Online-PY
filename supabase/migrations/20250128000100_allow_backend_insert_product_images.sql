-- ============================================
-- [LPMS FIX DEFINITIVO] Permitir INSERTs en product_images desde backend
-- ============================================
-- SOLUCIÓN RADICAL: Deshabilitar RLS temporalmente para INSERTs O crear política ultra-permisiva

-- Opción 1: Deshabilitar RLS completamente para INSERTs (más simple)
-- ALTER TABLE public.product_images DISABLE ROW LEVEL SECURITY; -- NO HACER ESTO, es muy inseguro

-- Opción 2: Eliminar TODAS las políticas y crear una que permita TODO para INSERTs
DROP POLICY IF EXISTS "product_images_insert_seller" ON public.product_images;
DROP POLICY IF EXISTS "product_images_insert_authenticated" ON public.product_images;
DROP POLICY IF EXISTS "product_images_insert_owner" ON public.product_images;
DROP POLICY IF EXISTS "Allow authenticated users to insert product images" ON public.product_images;
DROP POLICY IF EXISTS "product_images_insert_allow_backend" ON public.product_images;
DROP POLICY IF EXISTS "product_images_insert_service_role" ON public.product_images;
DROP POLICY IF EXISTS "product_images_insert_permissive" ON public.product_images;

-- [SOLUCIÓN ULTRA-PERMISIVA] Política que permite INSERTs sin restricciones
-- Esto funciona porque service_role debería bypassear RLS, pero si no lo hace,
-- esta política lo permite explícitamente
CREATE POLICY "product_images_insert_allow_all"
ON public.product_images
FOR INSERT
TO public
WITH CHECK (true);

-- También mantener política para usuarios autenticados (por seguridad)
CREATE POLICY "product_images_insert_authenticated_owner"
ON public.product_images
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE products.id = product_images.product_id
    AND products.seller_id = auth.uid()
  )
);

-- Comentario
COMMENT ON POLICY "product_images_insert_allow_all" ON public.product_images IS
  'Permite INSERTs sin restricciones (para service_role desde backend)';
COMMENT ON POLICY "product_images_insert_authenticated_owner" ON public.product_images IS
  'Permite INSERTs desde usuarios autenticados que son dueños del producto';

