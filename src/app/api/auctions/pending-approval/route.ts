// ============================================
// MERCADITO ONLINE PY - PENDING APPROVAL LIST
// Endpoint para listar subastas pendientes de aprobación del vendedor
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
    const sortBy = searchParams.get('sortBy') || 'deadline'; // deadline, created_at, amount
    const filter = searchParams.get('filter') || 'all'; // all, urgent, expired

    // Construir query base
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
        auction_end_at,
        created_at,
        updated_at,
        winner:profiles!winner_id(id, first_name, last_name, email)
      `, { count: 'exact' })
      .eq('sale_type', 'auction')
      .eq('auction_status', 'ended')
      .eq('seller_id', userId)
      .eq('approval_status', 'pending_approval')
      .not('buy_now_price', 'is', null)
      .not('current_bid', 'is', null);

    // Aplicar filtros
    if (filter === 'urgent') {
      // Urgente: falta menos de 24 horas
      const urgentDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      query = query.lte('approval_deadline', urgentDeadline);
    } else if (filter === 'expired') {
      // Expirado: pasó el deadline
      query = query.lte('approval_deadline', new Date().toISOString());
    }

    // Aplicar ordenamiento
    if (sortBy === 'deadline') {
      query = query.order('approval_deadline', { ascending: true }); // Más urgentes primero
    } else if (sortBy === 'created_at') {
      query = query.order('created_at', { ascending: false }); // Más recientes primero
    } else if (sortBy === 'amount') {
      query = query.order('current_bid', { ascending: false }); // Mayor monto primero
    }

    // Paginación
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('[Pending Approval API] Error obteniendo subastas', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener subastas pendientes' },
        { status: 500 }
      );
    }

    // Calcular estadísticas
    const now = new Date();
    const stats = {
      total: count || 0,
      urgent: 0, // < 24 horas
      expired: 0, // Pasó deadline
    };

    if (data) {
      data.forEach((auction: any) => {
        if (!auction.approval_deadline) return;
        const deadline = new Date(auction.approval_deadline);
        if (deadline < now) {
          stats.expired++;
        } else {
          const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
          if (hoursUntilDeadline < 24) {
            stats.urgent++;
          }
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
    logger.error('[Pending Approval API] Error inesperado', error);
    return NextResponse.json(
      { success: false, error: 'Error inesperado al obtener subastas pendientes' },
      { status: 500 }
    );
  }
}

