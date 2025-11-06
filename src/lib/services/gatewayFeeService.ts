// src/lib/services/gatewayFeeService.ts
// Servicio para gestión de comisiones de pasarela de pago

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';

export interface PaymentGatewaySetting {
  id: string;
  gateway_provider: string;
  gateway_name: string;
  fee_percent: number;
  fixed_fee: number;
  is_active: boolean;
  is_default: boolean;
  updated_by?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentGatewayFee {
  id: string;
  order_id: string;
  order_total: number;
  gateway_provider: string;
  gateway_fee_percent: number;
  gateway_fee_amount: number;
  gateway_transaction_id?: string | null;
  gateway_response?: any | null;
  is_refunded: boolean;
  charged_at: string;
  refunded_at?: string | null;
  created_at: string;
}

export interface CreateGatewaySettingParams {
  gateway_provider: string;
  gateway_name: string;
  fee_percent: number;
  fixed_fee?: number;
  is_active?: boolean;
  is_default?: boolean;
  notes?: string;
}

export interface UpdateGatewaySettingParams extends Partial<CreateGatewaySettingParams> {
  is_active?: boolean;
  is_default?: boolean;
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Obtener todas las configuraciones de pasarelas
 */
export async function getGatewaySettings(filters?: {
  is_active?: boolean;
}): Promise<PaymentGatewaySetting[]> {
  try {
    let query = (supabase as any)
      .from('payment_gateway_settings')
      .select('*')
      .order('gateway_provider', { ascending: true });

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []) as PaymentGatewaySetting[];
  } catch (err) {
    logger.error('Error getting gateway settings', err);
    throw err;
  }
}

/**
 * Obtener configuración de pasarela por provider
 */
export async function getGatewaySettingByProvider(
  provider: string
): Promise<PaymentGatewaySetting | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('payment_gateway_settings')
      .select('*')
      .eq('gateway_provider', provider)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as PaymentGatewaySetting;
  } catch (err) {
    logger.error('Error getting gateway setting by provider', err);
    throw err;
  }
}

/**
 * Obtener pasarela por defecto
 */
export async function getDefaultGatewaySetting(): Promise<PaymentGatewaySetting | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('payment_gateway_settings')
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as PaymentGatewaySetting;
  } catch (err) {
    logger.error('Error getting default gateway setting', err);
    throw null;
  }
}

/**
 * Crear o actualizar configuración de pasarela
 */
export async function upsertGatewaySetting(
  params: CreateGatewaySettingParams
): Promise<PaymentGatewaySetting> {
  try {
    // Obtener usuario actual
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Usuario no autenticado');
    }

    // Si se marca como default, desmarcar otros
    if (params.is_default) {
      await (supabase as any)
        .from('payment_gateway_settings')
        .update({ is_default: false })
        .neq('gateway_provider', params.gateway_provider);
    }

    const { data, error } = await (supabase as any)
      .from('payment_gateway_settings')
      .upsert(
        {
          ...params,
          updated_by: session.user.id,
          fixed_fee: params.fixed_fee || 0,
          is_active: params.is_active ?? true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'gateway_provider',
        }
      )
      .select()
      .single();

    if (error) throw error;

    logger.info('Gateway setting upserted', { provider: params.gateway_provider });

    return data as PaymentGatewaySetting;
  } catch (err) {
    logger.error('Error upserting gateway setting', err);
    throw err;
  }
}

/**
 * Actualizar configuración de pasarela
 */
export async function updateGatewaySetting(
  id: string,
  params: UpdateGatewaySettingParams
): Promise<PaymentGatewaySetting> {
  try {
    // Obtener usuario actual
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Usuario no autenticado');
    }

    // Si se marca como default, desmarcar otros
    if (params.is_default) {
      const { data: current } = await (supabase as any)
        .from('payment_gateway_settings')
        .select('gateway_provider')
        .eq('id', id)
        .single();

      if (current) {
        await (supabase as any)
          .from('payment_gateway_settings')
          .update({ is_default: false })
          .neq('gateway_provider', current.gateway_provider);
      }
    }

    const { data, error } = await (supabase as any)
      .from('payment_gateway_settings')
      .update({
        ...params,
        updated_by: session.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    logger.info('Gateway setting updated', { id });

    return data as PaymentGatewaySetting;
  } catch (err) {
    logger.error('Error updating gateway setting', err);
    throw err;
  }
}

/**
 * Calcular gateway fee para una orden
 */
export async function calculateGatewayFee(
  orderId: string,
  gatewayProvider?: string
): Promise<number> {
  try {
    const { data, error } = await (supabase as any).rpc('calculate_gateway_fee', {
      p_order_id: orderId,
      p_gateway_provider: gatewayProvider || null,
    });

    if (error) throw error;

    return parseFloat(data || 0);
  } catch (err) {
    logger.error('Error calculating gateway fee', err);
    throw err;
  }
}

/**
 * Obtener gateway fees de una orden
 */
export async function getGatewayFeesByOrder(orderId: string): Promise<PaymentGatewayFee[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('payment_gateway_fees')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []) as PaymentGatewayFee[];
  } catch (err) {
    logger.error('Error getting gateway fees by order', err);
    throw err;
  }
}

/**
 * Obtener estadísticas de gateway fees
 */
export async function getGatewayFeeStats(filters?: {
  start_date?: string;
  end_date?: string;
  gateway_provider?: string;
}): Promise<{
  total_fees: number;
  total_orders: number;
  average_fee_per_order: number;
  fees_by_provider: Record<string, number>;
}> {
  try {
    let query = (supabase as any)
      .from('payment_gateway_fees')
      .select('gateway_fee_amount, gateway_provider, order_id')
      .eq('is_refunded', false);

    if (filters?.start_date) {
      query = query.gte('charged_at', filters.start_date);
    }

    if (filters?.end_date) {
      query = query.lte('charged_at', filters.end_date);
    }

    if (filters?.gateway_provider) {
      query = query.eq('gateway_provider', filters.gateway_provider);
    }

    const { data, error } = await query;

    if (error) throw error;

    const fees = (data || []) as PaymentGatewayFee[];
    const totalFees = fees.reduce((sum, f) => sum + parseFloat(f.gateway_fee_amount?.toString() || '0'), 0);
    const uniqueOrders = new Set(fees.map((f) => f.order_id));
    const feesByProvider: Record<string, number> = {};

    for (const fee of fees) {
      const provider = fee.gateway_provider || 'unknown';
      feesByProvider[provider] = (feesByProvider[provider] || 0) + parseFloat(fee.gateway_fee_amount?.toString() || '0');
    }

    return {
      total_fees: totalFees,
      total_orders: uniqueOrders.size,
      average_fee_per_order: uniqueOrders.size > 0 ? totalFees / uniqueOrders.size : 0,
      fees_by_provider: feesByProvider,
    };
  } catch (err) {
    logger.error('Error getting gateway fee stats', err);
    throw err;
  }
}






