import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/apiAuth';
import { logger } from '@/lib/utils/logger';
import {
  assertUserOwnsFallbackStore,
  parseSourcedSettings,
  updateSourcedSettings,
} from '@/lib/services/sourcedCatalogService';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const ownership = await assertUserOwnsFallbackStore(auth.user.id);
    if (!ownership.ok || !ownership.store) {
      return NextResponse.json({ error: ownership.error }, { status: 403 });
    }

    return NextResponse.json({
      store: { id: ownership.store.id, name: ownership.store.name, slug: ownership.store.slug },
      settings: parseSourcedSettings(ownership.store.settings),
    });
  } catch (error: any) {
    logger.error('[sourced-catalog/settings GET]', error);
    return NextResponse.json({ error: error.message || 'Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const settings = await updateSourcedSettings(auth.user.id, {
      usd_pyg: body.usd_pyg != null ? Number(body.usd_pyg) : undefined,
      markup_percent: body.markup_percent != null ? Number(body.markup_percent) : undefined,
      buffer_percent: body.buffer_percent != null ? Number(body.buffer_percent) : undefined,
      default_delivery_min_days:
        body.default_delivery_min_days != null ? Number(body.default_delivery_min_days) : undefined,
      default_delivery_max_days:
        body.default_delivery_max_days != null ? Number(body.default_delivery_max_days) : undefined,
    });

    return NextResponse.json({ settings });
  } catch (error: any) {
    logger.error('[sourced-catalog/settings PATCH]', error);
    const status = error.message?.includes('fallback') || error.message?.includes('dueño') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Error guardando ajustes' }, { status });
  }
}
