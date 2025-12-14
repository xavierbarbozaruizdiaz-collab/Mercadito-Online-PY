// ============================================
// MERCADITO ONLINE PY - AUCTION APPROVAL ENDPOINT
// Permite al vendedor aprobar o rechazar compra cuando monto < buy_now_price
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { getSessionWithTimeout } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const productId = params.id;

    // Verificar sesión
    const { data: sessionData } = await getSessionWithTimeout();
    const session = sessionData?.session;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Debes iniciar sesión' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Obtener datos de la subasta
    const { data: auction, error: auctionError } = await supabaseAdmin
      .from('products')
      .select('id, seller_id, auction_status, current_bid, buy_now_price, approval_status, winner_id')
      .eq('id', productId)
      .eq('sale_type', 'auction')
      .single();

    if (auctionError || !auction) {
      logger.error('[Auction Approval] Error obteniendo subasta', auctionError);
      return NextResponse.json(
        { success: false, error: 'Subasta no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el usuario es el vendedor
    if (auction.seller_id !== userId) {
      logger.warn('[Auction Approval] Intento de aprobación por usuario no vendedor', {
        productId,
        userId,
        sellerId: auction.seller_id,
      });
      return NextResponse.json(
        { success: false, error: 'Solo el vendedor puede aprobar o rechazar' },
        { status: 403 }
      );
    }

    // Verificar que la subasta terminó
    if (auction.auction_status !== 'ended') {
      return NextResponse.json(
        { success: false, error: 'La subasta aún no ha finalizado' },
        { status: 400 }
      );
    }

    // Verificar que hay un ganador
    if (!auction.winner_id) {
      return NextResponse.json(
        { success: false, error: 'Esta subasta no tiene ganador' },
        { status: 400 }
      );
    }

    // Verificar que requiere aprobación (monto < buy_now_price)
    if (!auction.buy_now_price || (auction.current_bid && auction.current_bid >= auction.buy_now_price)) {
      return NextResponse.json(
        { success: false, error: 'Esta subasta no requiere aprobación' },
        { status: 400 }
      );
    }

    // Obtener datos del body
    const body = await request.json();
    const { action, notes } = body; // action: 'approve' | 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Acción inválida. Debe ser "approve" o "reject"' },
        { status: 400 }
      );
    }

    // Verificar que no se haya tomado ya una decisión
    if (auction.approval_status && auction.approval_status !== 'pending_approval') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Ya se tomó una decisión: ${auction.approval_status === 'approved' ? 'Aprobada' : 'Rechazada'}`,
          current_status: auction.approval_status,
        },
        { status: 400 }
      );
    }

    // Actualizar estado de aprobación
    const approvalStatus = action === 'approve' ? 'approved' : 'rejected';
    const updateData: any = {
      approval_status: approvalStatus,
      approval_decision_at: new Date().toISOString(),
    };

    if (notes) {
      updateData.approval_notes = notes;
    }

    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update(updateData)
      .eq('id', productId);

    if (updateError) {
      logger.error('[Auction Approval] Error actualizando estado', updateError);
      return NextResponse.json(
        { success: false, error: 'Error al actualizar estado de aprobación' },
        { status: 500 }
      );
    }

    // Notificar al comprador/ganador
    if (auction.winner_id) {
      try {
        if (action === 'approve') {
          const notificationMessage = `El vendedor ha aprobado tu compra de la subasta "${auction.id}". Puedes proceder al pago ahora.`;
          await supabaseAdmin.from('notifications').insert({
            user_id: auction.winner_id,
            type: 'order',
            title: '¡Tu compra de subasta ha sido APROBADA!',
            message: notificationMessage, // Compatible con esquema que usa 'message'
            content: notificationMessage, // Compatible con esquema que usa 'content'
            data: {
              product_id: productId,
              status: 'approved',
              winning_bid: auction.current_bid,
              buy_now_price: auction.buy_now_price,
              action: 'approve',
            },
          } as any);
          logger.info('[Auction Approval] Notificación enviada al ganador (aprobada)', {
            productId,
            winnerId: auction.winner_id,
          });
        } else if (action === 'reject') {
          const notificationMessage = `El vendedor ha rechazado tu compra de la subasta "${auction.id}". El monto ganador no alcanzó el precio esperado.${notes ? ` Nota: ${notes}` : ''}`;
          await supabaseAdmin.from('notifications').insert({
            user_id: auction.winner_id,
            type: 'order',
            title: 'Tu compra de subasta ha sido RECHAZADA',
            message: notificationMessage, // Compatible con esquema que usa 'message'
            content: notificationMessage, // Compatible con esquema que usa 'content'
            data: {
              product_id: productId,
              status: 'rejected',
              winning_bid: auction.current_bid,
              buy_now_price: auction.buy_now_price,
              action: 'reject',
              notes: notes || null,
            },
          } as any);
          logger.info('[Auction Approval] Notificación enviada al ganador (rechazada)', {
            productId,
            winnerId: auction.winner_id,
          });
        }
      } catch (notifError: any) {
        // No fallar la aprobación si falla la notificación, solo loguear
        logger.error('[Auction Approval] Error enviando notificación al ganador', {
          productId,
          winnerId: auction.winner_id,
          error: notifError?.message,
        });
      }
    }

    logger.info('[Auction Approval] Decisión tomada', {
      productId,
      sellerId: userId,
      action,
      approvalStatus,
    });

    return NextResponse.json({
      success: true,
      message: action === 'approve' 
        ? 'Compra aprobada exitosamente' 
        : 'Compra rechazada',
      approval_status: approvalStatus,
    });
  } catch (error: any) {
    logger.error('[Auction Approval] Error inesperado', error);
    return NextResponse.json(
      { success: false, error: 'Error inesperado al procesar aprobación' },
      { status: 500 }
    );
  }
}

