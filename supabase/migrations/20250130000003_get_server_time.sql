-- ============================================
-- MERCADITO ONLINE PY - SERVER TIME FUNCTION
-- Función para obtener el tiempo del servidor sincronizado
-- ============================================

-- Función para obtener el tiempo actual del servidor
CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN NOW();
END;
$$ LANGUAGE plpgsql STABLE;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.get_server_time() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_server_time() TO anon;

-- Comentario
COMMENT ON FUNCTION public.get_server_time() IS 'Retorna el tiempo actual del servidor PostgreSQL para sincronización de timers en subastas';

