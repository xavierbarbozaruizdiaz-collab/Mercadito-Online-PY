// src/lib/services/sellerAnalyticsService.ts
// Servicio para analytics avanzados de vendedores

import { supabase } from '@/lib/supabaseClient';
import { normalizeRpcResult, normalizeRpcList } from '@/lib/supabase/rpc';

export interface SalesStats {
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  completed_orders: number;
  pending_orders: number;
  cancelled_orders: number;
}

export interface SalesTrendData {
  period_date: string;
  total_revenue: number;
  order_count: number;
}

export interface TopProduct {
  product_id: string;
  product_title: string;
  total_quantity: number;
  total_revenue: number;
  order_count: number;
  average_rating: number;
}

export interface CategoryStats {
  category_id: string;
  category_name: string;
  total_products: number;
  total_sales: number;
  total_revenue: number;
}

export interface ConversionMetrics {
  total_product_views: number;
  total_adds_to_cart: number;
  total_checkouts: number;
  total_orders: number;
  cart_conversion_rate: number;
  checkout_conversion_rate: number;
  overall_conversion_rate: number;
}

export interface RepeatCustomer {
  customer_id: string;
  customer_name: string;
  order_count: number;
  total_spent: number;
  last_order_date: string;
}

export class SellerAnalyticsService {
  /**
   * Obtiene estadísticas de ventas por período
   */
  static async getSalesStatsByPeriod(
    sellerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SalesStats | null> {
    try {
      const { data, error } = await supabase.rpc('get_sales_stats_by_period', {
        seller_id_param: sellerId,
        period_start: startDate.toISOString(),
        period_end: endDate.toISOString(),
      } as any);

      if (error) throw error;
      return normalizeRpcResult<SalesStats>(data);
    } catch (error) {
      console.error('Error getting sales stats:', error);
      return null;
    }
  }

  /**
   * Obtiene tendencia de ventas (por día o mes)
   */
  static async getSalesTrend(
    sellerId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'month' = 'day'
  ): Promise<SalesTrendData[]> {
    try {
      const { data, error } = await supabase.rpc('get_sales_trend', {
        seller_id_param: sellerId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        group_by: groupBy,
      } as any);

      if (error) throw error;
      return normalizeRpcList<SalesTrendData>(data);
    } catch (error) {
      console.error('Error getting sales trend:', error);
      return [];
    }
  }

  /**
   * Obtiene productos más vendidos
   */
  static async getTopSellingProducts(
    sellerId: string,
    limit: number = 10,
    startDate?: Date,
    endDate?: Date
  ): Promise<TopProduct[]> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();

      const { data, error } = await supabase.rpc('get_top_selling_products', {
        seller_id_param: sellerId,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
        limit_count: limit,
      } as any);

      if (error) throw error;
      return normalizeRpcList<TopProduct>(data);
    } catch (error) {
      console.error('Error getting top products:', error);
      return [];
    }
  }

  /**
   * Obtiene estadísticas por categoría
   */
  static async getCategorySalesStats(
    sellerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CategoryStats[]> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();

      const { data, error } = await supabase.rpc('get_category_sales_stats', {
        seller_id_param: sellerId,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
      } as any);

      if (error) throw error;
      return normalizeRpcList<CategoryStats>(data);
    } catch (error) {
      console.error('Error getting category stats:', error);
      return [];
    }
  }

  /**
   * Obtiene métricas de conversión
   */
  static async getConversionMetrics(
    sellerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ConversionMetrics | null> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();

      const { data, error } = await supabase.rpc('get_conversion_metrics', {
        seller_id_param: sellerId,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
      } as any);

      if (error) throw error;
      return normalizeRpcResult<ConversionMetrics>(data);
    } catch (error) {
      console.error('Error getting conversion metrics:', error);
      return null;
    }
  }

  /**
   * Obtiene clientes recurrentes
   */
  static async getRepeatCustomers(
    sellerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<RepeatCustomer[]> {
    try {
      const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();

      const { data, error } = await supabase.rpc('get_repeat_customers', {
        seller_id_param: sellerId,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
      } as any);

      if (error) throw error;
      return (data || []) as RepeatCustomer[];
    } catch (error) {
      console.error('Error getting repeat customers:', error);
      return [];
    }
  }

  /**
   * Obtiene todas las métricas del dashboard en una llamada
   */
  static async getDashboardMetrics(
    sellerId: string,
    periodDays: number = 30
  ): Promise<{
    salesStats: SalesStats | null;
    salesTrend: SalesTrendData[];
    topProducts: TopProduct[];
    categoryStats: CategoryStats[];
    conversionMetrics: ConversionMetrics | null;
    repeatCustomers: RepeatCustomer[];
  }> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

    try {
      const [salesStats, salesTrend, topProducts, categoryStats, conversionMetrics, repeatCustomers] =
        await Promise.all([
          this.getSalesStatsByPeriod(sellerId, startDate, endDate),
          this.getSalesTrend(sellerId, startDate, endDate, 'day'),
          this.getTopSellingProducts(sellerId, 10, startDate, endDate),
          this.getCategorySalesStats(sellerId, startDate, endDate),
          this.getConversionMetrics(sellerId, startDate, endDate),
          this.getRepeatCustomers(sellerId, startDate, endDate),
        ]);

      return {
        salesStats,
        salesTrend,
        topProducts,
        categoryStats,
        conversionMetrics,
        repeatCustomers,
      };
    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      return {
        salesStats: null,
        salesTrend: [],
        topProducts: [],
        categoryStats: [],
        conversionMetrics: null,
        repeatCustomers: [],
      };
    }
  }
}

