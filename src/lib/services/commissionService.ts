// ============================================
// MERCADITO ONLINE PY - COMMISSION SERVICE
// Servicio para gestión de comisiones
// ============================================

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';

// ============================================
// TIPOS
// ============================================

export interface CommissionSettings {
  id: string;
  scope_type: 'global' | 'store' | 'seller' | 'category' | 'auction_buyer' | 'auction_seller';
  store_id?: string;
  seller_id?: string;
  category_id?: string;
  direct_sale_commission_percent?: number;
  auction_buyer_commission_percent?: number;
  auction_seller_commission_percent?: number;
  applies_to: 'direct_only' | 'auction_only' | 'both';
  is_active: boolean;
  effective_from: string;
  effective_until?: string;
  notes?: string;
}

export interface AuctionCommissions {
  buyer_commission_percent: number;
  seller_commission_percent: number;
}

export interface AuctionCommissionCalculated {
  buyer_commission_amount: number;
  buyer_total_paid: number;
  seller_commission_amount: number;
  seller_earnings: number;
}

// ============================================
// FUNCIONES
// ============================================

/**
 * Obtiene la comisión para un producto directo
 */
export async function getCommissionForDirectSale(
  sellerId: string,
  storeId?: string
): Promise<number> {
  try {
    const { data, error } = await (supabase as any).rpc('get_direct_sale_commission', {
      p_seller_id: sellerId,
      p_store_id: storeId || null,
    });

    if (error) {
      logger.error('Error getting direct sale commission', error, { sellerId, storeId });
      // Default: 10%
      return 10.0;
    }

    return data || 10.0;
  } catch (err) {
    logger.error('Exception getting direct sale commission', err, { sellerId, storeId });
    return 10.0;
  }
}

/**
 * Obtiene las comisiones para una subasta
 */
export async function getCommissionForAuction(
  sellerId: string,
  storeId?: string
): Promise<AuctionCommissions> {
  try {
    const { data, error } = await (supabase as any).rpc('get_auction_commissions', {
      p_seller_id: sellerId,
      p_store_id: storeId || null,
    });

    if (error) {
      logger.error('Error getting auction commissions', error, { sellerId, storeId });
      // Defaults: 3% comprador, 5% vendedor
      return {
        buyer_commission_percent: 3.0,
        seller_commission_percent: 5.0,
      };
    }

    if (data && data.length > 0) {
      return {
        buyer_commission_percent: data[0].buyer_commission_percent || 3.0,
        seller_commission_percent: data[0].seller_commission_percent || 5.0,
      };
    }

    return {
      buyer_commission_percent: 3.0,
      seller_commission_percent: 5.0,
    };
  } catch (err) {
    logger.error('Exception getting auction commissions', err, { sellerId, storeId });
    return {
      buyer_commission_percent: 3.0,
      seller_commission_percent: 5.0,
    };
  }
}

/**
 * Calcula el precio mostrado con comisión incluida (productos directos)
 */
export function calculatePriceWithCommission(
  basePrice: number,
  commissionPercent: number
): number {
  // Validaciones
  if (basePrice <= 0) {
    logger.warn('Base price <= 0, returning 0', { basePrice });
    return 0;
  }
  
  if (commissionPercent < 0) {
    logger.warn('Commission percent < 0, using 0%', { commissionPercent });
    commissionPercent = 0;
  }
  
  if (commissionPercent >= 100) {
    logger.warn('Commission percent >= 100%, using 10% instead', { commissionPercent });
    commissionPercent = 10;
  }
  
  // Precio mostrado = precio base / (1 - comisión/100)
  const priceWithCommission = basePrice / (1 - commissionPercent / 100);
  return Math.round(priceWithCommission);
}

/**
 * Calcula las comisiones de una subasta
 */
export async function calculateAuctionCommissions(
  finalPrice: number,
  sellerId: string,
  storeId?: string
): Promise<AuctionCommissionCalculated> {
  try {
    // Validaciones
    if (finalPrice <= 0) {
      logger.warn('Final price <= 0, returning zero commissions', { finalPrice });
      return {
        buyer_commission_amount: 0,
        buyer_total_paid: 0,
        seller_commission_amount: 0,
        seller_earnings: 0,
      };
    }
    
    if (!sellerId) {
      logger.warn('No sellerId provided, using defaults', { sellerId });
    }
    
    // Obtener porcentajes de comisión
    const commissions = await getCommissionForAuction(sellerId, storeId);
    
    // Validar porcentajes
    if (commissions.buyer_commission_percent < 0 || commissions.buyer_commission_percent > 100) {
      logger.warn('Invalid buyer commission percent, using 3%', { percent: commissions.buyer_commission_percent });
      commissions.buyer_commission_percent = 3.0;
    }
    
    if (commissions.seller_commission_percent < 0 || commissions.seller_commission_percent > 100) {
      logger.warn('Invalid seller commission percent, using 5%', { percent: commissions.seller_commission_percent });
      commissions.seller_commission_percent = 5.0;
    }
    
    // Calcular usando función SQL
    const { data, error } = await (supabase as any).rpc('calculate_auction_commissions', {
      p_final_price: finalPrice,
      p_buyer_commission_percent: commissions.buyer_commission_percent,
      p_seller_commission_percent: commissions.seller_commission_percent,
    });

    if (error) {
      logger.error('Error calculating auction commissions', error, { 
        finalPrice, 
        commissions 
      });
      // Calcular manualmente como fallback
      const buyerCommission = Math.round(finalPrice * commissions.buyer_commission_percent / 100);
      const sellerCommission = Math.round(finalPrice * commissions.seller_commission_percent / 100);
      
      return {
        buyer_commission_amount: buyerCommission,
        buyer_total_paid: finalPrice + buyerCommission,
        seller_commission_amount: sellerCommission,
        seller_earnings: Math.max(0, finalPrice - sellerCommission), // Asegurar no negativo
      };
    }

    if (data && data.length > 0) {
      return {
        buyer_commission_amount: data[0].buyer_commission_amount,
        buyer_total_paid: data[0].buyer_total_paid,
        seller_commission_amount: data[0].seller_commission_amount,
        seller_earnings: Math.max(0, data[0].seller_earnings || 0), // Asegurar no negativo
      };
    }

    // Fallback manual
    const buyerCommission = Math.round(finalPrice * commissions.buyer_commission_percent / 100);
    const sellerCommission = Math.round(finalPrice * commissions.seller_commission_percent / 100);
    
    return {
      buyer_commission_amount: buyerCommission,
      buyer_total_paid: finalPrice + buyerCommission,
      seller_commission_amount: sellerCommission,
      seller_earnings: Math.max(0, finalPrice - sellerCommission), // Asegurar no negativo
    };
  } catch (err) {
    logger.error('Exception calculating auction commissions', err, { finalPrice, sellerId });
    // Fallback con defaults
    const buyerCommission = Math.round(finalPrice * 0.03);
    const sellerCommission = Math.round(finalPrice * 0.05);
    
    return {
      buyer_commission_amount: buyerCommission,
      buyer_total_paid: finalPrice + buyerCommission,
      seller_commission_amount: sellerCommission,
      seller_earnings: Math.max(0, finalPrice - sellerCommission), // Asegurar no negativo
    };
  }
}

/**
 * Crea o actualiza platform_fees para una subasta finalizada
 */
export async function createAuctionFees(
  orderId: string,
  orderItemId: string,
  productId: string,
  finalPrice: number,
  sellerId: string,
  buyerId: string,
  storeId?: string
): Promise<void> {
  try {
    // Calcular comisiones
    const calculated = await calculateAuctionCommissions(finalPrice, sellerId, storeId);
    
    // Obtener porcentajes para guardar
    const commissions = await getCommissionForAuction(sellerId, storeId);
    
    // Insertar platform_fees
    const { error } = await (supabase as any).from('platform_fees').insert({
      order_id: orderId,
      order_item_id: orderItemId,
      seller_id: sellerId,
      buyer_id: buyerId,
      store_id: storeId || null,
      transaction_type: 'auction',
      auction_final_price: finalPrice,
      buyer_commission_percent: commissions.buyer_commission_percent,
      buyer_commission_amount: calculated.buyer_commission_amount,
      buyer_total_paid: calculated.buyer_total_paid,
      seller_commission_percent: commissions.seller_commission_percent,
      seller_commission_amount: calculated.seller_commission_amount,
      seller_earnings: calculated.seller_earnings,
      status: 'pending',
      payment_status: 'escrowed',
    });

    if (error) {
      logger.error('Error creating auction fees', error, { 
        orderId, 
        productId, 
        finalPrice 
      });
      throw error;
    }

    // Actualizar balance del vendedor
    await (supabase as any).rpc('update_seller_balance', {
      p_seller_id: sellerId,
      p_amount: calculated.seller_earnings,
      p_is_pending: true,
      p_store_id: storeId || null,
    }).catch(err => {
      logger.warn('Error updating seller balance (non-critical)', err, { sellerId });
    });

    logger.info('Auction fees created', { 
      orderId, 
      productId, 
      finalPrice,
      buyerTotal: calculated.buyer_total_paid,
      sellerEarnings: calculated.seller_earnings,
    });
  } catch (err) {
    logger.error('Exception creating auction fees', err, { orderId, productId });
    throw err;
  }
}

/**
 * Obtiene las configuraciones de comisión (admin)
 */
export async function getCommissionSettings(filters?: {
  scope_type?: string;
  store_id?: string;
  seller_id?: string;
}): Promise<CommissionSettings[]> {
  try {
    let query = supabase.from('commission_settings').select('*');

    if (filters?.scope_type) {
      query = query.eq('scope_type', filters.scope_type);
    }
    if (filters?.store_id) {
      query = query.eq('store_id', filters.store_id);
    }
    if (filters?.seller_id) {
      query = query.eq('seller_id', filters.seller_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    logger.error('Error getting commission settings', err);
    throw err;
  }
}

