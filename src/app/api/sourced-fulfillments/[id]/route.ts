import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/apiAuth';
import { logger } from '@/lib/utils/logger';
import { assertUserOwnsFallbackStore, getAdminClient } from '@/lib/services/sourcedCatalogService';

export const runtime = 'nodejs';

const ALLOWED: Record<string, string[]> = {
  pending_purchase: ['purchased', 'cancelled'],
  purchased: ['shipped', 'cancelled'],
  shipped: [],
  cancelled: [],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const ownership = await assertUserOwnsFallbackStore(auth.user.id);
    if (!ownership.ok || !ownership.store) {
      return NextResponse.json({ error: ownership.error }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const db = getAdminClient();

    const { data: current, error: fetchError } = await (db as any)
      .from('sourced_fulfillments')
      .select('id, status, store_id')
      .eq('id', id)
      .eq('store_id', ownership.store.id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Fulfillment no encontrado' }, { status: 404 });
    }

    const patch: Record<string, unknown> = {};

    if (typeof body.tracking_number === 'string') {
      patch.tracking_number = body.tracking_number.trim() || null;
    }
    if (typeof body.notes === 'string') {
      patch.notes = body.notes.trim() || null;
    }

    if (typeof body.status === 'string' && body.status !== current.status) {
      const allowed = ALLOWED[current.status] || [];
      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          { error: `No se puede pasar de ${current.status} a ${body.status}` },
          { status: 400 }
        );
      }
      patch.status = body.status;
      if (body.status === 'purchased') patch.purchased_at = new Date().toISOString();
      if (body.status === 'shipped') patch.shipped_at = new Date().toISOString();
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
    }

    const { data, error } = await (db as any)
      .from('sourced_fulfillments')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: any) {
    logger.error('[sourced-fulfillments PATCH]', error);
    return NextResponse.json({ error: error.message || 'Error' }, { status: 500 });
  }
}
