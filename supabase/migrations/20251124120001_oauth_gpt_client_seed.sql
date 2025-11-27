-- ============================================
-- MERCADITO ONLINE PY - OAUTH GPT CLIENT SEED
-- Migración: Insertar cliente OAuth para GPT Asistente de Compras
-- Fecha: 2024-11-24
-- SEGURIDAD: Este seed NO introduce secrets reales
-- ============================================

-- Insertar cliente OAuth para GPT
-- IMPORTANTE: El client_secret se establece como 'REVOKED-NEEDS-RESET' por defecto
-- Este valor es inválido y debe ser actualizado manualmente después del despliegue
-- usando un hash bcrypt generado OFFLINE (nunca en el repo)
--
-- Ver: docs/OAUTH_CLIENT_SECRET_ROTATION.md para el procedimiento completo

INSERT INTO public.oauth_clients (
  client_id,
  client_secret,
  name,
  description,
  redirect_uris,
  scopes,
  is_active,
  created_at,
  updated_at
) VALUES (
  'gpt-assistant-mercadito',
  'REVOKED-NEEDS-RESET', -- Valor inválido por defecto - DEBE actualizarse manualmente con hash bcrypt
  'GPT Asistente de Compras',
  'Cliente OAuth para el GPT "Asistente de Compras" de Mercadito Online PY',
  ARRAY['https://chat.openai.com/oauth/callback'], -- ⚠️ AJUSTAR SEGÚN URL REAL DEL GPT EN PRODUCCIÓN
  ARRAY['sourcing_orders.read', 'sourcing_orders.write'],
  false, -- Inactivo por defecto hasta que se establezca el client_secret correcto
  now(),
  now()
) ON CONFLICT (client_id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  redirect_uris = EXCLUDED.redirect_uris,
  scopes = EXCLUDED.scopes,
  updated_at = now();

-- Comentarios de seguridad
COMMENT ON TABLE public.oauth_clients IS '⚠️ SEGURIDAD: client_secret debe ser un hash bcrypt, nunca texto plano. Este seed no introduce secrets reales.';
COMMENT ON COLUMN public.oauth_clients.client_secret IS '⚠️ DEBE ser un hash bcrypt del secret real. El secret en claro solo vive en variables de entorno y configuración del GPT, NUNCA en el repo.';

