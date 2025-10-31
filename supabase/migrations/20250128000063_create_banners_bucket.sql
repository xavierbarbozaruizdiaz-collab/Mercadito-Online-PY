-- Crear bucket de storage para banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acceso para banners bucket
-- SELECT público: cualquier usuario puede ver banners
DROP POLICY IF EXISTS "Public Access for banners Select" ON storage.objects;
CREATE POLICY "Public Access for banners Select"
ON storage.objects FOR SELECT
USING (bucket_id = 'banners');

-- INSERT: solo usuarios autenticados (admins) pueden subir banners
DROP POLICY IF EXISTS "Authenticated users can upload banners" ON storage.objects;
CREATE POLICY "Authenticated users can upload banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'banners' 
  AND auth.role() = 'authenticated'
);

-- UPDATE: solo usuarios autenticados (admins) pueden actualizar banners
DROP POLICY IF EXISTS "Authenticated users can update banners" ON storage.objects;
CREATE POLICY "Authenticated users can update banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'banners' 
  AND auth.role() = 'authenticated'
);

-- DELETE: solo usuarios autenticados (admins) pueden eliminar banners
DROP POLICY IF EXISTS "Authenticated users can delete banners" ON storage.objects;
CREATE POLICY "Authenticated users can delete banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'banners' 
  AND auth.role() = 'authenticated'
);
