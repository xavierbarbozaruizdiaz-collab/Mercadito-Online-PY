-- ============================================
-- Corregir políticas RLS del bucket product-images
-- ============================================

-- Eliminar políticas existentes que puedan estar causando conflictos
DROP POLICY IF EXISTS "Public Access for Select" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

-- Crear políticas más permisivas y específicas para product-images

-- SELECT: Público puede leer imágenes
CREATE POLICY "product_images_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- INSERT: Usuarios autenticados pueden subir imágenes
CREATE POLICY "product_images_insert_authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL
);

-- UPDATE: Usuarios autenticados pueden actualizar imágenes
CREATE POLICY "product_images_update_authenticated"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL
);

-- DELETE: Usuarios autenticados pueden eliminar imágenes
CREATE POLICY "product_images_delete_authenticated"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL
);

