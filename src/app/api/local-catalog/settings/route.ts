import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/apiAuth';
import { logger } from '@/lib/utils/logger';
import {
  assertUserOwnsLocalCatalogStore,
  parseLocalCatalogSettings,
  updateLocalCatalogSettings,
} from '@/lib/services/localCatalogService';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const ownership = await assertUserOwnsLocalCatalogStore(auth.user.id);
    if (!ownership.ok || !ownership.store) {
      return NextResponse.json({ error: ownership.error }, { status: 403 });
    }

    const settings = parseLocalCatalogSettings(ownership.store.settings);
    return NextResponse.json({
      store: {
        id: ownership.store.id,
        name: ownership.store.name,
        slug: ownership.store.slug,
      },
      settings: {
        markup_percent: settings.markup_percent,
        buffer_percent: settings.buffer_percent,
        default_source: settings.default_source,
        import_token: settings.import_token,
      },
    });
  } catch (error: any) {
    logger.error('[local-catalog/settings GET]', error);
    return NextResponse.json({ error: error.message || 'Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const store = await updateLocalCatalogSettings({
      userId: auth.user.id,
      patch: {
        markup_percent:
          body.markup_percent !== undefined ? Number(body.markup_percent) : undefined,
        buffer_percent:
          body.buffer_percent !== undefined ? Number(body.buffer_percent) : undefined,
        default_source:
          typeof body.default_source === 'string' ? body.default_source : undefined,
        regenerate_token: Boolean(body.regenerate_token),
        store_name: typeof body.store_name === 'string' ? body.store_name : undefined,
      },
    });

    const settings = parseLocalCatalogSettings(store.settings);
    return NextResponse.json({
      store: { id: store.id, name: store.name, slug: store.slug },
      settings: {
        markup_percent: settings.markup_percent,
        buffer_percent: settings.buffer_percent,
        default_source: settings.default_source,
        import_token: settings.import_token,
      },
    });
  } catch (error: any) {
    logger.error('[local-catalog/settings PATCH]', error);
    const status = String(error.message || '').includes('administradores') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Error' }, { status });
  }
}
