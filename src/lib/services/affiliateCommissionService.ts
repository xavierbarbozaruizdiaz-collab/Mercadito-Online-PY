// ============================================
// MERCADITO ONLINE PY - AFFILIATE COMMISSION SERVICE
// Servicio para gestión de comisiones de afiliados
// ============================================

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';

// ============================================
// TIPOS
// ============================================

export interface AffiliateCommission {
  id: string;
  platform_fee_id: string;
  order_id: string;
  order_item_id: string;
  product_id: string;
  affiliate_id: string;
  base_amount: number;
  commission_amount: number;
  commission_percent: number;
  status: 'pending' | 'available' | 'paid';
  created_at: string;
  // Relaciones
  product?: {
    id: string;
    title: string;
    cover_url: string | null;
  };
  order?: {
    id: string;
    order_number: string | null;
    created_at: string;
  };
}

export interface AffiliateCommissionSummary {
  pending_balance: number;
  available_balance: number;
  total_earnings: number;
  commissions_this_month: number;
  next_payment_date: string | null;
  next_payment_amount: number;
}

// ============================================
// FUNCIONES
// ============================================

/**
 * Obtiene todas las comisiones de un afiliado
 */
export async function getAffiliateCommissions(
  affiliateId: string,
  options: {
    status?: 'pending' | 'available' | 'paid';
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<{ commissions: AffiliateCommission[]; total: number }> {
  try {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    // Obtener platform_fees asociados al afiliado
    let query = (supabase as any)
      .from('platform_fees')
      .select(`
        id,
        order_id,
        order_item_id,
        base_amount,
        affiliate_commission as commission_amount,
        commission_percent,
        status,
        payment_status,
        created_at,
        product:products!order_items_product_id_fkey(id, title, cover_url),
        order:orders(id, created_at)
      `, { count: 'exact' })
      .eq('affiliate_id', affiliateId)
      .not('affiliate_commission', 'is', null);

    if (options.status) {
      if (options.status === 'pending') {
        query = query.eq('payment_status', 'escrowed');
      } else if (options.status === 'available') {
        query = query.eq('payment_status', 'released');
      } else if (options.status === 'paid') {
        query = query.eq('status', 'paid');
      }
    }

    if (options.startDate) {
      query = query.gte('created_at', options.startDate);
    }

    if (options.endDate) {
      query = query.lte('created_at', options.endDate);
    }

    query = query.order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Mapear a AffiliateCommission
    const commissions: AffiliateCommission[] = (data || []).map((fee: any) => ({
      id: fee.id,
      platform_fee_id: fee.id,
      order_id: fee.order_id,
      order_item_id: fee.order_item_id,
      product_id: fee.product?.id || '',
      affiliate_id: affiliateId,
      base_amount: fee.base_amount || 0,
      commission_amount: fee.affiliate_commission || 0,
      commission_percent: fee.commission_percent || 0,
      status: fee.status === 'paid' ? 'paid' : fee.payment_status === 'released' ? 'available' : 'pending',
      created_at: fee.created_at,
      product: fee.product,
      order: fee.order,
    }));

    return {
      commissions,
      total: count || 0,
    };
  } catch (err: any) {
    logger.error('Error obteniendo comisiones del afiliado', err, { affiliateId, options });
    throw new Error(err.message || 'Error al obtener comisiones');
  }
}

/**
 * Obtiene resumen de comisiones del afiliado
 */
export async function getAffiliateCommissionSummary(
  affiliateId: string
): Promise<AffiliateCommissionSummary> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      throw new Error('Usuario no autenticado');
    }

    // Obtener balance del vendedor
    const { data: balanceData, error: balanceError } = await (supabase as any)
      .from('seller_balance')
      .select('pending_balance, available_balance, total_earnings')
      .eq('seller_id', session.session.user.id)
      .maybeSingle();

    if (balanceError && balanceError.code !== 'PGRST116') {
      throw balanceError;
    }

    const pendingBalance = balanceData?.pending_balance || 0;
    const availableBalance = balanceData?.available_balance || 0;
    const totalEarnings = balanceData?.total_earnings || 0;

    // Obtener comisiones de este mes
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: monthData, error: monthError } = await (supabase as any)
      .from('platform_fees')
      .select('affiliate_commission')
      .eq('affiliate_id', affiliateId)
      .gte('created_at', startOfMonth.toISOString())
      .not('affiliate_commission', 'is', null);

    if (monthError) {
      logger.warn('Error obteniendo comisiones del mes', monthError);
    }

    const commissionsThisMonth = (monthData || []).reduce(
      (sum: number, fee: any) => sum + (fee.affiliate_commission || 0),
      0
    );

    // Obtener información del afiliado para payment_schedule
    const { data: affiliateData } = await (supabase as any)
      .from('store_affiliates')
      .select('payment_schedule')
      .eq('id', affiliateId)
      .single();

    // Calcular próxima fecha de pago (estimada)
    let nextPaymentDate: string | null = null;
    let nextPaymentAmount = availableBalance;

    if (affiliateData?.payment_schedule) {
      const now = new Date();
      const nextPayment = new Date(now);

      if (affiliateData.payment_schedule === 'weekly') {
        // Próximo lunes
        const daysUntilMonday = (1 - now.getDay() + 7) % 7 || 7;
        nextPayment.setDate(now.getDate() + daysUntilMonday);
      } else if (affiliateData.payment_schedule === 'biweekly') {
        // Próximo lunes en 2 semanas
        const daysUntilMonday = (1 - now.getDay() + 7) % 7 || 7;
        nextPayment.setDate(now.getDate() + daysUntilMonday + 14);
      } else if (affiliateData.payment_schedule === 'monthly') {
        // Primer día del próximo mes
        nextPayment.setMonth(now.getMonth() + 1, 1);
      }

      nextPayment.setHours(0, 0, 0, 0);
      nextPaymentDate = nextPayment.toISOString();
    }

    return {
      pending_balance: pendingBalance,
      available_balance: availableBalance,
      total_earnings: totalEarnings,
      commissions_this_month: commissionsThisMonth,
      next_payment_date: nextPaymentDate,
      next_payment_amount: nextPaymentAmount,
    };
  } catch (err: any) {
    logger.error('Error obteniendo resumen de comisiones', err, { affiliateId });
    throw new Error(err.message || 'Error al obtener resumen');
  }
}

/**
 * Obtiene detalle de una comisión específica
 */
export async function getCommissionDetail(commissionId: string): Promise<AffiliateCommission | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('platform_fees')
      .select(`
        id,
        order_id,
        order_item_id,
        base_amount,
        affiliate_commission as commission_amount,
        commission_percent,
        status,
        payment_status,
        created_at,
        affiliate_id,
        product:products!order_items_product_id_fkey(id, title, cover_url),
        order:orders(id, created_at)
      `)
      .eq('id', commissionId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      platform_fee_id: data.id,
      order_id: data.order_id,
      order_item_id: data.order_item_id,
      product_id: data.product?.id || '',
      affiliate_id: data.affiliate_id,
      base_amount: data.base_amount || 0,
      commission_amount: data.affiliate_commission || 0,
      commission_percent: data.commission_percent || 0,
      status: data.status === 'paid' ? 'paid' : data.payment_status === 'released' ? 'available' : 'pending',
      created_at: data.created_at,
      product: data.product,
      order: data.order,
    };
  } catch (err: any) {
    logger.error('Error obteniendo detalle de comisión', err, { commissionId });
    throw new Error(err.message || 'Error al obtener detalle');
  }
}






