import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/apiAuth';
import { logger } from '@/lib/utils/logger';
import { assertUserOwnsFallbackStore, getAdminClient } from '@/lib/services/sourcedCatalogService';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const ownership = await assertUserOwnsFallbackStore(auth.user.id);
    if (!ownership.ok || !ownership.store) {
      return NextResponse.json({ error: ownership.error }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const db = getAdminClient();
    let query = (db as any)
      .from('sourced_fulfillments')
      .select(
        `
        id,
        order_id,
        order_item_id,
        product_id,
        store_id,
        source_platform,
        source_product_id,
        source_url,
        status,
        tracking_number,
        notes,
        purchased_at,
        shipped_at,
        created_at,
        updated_at,
        products (id, title, cover_url, price),
        orders (id, status, total_amount, created_at)
      `,
        { count: 'exact' }
      )
      .eq('store_id', ownership.store.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;
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
    logger.error('[sourced-fulfillments GET]', error);
    return NextResponse.json({ error: error.message || 'Error' }, { status: 500 });
  }
}
