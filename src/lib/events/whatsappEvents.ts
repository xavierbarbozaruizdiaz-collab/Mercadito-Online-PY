// ============================================
// MERCADITO ONLINE PY - WHATSAPP EVENT HELPERS
// Conecta eventos de negocio con WhatsApp Cloud API
// ============================================

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';
import { sendTextMessage } from '@/lib/services/whatsappCloudService';

async function getUserPhone(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      logger.warn('[WhatsAppEvents] Error obteniendo phone del usuario', { userId, error });
      return null;
    }

    const phone = (data as any)?.phone as string | null | undefined;
    if (!phone) {
      logger.info('[WhatsAppEvents] Usuario sin teléfono, se omite envío WhatsApp', { userId });
      return null;
    }

    return phone;
  } catch (err) {
    logger.error('[WhatsAppEvents] Error inesperado obteniendo phone', { userId, err });
    return null;
  }
}

export async function notifyBidReceived(
  productId: string,
  sellerId: string,
  amount: number
): Promise<void> {
  try {
    const phone = await getUserPhone(sellerId);
    if (!phone) return;

    const message =
      `🛎️ *Nueva puja recibida*\n\n` +
      `Has recibido una nueva puja de Gs. ${amount.toLocaleString('es-PY')} en tu subasta.\n\n` +
      `Ver detalle: ${process.env.NEXT_PUBLIC_APP_URL || ''}/auctions/${productId}`;

    await sendTextMessage(phone, message);
  } catch (err) {
    logger.error('[WhatsAppEvents] Error en notifyBidReceived', { productId, sellerId, err });
  }
}

export async function notifyAuctionWon(
  productId: string,
  winnerId: string,
  amount: number
): Promise<void> {
  try {
    const phone = await getUserPhone(winnerId);
    if (!phone) return;

    const message =
      `🎉 *¡Has ganado una subasta!*\n\n` +
      `Ganaste la subasta con una puja de Gs. ${amount.toLocaleString('es-PY')}.\n\n` +
      `Completá tu compra en: ${process.env.NEXT_PUBLIC_APP_URL || ''}/auctions/${productId}`;

    await sendTextMessage(phone, message);
  } catch (err) {
    logger.error('[WhatsAppEvents] Error en notifyAuctionWon', { productId, winnerId, err });
  }
}

export async function notifyOrderCreated(orderId: string, buyerId: string): Promise<void> {
  try {
    const phone = await getUserPhone(buyerId);
    if (!phone) return;

    const message =
      `🧾 *Pedido recibido*\n\n` +
      `Tu pedido ha sido creado correctamente.\n\n` +
      `Podés ver el detalle en: ${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard/orders/${orderId}`;

    await sendTextMessage(phone, message);
  } catch (err) {
    logger.error('[WhatsAppEvents] Error en notifyOrderCreated', { orderId, buyerId, err });
  }
}

export async function notifyMembershipActivated(
  userId: string,
  planName: string
): Promise<void> {
  try {
    const phone = await getUserPhone(userId);
    if (!phone) return;

    const message =
      `⭐ *Membresía activada*\n\n` +
      `Tu membresía "${planName}" en Mercadito Online PY ya está activa.\n\n` +
      `Ya podés disfrutar de tus beneficios.`;

    await sendTextMessage(phone, message);
  } catch (err) {
    logger.error('[WhatsAppEvents] Error en notifyMembershipActivated', { userId, planName, err });
  }
}









