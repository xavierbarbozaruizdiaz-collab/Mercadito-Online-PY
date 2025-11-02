// ============================================
// MERCADITO ONLINE PY - DELIVERY SERVICE
// Gestión de entregas y confirmaciones
// ============================================

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';

export interface DeliveryPenalty {
  id: string;
  order_id: string;
  auction_id: string | null;
  seller_id: string;
  buyer_id: string;
  order_amount: number;
  penalty_percent: number;
  penalty_amount: number;
  status: 'pending' | 'paid' | 'waived' | 'cancelled' | 'refunded';
  reason: string;
  days_overdue: number;
  refund_issued: boolean;
  seller_restricted: boolean;
  applied_at: string;
}

export interface DeliverySettings {
  id: string;
  max_delivery_days: number;
  grace_period_hours: number;
  warning_hours_before: number;
  penalty_percent: number;
  auto_restrict_seller: boolean;
  restriction_after_penalties: number;
  auto_refund_buyer: boolean;
  refund_after_days: number;
}

/**
 * Confirma la recepción de un pedido por parte del comprador
 */
export async function confirmDelivery(orderId: string, buyerId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const { data, error } = await (supabase as any).rpc('confirm_delivery', {
      p_order_id: orderId,
      p_buyer_id: buyerId,
    });

    if (error) throw error;

    return {
      success: true,
      message: data.message || 'Entrega confirmada exitosamente',
    };
  } catch (err: any) {
    logger.error('Error confirming delivery', err);
    return {
      success: false,
      error: err.message || 'Error al confirmar entrega',
    };
  }
}

/**
 * Obtiene las multas de entrega de un vendedor
 */
export async function getSellerPenalties(sellerId: string): Promise<DeliveryPenalty[]> {
  try {
    const { data, error } = await supabase
      .from('seller_delivery_penalties')
      .select('*')
      .eq('seller_id', sellerId)
      .order('applied_at', { ascending: false });

    if (error) throw error;

    return (data || []) as DeliveryPenalty[];
  } catch (err) {
    logger.error('Error getting seller penalties', err);
    throw err;
  }
}

/**
 * Obtiene las configuraciones de entrega
 */
export async function getDeliverySettings(): Promise<DeliverySettings | null> {
  try {
    const { data, error } = await supabase
      .from('seller_delivery_settings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as DeliverySettings | null;
  } catch (err) {
    logger.error('Error getting delivery settings', err);
    throw err;
  }
}

/**
 * Obtiene órdenes pendientes de entrega para un vendedor
 */
export async function getPendingDeliveries(sellerId: string): Promise<any[]> {
  try {
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select(`
        id,
        buyer_id,
        total_amount,
        delivery_status,
        delivery_deadline,
        expected_delivery_date,
        created_at,
        is_auction_order,
        auction_id,
        buyer:profiles!orders_buyer_id_fkey(id, email, first_name, last_name)
      `)
      .eq('status', 'paid')
      .in('delivery_status', ['pending', 'confirmed', 'in_transit'])
      .gte('delivery_deadline', new Date().toISOString()) // Aún no vencido
      .eq('is_auction_order', true)
      .order('delivery_deadline', { ascending: true });

    // Filtrar por seller_id a través de order_items
    const { data: orderItems } = await (supabase as any)
      .from('order_items')
      .select('order_id')
      .eq('seller_id', sellerId);

    const orderIds = (orderItems || []).map((oi: any) => oi.order_id);
    
    if (orderIds.length === 0) return [];

    const filteredData = (ordersData || []).filter((order: any) => orderIds.includes(order.id));

    return filteredData;
  } catch (err) {
    logger.error('Error getting pending deliveries', err);
    throw err;
  }
}

/**
 * Actualiza información de envío (tracking, transportista)
 */
export async function updateShippingInfo(
  orderId: string,
  sellerId: string,
  trackingNumber: string,
  carrier: string
): Promise<void> {
  try {
    // Verificar que el vendedor es dueño de esta orden
    const { data: orderItem } = await supabase
      .from('order_items')
      .select('seller_id')
      .eq('order_id', orderId)
      .eq('seller_id', sellerId)
      .single();

    if (!orderItem) {
      throw new Error('No tienes permisos para actualizar esta orden');
    }

    const { error } = await (supabase as any)
      .from('orders')
      .update({
        shipping_tracking_number: trackingNumber,
        shipping_carrier: carrier,
        delivery_status: 'in_transit',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) throw error;
  } catch (err) {
    logger.error('Error updating shipping info', err);
    throw err;
  }
}


