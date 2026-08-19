// ============================================
// MERCADITO ONLINE PY - QUICK AUCTION STATUS
// Endpoint liviano para últimos segundos (solo datos críticos)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const productId = params.id;

    // Query liviana: solo campos críticos para últimos segundos
    const { data, error } = await supabase
      .from('products')
      .select('id, current_bid, winner_id, auction_status, auction_end_at, total_bids, auction_version')
      .eq('id', productId)
      .eq('sale_type', 'auction')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Subasta no encontrada' },
          { status: 404 }
        );
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Subasta no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: data.id,
      current_bid: data.current_bid,
      winner_id: data.winner_id,
      auction_status: data.auction_status,
      auction_end_at: data.auction_end_at,
      total_bids: data.total_bids,
      auction_version: data.auction_version,
    });
  } catch (error: any) {
    console.error('Error en quick endpoint:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado rápido de subasta' },
      { status: 500 }
    );
  }
}

