// ============================================
// MERCADITO ONLINE PY - MY WINS API
// Endpoint para obtener subastas ganadas por el usuario actual
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { getSessionWithTimeout } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // Verificar sesión
    const { data: sessionData } = await getSessionWithTimeout();
    const session = sessionData?.session;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Debes iniciar sesión' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Obtener parámetros de query
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;
    const filter = searchParams.get('filter') || 'all'; // all, pending, approved, rejected

    // Construir query base - subastas donde el usuario es el ganador
    let query = supabaseAdmin
      .from('products')
      .select(`
        id,
        title,
        cover_url,
        current_bid,
        buy_now_price,
        approval_status,
        approval_deadline,
        approval_decision_at,
        approval_notes,
        winner_id,
        auction_status,
        auction_end_at,
        created_at,
        seller:profiles!seller_id(id, first_name, last_name, email)
      `, { count: 'exact' })
      .eq('sale_type', 'auction')
      .eq('auction_status', 'ended')
      .eq('winner_id', userId);

    // Aplicar filtros de aprobación
    if (filter === 'pending') {
      query = query.eq('approval_status', 'pending_approval');
    } else if (filter === 'approved') {
      query = query.eq('approval_status', 'approved');
    } else if (filter === 'rejected') {
      query = query.eq('approval_status', 'rejected');
    } else if (filter === 'no_approval_needed') {
      // Sin necesidad de aprobación (monto >= buy_now_price o no hay buy_now_price)
      query = query.or('approval_status.is.null,buy_now_price.is.null');
    }

    // Ordenar por fecha de finalización (más recientes primero)
    query = query.order('auction_end_at', { ascending: false });

    // Paginación
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('[My Wins API] Error obteniendo subastas ganadas', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener subastas ganadas' },
        { status: 500 }
      );
    }

    // Calcular estadísticas
    const stats = {
      total: count || 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      no_approval_needed: 0,
    };

    if (data) {
      data.forEach((auction: any) => {
        if (auction.approval_status === 'pending_approval') {
          stats.pending++;
        } else if (auction.approval_status === 'approved') {
          stats.approved++;
        } else if (auction.approval_status === 'rejected') {
          stats.rejected++;
        } else {
          stats.no_approval_needed++;
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      stats,
    });
  } catch (error: any) {
    logger.error('[My Wins API] Error inesperado', error);
    return NextResponse.json(
      { success: false, error: 'Error inesperado al obtener subastas ganadas' },
      { status: 500 }
    );
  }
}

