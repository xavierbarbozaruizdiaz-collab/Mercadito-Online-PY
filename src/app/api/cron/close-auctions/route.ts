import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route para cerrar subastas expiradas automáticamente
 * 
 * Se ejecuta cada 5-10 segundos mediante Vercel Cron Jobs
 * Configurar en vercel.json con:
 * {
 *   "crons": [{
 *     "path": "/api/cron/close-auctions",
 *     "schedule": "*/10 * * * * *"
 *   }]
 * }
 */

export const runtime = 'edge';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  // Verificar que viene de Vercel Cron (opcional pero recomendado)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Crear cliente con service role key para bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Llamar a la función que cierra subastas expiradas
    const { data, error } = await supabase.rpc('auto_close_expired_auctions');

    if (error) {
      console.error('Error closing expired auctions:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    console.log('✅ Closed expired auctions:', data);

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

