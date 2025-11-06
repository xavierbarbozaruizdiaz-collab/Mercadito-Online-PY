// ============================================
// MERCADITO ONLINE PY - ANALYTICS ADMIN SERVICE
// Servicio para estadísticas avanzadas y reportes
// ============================================

import { supabase } from '@/lib/supabase/client';

// ============================================
// TIPOS
// ============================================

export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

export type GrowthMetrics = {
  users: {
    current: number;
    previous: number;
    growth: number;
    growth_percentage: number;
  };
  orders: {
    current: number;
    previous: number;
    growth: number;
    growth_percentage: number;
  };
  revenue: {
    current: number;
    previous: number;
    growth: number;
    growth_percentage: number;
  };
  products: {
    current: number;
    previous: number;
    growth: number;
    growth_percentage: number;
  };
};

export type SalesChartData = {
  date: string;
  orders: number;
  revenue: number;
};

export type UserGrowthData = {
  date: string;
  new_users: number;
  new_sellers: number;
};

export type CategoryStats = {
  category_id: string;
  category_name: string;
  total_products: number;
  total_orders: number;
  total_revenue: number;
};

export type TopSeller = {
  seller_id: string;
  seller_name: string;
  seller_email: string;
  total_orders: number;
  total_revenue: number;
  total_products: number;
  average_rating: number;
};

export type AnalyticsReport = {
  total_users: number;
  total_sellers: number;
  total_products: number;
  total_orders: number;
  total_revenue: number;
  growth_metrics: GrowthMetrics;
  sales_chart: SalesChartData[];
  user_growth_chart: UserGrowthData[];
  category_stats: CategoryStats[];
  top_sellers: TopSeller[];
  orders_by_status: Record<string, number>;
  revenue_by_status: Record<string, number>;
};

// ============================================
// FUNCIONES DEL SERVICIO
// ============================================

function getDateRange(timeRange: TimeRange): { start: Date; end: Date; previousStart: Date; previousEnd: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  
  let start = new Date();
  let previousStart = new Date();
  let previousEnd = new Date();
  
  switch (timeRange) {
    case '7d':
      start.setDate(end.getDate() - 7);
      previousEnd.setDate(start.getDate() - 1);
      previousStart.setDate(previousEnd.getDate() - 7);
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      previousEnd.setDate(start.getDate() - 1);
      previousStart.setDate(previousEnd.getDate() - 30);
      break;
    case '90d':
      start.setDate(end.getDate() - 90);
      previousEnd.setDate(start.getDate() - 1);
      previousStart.setDate(previousEnd.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(end.getFullYear() - 1);
      previousEnd = new Date(start);
      previousEnd.setDate(previousEnd.getDate() - 1);
      previousStart = new Date(previousEnd);
      previousStart.setFullYear(previousStart.getFullYear() - 1);
      break;
    case 'all':
      start = new Date(0); // Desde el inicio
      previousStart = new Date(0);
      previousEnd = new Date(0);
      break;
  }
  
  start.setHours(0, 0, 0, 0);
  previousStart.setHours(0, 0, 0, 0);
  previousEnd.setHours(23, 59, 59, 999);
  
  return { start, end, previousStart, previousEnd };
}

/**
 * Obtiene reporte completo de analytics
 */
export async function getAnalyticsReport(timeRange: TimeRange = '30d'): Promise<AnalyticsReport | null> {
  try {
    console.log('📊 Generando reporte de analytics para:', timeRange);
    const { start, end, previousStart, previousEnd } = getDateRange(timeRange);
    
    // Totales generales
    const [
      totalUsersRes,
      totalSellersRes,
      totalProductsRes,
      totalOrdersRes,
      currentPeriodOrdersRes,
      previousPeriodOrdersRes,
      currentPeriodRevenueRes,
      previousPeriodRevenueRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'seller'),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase
        .from('orders')
        .select('id, total_amount, payment_status')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString()),
      supabase
        .from('orders')
        .select('id, total_amount, payment_status')
        .gte('created_at', previousStart.toISOString())
        .lte('created_at', previousEnd.toISOString()),
      supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('payment_status', 'paid'),
      supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', previousStart.toISOString())
        .lte('created_at', previousEnd.toISOString())
        .eq('payment_status', 'paid'),
    ]);

    const total_users = totalUsersRes.count || 0;
    const total_sellers = totalSellersRes.count || 0;
    const total_products = totalProductsRes.count || 0;
    const total_orders = totalOrdersRes.count || 0;

    const currentOrders = currentPeriodOrdersRes.data || [];
    const previousOrders = previousPeriodOrdersRes.data || [];
    const currentRevenue = (currentPeriodRevenueRes.data || []).reduce((sum: number, o: any) => sum + (parseFloat(o.total_amount) || 0), 0);
    const previousRevenue = (previousPeriodRevenueRes.data || []).reduce((sum: number, o: any) => sum + (parseFloat(o.total_amount) || 0), 0);

    // Calcular crecimiento de usuarios y productos
    const [currentUsersRes, previousUsersRes, currentProductsRes, previousProductsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', previousStart.toISOString()).lte('created_at', previousEnd.toISOString()),
      supabase.from('products').select('id', { count: 'exact', head: true }).gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
      supabase.from('products').select('id', { count: 'exact', head: true }).gte('created_at', previousStart.toISOString()).lte('created_at', previousEnd.toISOString()),
    ]);

    const currentUsers = currentUsersRes.count || 0;
    const previousUsers = previousUsersRes.count || 0;
    const currentProducts = currentProductsRes.count || 0;
    const previousProducts = previousProductsRes.count || 0;

    // Cálculo de crecimiento
    const calculateGrowth = (current: number, previous: number) => {
      const growth = current - previous;
      const growth_percentage = previous > 0 ? ((growth / previous) * 100) : (current > 0 ? 100 : 0);
      return { current, previous, growth, growth_percentage };
    };

    const growth_metrics: GrowthMetrics = {
      users: calculateGrowth(currentUsers, previousUsers),
      orders: calculateGrowth(currentOrders.length, previousOrders.length),
      revenue: calculateGrowth(currentRevenue, previousRevenue),
      products: calculateGrowth(currentProducts, previousProducts),
    };

    // Datos para gráficos (últimos días según timeRange)
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : timeRange === '1y' ? 365 : 30;
    
    // Optimizar: hacer consultas en batch en lugar de una por día
    const chartStart = new Date(end);
    chartStart.setDate(chartStart.getDate() - days);
    chartStart.setHours(0, 0, 0, 0);

    // Obtener todas las órdenes del período de una vez
    const { data: allOrdersInPeriod } = await supabase
      .from('orders')
      .select('id, total_amount, payment_status, created_at')
      .gte('created_at', chartStart.toISOString())
      .lte('created_at', end.toISOString())
      .eq('payment_status', 'paid');

    // Obtener todos los usuarios del período de una vez
    const { data: allUsersInPeriod } = await supabase
      .from('profiles')
      .select('id, role, created_at')
      .gte('created_at', chartStart.toISOString())
      .lte('created_at', end.toISOString());

    // Agrupar por fecha
    const salesChart: SalesChartData[] = [];
    const userGrowthChart: UserGrowthData[] = [];
    const salesByDate = new Map<string, { orders: number; revenue: number }>();
    const usersByDate = new Map<string, { new_users: number; new_sellers: number }>();

    // Inicializar todos los días
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(end);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      salesByDate.set(dateStr, { orders: 0, revenue: 0 });
      usersByDate.set(dateStr, { new_users: 0, new_sellers: 0 });
    }

    // Procesar órdenes
    (allOrdersInPeriod || []).forEach((order: any) => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      if (salesByDate.has(orderDate)) {
        const day = salesByDate.get(orderDate)!;
        day.orders += 1;
        day.revenue += parseFloat(order.total_amount) || 0;
      }
    });

    // Procesar usuarios
    (allUsersInPeriod || []).forEach((user: any) => {
      const userDate = new Date(user.created_at).toISOString().split('T')[0];
      if (usersByDate.has(userDate)) {
        const day = usersByDate.get(userDate)!;
        day.new_users += 1;
        if (user.role === 'seller') {
          day.new_sellers += 1;
        }
      }
    });

    // Convertir a arrays ordenados
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(end);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      
      const sales = salesByDate.get(dateStr) || { orders: 0, revenue: 0 };
      const users = usersByDate.get(dateStr) || { new_users: 0, new_sellers: 0 };
      
      salesChart.push({
        date: dateStr,
        orders: sales.orders,
        revenue: sales.revenue,
      });

      userGrowthChart.push({
        date: dateStr,
        new_users: users.new_users,
        new_sellers: users.new_sellers,
      });
    }

    // Estadísticas por categoría
    const { data: categoryData } = await supabase
      .from('products')
      .select('category_id, categories(name)')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    const categoryMap = new Map<string, CategoryStats>();
    (categoryData || []).forEach((p: any) => {
      const catId = p.category_id || 'sin-categoria';
      const catName = (p.categories as any)?.name || 'Sin categoría';
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          category_id: catId,
          category_name: catName,
          total_products: 0,
          total_orders: 0,
          total_revenue: 0,
        });
      }
      const cat = categoryMap.get(catId)!;
      cat.total_products += 1;
    });

    // Obtener órdenes por categoría
    const { data: orderItemsData } = await supabase
      .from('order_items')
      .select('product_id, total_price, products(category_id)')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    (orderItemsData || []).forEach((item: any) => {
      const catId = (item.products as any)?.category_id || 'sin-categoria';
      if (categoryMap.has(catId)) {
        const cat = categoryMap.get(catId)!;
        cat.total_orders += 1;
        cat.total_revenue += parseFloat(item.total_price) || 0;
      }
    });

    const category_stats = Array.from(categoryMap.values())
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 10);

    // Top vendedores
    const { data: topSellersData } = await supabase
      .from('orders')
      .select('seller_id, total_amount, profiles!orders_seller_id_fkey(id, email, first_name, last_name)')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .eq('payment_status', 'paid');

    const sellerMap = new Map<string, TopSeller>();
    (topSellersData || []).forEach((order: any) => {
      const sellerId = order.seller_id;
      if (!sellerId) return;

      if (!sellerMap.has(sellerId)) {
        const seller = (order.profiles as any) || {};
        sellerMap.set(sellerId, {
          seller_id: sellerId,
          seller_name: seller.first_name || seller.last_name ? `${seller.first_name || ''} ${seller.last_name || ''}`.trim() : seller.email || 'N/A',
          seller_email: seller.email || 'N/A',
          total_orders: 0,
          total_revenue: 0,
          total_products: 0,
          average_rating: 0,
        });
      }
      const seller = sellerMap.get(sellerId)!;
      seller.total_orders += 1;
      seller.total_revenue += parseFloat(order.total_amount) || 0;
    });

    // Agregar productos y rating a vendedores
    await Promise.all(
      Array.from(sellerMap.keys()).map(async (sellerId) => {
        const [productsRes, reviewsRes] = await Promise.all([
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('seller_id', sellerId),
          supabase.from('reviews').select('rating').eq('seller_id', sellerId),
        ]);

        const seller = sellerMap.get(sellerId)!;
        seller.total_products = productsRes.count || 0;

        const reviews = reviewsRes.data || [];
        if (reviews.length > 0) {
          seller.average_rating =
            reviews.reduce((sum: number, r: any) => sum + (parseFloat(r.rating) || 0), 0) / reviews.length;
        }
      })
    );

    const top_sellers = Array.from(sellerMap.values())
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 10);

    // Órdenes por estado
    const { data: ordersByStatusData } = await supabase
      .from('orders')
      .select('status, payment_status, total_amount')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    const orders_by_status: Record<string, number> = {};
    const revenue_by_status: Record<string, number> = {};

    (ordersByStatusData || []).forEach((order: any) => {
      const status = order.status || 'unknown';
      orders_by_status[status] = (orders_by_status[status] || 0) + 1;
      revenue_by_status[status] = (revenue_by_status[status] || 0) + (parseFloat(order.total_amount) || 0);
    });

    return {
      total_users: total_users,
      total_sellers: total_sellers,
      total_products: total_products,
      total_orders: total_orders,
      total_revenue: currentRevenue,
      growth_metrics: growth_metrics,
      sales_chart: salesChart,
      user_growth_chart: userGrowthChart,
      category_stats: category_stats,
      top_sellers: top_sellers,
      orders_by_status: orders_by_status,
      revenue_by_status: revenue_by_status,
    };
  } catch (error) {
    console.error('Error generating analytics report:', error);
    return null;
  }
}

/**
 * Exporta datos a CSV
 */
export function exportToCSV(data: any[], filename: string): void {
  if (!data || data.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escapar comillas y comas
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exporta reporte completo a CSV
 */
export async function exportFullReport(timeRange: TimeRange = '30d'): Promise<void> {
  const report = await getAnalyticsReport(timeRange);
  if (!report) {
    alert('Error al generar el reporte');
    return;
  }

  // Crear múltiples CSVs para diferentes secciones
  const reports: Array<{ name: string; data: any[] }> = [];

  // 1. Resumen general
  reports.push({
    name: 'resumen',
    data: [
      {
        Métrica: 'Total Usuarios',
        Valor: report.total_users,
      },
      {
        Métrica: 'Total Vendedores',
        Valor: report.total_sellers,
      },
      {
        Métrica: 'Total Productos',
        Valor: report.total_products,
      },
      {
        Métrica: 'Total Órdenes',
        Valor: report.total_orders,
      },
      {
        Métrica: 'Ingresos Totales',
        Valor: report.total_revenue,
      },
    ],
  });

  // 2. Métricas de crecimiento
  reports.push({
    name: 'crecimiento',
    data: [
      {
        Métrica: 'Usuarios',
        Período_Actual: report.growth_metrics.users.current,
        Período_Anterior: report.growth_metrics.users.previous,
        Crecimiento: report.growth_metrics.users.growth,
        Porcentaje: `${report.growth_metrics.users.growth_percentage.toFixed(2)}%`,
      },
      {
        Métrica: 'Órdenes',
        Período_Actual: report.growth_metrics.orders.current,
        Período_Anterior: report.growth_metrics.orders.previous,
        Crecimiento: report.growth_metrics.orders.growth,
        Porcentaje: `${report.growth_metrics.orders.growth_percentage.toFixed(2)}%`,
      },
      {
        Métrica: 'Ingresos',
        Período_Actual: report.growth_metrics.revenue.current,
        Período_Anterior: report.growth_metrics.revenue.previous,
        Crecimiento: report.growth_metrics.revenue.growth,
        Porcentaje: `${report.growth_metrics.revenue.growth_percentage.toFixed(2)}%`,
      },
      {
        Métrica: 'Productos',
        Período_Actual: report.growth_metrics.products.current,
        Período_Anterior: report.growth_metrics.products.previous,
        Crecimiento: report.growth_metrics.products.growth,
        Porcentaje: `${report.growth_metrics.products.growth_percentage.toFixed(2)}%`,
      },
    ],
  });

  // 3. Ventas diarias
  reports.push({
    name: 'ventas_diarias',
    data: report.sales_chart.map((item) => ({
      Fecha: item.date,
      Órdenes: item.orders,
      Ingresos: item.revenue,
    })),
  });

  // 4. Crecimiento de usuarios
  reports.push({
    name: 'crecimiento_usuarios',
    data: report.user_growth_chart.map((item) => ({
      Fecha: item.date,
      Nuevos_Usuarios: item.new_users,
      Nuevos_Vendedores: item.new_sellers,
    })),
  });

  // 5. Estadísticas por categoría
  reports.push({
    name: 'categorias',
    data: report.category_stats.map((cat) => ({
      Categoría: cat.category_name,
      Productos: cat.total_products,
      Órdenes: cat.total_orders,
      Ingresos: cat.total_revenue,
    })),
  });

  // 6. Top vendedores
  reports.push({
    name: 'top_vendedores',
    data: report.top_sellers.map((seller) => ({
      Vendedor: seller.seller_name,
      Email: seller.seller_email,
      Órdenes: seller.total_orders,
      Ingresos: seller.total_revenue,
      Productos: seller.total_products,
      Calificación_Promedio: seller.average_rating.toFixed(2),
    })),
  });

  // Exportar todos los reportes
  reports.forEach((report) => {
    exportToCSV(report.data, report.name);
  });
}

