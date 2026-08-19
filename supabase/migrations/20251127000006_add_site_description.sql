-- ============================================
-- MERCADITO ONLINE PY - ADD SITE DESCRIPTION
-- Agrega columna site_description a site_settings para SEO y metadata dinámica
-- ============================================

-- Agregar columna site_description si no existe
-- Nota: site_settings usa estructura key-value, así que site_description será un registro con key='site_description'
-- No necesitamos agregar una columna, solo asegurarnos de que el registro pueda existir

-- Insertar valor inicial si no existe
INSERT INTO public.site_settings (key, value, description)
VALUES (
  'site_description',
  '"El mejor marketplace de Paraguay. Compra y vende productos nuevos y usados de forma segura."'::jsonb,
  'Descripción del sitio para SEO y metadata'
)
ON CONFLICT (key) DO NOTHING;

-- Agregar política RLS pública para site_description (similar a site_name)
DROP POLICY IF EXISTS "public_can_read_site_description" ON public.site_settings;
CREATE POLICY "public_can_read_site_description"
ON public.site_settings FOR SELECT
TO public
USING (key = 'site_description');

DO $$ BEGIN
  RAISE NOTICE '✅ site_description agregado a site_settings';
  RAISE NOTICE '✅ Política RLS pública para site_description creada';
END $$;


















