// src/lib/services/influencerService.ts
// Servicio para gestión de influencers

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';

export interface Influencer {
  id: string;
  influencer_name: string;
  influencer_code: string;
  social_media_platform: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  bio?: string | null;
  commission_percent: number;
  commission_type: 'gateway_fee_percent' | 'platform_revenue_percent' | 'fixed_per_sale';
  can_track_all_stores: boolean;
  assigned_stores?: string[] | null;
  min_sales_threshold: number;
  max_commission_per_month?: number | null;
  min_commission_per_order: number;
  max_commission_per_order?: number | null;
  total_clicks: number;
  total_visits: number;
  total_registrations: number;
  total_orders: number;
  total_revenue: number;
  total_commissions_earned: number;
  total_commissions_paid: number;
  referral_link?: string | null;
  qr_code_url?: string | null;
  payment_method?: string | null;
  payment_schedule: string;
  payment_threshold: number;
  is_active: boolean;
  is_verified: boolean;
  created_by?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InfluencerCommission {
  id: string;
  influencer_id: string;
  order_id: string;
  gateway_fee_id?: string | null;
  order_total: number;
  gateway_fee_amount: number;
  commission_percent: number;
  commission_amount: number;
  referral_source?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled' | 'refunded';
  paid_at?: string | null;
  payout_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInfluencerParams {
  influencer_name: string;
  influencer_code: string;
  social_media_platform: string;
  contact_email?: string;
  contact_phone?: string;
  bio?: string;
  commission_percent: number;
  commission_type?: 'gateway_fee_percent' | 'platform_revenue_percent' | 'fixed_per_sale';
  can_track_all_stores?: boolean;
  assigned_stores?: string[];
  min_sales_threshold?: number;
  max_commission_per_month?: number;
  min_commission_per_order?: number;
  max_commission_per_order?: number;
  payment_method?: string;
  payment_schedule?: string;
  payment_threshold?: number;
  notes?: string;
}

export interface UpdateInfluencerParams extends Partial<CreateInfluencerParams> {
  is_active?: boolean;
  is_verified?: boolean;
}

export interface InfluencerStats {
  influencer_id: string;
  total_clicks: number;
  total_visits: number;
  total_orders: number;
  total_revenue: number;
  total_commissions: number;
  pending_commissions: number;
  paid_commissions: number;
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Obtener todos los influencers
 */
export async function getInfluencers(filters?: {
  is_active?: boolean;
  platform?: string;
  search?: string;
}): Promise<Influencer[]> {
  try {
    let query = (supabase as any)
      .from('influencers')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters?.platform) {
      query = query.eq('social_media_platform', filters.platform);
    }

    if (filters?.search) {
      query = query.or(
        `influencer_name.ilike.%${filters.search}%,influencer_code.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []) as Influencer[];
  } catch (err) {
    logger.error('Error getting influencers', err);
    throw err;
  }
}

/**
 * Obtener influencer por ID
 */
export async function getInfluencerById(id: string): Promise<Influencer | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('influencers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data as Influencer;
  } catch (err) {
    logger.error('Error getting influencer by id', err);
    throw err;
  }
}

/**
 * Obtener influencer por código
 */
export async function getInfluencerByCode(code: string): Promise<Influencer | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('influencers')
      .select('*')
      .eq('influencer_code', code)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as Influencer;
  } catch (err) {
    logger.error('Error getting influencer by code', err);
    throw err;
  }
}

/**
 * Crear nuevo influencer
 */
export async function createInfluencer(params: CreateInfluencerParams): Promise<Influencer> {
  try {
    // Obtener usuario actual
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Usuario no autenticado');
    }

    // Generar referral link si no existe
    const referralLink = (params as any).referral_link || `/?influencer=${params.influencer_code}`;

    const { data, error } = await (supabase as any)
      .from('influencers')
      .insert({
        ...params,
        referral_link: referralLink,
        created_by: session.user.id,
        commission_type: params.commission_type || 'gateway_fee_percent',
        can_track_all_stores: params.can_track_all_stores ?? true,
        min_sales_threshold: params.min_sales_threshold ?? 0,
        payment_schedule: params.payment_schedule || 'monthly',
        payment_threshold: params.payment_threshold ?? 0,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Influencer created', { id: data.id, code: data.influencer_code });

    return data as Influencer;
  } catch (err) {
    logger.error('Error creating influencer', err);
    throw err;
  }
}

/**
 * Actualizar influencer
 */
export async function updateInfluencer(
  id: string,
  params: UpdateInfluencerParams
): Promise<Influencer> {
  try {
    const { data, error } = await (supabase as any)
      .from('influencers')
      .update({
        ...params,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    logger.info('Influencer updated', { id });

    return data as Influencer;
  } catch (err) {
    logger.error('Error updating influencer', err);
    throw err;
  }
}

/**
 * Eliminar influencer (soft delete)
 */
export async function deleteInfluencer(id: string): Promise<void> {
  try {
    const { error } = await (supabase as any)
      .from('influencers')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    logger.info('Influencer deleted', { id });
  } catch (err) {
    logger.error('Error deleting influencer', err);
    throw err;
  }
}

/**
 * Obtener comisiones de un influencer
 */
export async function getInfluencerCommissions(
  influencerId: string,
  filters?: {
    status?: string;
    start_date?: string;
    end_date?: string;
  }
): Promise<InfluencerCommission[]> {
  try {
    let query = (supabase as any)
      .from('influencer_commissions')
      .select('*')
      .eq('influencer_id', influencerId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.start_date) {
      query = query.gte('created_at', filters.start_date);
    }

    if (filters?.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []) as InfluencerCommission[];
  } catch (err) {
    logger.error('Error getting influencer commissions', err);
    throw err;
  }
}

/**
 * Obtener estadísticas de influencer
 */
export async function getInfluencerStats(
  influencerId: string,
  startDate?: string,
  endDate?: string
): Promise<InfluencerStats | null> {
  try {
    const { data, error } = await (supabase as any).rpc('get_influencer_stats', {
      p_influencer_id: influencerId,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) throw error;

    return data as InfluencerStats | null;
  } catch (err) {
    logger.error('Error getting influencer stats', err);
    throw err;
  }
}

/**
 * Trackear visita de influencer
 */
export async function trackInfluencerVisit(
  influencerCode: string,
  eventType: 'click' | 'visit' | 'registration' = 'visit'
): Promise<boolean> {
  try {
    const { data, error } = await (supabase as any).rpc('track_influencer_visit', {
      p_influencer_code: influencerCode,
      p_event_type: eventType,
    });

    if (error) throw error;

    return data === true;
  } catch (err) {
    logger.error('Error tracking influencer visit', err);
    return false;
  }
}

/**
 * Procesar pagos de comisiones (marcar como pagado)
 */
export async function markCommissionsAsPaid(
  commissionIds: string[],
  payoutId?: string
): Promise<void> {
  try {
    const { error } = await (supabase as any)
      .from('influencer_commissions')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payout_id: payoutId || null,
        updated_at: new Date().toISOString(),
      })
      .in('id', commissionIds);

    if (error) throw error;

    // Actualizar total_commissions_paid del influencer
    const { data: commissions } = await (supabase as any)
      .from('influencer_commissions')
      .select('influencer_id, commission_amount')
      .in('id', commissionIds);

    if (commissions && commissions.length > 0) {
      // Agrupar por influencer
      const influencerTotals = new Map<string, number>();
      
      for (const commission of commissions) {
        const influencerId = commission.influencer_id;
        const amount = parseFloat(commission.commission_amount || 0);
        influencerTotals.set(
          influencerId,
          (influencerTotals.get(influencerId) || 0) + amount
        );
      }

      // Actualizar cada influencer
      for (const [influencerId, total] of influencerTotals.entries()) {
        // Obtener valor actual
        const { data: current } = await (supabase as any)
          .from('influencers')
          .select('total_commissions_paid')
          .eq('id', influencerId)
          .single();

        const currentTotal = parseFloat(current?.total_commissions_paid || 0);
        
        // Actualizar sumando el total
        await (supabase as any)
          .from('influencers')
          .update({
            total_commissions_paid: currentTotal + total,
            updated_at: new Date().toISOString(),
          })
          .eq('id', influencerId);
      }
    }

    logger.info('Commissions marked as paid', { count: commissionIds.length });
  } catch (err) {
    logger.error('Error marking commissions as paid', err);
    throw err;
  }
}

/**
 * Obtener todas las comisiones pendientes agrupadas por influencer
 */
export async function getPendingCommissionsByInfluencer(): Promise<
  Array<{
    influencer_id: string;
    influencer_name: string;
    influencer_code: string;
    total_pending: number;
    commission_count: number;
  }>
> {
  try {
    // Obtener comisiones pendientes
    const { data: commissions, error: commissionsError } = await (supabase as any)
      .from('influencer_commissions')
      .select('influencer_id, commission_amount')
      .eq('status', 'pending');

    if (commissionsError) throw commissionsError;

    if (!commissions || commissions.length === 0) {
      return [];
    }

    // Obtener IDs únicos de influencers
    const influencerIds = [...new Set(commissions.map((c: any) => c.influencer_id))];

    // Obtener información de influencers
    const { data: influencers, error: influencersError } = await (supabase as any)
      .from('influencers')
      .select('id, influencer_name, influencer_code')
      .in('id', influencerIds);

    if (influencersError) throw influencersError;

    // Crear mapa de influencers
    const influencersMap = new Map();
    (influencers || []).forEach((inf: any) => {
      influencersMap.set(inf.id, inf);
    });

    // Agrupar por influencer
    const grouped = new Map<string, any>();

    for (const commission of commissions || []) {
      const influencerId = commission.influencer_id;
      const influencer = influencersMap.get(influencerId);

      if (!grouped.has(influencerId)) {
        grouped.set(influencerId, {
          influencer_id: influencerId,
          influencer_name: influencer?.influencer_name || 'Unknown',
          influencer_code: influencer?.influencer_code || '',
          total_pending: 0,
          commission_count: 0,
        });
      }

      const group = grouped.get(influencerId);
      group.total_pending += parseFloat(commission.commission_amount || 0);
      group.commission_count += 1;
    }

    return Array.from(grouped.values());
  } catch (err) {
    logger.error('Error getting pending commissions by influencer', err);
    throw err;
  }
}

