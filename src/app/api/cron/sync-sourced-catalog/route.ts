import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { isAliExpressConfigured } from '@/lib/services/aliexpressClient';
import { syncSourcedCatalog } from '@/lib/services/sourcedCatalogService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAliExpressConfigured()) {
    return NextResponse.json({ skipped: true, reason: 'AliExpress no configurado' });
  }

  try {
    logger.info('[cron/sync-sourced-catalog] inicio');
    const result = await syncSourcedCatalog(80);
    logger.info('[cron/sync-sourced-catalog] fin', result);
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error('[cron/sync-sourced-catalog]', error);
    return NextResponse.json({ error: error.message || 'Error' }, { status: 500 });
  }
}
