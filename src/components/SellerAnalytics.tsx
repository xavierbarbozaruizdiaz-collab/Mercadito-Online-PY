// src/components/SellerAnalytics.tsx
// Dashboard analítico completo para vendedores

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  getSellerAnalyticsReport,
  type SellerAnalyticsReport,
  type TimeRange,
} from '@/lib/services/sellerAnalyticsService';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import LoadingSpinner from './ui/LoadingSpinner';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Package,
  Users,
  Target,
  BarChart3,
  PieChart
} from 'lucide-react';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils/index';

interface SellerAnalyticsProps {
  periodDays?: number;
}

// Tipos derivados del servicio
interface SalesStats {
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
}

interface SalesTrendData {
  period_date: string;
  total_revenue: number;
}

interface TopProduct {
  product_id: string;
  product_title: string;
  total_quantity: number;
  total_revenue: number;
  order_count: number;
  average_rating: number;
}

interface CategoryStats {
  category_id: string;
  category_name: string;
  total_revenue: number;
  total_products: number;
  total_sales: number;
}

interface ConversionMetrics {
  total_product_views: number;
  total_adds_to_cart: number;
  total_checkouts: number;
  total_orders: number;
  cart_conversion_rate: number;
  checkout_conversion_rate: number;
  overall_conversion_rate: number;
}

interface RepeatCustomer {
  customer_id: string;
  customer_name: string;
  order_count: number;
  total_spent: number;
  last_order_date: string;
}

export default function SellerAnalytics({ periodDays = 30 }: SellerAnalyticsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<SellerAnalyticsReport | null>(null);

  useEffect(() => {
    if (!user) return;
    loadAnalytics();
  }, [user, periodDays]);

  const loadAnalytics = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Convertir periodDays a TimeRange
      const timeRange: TimeRange = periodDays <= 7 ? '7d' : periodDays <= 30 ? '30d' : periodDays <= 90 ? '90d' : '1y';
      const analyticsReport = await getSellerAnalyticsReport(user.id, timeRange);
      setReport(analyticsReport);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Convertir el reporte a los tipos esperados por los componentes
  const salesStats: SalesStats | null = report ? {
    total_revenue: report.summary.totalRevenue,
    total_orders: report.summary.totalOrders,
    average_order_value: report.summary.averageOrderValue,
  } : null;

  const salesTrend: SalesTrendData[] = report?.salesTrend.map(t => ({
    period_date: t.date,
    total_revenue: t.revenue,
  })) || [];

  const topProducts: TopProduct[] = report?.topProducts.map(p => ({
    product_id: p.id,
    product_title: p.title,
    total_quantity: p.total_sold,
    total_revenue: p.revenue,
    order_count: 0, // No disponible en el reporte
    average_rating: 0, // No disponible en el reporte
  })) || [];

  const categoryStats: CategoryStats[] = report?.salesByCategory.map(c => ({
    category_id: c.category_id,
    category_name: c.category_name,
    total_revenue: c.revenue,
    total_products: c.products,
    total_sales: c.orders,
  })) || [];

  const conversionMetrics: ConversionMetrics | null = report ? {
    total_product_views: 0, // No disponible en el reporte actual
    total_adds_to_cart: 0, // No disponible en el reporte actual
    total_checkouts: 0, // No disponible en el reporte actual
    total_orders: report.summary.totalOrders,
    cart_conversion_rate: 0, // No disponible en el reporte actual
    checkout_conversion_rate: 0, // No disponible en el reporte actual
    overall_conversion_rate: report.summary.conversionRate,
  } : null;

  const repeatCustomers: RepeatCustomer[] = report?.topCustomers.map(c => ({
    customer_id: c.user_id,
    customer_name: c.name,
    order_count: c.total_orders,
    total_spent: c.total_spent,
    last_order_date: c.last_order_date,
  })) || [];

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Ingresos Totales"
          value={formatCurrency(salesStats?.total_revenue || 0)}
          icon={<DollarSign className="w-5 h-5" />}
          color="green"
        />
        <MetricCard
          title="Pedidos"
          value={formatNumber(salesStats?.total_orders || 0)}
          icon={<ShoppingCart className="w-5 h-5" />}
          color="blue"
        />
        <MetricCard
          title="Ticket Promedio"
          value={formatCurrency(salesStats?.average_order_value || 0)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple"
        />
        <MetricCard
          title="Tasa Conversión"
          value={`${conversionMetrics?.overall_conversion_rate?.toFixed(1) || '0.0'}%`}
          icon={<Target className="w-5 h-5" />}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de tendencia de ventas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Tendencias de Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SalesTrendChart data={salesTrend} />
          </CardContent>
        </Card>

        {/* Productos más vendidos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Productos Más Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TopProductsList products={topProducts} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estadísticas por categoría */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Ventas por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryStatsList stats={categoryStats} />
          </CardContent>
        </Card>

        {/* Clientes recurrentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Clientes Recurrentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RepeatCustomersList customers={repeatCustomers} />
          </CardContent>
        </Card>
      </div>

      {/* Métricas de conversión */}
      {conversionMetrics && (
        <Card>
          <CardHeader>
            <CardTitle>Métricas de Conversión</CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionMetricsDisplay metrics={conversionMetrics} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Componente de tarjeta de métrica
function MetricCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'purple' | 'orange';
}) {
  const colors = {
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    orange: 'bg-orange-100 text-orange-800',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${colors[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Gráfico de tendencia de ventas (barras simples)
function SalesTrendChart({ data }: { data: SalesTrendData[] }) {
  if (data.length === 0) {
    return <p className="text-gray-500 text-center py-8">No hay datos disponibles</p>;
  }

  const maxRevenue = Math.max(...data.map(d => d.total_revenue), 1);

  return (
    <div className="space-y-4">
      {data.slice(-14).map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="w-20 text-xs text-gray-600">
            {formatDate(item.period_date)}
          </div>
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all"
                style={{ width: `${(item.total_revenue / maxRevenue) * 100}%` }}
              />
            </div>
            <div className="text-sm font-medium w-20 text-right">
              {formatCurrency(item.total_revenue)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Lista de productos más vendidos
function TopProductsList({ products }: { products: TopProduct[] }) {
  if (products.length === 0) {
    return <p className="text-gray-500 text-center py-8">No hay productos vendidos</p>;
  }

  return (
    <div className="space-y-3">
      {products.map((product, index) => (
        <div key={product.product_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">#{index + 1}</span>
              <span className="font-medium">{product.product_title}</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {formatNumber(product.total_quantity)} unidades • {formatNumber(product.order_count)} pedidos
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-green-600">
              {formatCurrency(product.total_revenue)}
            </div>
            {product.average_rating > 0 && (
              <div className="text-xs text-gray-500">
                ⭐ {product.average_rating.toFixed(1)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Lista de estadísticas por categoría
function CategoryStatsList({ stats }: { stats: CategoryStats[] }) {
  if (stats.length === 0) {
    return <p className="text-gray-500 text-center py-8">No hay ventas por categoría</p>;
  }

  const maxRevenue = Math.max(...stats.map(s => s.total_revenue), 1);

  return (
    <div className="space-y-3">
      {stats.map((stat) => (
        <div key={stat.category_id} className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium">{stat.category_name}</span>
            <span className="text-sm font-bold text-green-600">
              {formatCurrency(stat.total_revenue)}
            </span>
          </div>
          <div className="flex gap-2 text-xs text-gray-500">
            <span>{formatNumber(stat.total_products)} productos</span>
            <span>•</span>
            <span>{formatNumber(stat.total_sales)} ventas</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full"
              style={{ width: `${(stat.total_revenue / maxRevenue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Lista de clientes recurrentes
function RepeatCustomersList({ customers }: { customers: RepeatCustomer[] }) {
  if (customers.length === 0) {
    return <p className="text-gray-500 text-center py-8">No hay clientes recurrentes</p>;
  }

  return (
    <div className="space-y-3">
      {customers.slice(0, 10).map((customer) => (
        <div key={customer.customer_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium">{customer.customer_name}</div>
            <div className="text-sm text-gray-500">
              {customer.order_count} pedidos • Último: {formatDate(customer.last_order_date)}
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-green-600">
              {formatCurrency(customer.total_spent)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Display de métricas de conversión
function ConversionMetricsDisplay({ metrics }: { metrics: ConversionMetrics }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <div className="text-2xl font-bold text-blue-600">{formatNumber(metrics.total_product_views)}</div>
        <div className="text-sm text-gray-600 mt-1">Vistas</div>
      </div>
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <div className="text-2xl font-bold text-purple-600">{formatNumber(metrics.total_adds_to_cart)}</div>
        <div className="text-sm text-gray-600 mt-1">En Carrito</div>
        <div className="text-xs text-gray-500 mt-1">
          {metrics.cart_conversion_rate.toFixed(1)}% tasa
        </div>
      </div>
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <div className="text-2xl font-bold text-orange-600">{formatNumber(metrics.total_checkouts)}</div>
        <div className="text-sm text-gray-600 mt-1">Checkouts</div>
        <div className="text-xs text-gray-500 mt-1">
          {metrics.checkout_conversion_rate.toFixed(1)}% tasa
        </div>
      </div>
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <div className="text-2xl font-bold text-green-600">{formatNumber(metrics.total_orders)}</div>
        <div className="text-sm text-gray-600 mt-1">Órdenes</div>
        <div className="text-xs text-gray-500 mt-1">
          {metrics.overall_conversion_rate.toFixed(1)}% conversión
        </div>
      </div>
    </div>
  );
}

