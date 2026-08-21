import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/apiAuth';
import { logger } from '@/lib/utils/logger';
import { fetchCellshopCategory } from '@/lib/services/cellshopScraper';
import {
  assertUserOwnsLocalCatalogStore,
  importLocalCatalogProduct,
} from '@/lib/services/localCatalogService';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const ownership = await assertUserOwnsLocalCatalogStore(auth.user.id);
    if (!ownership.ok || !ownership.store) {
      return NextResponse.json({ error: ownership.error }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const categoryUrl =
      typeof body.category_url === 'string'
        ? body.category_url
        : typeof body.url === 'string'
          ? body.url
          : '';
    const maxPagesRaw = Number(body.max_pages ?? body.pages ?? 1);
    const maxPages = Number.isFinite(maxPagesRaw)
      ? Math.min(3, Math.max(1, Math.floor(maxPagesRaw)))
      : 1;

    if (!categoryUrl.trim()) {
      return NextResponse.json({ error: 'category_url es requerido' }, { status: 400 });
    }

    const { products, pagesFetched } = await fetchCellshopCategory(categoryUrl, maxPages);

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: { source_url?: string; error: string }[] = [];

    for (const item of products) {
      try {
        const result = await importLocalCatalogProduct({
          store: ownership.store,
          title: item.title,
          sourcePricePyg: item.pricePyg,
          imageUrl: item.imageUrl,
          sourceUrl: item.sourceUrl,
          source: 'Cellshop',
          currency: 'PYG',
          status: 'paused',
        });
        if (result.created) imported += 1;
        else updated += 1;
      } catch (err: any) {
        skipped += 1;
        errors.push({
          source_url: item.sourceUrl,
          error: err?.message || 'Error importando',
        });
      }
    }

    return NextResponse.json({
      ok: true,
      found: products.length,
      pages_fetched: pagesFetched,
      imported,
      updated,
      skipped,
      errors: errors.slice(0, 20),
    });
  } catch (error: any) {
    logger.error('[local-catalog/import-category]', error);
    return NextResponse.json(
      { error: error.message || 'Error importando categoría' },
      { status: 500 }
    );
  }
}
