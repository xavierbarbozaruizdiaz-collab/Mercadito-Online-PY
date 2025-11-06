// ============================================
// MERCADITO ONLINE PY - AFFILIATE SERVICE
// Servicio para gestión de vendedores afiliados
// ============================================

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';

// ============================================
// TIPOS
// ============================================

export interface StoreAffiliate {
  id: string;
  store_id: string;
  affiliate_seller_id: string;
  affiliate_code: string;
  display_name: string | null;
  commission_percent: number;
  min_commission: number;
  max_commission: number | null;
  commission_tiers: Array<{ min_sales: number; percent: number }>;
  can_sell_all_products: boolean;
  product_category_limit: string[] | null;
  payment_schedule: 'weekly' | 'biweekly' | 'monthly';
  payment_threshold: number;
  payment_method_preference: string | null;
  status: 'pending' | 'active' | 'suspended' | 'terminated';
  contract_start_date: string | null;
  contract_end_date: string | null;
  terms_accepted_at: string | null;
  terms_version: string | null;
  max_products: number | null;
  max_monthly_sales: number | null;
  referral_link: string | null;
  total_sales_count: number;
  total_sales_amount: number;
  total_commissions_earned: number;
  invited_by: string | null;
  invited_at: string | null;
  activated_by: string | null;
  activated_at: string | null;
  suspended_by: string | null;
  suspended_at: string | null;
  termination_reason: string | null;
  created_at: string;
  updated_at: string;
  // Relaciones
  store?: {
    id: string;
    name: string;
    slug: string;
  };
  affiliate_seller?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
}

export interface AffiliateProductAssignment {
  id: string;
  product_id: string;
  affiliate_id: string;
  custom_commission_percent: number | null;
  status: 'active' | 'paused' | 'ended';
  assigned_at: string;
  assigned_by: string | null;
  ended_at: string | null;
  ended_by: string | null;
  sales_count: number;
  total_revenue: number;
  product?: {
    id: string;
    title: string;
    price: number;
    cover_url: string | null;
  };
}

export interface AffiliatePerformance {
  id: string;
  affiliate_id: string;
  period_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  period_start: string;
  period_end: string;
  total_sales: number;
  total_revenue: number;
  total_commissions: number;
  average_order_value: number | null;
  conversion_rate: number | null;
  rank_in_store: number | null;
  rank_percentile: number | null;
  created_at: string;
  updated_at: string;
}

export interface InviteAffiliateParams {
  store_id: string;
  seller_email: string;
  commission_percent: number;
  can_sell_all_products?: boolean;
  category_limit?: string[];
  commission_tiers?: Array<{ min_sales: number; percent: number }>;
}

// ============================================
// FUNCIONES
// ============================================

/**
 * Invita un afiliado a una tienda
 */
export async function inviteAffiliate(params: InviteAffiliateParams): Promise<StoreAffiliate> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await (supabase as any).rpc('invite_affiliate', {
      p_store_id: params.store_id,
      p_seller_email: params.seller_email,
      p_commission_percent: params.commission_percent,
      p_invited_by: session.session.user.id,
      p_can_sell_all: params.can_sell_all_products || false,
      p_category_limit: params.category_limit || null,
      p_commission_tiers: params.commission_tiers ? JSON.stringify(params.commission_tiers) : '[]',
    });

    if (error) throw error;

    // Obtener el afiliado creado
    return await getAffiliateById(data);
  } catch (err: any) {
    logger.error('Error invitando afiliado', err, { params });
    throw new Error(err.message || 'Error al invitar afiliado');
  }
}

/**
 * Activa un afiliado
 */
export async function activateAffiliate(affiliateId: string): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await (supabase as any).rpc('activate_affiliate', {
      p_affiliate_id: affiliateId,
      p_activated_by: session.session.user.id,
    });

    if (error) throw error;
    return data === true;
  } catch (err: any) {
    logger.error('Error activando afiliado', err, { affiliateId });
    throw new Error(err.message || 'Error al activar afiliado');
  }
}

/**
 * Obtiene un afiliado por ID
 */
export async function getAffiliateById(affiliateId: string): Promise<StoreAffiliate> {
  const { data, error } = await (supabase as any)
    .from('store_affiliates')
    .select(`
      *,
      store:stores(id, name, slug),
      affiliate_seller:profiles!store_affiliates_affiliate_seller_id_fkey(id, email, first_name, last_name)
    `)
    .eq('id', affiliateId)
    .single();

  if (error) {
    logger.error('Error obteniendo afiliado', error, { affiliateId });
    throw new Error('Error al obtener afiliado');
  }

  // Parsear commission_tiers
  const affiliate = data as StoreAffiliate;
  if (typeof affiliate.commission_tiers === 'string') {
    affiliate.commission_tiers = JSON.parse(affiliate.commission_tiers);
  }

  return affiliate;
}

/**
 * Obtiene todos los afiliados de una tienda
 */
export async function getStoreAffiliates(
  storeId: string,
  options: {
    status?: 'pending' | 'active' | 'suspended' | 'terminated';
    page?: number;
    limit?: number;
  } = {}
): Promise<{ affiliates: StoreAffiliate[]; total: number }> {
  try {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    let query = (supabase as any)
      .from('store_affiliates')
      .select(`
        *,
        store:stores(id, name, slug),
        affiliate_seller:profiles!store_affiliates_affiliate_seller_id_fkey(id, email, first_name, last_name)
      `, { count: 'exact' })
      .eq('store_id', storeId);

    if (options.status) {
      query = query.eq('status', options.status);
    }

    query = query.order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Parsear commission_tiers
    const affiliates = (data || []).map((affiliate: StoreAffiliate) => {
      if (typeof affiliate.commission_tiers === 'string') {
        affiliate.commission_tiers = JSON.parse(affiliate.commission_tiers);
      }
      return affiliate;
    });

    return {
      affiliates,
      total: count || 0,
    };
  } catch (err: any) {
    logger.error('Error obteniendo afiliados', err, { storeId, options });
    throw new Error(err.message || 'Error al obtener afiliados');
  }
}

/**
 * Obtiene el afiliado del usuario actual (si existe)
 */
export async function getCurrentUserAffiliate(): Promise<StoreAffiliate | null> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      return null;
    }

    const { data, error } = await (supabase as any)
      .from('store_affiliates')
      .select(`
        *,
        store:stores(id, name, slug),
        affiliate_seller:profiles!store_affiliates_affiliate_seller_id_fkey(id, email, first_name, last_name)
      `)
      .eq('affiliate_seller_id', session.session.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Parsear commission_tiers
    if (typeof data.commission_tiers === 'string') {
      data.commission_tiers = JSON.parse(data.commission_tiers);
    }

    return data as StoreAffiliate;
  } catch (err: any) {
    logger.error('Error obteniendo afiliado del usuario', err);
    return null;
  }
}

/**
 * Asigna un producto a un afiliado
 */
export async function assignProductToAffiliate(
  productId: string,
  affiliateId: string,
  customCommission?: number
): Promise<string> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await (supabase as any).rpc('assign_product_to_affiliate', {
      p_product_id: productId,
      p_affiliate_id: affiliateId,
      p_assigned_by: session.session.user.id,
      p_custom_commission: customCommission || null,
    });

    if (error) throw error;
    return data;
  } catch (err: any) {
    logger.error('Error asignando producto a afiliado', err, { productId, affiliateId });
    throw new Error(err.message || 'Error al asignar producto');
  }
}

/**
 * Obtiene productos asignados a un afiliado
 */
export async function getAffiliateProducts(
  affiliateId: string,
  options: {
    status?: 'active' | 'paused' | 'ended';
    page?: number;
    limit?: number;
  } = {}
): Promise<{ assignments: AffiliateProductAssignment[]; total: number }> {
  try {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    let query = (supabase as any)
      .from('affiliate_product_assignments')
      .select(`
        *,
        product:products(id, title, price, cover_url)
      `, { count: 'exact' })
      .eq('affiliate_id', affiliateId);

    if (options.status) {
      query = query.eq('status', options.status);
    }

    query = query.order('assigned_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      assignments: data || [],
      total: count || 0,
    };
  } catch (err: any) {
    logger.error('Error obteniendo productos del afiliado', err, { affiliateId, options });
    throw new Error(err.message || 'Error al obtener productos');
  }
}

/**
 * Suspende un afiliado
 */
export async function suspendAffiliate(
  affiliateId: string,
  reason?: string
): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      throw new Error('Usuario no autenticado');
    }

    const { error } = await (supabase as any)
      .from('store_affiliates')
      .update({
        status: 'suspended',
        suspended_by: session.session.user.id,
        suspended_at: new Date().toISOString(),
        termination_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', affiliateId);

    if (error) throw error;
    return true;
  } catch (err: any) {
    logger.error('Error suspendiendo afiliado', err, { affiliateId, reason });
    throw new Error(err.message || 'Error al suspender afiliado');
  }
}

/**
 * Actualiza comisión de un afiliado
 */
export async function updateAffiliateCommission(
  affiliateId: string,
  commissionPercent: number,
  commissionTiers?: Array<{ min_sales: number; percent: number }>
): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      throw new Error('Usuario no autenticado');
    }

    const updateData: any = {
      commission_percent: commissionPercent,
      updated_at: new Date().toISOString(),
    };

    if (commissionTiers) {
      updateData.commission_tiers = JSON.stringify(commissionTiers);
    }

    const { error } = await (supabase as any)
      .from('store_affiliates')
      .update(updateData)
      .eq('id', affiliateId);

    if (error) throw error;
    return true;
  } catch (err: any) {
    logger.error('Error actualizando comisión del afiliado', err, { affiliateId });
    throw new Error(err.message || 'Error al actualizar comisión');
  }
}

/**
 * Busca afiliado por código
 */
export async function getAffiliateByCode(code: string): Promise<StoreAffiliate | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('store_affiliates')
      .select(`
        *,
        store:stores(id, name, slug),
        affiliate_seller:profiles!store_affiliates_affiliate_seller_id_fkey(id, email, first_name, last_name)
      `)
      .eq('affiliate_code', code)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Parsear commission_tiers
    if (typeof data.commission_tiers === 'string') {
      data.commission_tiers = JSON.parse(data.commission_tiers);
    }

    return data as StoreAffiliate;
  } catch (err: any) {
    logger.error('Error obteniendo afiliado por código', err, { code });
    return null;
  }
}

