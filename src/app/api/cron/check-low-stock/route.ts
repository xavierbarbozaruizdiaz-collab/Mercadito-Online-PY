import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';
import { headers } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Verificar secreto de cron
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Iniciando verificación de stock bajo');

    // Obtener productos con stock bajo
    const { data: productsLowStock, error: productsError } = await supabase
      .from('products')
      .select('id, title, stock_quantity, low_stock_threshold, seller_id, store_id')
      .eq('status', 'active')
      .eq('stock_management_enabled', true)
      .not('stock_quantity', 'is', null)
      .not('low_stock_threshold', 'is', null);

    if (productsError) {
      throw productsError;
    }

    if (!productsLowStock || productsLowStock.length === 0) {
      logger.info('No hay productos con stock bajo');
      return NextResponse.json({ checked: 0, alerts_created: 0 });
    }

    let alertsCreated = 0;
    let notificationsCreated = 0;

    // Verificar cada producto
    for (const product of productsLowStock) {
      const p = product as any;
      const stock = p.stock_quantity || 0;
      const threshold = p.low_stock_threshold || 5;

      if (stock <= threshold) {
        // Verificar si ya hay una alerta activa
        const { data: existingAlert } = await supabase
          .from('stock_alerts')
          .select('id')
          .eq('product_id', p.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!existingAlert) {
          // Crear alerta
          const { error: alertError } = await (supabase as any)
            .from('stock_alerts')
            .insert({
              product_id: p.id,
              seller_id: p.seller_id,
              threshold: threshold,
              current_stock: stock,
              is_active: true,
              notified_at: new Date().toISOString(),
            });

          if (!alertError) {
            alertsCreated++;

            // Crear notificación para el vendedor
            const { error: notifError } = await (supabase as any)
              .from('notifications')
              .insert({
                user_id: p.seller_id,
                type: 'stock',
                title: 'Stock Bajo',
                message: `El producto "${p.title}" tiene stock bajo (${stock} unidades restantes)`,
                data: {
                  product_id: p.id,
                  product_title: p.title,
                  current_stock: stock,
                  threshold: threshold,
                },
                is_read: false,
              });

            if (!notifError) {
              notificationsCreated++;
            }
          }
        }
      }
    }

    logger.info('Verificación de stock bajo completada', {
      checked: productsLowStock.length,
      alerts_created: alertsCreated,
      notifications_created: notificationsCreated,
    });

    return NextResponse.json({
      checked: productsLowStock.length,
      alerts_created: alertsCreated,
      notifications_created: notificationsCreated,
    });
  } catch (error: any) {
    logger.error('Error verificando stock bajo', error);
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}

