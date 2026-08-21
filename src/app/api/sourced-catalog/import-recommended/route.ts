import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/apiAuth';
import { logger } from '@/lib/utils/logger';
import { isAliExpressConfigured } from '@/lib/services/aliexpressClient';
import { importDropshipRecommended } from '@/lib/services/sourcedCatalogService';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    if (!isAliExpressConfigured()) {
      return NextResponse.json(
        { error: 'AliExpress no está configurado en el servidor' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const categoryIds = Array.isArray(body.categoryIds)
      ? body.categoryIds.map((id: unknown) => String(id)).filter(Boolean)
      : undefined;
    const result = await importDropshipRecommended({
      userId: auth.user.id,
      categoryOffset: Number(body.categoryOffset) || 0,
      categoryLimit: Number(body.categoryLimit) || 8,
      pageSize: Number(body.pageSize) || 12,
      categoryIds,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error('[sourced-catalog/import-recommended]', error);
    const status =
      error.message?.includes('fallback') || error.message?.includes('administrador') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Error importando recomendados' }, { status });
  }
}
