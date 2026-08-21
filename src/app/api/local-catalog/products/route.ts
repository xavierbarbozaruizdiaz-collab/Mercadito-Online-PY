import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/apiAuth';
import { logger } from '@/lib/utils/logger';
import {
  assertUserOwnsLocalCatalogStore,
  LOCAL_SOURCE_PLATFORM,
  setLocalCatalogProductVisibility,
} from '@/lib/services/localCatalogService';
import { getAdminClient } from '@/lib/services/sourcedCatalogService';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const ownership = await assertUserOwnsLocalCatalogStore(auth.user.id);
    if (!ownership.ok || !ownership.store) {
      return NextResponse.json({ error: ownership.error }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '40', 10)));
    const offset = (page - 1) * limit;

    const db = getAdminClient();
    const base = () =>
      (db as any)
        .from('products')
        .eq('store_id', ownership.store.id)
        .eq('fulfillment_type', 'sourced')
        .eq('source_platform', LOCAL_SOURCE_PLATFORM);

    const [{ data, error, count }, visibleRes] = await Promise.all([
      base()
        .select(
          'id, title, price, cover_url, status, source_product_id, source_url, source_price, source_shipping_price, source_currency, source_platform, markup_percent, last_source_synced_at, source_available',
          { count: 'exact' }
        )
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1),
      base().select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

    if (error) throw error;
    if (visibleRes.error) throw visibleRes.error;

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        visible_total: visibleRes.count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    logger.error('[local-catalog/products GET]', error);
    return NextResponse.json({ error: error.message || 'Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const ownership = await assertUserOwnsLocalCatalogStore(auth.user.id);
    if (!ownership.ok || !ownership.store) {
      return NextResponse.json({ error: ownership.error }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 });
    }
    if (typeof body.visible !== 'boolean') {
      return NextResponse.json({ error: 'visible (boolean) es requerido' }, { status: 400 });
    }

    const product = await setLocalCatalogProductVisibility({
      storeId: ownership.store.id,
      productId: id,
      visible: body.visible,
    });

    return NextResponse.json({ ok: true, product });
  } catch (error: any) {
    logger.error('[local-catalog/products PATCH]', error);
    const status = error.message?.includes('no encontrado') ? 404 : 500;
    return NextResponse.json({ error: error.message || 'Error' }, { status });
  }
}
