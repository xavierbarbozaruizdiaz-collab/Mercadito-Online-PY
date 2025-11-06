// ============================================
// API ROUTE - PRODUCT CATALOG SYNC
// POST /api/catalog/sync
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { productCatalog } from '@/lib/services/productCatalogService';

// POST - Sincronizar producto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, platform } = body;

    if (!productId || !platform) {
      return NextResponse.json(
        { error: 'productId y platform son requeridos' },
        { status: 400 }
      );
    }

    const result = await productCatalog.syncProduct(productId, platform);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, externalId: result.externalId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Estado de sincronización
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const platform = searchParams.get('platform');

    if (!productId) {
      return NextResponse.json(
        { error: 'productId es requerido' },
        { status: 400 }
      );
    }

    const status = await productCatalog.getSyncStatus(
      productId,
      platform as any
    );

    return NextResponse.json({ status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

