-- ============================================
-- MERCADITO ONLINE PY - STORE CATEGORIES
-- Agregar campo para categorías/rubros de tiendas
-- ============================================

-- Agregar columna para categorías (rubros a los que se dedica la tienda)
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS category_ids UUID[] DEFAULT '{}';

-- Crear índice para búsquedas más rápidas
CREATE INDEX IF NOT EXISTS idx_stores_category_ids ON stores USING GIN (category_ids);

-- Comentario para documentar el campo
COMMENT ON COLUMN stores.category_ids IS 'Array de IDs de categorías/rubros a los que se dedica la tienda. Permite filtrar tiendas por especialidad.';

-- ============================================
-- CREAR BUCKETS DE STORAGE PARA PERFILES Y TIENDAS
-- ============================================

-- Crear bucket para perfiles (avatars y covers de usuarios)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Crear bucket para tiendas (logos y covers de tiendas)
INSERT INTO storage.buckets (id, name, public)
VALUES ('stores', 'stores', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acceso para bucket profiles
DROP POLICY IF EXISTS "Public Access for profiles Select" ON storage.objects;
CREATE POLICY "Public Access for profiles Select"
ON storage.objects FOR SELECT
USING (bucket_id = 'profiles');

DROP POLICY IF EXISTS "Authenticated users can upload profiles" ON storage.objects;
CREATE POLICY "Authenticated users can upload profiles"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profiles' 
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can update profiles" ON storage.objects;
CREATE POLICY "Authenticated users can update profiles"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profiles' 
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can delete profiles" ON storage.objects;
CREATE POLICY "Authenticated users can delete profiles"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profiles' 
  AND auth.role() = 'authenticated'
);

-- Políticas de acceso para bucket stores
DROP POLICY IF EXISTS "Public Access for stores Select" ON storage.objects;
CREATE POLICY "Public Access for stores Select"
ON storage.objects FOR SELECT
USING (bucket_id = 'stores');

DROP POLICY IF EXISTS "Authenticated users can upload stores" ON storage.objects;
CREATE POLICY "Authenticated users can upload stores"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'stores' 
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can update stores" ON storage.objects;
CREATE POLICY "Authenticated users can update stores"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'stores' 
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can delete stores" ON storage.objects;
CREATE POLICY "Authenticated users can delete stores"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'stores' 
  AND auth.role() = 'authenticated'
);

