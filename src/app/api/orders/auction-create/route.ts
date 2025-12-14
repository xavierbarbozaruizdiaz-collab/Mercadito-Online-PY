import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // SOLUCIÓN: Obtener token de autorización del header o cookies
    const authHeader = request.headers.get('authorization');
    const cookieStore = await cookies();
    
    // Intentar obtener sesión desde cookies (método principal)
    const supabase = await createServerClient();
    let sessionData = await supabase.auth.getSession();
    let user = (sessionData.data as any)?.session?.user;
    
    // Si no hay sesión en cookies, intentar desde Authorization header
    if (!user?.id && authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: userFromToken }, error: tokenError } = await supabaseAdmin.auth.getUser(token);
      if (!tokenError && userFromToken) {
        user = userFromToken;
      }
    }
    
    // Si aún no hay usuario, verificar token en cookies directamente
    if (!user?.id) {
      const accessToken = cookieStore.get('sb-access-token')?.value || 
                         cookieStore.get('sb-hqdatzhliaordlsqtjea-auth-token')?.value;
      if (accessToken) {
        const { data: { user: userFromCookieToken }, error: cookieTokenError } = await supabaseAdmin.auth.getUser(accessToken);
        if (!cookieTokenError && userFromCookieToken) {
          user = userFromCookieToken;
        }
      }
    }

    if (!user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { auctionId, shippingAddress, paymentMethod, notes, totalAmount } = body;

    if (!auctionId || !totalAmount || totalAmount <= 0) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Obtener info de la subasta y verificar ganador
    const { data: auction, error: auctionError } = await (supabaseAdmin as any)
      .from('products')
      .select('id, seller_id, auction_status, winner_id, current_bid')
      .eq('id', auctionId)
      .single();

    if (auctionError || !auction) {
      return NextResponse.json({ error: 'Subasta no encontrada' }, { status: 404 });
    }

    if (auction.auction_status !== 'ended') {
      return NextResponse.json({ error: 'La subasta no ha finalizado' }, { status: 400 });
    }

    if (auction.winner_id !== user.id) {
      return NextResponse.json({ error: 'No eres el ganador de esta subasta' }, { status: 403 });
    }

    // Crear orden
    const { data: order, error: orderError } = await (supabaseAdmin as any)
      .from('orders')
      .insert({
        buyer_id: user.id,
        status: 'pending',
        total_amount: totalAmount,
        payment_method: paymentMethod || 'cash',
        shipping_address: shippingAddress || null,
        notes: notes || null,
      })
      .select('id')
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: orderError?.message || 'No se pudo crear la orden' }, { status: 500 });
    }

    // Crear item de orden (1 unidad)
    const { error: itemError } = await (supabaseAdmin as any)
      .from('order_items')
      .insert({
        order_id: order.id,
        product_id: auction.id,
        quantity: 1,
        unit_price: auction.current_bid || 0,
        total_price: auction.current_bid || 0,
      });

    if (itemError) {
      return NextResponse.json({ error: itemError.message || 'No se pudo crear el item de la orden' }, { status: 500 });
    }

    return NextResponse.json({ orderId: order.id }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error inesperado al crear la orden de subasta' },
      { status: 500 }
    );
  }
}


