import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

/**
 * API Route para debug: Verificar pedidos en la base de datos
 * GET /api/debug/check-orders?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    // Consultar pedidos directamente desde la BD
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, buyer_id, status, total_amount, created_at')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false });

    // También verificar todos los pedidos (sin filtro) para ver si hay alguno
    const { data: allOrders, error: allOrdersError } = await supabase
      .from('orders')
      .select('id, buyer_id, status, total_amount, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // Verificar si el usuario existe
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', userId)
      .single();

    return NextResponse.json({
      success: true,
      userId,
      userProfile: userProfile || null,
      ordersForUser: {
        count: orders?.length || 0,
        orders: orders || [],
        error: ordersError
      },
      allOrdersSample: {
        count: allOrders?.length || 0,
        orders: allOrders || [],
        error: allOrdersError
      },
      diagnostics: {
        userIdExists: !!userProfile,
        hasOrders: (orders?.length || 0) > 0,
        hasAnyOrders: (allOrders?.length || 0) > 0
      }
    });

  } catch (error: any) {
    console.error('Error en check-orders:', error);
    return NextResponse.json(
      { error: error.message || 'Error desconocido' },
      { status: 500 }
    );
  }
}

