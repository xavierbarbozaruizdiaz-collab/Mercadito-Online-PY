-- ============================================
-- MERCADITO ONLINE PY - ADD PUBLIC RLS FOR BANK SETTINGS
-- Permite lectura pública de configuración bancaria para checkout de membresías
-- ============================================

-- Política RLS para permitir lectura pública de configuración bancaria
-- Necesario para checkout de membresías con transferencia bancaria
-- Los usuarios necesitan ver estos datos para realizar transferencias
DROP POLICY IF EXISTS "public_can_read_bank_settings" ON public.site_settings;
CREATE POLICY "public_can_read_bank_settings"
ON public.site_settings FOR SELECT
TO public
USING (key IN ('bank_account_number', 'bank_name', 'bank_account_holder', 'whatsapp_number'));

DO $$ BEGIN
  RAISE NOTICE '✅ Política RLS pública para configuración bancaria creada';
  RAISE NOTICE '   - bank_account_number: lectura pública habilitada';
  RAISE NOTICE '   - bank_name: lectura pública habilitada';
  RAISE NOTICE '   - bank_account_holder: lectura pública habilitada';
  RAISE NOTICE '   - whatsapp_number: lectura pública habilitada';
END $$;















