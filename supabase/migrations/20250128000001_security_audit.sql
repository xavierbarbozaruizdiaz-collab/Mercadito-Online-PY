-- ============================================
-- AUDITORÍA DE SEGURIDAD - CORRECCIONES
-- ============================================

-- 1. Corregir políticas de Storage para ser más restrictivas
-- Solo permitir que usuarios autenticados actualicen/eliminen sus propias imágenes

-- Política UPDATE más restrictiva
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
CREATE POLICY "Users can update own images" ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
  -- Verificar que el usuario es el propietario del producto
  AND EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.product_images pi ON p.id = pi.product_id
    WHERE pi.url LIKE '%' || name || '%'
    AND p.created_by = auth.uid()
  )
);

-- Política DELETE más restrictiva
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
CREATE POLICY "Users can delete own images" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
  -- Verificar que el usuario es el propietario del producto
  AND EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.product_images pi ON p.id = pi.product_id
    WHERE pi.url LIKE '%' || name || '%'
    AND p.created_by = auth.uid()
  )
);

-- 2. Agregar políticas RLS faltantes para products
-- Verificar si products tiene RLS habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'products' AND n.nspname = 'public'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Políticas para products
DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view products" ON public.products FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Users can create products" ON public.products;
CREATE POLICY "Users can create products" ON public.products FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update own products" ON public.products;
CREATE POLICY "Users can update own products" ON public.products FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
CREATE POLICY "Users can delete own products" ON public.products FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- 3. Agregar políticas RLS para product_images
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view product images" ON public.product_images;
CREATE POLICY "Public can view product images" ON public.product_images FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Users can manage own product images" ON public.product_images;
CREATE POLICY "Users can manage own product images" ON public.product_images FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id
    AND p.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id
    AND p.created_by = auth.uid()
  )
);

-- 4. Agregar políticas RLS para categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories" ON public.categories FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- 5. Función de seguridad para validar permisos de admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Comentarios de seguridad
COMMENT ON FUNCTION public.is_admin() IS 'Función de seguridad para verificar si el usuario actual es admin';
COMMENT ON POLICY "Users can update own images" ON storage.objects IS 'Solo permite actualizar imágenes propias';
COMMENT ON POLICY "Users can delete own images" ON storage.objects IS 'Solo permite eliminar imágenes propias';
COMMENT ON POLICY "Public can view products" ON public.products IS 'Permite lectura pública de productos';
COMMENT ON POLICY "Users can create products" ON public.products IS 'Solo usuarios autenticados pueden crear productos';
COMMENT ON POLICY "Users can update own products" ON public.products IS 'Solo pueden actualizar sus propios productos';
COMMENT ON POLICY "Users can delete own products" ON public.products IS 'Solo pueden eliminar sus propios productos';
