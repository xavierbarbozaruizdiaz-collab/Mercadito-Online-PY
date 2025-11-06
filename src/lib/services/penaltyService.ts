// ============================================
// MERCADITO ONLINE PY - PENALTY SERVICE
// Servicio para gestionar multas y penalizaciones
// ============================================

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';

export interface Penalty {
  id: string;
  auction_id: string;
  user_id: string;
  order_id: string | null;
  winning_bid_amount: number;
  penalty_percent: number;
  penalty_amount: number;
  status: 'pending' | 'paid' | 'waived' | 'cancelled';
  membership_cancelled: boolean;
  membership_level_before: string;
  membership_level_after: string;
  applied_at: string;
  paid_at: string | null;
  waived_at: string | null;
  waived_reason: string | null;
}

export interface PenaltySetting {
  id: string;
  penalty_percent: number;
  grace_period_hours: number;
  notification_hours_before: number[];
  auto_cancel_membership: boolean;
  membership_cancellation_delay_hours: number;
  is_active: boolean;
}

/**
 * Obtiene todas las multas con filtros opcionales
 */
export async function getPenalties(filters?: {
  status?: string;
  userId?: string;
  auctionId?: string;
}): Promise<Penalty[]> {
  try {
    let query = supabase
      .from('auction_penalties')
      .select('*')
      .order('applied_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.auctionId) {
      query = query.eq('auction_id', filters.auctionId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []) as Penalty[];
  } catch (err) {
    logger.error('Error getting penalties', err);
    throw err;
  }
}

/**
 * Obtiene una multa por ID
 */
export async function getPenaltyById(penaltyId: string): Promise<Penalty | null> {
  try {
    const { data, error } = await supabase
      .from('auction_penalties')
      .select('*')
      .eq('id', penaltyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as Penalty;
  } catch (err) {
    logger.error('Error getting penalty by id', err);
    throw err;
  }
}

/**
 * Obtiene la configuración activa de multas
 */
export async function getPenaltySettings(): Promise<PenaltySetting | null> {
  try {
    const { data, error } = await supabase
      .from('penalty_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;

    return data as PenaltySetting | null;
  } catch (err) {
    logger.error('Error getting penalty settings', err);
    throw err;
  }
}

/**
 * Actualiza la configuración de multas
 */
export async function updatePenaltySettings(
  settings: Partial<PenaltySetting>
): Promise<void> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user?.id) {
      throw new Error('No autenticado');
    }

    const updateData = {
      ...settings,
      updated_by: session.session.user.id,
      updated_at: new Date().toISOString(),
    };

    // Buscar configuración activa
    const { data: existing } = await supabase
      .from('penalty_settings')
      .select('id')
      .eq('is_active', true)
      .maybeSingle();

    if (existing) {
      // Actualizar existente
      const { error } = await (supabase as any)
        .from('penalty_settings')
        .update(updateData)
        .eq('id', (existing as any).id);

      if (error) throw error;
    } else {
      // Crear nuevo
      const { error } = await (supabase as any)
        .from('penalty_settings')
        .insert([{ ...updateData, is_active: true }]);

      if (error) throw error;
    }
  } catch (err) {
    logger.error('Error updating penalty settings', err);
    throw err;
  }
}

/**
 * Actualiza el estado de una multa
 */
export async function updatePenaltyStatus(
  penaltyId: string,
  status: Penalty['status'],
  reason?: string
): Promise<void> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user?.id) {
      throw new Error('No autenticado');
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString();
    } else if (status === 'waived') {
      updateData.waived_at = new Date().toISOString();
      updateData.waived_by = session.session.user.id;
      updateData.waived_reason = reason || 'Sin razón especificada';
    }

    const { error } = await (supabase as any)
      .from('auction_penalties')
      .update(updateData)
      .eq('id', penaltyId);

    if (error) throw error;
  } catch (err) {
    logger.error('Error updating penalty status', err);
    throw err;
  }
}

/**
 * Aplica multa manualmente a un usuario (solo admin)
 */
export async function applyPenaltyManually(
  auctionId: string,
  userId: string,
  penaltyPercent?: number
): Promise<string> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user?.id) {
      throw new Error('No autenticado');
    }

    const { data, error } = await (supabase as any).rpc('apply_penalty_to_user', {
      p_auction_id: auctionId,
      p_user_id: userId,
      p_penalty_percent: penaltyPercent || null,
      p_admin_id: session.session.user.id,
    });

    if (error) throw error;

    return data;
  } catch (err) {
    logger.error('Error applying penalty manually', err);
    throw err;
  }
}

/**
 * Cancela membresía por no-pago
 */
export async function cancelMembershipForNonPayment(
  userId: string,
  reason?: string
): Promise<boolean> {
  try {
    const { data, error } = await (supabase as any).rpc('cancel_membership_for_non_payment', {
      p_user_id: userId,
      p_reason: reason || 'No pago de subasta ganada',
    });

    if (error) throw error;

    return data;
  } catch (err) {
    logger.error('Error cancelling membership', err);
    throw err;
  }
}

