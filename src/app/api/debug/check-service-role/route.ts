// ============================================
// DEBUG ENDPOINT - Verificar service_role key
// TEMPORAL: Eliminar después de debugging
// ============================================

import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const hasServiceKey = !!serviceKey;
    const hasAnonKey = !!anonKey;
    const serviceKeyLength = serviceKey?.length || 0;
    const anonKeyLength = anonKey?.length || 0;
    
    // Verificar formato
    const isServiceRoleFormat = serviceKey?.startsWith('eyJ') && serviceKeyLength > 100;
    const isAnonFormat = anonKey?.startsWith('eyJ') && anonKeyLength > 100;
    
    // Verificar que no sean iguales
    const keysAreDifferent = serviceKey !== anonKey;

    const info = {
      hasServiceKey,
      hasAnonKey,
      hasSupabaseUrl: !!supabaseUrl,
      serviceKeyLength,
      anonKeyLength,
      serviceKeyPrefix: serviceKey?.substring(0, 30) || 'N/A',
      anonKeyPrefix: anonKey?.substring(0, 30) || 'N/A',
      isServiceRoleFormat,
      isAnonFormat,
      keysAreDifferent,
      supabaseUrl: supabaseUrl || 'N/A',
      // Verificar si el service key es realmente diferente del anon key
      keysMatch: serviceKey === anonKey ? '⚠️ SON IGUALES (PROBLEMA)' : '✅ Son diferentes',
    };

    logger.info('[DEBUG] Service role key check', info);

    return NextResponse.json({
      success: true,
      ...info,
      // No exponer los keys completos por seguridad
      warning: !isServiceRoleFormat ? '⚠️ Service key NO tiene formato JWT válido' : null,
      error: !keysAreDifferent ? '❌ Service key y Anon key son IGUALES (CRÍTICO)' : null,
    });
  } catch (error: any) {
    logger.error('[DEBUG] Error checking service role key', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}







