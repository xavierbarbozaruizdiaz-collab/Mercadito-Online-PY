import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { createServerClient } from '@/lib/supabase/server';

async function countLive() {
  // Ajustar estas condiciones a tu esquema real
  const products = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  // stores: si no existe tabla stores, intenta profiles con role seller
  let storesCount = 0;
  try {
    const stores = await supabase
      .from('stores')
      .select('id', { count: 'exact', head: true });
    if (!stores.error && stores.count != null) storesCount = stores.count;
  } catch {
    const sellers = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'seller');
    if (!sellers.error && sellers.count != null) storesCount = sellers.count;
  }

  // auctions: si no existe, 0
  let auctionsCount = 0;
  try {
    const auctions = await supabase
      .from('auctions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');
    if (!auctions.error && auctions.count != null) auctionsCount = auctions.count;
  } catch {}

  const productsCount = products.count || 0;
  return { productsCount, storesCount, auctionsCount };
}

export async function GET() {
  try {
    const live = await countLive();
    return NextResponse.json(
      {
        products: live.productsCount,
        stores: live.storesCount,
        auctions: live.auctionsCount,
        source: 'live',
      },
      { headers: { 'cache-control': 'no-store' } }
    );
  } catch (_e: unknown) {
    // Fallback a cache site_stats
    const { data } = await (supabase as any).from('site_stats').select('*').eq('id', 1).single();
    return NextResponse.json(
      {
        products: data?.products_count ?? 0,
        stores: data?.stores_count ?? 0,
        auctions: data?.auctions_count ?? 0,
        source: 'cache',
      },
      { headers: { 'cache-control': 'no-store' } }
    );
  }
}

export async function PATCH(_req: NextRequest) {
  // [SECURITY PATCH FASE3] Verificación explícita de admin en PATCH /api/site-stats
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ ok: false, error: 'Error verificando permisos' }, { status: 500 });
  }

  const profileData = profile as { role?: string };
  if (profileData.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'No autorizado. Se requiere rol de administrador.' }, { status: 403 });
  }

  // Sólo admin: rely en RLS, si no es admin, UPDATE fallará
  try {
    const live = await countLive();
    const { error } = await (supabase as any)
      .from('site_stats')
      .upsert({
        id: 1,
        products_count: live.productsCount,
        stores_count: live.storesCount,
        auctions_count: live.auctionsCount,
      }, { onConflict: 'id' });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, updated: live });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}



