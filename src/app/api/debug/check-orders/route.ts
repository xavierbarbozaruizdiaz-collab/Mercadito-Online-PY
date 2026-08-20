import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { requireAdmin } from '@/lib/auth/apiAuth';

/**
 * API de debug — solo admin y solo fuera de producción.
 * GET /api/debug/check-orders?userId=xxx
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_APP_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId es requerido' }, { status: 400 });
    }

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, buyer_id, status, total_amount, created_at')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false });

    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', userId)
      .single();

    return NextResponse.json({
      orders: orders || [],
      ordersError,
      userProfile,
      profileError,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error' }, { status: 500 });
  }
}
