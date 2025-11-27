-- ============================================
-- MERCADITO ONLINE PY - FIX DOUBLE ENCODED SETTINGS
-- Limpia SOLO los valores que fueron guardados con doble encoding
-- MIGRACIÓN SEGURA: Solo actualiza valores problemáticos específicos
-- ============================================

-- Función SEGURA para limpiar valores con múltiples escapes
-- Solo procesa strings que claramente tienen doble encoding
CREATE OR REPLACE FUNCTION clean_jsonb_string_safe(val JSONB)
RETURNS JSONB AS $$
DECLARE
  str_val TEXT;
  cleaned TEXT;
  result JSONB;
BEGIN
  -- Si es null, devolver null
  IF val IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Convertir JSONB a texto para inspección
  str_val := val::TEXT;
  
  -- Si es un número válido, array u objeto JSON válido, NO TOCAR
  IF str_val ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
    RETURN val; -- Es un número, dejarlo como está
  END IF;
  
  IF str_val ~ '^\[.*\]$' THEN
    RETURN val; -- Es un array, dejarlo como está
  END IF;
  
  IF str_val ~ '^{.*}$' THEN
    RETURN val; -- Es un objeto, dejarlo como está
  END IF;
  
  -- Solo procesar si es un string que tiene múltiples capas de comillas/escapes
  -- Detectar patrón de doble encoding: múltiples comillas o barras al inicio/fin
  IF str_val !~ '^"+"' AND str_val !~ '\\+"' THEN
    -- No tiene el patrón de doble encoding, NO TOCAR
    RETURN val;
  END IF;
  
  -- Limpiar múltiples escapes de forma segura
  cleaned := str_val;
  
  -- Remover capas de comillas externas (máximo 3 iteraciones para seguridad)
  FOR i IN 1..3 LOOP
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
  
  -- Limpiar barras invertidas múltiples (máximo 2 veces)
  FOR i IN 1..2 LOOP
    cleaned := REGEXP_REPLACE(cleaned, '\\\\+', '\', 'g');
  END LOOP;
  
  -- Validar que el resultado sea un string válido antes de convertir a JSONB
  IF cleaned IS NULL OR cleaned = '' THEN
    RETURN val; -- Si se vació, mantener el original
  END IF;
  
  -- Convertir el string limpio a JSONB de forma segura
  BEGIN
    result := to_jsonb(cleaned);
    RETURN result;
  EXCEPTION WHEN OTHERS THEN
    -- Si falla la conversión, mantener el valor original
    RETURN val;
  END;
END;
$$ LANGUAGE plpgsql;

-- ACTUALIZAR SOLO valores problemáticos específicos
-- Usar transacción implícita para seguridad
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Actualizar SOLO los valores que tienen doble encoding claro
  UPDATE site_settings
  SET value = clean_jsonb_string_safe(value)
  WHERE key IN ('site_name', 'contact_email', 'contact_phone', 'location', 'primary_color', 'secondary_color')
    AND value::TEXT ~ '^"+'  -- Solo strings que empiezan con múltiples comillas
    AND value::TEXT !~ '^-?[0-9]+(\.[0-9]+)?$'  -- Excluir números
    AND value::TEXT !~ '^\[.*\]$'  -- Excluir arrays
    AND value::TEXT !~ '^{.*}$'  -- Excluir objetos
  ;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  RAISE NOTICE '✅ Migración completada. Filas actualizadas: %', affected_count;
  RAISE NOTICE '✅ Solo se actualizaron valores con doble encoding detectado';
  RAISE NOTICE '✅ Valores válidos (números, arrays, objetos) NO fueron modificados';
END $$;

-- Limpiar la función después de usarla
DROP FUNCTION IF EXISTS clean_jsonb_string_safe(JSONB);

