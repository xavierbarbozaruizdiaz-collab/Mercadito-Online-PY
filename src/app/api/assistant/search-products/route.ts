// ============================================
// MERCADITO ONLINE PY - SEARCH PRODUCTS API (FOR GPT)
// Endpoint wrapper para que el GPT pueda buscar productos
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '@/lib/services/searchService';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

// ============================================
// ENDPOINT POST
// ============================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, max_results } = body;

    // Si query está vacío o no existe → devolver items vacío
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    // Validar max_results (máximo 60, default 12)
    const limit = max_results ? Math.min(Math.max(1, max_results), 60) : 12;

    // Llamar al servicio de búsqueda existente
    const result = await SearchService.searchProducts({
      query: query.trim(),
      limit: limit,
      page: 1, // Siempre primera página para el GPT
    });

    // Mapear el resultado al formato requerido por el GPT
    const items = result.data.map((p) => ({
      id: p.id,
      title: p.title || '',
      price: p.price ?? null,
      description: null, // SearchService no incluye description en el select, usar null
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mercadito-online-py.vercel.app'}/products/${p.id}`,
    }));

    return NextResponse.json({ items }, { status: 200 });

  } catch (error: any) {
    // Loggear el error pero devolver siempre 200 con items vacío
    logger.error('[assistant/search-products] error', error);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}


