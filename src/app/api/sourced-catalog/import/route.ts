import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/apiAuth';
import { logger } from '@/lib/utils/logger';
import { isAliExpressConfigured } from '@/lib/services/aliexpressClient';
import { importAliExpressProducts } from '@/lib/services/sourcedCatalogService';

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
    const productIds = Array.isArray(body.productIds)
      ? body.productIds.map((id: unknown) => String(id))
      : [];

    if (productIds.length === 0) {
      return NextResponse.json({ error: 'productIds es requerido' }, { status: 400 });
    }

    const result = await importAliExpressProducts({
      productIds,
      userId: auth.user.id,
      keyword: typeof body.keyword === 'string' ? body.keyword : undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error('[sourced-catalog/import]', error);
    const status = error.message?.includes('fallback') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Error importando productos' }, { status });
  }
}
