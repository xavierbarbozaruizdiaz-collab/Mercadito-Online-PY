-- ============================================
-- MERCADITO ONLINE PY - SCHEDULER PARA CERRAR SUBASTAS
-- Configuración de pg_cron o instrucciones para Edge Function
-- ============================================

-- NOTA: Si tu instancia de Supabase tiene pg_cron habilitado, puedes usar esto.
-- Si no, configura una Edge Function que se ejecute cada 5-10 segundos.

-- ============================================
-- OPCIÓN 1: Usar pg_cron (si está disponible)
-- ============================================

-- Verificar si pg_cron está instalado
-- SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Si pg_cron está disponible, crear job:
-- NOTA: Descomenta estas líneas si pg_cron está habilitado
-- Formato cron para cada 5 segundos: '*/5 * * * * *'
--
-- SELECT cron.schedule(
--   'close-expired-auctions',
--   '*/5 * * * * *',
--   $$SELECT auto_close_expired_auctions();$$
-- );

-- ============================================
-- OPCIÓN 2: Edge Function (RECOMENDADO)
-- ============================================

-- Crear Edge Function en Supabase Dashboard:
-- Nombre: close-expired-auctions
-- Path: /functions/close-expired-auctions
-- Schedule: cada 5 segundos

/*
-- Código para Edge Function (Deno):
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data, error } = await supabase.rpc('auto_close_expired_auctions')

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
*/

-- ============================================
-- OPCIÓN 3: Webhook/Scheduled Task externo
-- ============================================

-- Puedes usar servicios como:
-- - Vercel Cron Jobs
-- - GitHub Actions (con schedule)
-- - Cloudflare Workers (con cron triggers)
-- - AWS Lambda (con EventBridge)

-- Ejemplo de llamada:
-- POST https://tu-proyecto.supabase.co/rest/v1/rpc/auto_close_expired_auctions
-- Headers: { "apikey": "tu-service-role-key", "Authorization": "Bearer tu-service-role-key" }

-- ============================================
-- FUNCIÓN DE PRUEBA MANUAL
-- ============================================

-- Para probar manualmente:
-- SELECT auto_close_expired_auctions();

-- Para ver cuántas subastas cerró:
-- SELECT * FROM auction_events WHERE event_type = 'LOT_CLOSED' ORDER BY created_at DESC LIMIT 10;

