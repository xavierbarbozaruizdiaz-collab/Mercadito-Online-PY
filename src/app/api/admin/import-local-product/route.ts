import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/apiAuth';
import { logger } from '@/lib/utils/logger';
import {
  ensureOfficialLocalCatalogStore,
  findLocalCatalogStoreByImportToken,
  importLocalCatalogProduct,
  parsePygPriceInput,
} from '@/lib/services/localCatalogService';

export const runtime = 'nodejs';

const ALLOWED_ORIGINS = [
  'https://cellshop.com.py',
  'https://www.cellshop.com.py',
];

function corsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get('origin') || '';
  const allow =
    ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.cellshop.com.py')
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-import-token',
    'Access-Control-Max-Age': '86400',
  };
}

function extractImportToken(request: NextRequest): string {
  const headerToken = request.headers.get('x-import-token') || '';
  if (headerToken.trim()) return headerToken.trim();
  const auth = request.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || '';
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request);

  try {
    const token = extractImportToken(request);
    let store = token ? await findLocalCatalogStoreByImportToken(token) : null;

    if (!store) {
      const auth = await requireAdmin(request);
      if (!auth.ok) {
        return NextResponse.json(
          { ok: false, error: 'Token inválido o sesión admin requerida' },
          { status: 401, headers }
        );
      }
      store = await ensureOfficialLocalCatalogStore(auth.user.id);
    }

    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === 'string' ? body.title : '';
    const price = parsePygPriceInput(body.price);
    const imageUrl =
      typeof body.image_url === 'string'
        ? body.image_url
        : typeof body.imageUrl === 'string'
          ? body.imageUrl
          : null;
    const source = typeof body.source === 'string' ? body.source : null;
    const currency = typeof body.currency === 'string' ? body.currency : 'PYG';
    const sourceUrl =
      typeof body.source_url === 'string'
        ? body.source_url
        : typeof body.sourceUrl === 'string'
          ? body.sourceUrl
          : typeof body.url === 'string'
            ? body.url
            : null;

    if (!title.trim()) {
      return NextResponse.json({ ok: false, error: 'title es requerido' }, { status: 400, headers });
    }
    if (price == null) {
      return NextResponse.json({ ok: false, error: 'price inválido' }, { status: 400, headers });
    }

    const result = await importLocalCatalogProduct({
      store,
      title,
      sourcePricePyg: price,
      imageUrl,
      source,
      sourceUrl,
      currency,
    });

    return NextResponse.json(
      {
        ok: true,
        created: result.created,
        product: result.product,
      },
      { status: result.created ? 201 : 200, headers }
    );
  } catch (error: any) {
    logger.error('[import-local-product]', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Error importando producto' },
      { status: 500, headers }
    );
  }
}
