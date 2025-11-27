-- ============================================
-- MERCADITO ONLINE PY - FIX DOUBLE ENCODED SETTINGS
-- Limpia los valores que fueron guardados con doble encoding
-- ============================================

-- Función para limpiar valores con múltiples escapes
CREATE OR REPLACE FUNCTION clean_jsonb_string(val JSONB)
RETURNS TEXT AS $$
DECLARE
  str_val TEXT;
  cleaned TEXT;
BEGIN
  -- Convertir JSONB a texto
  str_val := val::TEXT;
  
  -- Si está vacío o es null, devolver null
  IF str_val IS NULL OR str_val = '' THEN
    RETURN NULL;
  END IF;
  
  -- Si es un número, array u objeto, devolverlo como está
  IF str_val ~ '^[0-9]+$' OR str_val ~ '^\[.*\]$' OR str_val ~ '^{.*}$' THEN
    RETURN str_val;
  END IF;
  
  -- Limpiar múltiples escapes de comillas y barras
  cleaned := str_val;
  
  -- Remover comillas externas si existen
  WHILE cleaned LIKE '"%"' OR cleaned LIKE '\"%\"' OR cleaned LIKE '\\"%\\"' LOOP
    -- Remover una capa de comillas
    IF cleaned LIKE '"%"' THEN
      cleaned := SUBSTRING(cleaned FROM 2 FOR LENGTH(cleaned) - 2);
    ELSIF cleaned LIKE '\"%\"' THEN
      cleaned := REPLACE(cleaned, '\"', '');
    ELSIF cleaned LIKE '\\"%\\"' THEN
      cleaned := REPLACE(cleaned, '\\"', '');
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  -- Limpiar barras invertidas múltiples
  cleaned := REGEXP_REPLACE(cleaned, '\\+', '\', 'g');
  
  RETURN cleaned;
END;
$$ LANGUAGE plpgsql;

-- Limpiar valores de strings que tienen múltiples escapes
UPDATE site_settings
SET value = clean_jsonb_string(value)::JSONB
WHERE key IN ('site_name', 'contact_email', 'contact_phone', 'location', 'primary_color', 'secondary_color')
  AND value::TEXT LIKE '%"%'  -- Solo actualizar si tiene comillas (probablemente mal formateado)
  AND value::TEXT NOT SIMILAR TO '[0-9]+'  -- No tocar números
  AND value::TEXT NOT SIMILAR TO '\[.*\]'  -- No tocar arrays
  AND value::TEXT NOT SIMILAR TO '\{.*\}'  -- No tocar objetos
;

-- Limpiar la función después de usarla
DROP FUNCTION IF EXISTS clean_jsonb_string(JSONB);

DO $$ BEGIN
  RAISE NOTICE '✅ Valores con doble encoding limpiados en site_settings';
END $$;

