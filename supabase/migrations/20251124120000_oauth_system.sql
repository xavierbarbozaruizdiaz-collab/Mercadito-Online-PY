-- ============================================
-- MERCADITO ONLINE PY - OAUTH 2.0 SYSTEM
-- Migración: Agregar tablas OAuth para integración con GPT
-- Fecha: 2024-11-24
-- IMPORTANTE: Esta migración NO modifica auth.users ni RLS existente
-- ============================================

-- ============================================
-- TABLA: oauth_clients
-- Almacena clientes OAuth (ej: GPT)
-- ============================================

CREATE TABLE IF NOT EXISTS public.oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE NOT NULL,
  client_secret TEXT NOT NULL, -- Hash bcrypt del secret real
  name TEXT NOT NULL,
  description TEXT,
  redirect_uris TEXT[] NOT NULL DEFAULT '{}',
  scopes TEXT[] NOT NULL DEFAULT '{}', -- Scopes permitidos para este cliente
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices para oauth_clients
CREATE INDEX IF NOT EXISTS idx_oauth_clients_client_id ON public.oauth_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_clients_active ON public.oauth_clients(is_active) WHERE is_active = true;

-- Comentarios
COMMENT ON TABLE public.oauth_clients IS 'Clientes OAuth registrados (ej: GPT Asistente de Compras)';
COMMENT ON COLUMN public.oauth_clients.client_id IS 'Identificador público del cliente OAuth';
COMMENT ON COLUMN public.oauth_clients.client_secret IS 'Secret del cliente (hash bcrypt, nunca en texto plano)';
COMMENT ON COLUMN public.oauth_clients.redirect_uris IS 'URIs de redirección permitidas para este cliente';
COMMENT ON COLUMN public.oauth_clients.scopes IS 'Scopes que este cliente puede solicitar';

-- ============================================
-- TABLA: oauth_authorization_codes
-- Almacena códigos de autorización temporales (Authorization Code flow)
-- ============================================

CREATE TABLE IF NOT EXISTS public.oauth_authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- Código de autorización (UUID o string aleatorio)
  client_id TEXT NOT NULL REFERENCES public.oauth_clients(client_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  code_challenge TEXT, -- Para PKCE (opcional en MVP, pero preparado)
  code_challenge_method TEXT, -- 'plain' o 'S256'
  expires_at TIMESTAMPTZ NOT NULL, -- Código expira en 10 minutos
  used_at TIMESTAMPTZ, -- NULL hasta que se use, luego timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para oauth_authorization_codes
CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_code ON public.oauth_authorization_codes(code);
CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_client_id ON public.oauth_authorization_codes(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_user_id ON public.oauth_authorization_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_expires_at ON public.oauth_authorization_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_unused ON public.oauth_authorization_codes(used_at) WHERE used_at IS NULL;

-- Comentarios
COMMENT ON TABLE public.oauth_authorization_codes IS 'Códigos de autorización OAuth temporales (Authorization Code flow)';
COMMENT ON COLUMN public.oauth_authorization_codes.code IS 'Código de autorización único (UUID o string aleatorio)';
COMMENT ON COLUMN public.oauth_authorization_codes.expires_at IS 'Fecha de expiración del código (típicamente 10 minutos)';
COMMENT ON COLUMN public.oauth_authorization_codes.used_at IS 'NULL hasta que se use, luego timestamp de uso (previene reutilización)';

-- ============================================
-- TABLA: oauth_tokens
-- Almacena access_tokens emitidos
-- ============================================

CREATE TABLE IF NOT EXISTS public.oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT UNIQUE NOT NULL, -- JWT o UUID (según implementación)
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  client_id TEXT NOT NULL REFERENCES public.oauth_clients(client_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL, -- Token expira en 1 hora (3600 segundos)
  revoked_at TIMESTAMPTZ, -- NULL hasta que se revoque, luego timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ -- Para tracking de uso
);

-- Índices para oauth_tokens
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_access_token ON public.oauth_tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_client_id ON public.oauth_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON public.oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON public.oauth_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_active ON public.oauth_tokens(revoked_at, expires_at) WHERE revoked_at IS NULL;

-- Comentarios
COMMENT ON TABLE public.oauth_tokens IS 'Access tokens OAuth emitidos (Bearer tokens)';
COMMENT ON COLUMN public.oauth_tokens.access_token IS 'Token de acceso (JWT o UUID según implementación)';
COMMENT ON COLUMN public.oauth_tokens.expires_at IS 'Fecha de expiración del token (típicamente 1 hora)';
COMMENT ON COLUMN public.oauth_tokens.revoked_at IS 'NULL hasta que se revoque, luego timestamp de revocación';
COMMENT ON COLUMN public.oauth_tokens.last_used_at IS 'Última vez que se usó el token (para tracking)';

-- ============================================
-- FUNCIÓN: Limpiar códigos de autorización expirados
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Eliminar códigos expirados o usados (más de 1 hora)
  DELETE FROM public.oauth_authorization_codes
  WHERE expires_at < now() - INTERVAL '1 hour'
     OR (used_at IS NOT NULL AND used_at < now() - INTERVAL '1 hour');
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_oauth_codes IS 'Limpia códigos de autorización expirados o usados';

-- ============================================
-- FUNCIÓN: Limpiar tokens expirados o revocados
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Eliminar tokens expirados o revocados (más de 24 horas)
  DELETE FROM public.oauth_tokens
  WHERE expires_at < now() - INTERVAL '24 hours'
     OR (revoked_at IS NOT NULL AND revoked_at < now() - INTERVAL '24 hours');
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_oauth_tokens IS 'Limpia tokens OAuth expirados o revocados';

-- ============================================
-- RLS: Row Level Security para tablas OAuth
-- IMPORTANTE: Solo lectura para usuarios autenticados, escritura solo desde backend
-- ============================================

-- Habilitar RLS en oauth_clients
ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins pueden ver clientes activos (para debugging)
CREATE POLICY "Admins can view active oauth clients" ON public.oauth_clients
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Habilitar RLS en oauth_authorization_codes
ALTER TABLE public.oauth_authorization_codes ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios solo pueden ver sus propios códigos (si es necesario para debugging)
-- En producción, el backend maneja esto sin exponer a usuarios
CREATE POLICY "Users can view own auth codes" ON public.oauth_authorization_codes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Habilitar RLS en oauth_tokens
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios solo pueden ver sus propios tokens activos
CREATE POLICY "Users can view own active tokens" ON public.oauth_tokens
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND revoked_at IS NULL
    AND expires_at > now()
  );

-- ============================================
-- NOTA IMPORTANTE
-- ============================================
-- Esta migración NO modifica:
-- - auth.users
-- - public.profiles
-- - RLS existente en otras tablas
-- - Flujo de autenticación Supabase existente
--
-- OAuth es una CAPA ADICIONAL que coexiste con Supabase Auth
-- ============================================























