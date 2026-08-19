-- ============================================
-- MERCADITO ONLINE PY - ADD PUBLIC RLS FOR SITE SETTINGS
-- Permite lectura pública de campos necesarios para el frontend público
-- ============================================

-- Política RLS para permitir lectura pública de site_name
-- Necesario para metadata dinámica en layout.tsx
DROP POLICY IF EXISTS "public_can_read_site_name" ON public.site_settings;
CREATE POLICY "public_can_read_site_name"
ON public.site_settings FOR SELECT
TO public
USING (key = 'site_name');

-- Política RLS para permitir lectura pública de colores del sitio
-- Necesario para aplicar colores dinámicos en el futuro
DROP POLICY IF EXISTS "public_can_read_site_colors" ON public.site_settings;
CREATE POLICY "public_can_read_site_colors"
ON public.site_settings FOR SELECT
TO public
USING (key IN ('primary_color', 'secondary_color'));

-- Política RLS para permitir lectura pública de configuración de envíos
-- Necesario para checkout y cálculo de costos de envío
DROP POLICY IF EXISTS "public_can_read_shipping_settings" ON public.site_settings;
CREATE POLICY "public_can_read_shipping_settings"
ON public.site_settings FOR SELECT
TO public
USING (key IN ('shipping_cost', 'free_shipping_threshold'));

-- Nota: Las políticas existentes ya cubren:
-- - contact_email, contact_phone, location (via public_can_read_contact_settings)
-- - payment_methods (via public_can_read_payment_methods)

DO $$ BEGIN
  RAISE NOTICE '✅ Políticas RLS públicas para site_settings creadas';
  RAISE NOTICE '   - site_name: lectura pública habilitada';
  RAISE NOTICE '   - primary_color, secondary_color: lectura pública habilitada';
  RAISE NOTICE '   - shipping_cost, free_shipping_threshold: lectura pública habilitada';
END $$;


















