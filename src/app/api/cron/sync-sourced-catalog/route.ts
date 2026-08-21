import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { isAliExpressConfigured } from '@/lib/services/aliexpressClient';
import { importDropshipRecommended, syncSourcedCatalog } from '@/lib/services/sourcedCatalogService';

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
    const sync = await syncSourcedCatalog(40);
    let recommended = null;
    try {
      recommended = await importDropshipRecommended({
        categoryOffset: 0,
        categoryLimit: 6,
        pageSize: 10,
      });
    } catch (recommendError: any) {
      logger.warn('[cron/sync-sourced-catalog] import recomendados', recommendError);
      recommended = { error: recommendError?.message || 'Error importando recomendados' };
    }
    logger.info('[cron/sync-sourced-catalog] fin', { sync, recommended });
    return NextResponse.json({ sync, recommended });
  } catch (error: any) {
    logger.error('[cron/sync-sourced-catalog]', error);
    return NextResponse.json({ error: error.message || 'Error' }, { status: 500 });
  }
}
