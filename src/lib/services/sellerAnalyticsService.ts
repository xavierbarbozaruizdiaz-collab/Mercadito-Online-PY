// ============================================
// MERCADITO ONLINE PY - SELLER ANALYTICS SERVICE
// Servicio para analytics de vendedores
// ============================================

import { supabase } from '@/lib/supabase/client';

export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

export interface SellerAnalyticsReport {
  // Resumen general
  summary: {
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    activeProducts: number;
    averageOrderValue: number;
    conversionRate: number;
    totalCustomers: number;
    returningCustomers: number;
  };

  // Tendencias temporales
  salesTrend: Array<{
    date: string;
    revenue: number;
    orders: number;
    customers: number;
  }>;

  // Productos
  topProducts: Array<{
    id: string;
    title: string;
    cover_url: string | null;
    total_sold: number;
    revenue: number;
    views?: number;
  }>;

  // Órdenes
  ordersByStatus: {
    pending: number;
    confirmed: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };

  // Categorías
  salesByCategory: Array<{
    category_id: string;
    category_name: string;
    revenue: number;
    orders: number;
    products: number;
  }>;

  // Clientes
  topCustomers: Array<{
    user_id: string;
    name: string;
    email: string;
    total_orders: number;
    total_spent: number;
    last_order_date: string;
  }>;

  // Comparación con período anterior
  comparison: {
    revenueChange: number;
    ordersChange: number;
    customersChange: number;
    revenueChangePercent: number;
    ordersChangePercent: number;
    customersChangePercent: number;
  };
}

/**
 * Obtiene el reporte de analytics para un vendedor
 */
export async function getSellerAnalyticsReport(
  sellerId: string,
  timeRange: TimeRange = '30d'
): Promise<SellerAnalyticsReport | null> {
  try {
    const { startDate, endDate, previousStartDate } = getDateRange(timeRange);

    // Obtener todas las órdenes del vendedor
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        buyer_id,
        status,
        total_amount,
        created_at,
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          products (
            id,
            title,
            cover_url,
            category_id,
            categories (
              id,
              name
            )
          )
        )
      `)
      .eq('seller_id', sellerId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return null;
    }

    // Obtener órdenes del período anterior para comparación
    const { data: previousOrders } = await supabase
      .from('orders')
      .select('id, total_amount, created_at')
      .eq('seller_id', sellerId)
      .gte('created_at', previousStartDate)
      .lt('created_at', startDate);

    // Obtener productos del vendedor
    const { data: products } = await supabase
      .from('products')
      .select('id, title, category_id, status')
      .eq('seller_id', sellerId);

    // Calcular métricas
    const totalRevenue = (orders || []).reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const totalOrders = orders?.length || 0;
    const totalProducts = products?.length || 0;
    const activeProducts = products?.filter(p => p.status === 'active' || !p.status).length || 0;

    // Agrupar por fecha para tendencias
    const salesByDate = new Map<string, { revenue: number; orders: number; customers: Set<string> }>();
    const customersSet = new Set<string>();
    const ordersByStatus: any = {
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    orders?.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      if (!salesByDate.has(date)) {
        salesByDate.set(date, { revenue: 0, orders: 0, customers: new Set() });
      }
      const dayData = salesByDate.get(date)!;
      dayData.revenue += order.total_amount || 0;
      dayData.orders += 1;
      dayData.customers.add(order.buyer_id);
      customersSet.add(order.buyer_id);

      const status = order.status as keyof typeof ordersByStatus;
      if (ordersByStatus.hasOwnProperty(status)) {
        ordersByStatus[status]++;
      }
    });

    // Generar array de tendencias
    const salesTrend = Array.from(salesByDate.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orders: data.orders,
        customers: data.customers.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Productos más vendidos
    const productSales = new Map<string, { id: string; title: string; cover_url: string | null; sold: number; revenue: number }>();
    orders?.forEach(order => {
      order.order_items?.forEach((item: any) => {
        const productId = item.product_id;
        if (!productSales.has(productId)) {
          productSales.set(productId, {
            id: productId,
            title: item.products?.title || 'Producto',
            cover_url: item.products?.cover_url || null,
            sold: 0,
            revenue: 0,
          });
        }
        const product = productSales.get(productId)!;
        product.sold += item.quantity || 0;
        product.revenue += item.total_price || 0;
      });
    });

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(p => ({
        ...p,
        total_sold: p.sold,
      }));

    // Ventas por categoría
    const categorySales = new Map<string, { category_id: string; category_name: string; revenue: number; orders: number; products: Set<string> }>();
    orders?.forEach(order => {
      order.order_items?.forEach((item: any) => {
        const categoryId = item.products?.category_id;
        const categoryName = item.products?.categories?.name || 'Sin categoría';
        if (!categorySales.has(categoryId)) {
          categorySales.set(categoryId, {
            category_id: categoryId,
            category_name: categoryName,
            revenue: 0,
            orders: 0,
            products: new Set(),
          });
        }
        const cat = categorySales.get(categoryId)!;
        cat.revenue += item.total_price || 0;
        cat.products.add(item.product_id);
      });
    });

    const salesByCategory = Array.from(categorySales.values())
      .map(cat => ({
        ...cat,
        orders: 1, // Simplificado
        products: cat.products.size,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Top clientes
    const customerData = new Map<string, { user_id: string; name: string; email: string; orders: number; spent: number; lastOrder: string }>();
    orders?.forEach(order => {
      if (!customerData.has(order.buyer_id)) {
        customerData.set(order.buyer_id, {
          user_id: order.buyer_id,
          name: 'Cliente',
          email: '',
          orders: 0,
          spent: 0,
          lastOrder: order.created_at,
        });
      }
      const customer = customerData.get(order.buyer_id)!;
      customer.orders += 1;
      customer.spent += order.total_amount || 0;
      if (order.created_at > customer.lastOrder) {
        customer.lastOrder = order.created_at;
      }
    });

    // Obtener información de perfiles de clientes
    const buyerIds = Array.from(customerData.keys());
    if (buyerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', buyerIds);

      profiles?.forEach(profile => {
        const customer = customerData.get(profile.id);
        if (customer) {
          customer.name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email?.split('@')[0] || 'Cliente';
          customer.email = profile.email || '';
        }
      });
    }

    const topCustomers = Array.from(customerData.values())
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 10)
      .map(c => ({
        user_id: c.user_id,
        name: c.name,
        email: c.email,
        total_orders: c.orders,
        total_spent: c.spent,
        last_order_date: c.lastOrder,
      }));

    // Calcular comparación con período anterior
    const previousRevenue = (previousOrders || []).reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const previousOrdersCount = previousOrders?.length || 0;
    const previousCustomers = new Set(previousOrders?.map(o => o.buyer_id) || []).size;

    const revenueChange = totalRevenue - previousRevenue;
    const ordersChange = totalOrders - previousOrdersCount;
    const customersChange = customersSet.size - previousCustomers;

    const revenueChangePercent = previousRevenue > 0 ? (revenueChange / previousRevenue) * 100 : 0;
    const ordersChangePercent = previousOrdersCount > 0 ? (ordersChange / previousOrdersCount) * 100 : 0;
    const customersChangePercent = previousCustomers > 0 ? (customersChange / previousCustomers) * 100 : 0;

    // Calcular clientes recurrentes
    const previousCustomerIds = new Set(previousOrders?.map(o => o.buyer_id) || []);
    const returningCustomers = Array.from(customersSet).filter(id => previousCustomerIds.has(id)).length;

    // Calcular conversión (simplificado: órdenes / productos activos)
    const conversionRate = activeProducts > 0 ? (totalOrders / activeProducts) * 100 : 0;

    return {
      summary: {
        totalRevenue,
        totalOrders,
        totalProducts,
        activeProducts,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        conversionRate,
        totalCustomers: customersSet.size,
        returningCustomers,
      },
      salesTrend,
      topProducts,
      ordersByStatus,
      salesByCategory,
      topCustomers,
      comparison: {
        revenueChange,
        ordersChange,
        customersChange,
        revenueChangePercent,
        ordersChangePercent,
        customersChangePercent,
      },
    };
  } catch (error) {
    console.error('Error generating seller analytics report:', error);
    return null;
  }
}

/**
 * Obtiene el rango de fechas según el período seleccionado
 */
function getDateRange(timeRange: TimeRange): {
  startDate: string;
  endDate: string;
  previousStartDate: string;
} {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  
  let startDate = new Date();
  let previousStartDate = new Date();

  switch (timeRange) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      previousStartDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      previousStartDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      previousStartDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      previousStartDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case 'all':
      startDate = new Date(0); // Desde el inicio
      previousStartDate = new Date(0);
      break;
  }

  startDate.setHours(0, 0, 0, 0);
  previousStartDate.setHours(0, 0, 0, 0);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    previousStartDate: previousStartDate.toISOString(),
  };
}
