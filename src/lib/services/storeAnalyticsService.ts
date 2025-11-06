// ============================================
// STORE ANALYTICS SERVICE
// Analytics individual por tienda
// ============================================

import { supabase } from '@/lib/supabase/client';

export interface StoreMetrics {
  storeId: string;
  period: {
    start: Date;
    end: Date;
  };
  views: number;
  uniqueVisitors: number;
  sessions: number;
  productViews: number;
  addToCartCount: number;
  purchases: number;
  revenue: number;
  conversionRate: number;
  topProducts: Array<{
    productId: string;
    title: string;
    views: number;
    purchases: number;
    revenue: number;
  }>;
  trafficSources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  dailyMetrics: Array<{
    date: string;
    views: number;
    uniqueVisitors: number;
    revenue: number;
  }>;
}

export interface ConversionFunnel {
  storeViews: number;
  productViews: number;
  addToCart: number;
  checkoutStarted: number;
  purchases: number;
  conversionRates: {
    viewToProduct: number;
    productToCart: number;
    cartToCheckout: number;
    checkoutToPurchase: number;
    overall: number;
  };
}

class StoreAnalyticsService {
  /**
   * Obtiene métricas generales de una tienda
   */
  async getStoreMetrics(
    storeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StoreMetrics | null> {
    try {
      // Obtener vistas de tienda
      const { data: storeViews } = await supabase
        .from('analytics_events')
        .select('id, user_id, session_id')
        .eq('event_type', 'store_view')
        .eq('event_data->>store_id', storeId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const views = storeViews?.length || 0;
      const uniqueVisitors = new Set(
        storeViews?.map(v => v.user_id).filter(Boolean) || []
      ).size;
      const sessions = new Set(
        storeViews?.map(v => v.session_id).filter(Boolean) || []
      ).size;

      // Obtener vistas de productos de la tienda
      const { data: products } = await supabase
        .from('products')
        .select('id, title')
        .eq('store_id', storeId)
        .is('deleted_at', null);

      const productIds = products?.map(p => p.id) || [];

      const { data: productViews } = await supabase
        .from('analytics_events')
        .select('id, event_data')
        .eq('event_type', 'product_view')
        .in(
          'event_data->>product_id',
          productIds.map(id => id.toString())
        )
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const { data: addToCart } = await supabase
        .from('analytics_events')
        .select('id, event_data')
        .eq('event_type', 'add_to_cart')
        .in(
          'event_data->>product_id',
          productIds.map(id => id.toString())
        )
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Obtener compras
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total_amount, created_at')
        .eq('store_id', storeId)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const purchases = orders?.length || 0;
      const revenue =
        orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      // Obtener productos más vistos
      const productViewCounts = new Map<string, number>();
      productViews?.forEach((view: any) => {
        const productId = view.event_data?.product_id;
        if (productId) {
          productViewCounts.set(
            productId,
            (productViewCounts.get(productId) || 0) + 1
          );
        }
      });

      const topProducts = Array.from(productViewCounts.entries())
        .map(([productId, views]) => {
          const product = products?.find(p => p.id === productId);
          const productOrders = orders?.filter(
            (order: any) => order.items?.some((item: any) => item.product_id === productId)
          ) || [];
          return {
            productId,
            title: product?.title || 'Producto desconocido',
            views,
            purchases: productOrders.length,
            revenue:
              productOrders.reduce(
                (sum: number, order: any) =>
                  sum +
                  (order.items?.find((item: any) => item.product_id === productId)?.price || 0),
                0
              ) || 0,
          };
        })
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      // Obtener fuentes de tráfico (simplificado)
      const trafficSources = this.calculateTrafficSources(storeViews || []);

      // Obtener métricas diarias
      const dailyMetrics = await this.getDailyMetrics(storeId, startDate, endDate);

      // Calcular tasa de conversión
      const conversionRate = views > 0 ? (purchases / views) * 100 : 0;

      return {
        storeId,
        period: { start: startDate, end: endDate },
        views,
        uniqueVisitors,
        sessions,
        productViews: productViews?.length || 0,
        addToCartCount: addToCart?.length || 0,
        purchases,
        revenue,
        conversionRate,
        topProducts,
        trafficSources,
        dailyMetrics,
      };
    } catch (error) {
      console.error('Error obteniendo métricas de tienda:', error);
      return null;
    }
  }

  /**
   * Obtiene embudo de conversión
   */
  async getConversionFunnel(
    storeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ConversionFunnel | null> {
    try {
      // Vistas de tienda
      const { data: storeViews } = await supabase
        .from('analytics_events')
        .select('id')
        .eq('event_type', 'store_view')
        .eq('event_data->>store_id', storeId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Vistas de productos
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('store_id', storeId);

      const productIds = products?.map(p => p.id) || [];

      const { data: productViews } = await supabase
        .from('analytics_events')
        .select('id')
        .eq('event_type', 'product_view')
        .in(
          'event_data->>product_id',
          productIds.map(id => id.toString())
        )
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Agregar al carrito
      const { data: addToCart } = await supabase
        .from('analytics_events')
        .select('id')
        .eq('event_type', 'add_to_cart')
        .in(
          'event_data->>product_id',
          productIds.map(id => id.toString())
        )
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Checkout iniciado
      const { data: checkoutStarted } = await supabase
        .from('analytics_events')
        .select('id')
        .eq('event_type', 'begin_checkout')
        .in(
          'event_data->>store_id',
          [storeId]
        )
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Compras
      const { data: purchases } = await supabase
        .from('orders')
        .select('id')
        .eq('store_id', storeId)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const storeViewsCount = storeViews?.length || 0;
      const productViewsCount = productViews?.length || 0;
      const addToCartCount = addToCart?.length || 0;
      const checkoutStartedCount = checkoutStarted?.length || 0;
      const purchasesCount = purchases?.length || 0;

      return {
        storeViews: storeViewsCount,
        productViews: productViewsCount,
        addToCart: addToCartCount,
        checkoutStarted: checkoutStartedCount,
        purchases: purchasesCount,
        conversionRates: {
          viewToProduct:
            storeViewsCount > 0 ? (productViewsCount / storeViewsCount) * 100 : 0,
          productToCart:
            productViewsCount > 0 ? (addToCartCount / productViewsCount) * 100 : 0,
          cartToCheckout:
            addToCartCount > 0 ? (checkoutStartedCount / addToCartCount) * 100 : 0,
          checkoutToPurchase:
            checkoutStartedCount > 0
              ? (purchasesCount / checkoutStartedCount) * 100
              : 0,
          overall:
            storeViewsCount > 0 ? (purchasesCount / storeViewsCount) * 100 : 0,
        },
      };
    } catch (error) {
      console.error('Error obteniendo embudo de conversión:', error);
      return null;
    }
  }

  /**
   * Obtiene métricas diarias
   */
  private async getDailyMetrics(
    storeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; views: number; uniqueVisitors: number; revenue: number }>> {
    try {
      const { data } = await supabase.rpc('get_store_daily_metrics', {
        p_store_id: storeId,
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
      });

      // Si no existe la función, calcular manualmente
      if (!data) {
        const { data: views } = await supabase
          .from('analytics_events')
          .select('created_at, user_id')
          .eq('event_type', 'store_view')
          .eq('event_data->>store_id', storeId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        // Agrupar por fecha
        const dailyMap = new Map<string, { views: number; visitors: Set<string> }>();

        views?.forEach((view: any) => {
          const date = new Date(view.created_at).toISOString().split('T')[0];
          if (!dailyMap.has(date)) {
            dailyMap.set(date, { views: 0, visitors: new Set() });
          }
          const day = dailyMap.get(date)!;
          day.views++;
          if (view.user_id) {
            day.visitors.add(view.user_id);
          }
        });

        // Obtener ingresos diarios
        const { data: orders } = await supabase
          .from('orders')
          .select('total_amount, created_at')
          .eq('store_id', storeId)
          .eq('status', 'completed')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        const revenueMap = new Map<string, number>();
        orders?.forEach((order: any) => {
          const date = new Date(order.created_at).toISOString().split('T')[0];
          revenueMap.set(date, (revenueMap.get(date) || 0) + (order.total_amount || 0));
        });

        return Array.from(dailyMap.entries()).map(([date, data]) => ({
          date,
          views: data.views,
          uniqueVisitors: data.visitors.size,
          revenue: revenueMap.get(date) || 0,
        }));
      }

      return data || [];
    } catch (error) {
      console.error('Error obteniendo métricas diarias:', error);
      return [];
    }
  }

  /**
   * Calcula fuentes de tráfico
   */
  private calculateTrafficSources(events: any[]): Array<{
    source: string;
    count: number;
    percentage: number;
  }> {
    const sources = new Map<string, number>();

    events.forEach((event: any) => {
      const source =
        event.event_data?.traffic_source ||
        event.event_data?.referrer ||
        'direct';
      sources.set(source, (sources.get(source) || 0) + 1);
    });

    const total = events.length;
    return Array.from(sources.entries())
      .map(([source, count]) => ({
        source,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }
}

// Exportar instancia singleton
export const storeAnalytics = new StoreAnalyticsService();

