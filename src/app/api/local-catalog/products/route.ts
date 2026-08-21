import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/apiAuth';
import { logger } from '@/lib/utils/logger';
import {
  assertUserOwnsLocalCatalogStore,
  LOCAL_SOURCE_PLATFORM,
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
    const { data, error, count } = await (db as any)
      .from('products')
      .select(
        'id, title, price, cover_url, status, source_product_id, source_url, source_price, source_shipping_price, source_currency, source_platform, markup_percent, last_source_synced_at, source_available',
        { count: 'exact' }
      )
      .eq('store_id', ownership.store.id)
      .eq('fulfillment_type', 'sourced')
      .eq('source_platform', LOCAL_SOURCE_PLATFORM)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    logger.error('[local-catalog/products GET]', error);
    return NextResponse.json({ error: error.message || 'Error' }, { status: 500 });
  }
}
