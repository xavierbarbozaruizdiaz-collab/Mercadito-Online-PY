import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/apiAuth';
import { logger } from '@/lib/utils/logger';
import {
  assertUserOwnsFallbackStore,
  getAdminClient,
} from '@/lib/services/sourcedCatalogService';
import { assertUserOwnsLocalCatalogStore } from '@/lib/services/localCatalogService';

export const runtime = 'nodejs';

function trimOrNull(value: unknown, max = 200): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  return t.slice(0, max);
}

async function resolveOfficialStoreIds(userId: string): Promise<{
  ok: boolean;
  error?: string;
  storeIds: string[];
}> {
  const fallback = await assertUserOwnsFallbackStore(userId);
  const local = await assertUserOwnsLocalCatalogStore(userId);
  const ids: string[] = [];
  if (fallback.ok && fallback.store) ids.push(fallback.store.id);
  if (local.ok && local.store) ids.push(local.store.id);
  if (ids.length === 0) {
    return {
      ok: false,
      error: fallback.error || local.error || 'Sin tienda oficial',
      storeIds: [],
    };
  }
  return { ok: true, storeIds: Array.from(new Set(ids)) };
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const resolved = await resolveOfficialStoreIds(auth.user.id);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
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
        origin,
        customer_name,
        customer_phone,
        customer_notes,
        tracking_number,
        notes,
        purchased_at,
        shipped_at,
        created_at,
        updated_at,
        products (id, title, cover_url, price),
        orders (
          id,
          status,
          total_amount,
          created_at,
          buyer_id,
          shipping_address,
          notes
        )
      `,
        { count: 'exact' }
      )
      .in('store_id', resolved.storeIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (platform && platform !== 'all') {
      query = query.eq('source_platform', platform);
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

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const resolved = await resolveOfficialStoreIds(auth.user.id);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const productId = typeof body.product_id === 'string' ? body.product_id.trim() : '';
    if (!productId) {
      return NextResponse.json({ error: 'product_id es requerido' }, { status: 400 });
    }

    const customerName = trimOrNull(body.customer_name, 120);
    const customerPhone = trimOrNull(body.customer_phone, 40);
    const customerNotes = trimOrNull(body.customer_notes, 500);

    const db = getAdminClient();
    const { data: product, error: productError } = await (db as any)
      .from('products')
      .select(
        'id, store_id, fulfillment_type, source_platform, source_product_id, source_url, title, status'
      )
      .eq('id', productId)
      .in('store_id', resolved.storeIds)
      .maybeSingle();

    if (productError) throw productError;
    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado en las tiendas oficiales' },
        { status: 404 }
      );
    }
    if (product.fulfillment_type !== 'sourced') {
      return NextResponse.json(
        { error: 'Solo se pueden encolar productos sourced' },
        { status: 400 }
      );
    }
    if (!product.source_url && !product.source_product_id) {
      return NextResponse.json(
        { error: 'El producto no tiene link ni ID de origen' },
        { status: 400 }
      );
    }

    const { data, error } = await (db as any)
      .from('sourced_fulfillments')
      .insert({
        order_id: null,
        order_item_id: null,
        product_id: product.id,
        store_id: product.store_id,
        source_platform: product.source_platform || 'aliexpress',
        source_product_id: product.source_product_id || null,
        source_url: product.source_url || null,
        status: 'pending_purchase',
        origin: 'manual',
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_notes: customerNotes,
      })
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
        origin,
        customer_name,
        customer_phone,
        customer_notes,
        tracking_number,
        notes,
        purchased_at,
        shipped_at,
        created_at,
        updated_at,
        products (id, title, cover_url, price)
      `
      )
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    logger.error('[sourced-fulfillments POST]', error);
    return NextResponse.json({ error: error.message || 'Error' }, { status: 500 });
  }
}
