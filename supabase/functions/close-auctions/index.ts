// ============================================
// MERCADITO ONLINE PY - EDGE FUNCTION: AUTO-CIERRE
// Edge Function de Supabase para cerrar subastas expiradas
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Crear cliente de Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Ejecutar función para cerrar subastas expiradas
    const { data: closedCount, error: closeError } = await supabaseClient.rpc(
      'close_expired_auctions'
    );

    if (closeError) {
      console.error('Error closing expired auctions:', closeError);
      return new Response(
        JSON.stringify({
          success: false,
          error: closeError.message,
          closed_count: null,
          activated_count: null,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Ejecutar función para activar subastas programadas
    const { data: activatedCount, error: activateError } = await supabaseClient.rpc(
      'activate_scheduled_auctions'
    );

    if (activateError) {
      console.error('Error activating scheduled auctions:', activateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: activateError.message,
          closed_count: closedCount || 0,
          activated_count: null,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        closed_count: closedCount || 0,
        activated_count: activatedCount || 0,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unexpected error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

