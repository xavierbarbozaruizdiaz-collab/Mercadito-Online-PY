import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/apiAuth';
import { logger } from '@/lib/utils/logger';
import { isAliExpressConfigured } from '@/lib/services/aliexpressClient';
import {
  assertUserOwnsFallbackStore,
  computeLandedPricePyg,
  parseSourcedSettings,
  searchAliExpressForDashboard,
} from '@/lib/services/sourcedCatalogService';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const ownership = await assertUserOwnsFallbackStore(auth.user.id);
    if (!ownership.ok || !ownership.store) {
      return NextResponse.json({ error: ownership.error }, { status: 403 });
    }

    if (!isAliExpressConfigured()) {
      return NextResponse.json(
        { error: 'AliExpress no está configurado. Pedí a un admin que cargue ALIEXPRESS_APP_KEY y ALIEXPRESS_APP_SECRET.' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const keywords = typeof body.keywords === 'string' ? body.keywords.trim() : '';
    if (!keywords) {
      return NextResponse.json({ error: 'keywords es requerido' }, { status: 400 });
    }

    const page = Math.max(1, Number(body.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(body.pageSize) || 20));

    const result = await searchAliExpressForDashboard({ keywords, page, pageSize });
    const settings = parseSourcedSettings(ownership.store.settings);

    const items = result.products.map((p) => ({
      ...p,
      previewPricePyg: computeLandedPricePyg({
        sourcePrice: p.salePrice,
        sourceShipping: p.shippingPrice,
        fx: settings.usd_pyg,
        markupPercent: settings.markup_percent,
        bufferPercent: settings.buffer_percent,
      }),
    }));

    return NextResponse.json({
      items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      settings,
    });
  } catch (error: any) {
    logger.error('[sourced-catalog/search]', error);
    return NextResponse.json({ error: error.message || 'Error buscando en AliExpress' }, { status: 500 });
  }
}
