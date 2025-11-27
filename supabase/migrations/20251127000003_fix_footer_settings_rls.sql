-- ============================================
-- MERCADITO ONLINE PY - FIX FOOTER SETTINGS RLS
-- Permite lectura pública de contact_email, contact_phone y location
-- para que el Footer pueda mostrar estos datos sin autenticación
-- ============================================

-- Agregar políticas RLS para permitir lectura pública de datos de contacto
DROP POLICY IF EXISTS "public_can_read_contact_settings" ON public.site_settings;
CREATE POLICY "public_can_read_contact_settings"
ON public.site_settings FOR SELECT
TO public
USING (key IN ('contact_email', 'contact_phone', 'location'));

DO $$ BEGIN
  RAISE NOTICE '✅ Política RLS para datos de contacto del footer creada';
END $$;

