// ============================================
// MERCADITO ONLINE PY - MEMBERSHIP SERVICE
// Gestión de planes y suscripciones de membresía
// ============================================

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';

export interface MembershipPlan {
  id: string;
  level: 'bronze' | 'silver' | 'gold';
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  price_one_time: number | null;
  duration_days: number;
  bid_limit: number | null;
  bid_limit_formatted: string | null;
  features: string[];
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
}

export interface MembershipSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled' | 'failed';
  subscription_type: 'monthly' | 'yearly' | 'one_time';
  starts_at: string;
  expires_at: string;
  auto_renew: boolean;
  amount_paid: number;
  payment_method: string | null;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
}

export interface UserBidLimit {
  can_bid: boolean;
  membership_level: string;
  bid_limit: number | null;
  bid_limit_formatted: string;
  membership_expires_at: string | null;
  subscription_expires_at?: string | null;
  plan_name?: string;
  membership_expired?: boolean;
  message?: string;
}

/**
 * Obtiene todos los planes de membresía activos
 */
export async function getMembershipPlans(): Promise<MembershipPlan[]> {
  try {
    const { data, error } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return (data || []).map((plan: any) => ({
      ...plan,
      features: plan.features || [],
    })) as MembershipPlan[];
  } catch (err) {
    logger.error('Error getting membership plans', err);
    throw err;
  }
}

/**
 * Obtiene un plan por ID
 */
export async function getMembershipPlanById(planId: string): Promise<MembershipPlan | null> {
  try {
    const { data, error } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    if (!data) return null;

    return {
      ...(data as any),
      features: (data as any).features || [],
    } as MembershipPlan;
  } catch (err) {
    logger.error('Error getting membership plan by id', err);
    throw err;
  }
}

/**
 * Obtiene el límite de puja del usuario actual
 */
export async function getUserBidLimit(userId: string): Promise<UserBidLimit> {
  try {
    const { data, error } = await (supabase as any).rpc('get_user_bid_limit', {
      p_user_id: userId,
    });

    if (error) throw error;

    return data as UserBidLimit;
  } catch (err) {
    logger.error('Error getting user bid limit', err);
    throw err;
  }
}

/**
 * Crea una suscripción pendiente que requiere aprobación del admin
 */
export async function createPendingMembershipSubscription(
  userId: string,
  planId: string,
  subscriptionType: 'monthly' | 'yearly' | 'one_time',
  amountPaid: number,
  paymentMethod: string,
  paymentReference?: string
): Promise<string> {
  try {
    // Obtener información del plan para calcular fechas
    const plan = await getMembershipPlanById(planId);
    if (!plan) {
      throw new Error('Plan de membresía no encontrado');
    }

    // Calcular fechas según el tipo de suscripción
    const now = new Date();
    let expiresAt: Date;
    
    if (subscriptionType === 'one_time') {
      expiresAt = new Date(now.getTime() + (plan.duration_days * 24 * 60 * 60 * 1000));
    } else if (subscriptionType === 'monthly') {
      expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else { // yearly
      expiresAt = new Date(now);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // Crear suscripción con status 'pending'
    const { data, error } = await supabase
      .from('membership_subscriptions')
      .insert({
        user_id: userId,
        plan_id: planId,
        status: 'pending', // Pendiente de aprobación
        subscription_type: subscriptionType,
        starts_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        auto_renew: subscriptionType !== 'one_time',
        amount_paid: amountPaid,
        payment_method: paymentMethod,
        payment_status: 'completed', // El pago está completo, pero la membresía está pendiente
        payment_reference: paymentReference || null,
      })
      .select('id')
      .single();

    if (error) throw error;

    logger.info('Suscripción pendiente creada', {
      subscriptionId: data.id,
      userId,
      planId,
      subscriptionType,
      amountPaid,
    });

    return data.id;
  } catch (err) {
    logger.error('Error creating pending membership subscription', err);
    throw err;
  }
}

/**
 * Activa una suscripción tras pago exitoso
 * NOTA: Esta función solo debe usarse para activaciones automáticas o desde el admin
 */
export async function activateMembershipSubscription(
  userId: string,
  planId: string,
  subscriptionType: 'monthly' | 'yearly' | 'one_time',
  amountPaid: number,
  paymentMethod: string,
  paymentReference?: string
): Promise<string> {
  try {
    const { data, error } = await (supabase as any).rpc('activate_membership_subscription', {
      p_user_id: userId,
      p_plan_id: planId,
      p_subscription_type: subscriptionType,
      p_amount_paid: amountPaid,
      p_payment_method: paymentMethod,
      p_payment_reference: paymentReference || null,
    });

    if (error) throw error;

    return data;
  } catch (err) {
    logger.error('Error activating membership subscription', err);
    throw err;
  }
}

/**
 * Obtiene las suscripciones activas de un usuario
 */
export async function getUserSubscriptions(userId: string): Promise<MembershipSubscription[]> {
  try {
    const { data, error } = await supabase
      .from('membership_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []) as MembershipSubscription[];
  } catch (err) {
    logger.error('Error getting user subscriptions', err);
    throw err;
  }
}

/**
 * Obtiene la suscripción activa actual de un usuario
 */
export async function getActiveSubscription(userId: string): Promise<MembershipSubscription | null> {
  try {
    const { data, error } = await supabase
      .from('membership_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as MembershipSubscription | null;
  } catch (err) {
    logger.error('Error getting active subscription', err);
    throw err;
  }
}

/**
 * Cancela una suscripción (solo para renovaciones automáticas)
 */
export async function cancelSubscription(
  subscriptionId: string,
  userId: string,
  reason?: string
): Promise<void> {
  try {
    const { error } = await (supabase as any)
      .from('membership_subscriptions')
      .update({
        auto_renew: false,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || 'Cancelado por usuario',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (err) {
    logger.error('Error cancelling subscription', err);
    throw err;
  }
}

// ============================================
// LÍMITES DE PUBLICACIÓN
// ============================================

export interface PublicationLimits {
  can_publish: boolean;
  is_store_owner: boolean;
  membership_level: string;
  membership_expires_at: string | null;
  max_products: number | null;
  current_products: number;
  can_publish_more: boolean;
  products_remaining: number | null;
  max_price_base: number | null;
  message: string;
  requires_upgrade: boolean;
  suggested_plan_level: string | null;
  suggested_plan_name: string | null;
}

export interface CanPublishResult {
  can_publish: boolean;
  reason: string;
  suggested_plan_level: string | null;
  suggested_plan_name: string | null;
  current_products: number;
  max_products: number | null;
  can_publish_more_products: boolean;
  price_exceeds_limit: boolean;
  max_price_base: number | null;
}

/**
 * Obtiene los límites de publicación del usuario actual
 */
export async function getUserPublicationLimits(userId: string): Promise<PublicationLimits> {
  try {
    const { data, error } = await (supabase as any).rpc('get_user_publication_limits', {
      p_user_id: userId,
    });

    if (error) throw error;

    return data as PublicationLimits;
  } catch (err) {
    logger.error('Error getting user publication limits', err);
    throw err;
  }
}

/**
 * Verifica si el usuario puede publicar un producto específico
 */
export async function checkCanPublishProduct(
  userId: string,
  priceBase: number
): Promise<CanPublishResult> {
  try {
    const { data, error } = await (supabase as any).rpc('check_can_publish_product', {
      p_user_id: userId,
      p_price_base: priceBase,
    });

    if (error) throw error;

    return data as CanPublishResult;
  } catch (err) {
    logger.error('Error checking if can publish product', err);
    throw err;
  }
}

