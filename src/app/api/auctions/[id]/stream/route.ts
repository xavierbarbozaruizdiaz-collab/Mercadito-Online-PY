// ============================================
// SERVER-SENT EVENTS (SSE) STREAM FOR AUCTIONS
// Alternativa escalable a WebSockets para broadcast masivo
// ============================================

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const productId = params.id;

  // Crear stream SSE
  const stream = new ReadableStream({
    async start(controller) {
      let isActive = true;
      
      // Función para enviar datos
      const send = (data: any) => {
        if (!isActive) return;
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(new TextEncoder().encode(message));
        } catch (err) {
          console.error('Error enviando SSE:', err);
        }
      };

      // Suscribirse a cambios en la tabla de productos (estado de subasta)
      const productChannel = supabase
        .channel(`auction-${productId}-sse-products`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'products',
            filter: `id=eq.${productId}`,
          },
          (payload) => {
            if (payload.new) {
              send({
                type: 'AUCTION_UPDATE',
                data: payload.new,
                timestamp: Date.now(),
              });
            }
          }
        )
        .subscribe();

      // Suscribirse a nuevas pujas
      const bidsChannel = supabase
        .channel(`auction-${productId}-sse-bids`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'auction_bids',
            filter: `product_id=eq.${productId}`,
          },
          (payload) => {
            if (payload.new) {
              send({
                type: 'BID_PLACED',
                data: payload.new,
                timestamp: Date.now(),
              });
            }
          }
        )
        .subscribe();

      // Enviar heartbeat cada 30 segundos para mantener conexión
      const heartbeatInterval = setInterval(() => {
        send({
          type: 'HEARTBEAT',
          serverTime: Date.now(),
        });
      }, 30000);

      // Enviar tiempo del servidor sincronizado cada 10 segundos
      const timeSyncInterval = setInterval(async () => {
        try {
          const { getServerTime } = await import('@/lib/utils/timeSync');
          const serverTime = await getServerTime();
          send({
            type: 'TIME_SYNC',
            serverTime: serverTime,
            timestamp: Date.now(),
          });
        } catch (err) {
          console.warn('Error sincronizando tiempo en SSE:', err);
        }
      }, 10000);

      // Limpiar al cerrar conexión
      request.signal.addEventListener('abort', () => {
        isActive = false;
        clearInterval(heartbeatInterval);
        clearInterval(timeSyncInterval);
        supabase.removeChannel(productChannel);
        supabase.removeChannel(bidsChannel);
        try {
          controller.close();
        } catch (err) {
          // Ignorar errores al cerrar
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Deshabilitar buffering en Nginx
    },
  });
}

