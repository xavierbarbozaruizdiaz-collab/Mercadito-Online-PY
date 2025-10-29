// src/lib/services/couponService.ts
// Servicio para gestión de cupones y descuentos

import { supabase } from '@/lib/supabaseClient';

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase_amount: number;
  max_discount_amount?: number | null;
  category_id?: string | null;
  store_id?: string | null;
  product_id?: string | null;
  usage_limit?: number | null;
  usage_count: number;
  user_limit: number;
  valid_from: string;
  valid_until?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Promotion {
  id: string;
  name: string;
  description?: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase_amount: number;
  max_discount_amount?: number | null;
  category_id?: string | null;
  store_id?: string | null;
  product_id?: string | null;
  valid_from: string;
  valid_until?: string | null;
  is_active: boolean;
  priority: number;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon_id?: string;
  discount_amount: number;
  message: string;
}

export interface CouponUsage {
  id: string;
  coupon_id: string;
  user_id: string;
  order_id?: string | null;
  discount_amount: number;
  used_at: string;
  coupon?: Coupon;
}

export interface CreateCouponInput {
  code: string;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase_amount?: number;
  max_discount_amount?: number;
  category_id?: string;
  store_id?: string;
  product_id?: string;
  usage_limit?: number;
  user_limit?: number;
  valid_from?: string;
  valid_until?: string;
}

export class CouponService {
  /**
   * Valida un cupón para un usuario y monto de compra
   */
  static async validateCoupon(
    couponCode: string,
    userId: string,
    orderAmount: number
  ): Promise<CouponValidationResult> {
    try {
      const { data, error } = await supabase.rpc('validate_coupon', {
        coupon_code: couponCode.toUpperCase().trim(),
        user_id_param: userId,
        order_amount: orderAmount,
      } as any);

      if (error) throw error;

      const result = data && data[0] ? data[0] : null;
      if (!result) {
        return {
          valid: false,
          discount_amount: 0,
          message: 'Cupón no encontrado',
        };
      }

      return {
        valid: result.valid,
        coupon_id: result.coupon_id || undefined,
        discount_amount: Number(result.discount_amount || 0),
        message: result.message || '',
      };
    } catch (error: any) {
      console.error('Error validating coupon:', error);
      return {
        valid: false,
        discount_amount: 0,
        message: error.message || 'Error al validar el cupón',
      };
    }
  }

  /**
   * Obtiene cupones disponibles para un usuario
   */
  static async getAvailableCoupons(options: {
    categoryId?: string;
    storeId?: string;
    productId?: string;
  } = {}): Promise<Coupon[]> {
    try {
      let query = supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .lte('valid_from', new Date().toISOString())
        .or(
          `valid_until.is.null,valid_until.gte.${new Date().toISOString()}`
        );

      if (options.categoryId) {
        query = query.or(`category_id.eq.${options.categoryId},category_id.is.null`);
      }

      if (options.storeId) {
        query = query.or(`store_id.eq.${options.storeId},store_id.is.null`);
      }

      if (options.productId) {
        query = query.or(`product_id.eq.${options.productId},product_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as Coupon[];
    } catch (error) {
      console.error('Error getting available coupons:', error);
      return [];
    }
  }

  /**
   * Obtiene las promociones activas
   */
  static async getActivePromotions(options: {
    productId?: string;
    storeId?: string;
    categoryId?: string;
  } = {}): Promise<Promotion[]> {
    try {
      const { data, error } = await supabase.rpc('get_active_promotions', {
        product_id_param: options.productId || null,
        store_id_param: options.storeId || null,
        category_id_param: options.categoryId || null,
      } as any);

      if (error) throw error;

      return (data || []) as Promotion[];
    } catch (error) {
      console.error('Error getting active promotions:', error);
      return [];
    }
  }

  /**
   * Aplica un cupón a una orden
   */
  static async applyCouponToOrder(
    couponCode: string,
    orderId: string,
    userId: string
  ): Promise<CouponValidationResult> {
    try {
      const { data, error } = await supabase.rpc('apply_coupon_to_order', {
        coupon_code_param: couponCode.toUpperCase().trim(),
        order_id_param: orderId,
        user_id_param: userId,
      } as any);

      if (error) throw error;

      const result = data && data[0] ? data[0] : null;
      if (!result) {
        return {
          valid: false,
          discount_amount: 0,
          message: 'Error al aplicar el cupón',
        };
      }

      return {
        valid: result.success,
        discount_amount: Number(result.discount_amount || 0),
        message: result.message || '',
      };
    } catch (error: any) {
      console.error('Error applying coupon:', error);
      return {
        valid: false,
        discount_amount: 0,
        message: error.message || 'Error al aplicar el cupón',
      };
    }
  }

  /**
   * Obtiene el historial de uso de cupones de un usuario
   */
  static async getUserCouponUsage(
    userId: string
  ): Promise<CouponUsage[]> {
    try {
      const { data, error } = await supabase
        .from('coupon_usage')
        .select(`
          *,
          coupon:coupons(*)
        `)
        .eq('user_id', userId)
        .order('used_at', { ascending: false });

      if (error) throw error;

      return (data || []) as CouponUsage[];
    } catch (error) {
      console.error('Error getting user coupon usage:', error);
      return [];
    }
  }

  /**
   * Crea un nuevo cupón (solo admins y store owners)
   */
  static async createCoupon(
    input: CreateCouponInput
  ): Promise<Coupon | null> {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .insert({
          code: input.code.toUpperCase().trim(),
          name: input.name,
          description: input.description || null,
          discount_type: input.discount_type,
          discount_value: input.discount_value,
          min_purchase_amount: input.min_purchase_amount || 0,
          max_discount_amount: input.max_discount_amount || null,
          category_id: input.category_id || null,
          store_id: input.store_id || null,
          product_id: input.product_id || null,
          usage_limit: input.usage_limit || null,
          user_limit: input.user_limit || 1,
          valid_from: input.valid_from || new Date().toISOString(),
          valid_until: input.valid_until || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      return data as Coupon;
    } catch (error: any) {
      console.error('Error creating coupon:', error);
      throw error;
    }
  }

  /**
   * Calcula el descuento de una promoción para un monto dado
   */
  static calculatePromotionDiscount(
    promotion: Promotion,
    amount: number
  ): number {
    if (amount < promotion.min_purchase_amount) {
      return 0;
    }

    let discount = 0;

    if (promotion.discount_type === 'percentage') {
      discount = (amount * promotion.discount_value) / 100;
      if (promotion.max_discount_amount) {
        discount = Math.min(discount, promotion.max_discount_amount);
      }
    } else {
      discount = Math.min(promotion.discount_value, amount);
    }

    return Math.round(discount * 100) / 100; // Redondear a 2 decimales
  }

  /**
   * Obtiene el mejor descuento aplicable de promociones
   */
  static getBestPromotionDiscount(
    promotions: Promotion[],
    amount: number
  ): { promotion: Promotion; discount: number } | null {
    if (promotions.length === 0) return null;

    let bestPromotion: Promotion | null = null;
    let bestDiscount = 0;

    for (const promotion of promotions) {
      const discount = this.calculatePromotionDiscount(promotion, amount);
      if (discount > bestDiscount) {
        bestDiscount = discount;
        bestPromotion = promotion;
      }
    }

    return bestPromotion
      ? { promotion: bestPromotion, discount: bestDiscount }
      : null;
  }
}

