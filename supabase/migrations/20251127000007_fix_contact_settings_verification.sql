-- ============================================
-- MERCADITO ONLINE PY - FIX CONTACT SETTINGS VERIFICATION
-- Verifica y asegura que contact_email y contact_phone existan y tengan valores válidos
-- ============================================

-- Verificar qué valores existen actualmente
DO $$
DECLARE
  email_val TEXT;
  phone_val TEXT;
  email_exists BOOLEAN;
  phone_exists BOOLEAN;
BEGIN
  -- Verificar si existen los registros
  SELECT EXISTS(SELECT 1 FROM site_settings WHERE key = 'contact_email') INTO email_exists;
  SELECT EXISTS(SELECT 1 FROM site_settings WHERE key = 'contact_phone') INTO phone_exists;
  
  -- Obtener valores actuales si existen
  IF email_exists THEN
    SELECT value::TEXT INTO email_val FROM site_settings WHERE key = 'contact_email';
  END IF;
  
  IF phone_exists THEN
    SELECT value::TEXT INTO phone_val FROM site_settings WHERE key = 'contact_phone';
  END IF;
  
  -- Log de diagnóstico
  RAISE NOTICE '=== DIAGNÓSTICO CONTACT SETTINGS ===';
  RAISE NOTICE 'contact_email existe: %', email_exists;
  RAISE NOTICE 'contact_phone existe: %', phone_exists;
  IF email_exists THEN
    RAISE NOTICE 'contact_email valor actual: %', email_val;
  END IF;
  IF phone_exists THEN
    RAISE NOTICE 'contact_phone valor actual: %', phone_val;
  END IF;
  
  -- Si no existen, crearlos con valores por defecto (pero válidos)
  IF NOT email_exists THEN
    INSERT INTO site_settings (key, value, description)
    VALUES ('contact_email', '"contacto@mercadito-online-py.com"', 'Email de contacto')
    ON CONFLICT (key) DO NOTHING;
    RAISE NOTICE '✅ contact_email creado';
  END IF;
  
  IF NOT phone_exists THEN
    INSERT INTO site_settings (key, value, description)
    VALUES ('contact_phone', '"+595981234567"', 'Teléfono de contacto')
    ON CONFLICT (key) DO NOTHING;
    RAISE NOTICE '✅ contact_phone creado';
  END IF;
  
  -- Limpiar valores con doble encoding si existen
  UPDATE site_settings
  SET value = TRIM(BOTH '"' FROM value::TEXT)::JSONB
  WHERE key IN ('contact_email', 'contact_phone')
    AND value::TEXT LIKE '"%"'
    AND value::TEXT NOT LIKE '"%"%'; -- Solo si tiene una capa de comillas
  
  RAISE NOTICE '✅ Verificación completada';
END $$;

-- Asegurar que las políticas RLS permitan lectura pública
-- (Ya deberían existir, pero las verificamos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'site_settings' 
    AND policyname = 'public_can_read_contact_settings'
  ) THEN
    CREATE POLICY "public_can_read_contact_settings"
    ON public.site_settings FOR SELECT
    TO public
    USING (key IN ('contact_email', 'contact_phone', 'location'));
    RAISE NOTICE '✅ Política RLS public_can_read_contact_settings creada';
  ELSE
    RAISE NOTICE '✅ Política RLS public_can_read_contact_settings ya existe';
  END IF;
END $$;


















