// ============================================
// MERCADITO ONLINE PY - SELLER DASHBOARD
// Dashboard mejorado para vendedores
// ============================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, useStore, useRole } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import SellerAnalytics from '@/components/SellerAnalytics';
import { 
  Package, 
  Plus, 
  Edit, 
  Eye, 
  TrendingUp, 
  Users, 
  DollarSign,
  ShoppingCart,
  Store,
  Settings,
  BarChart3,
  Bell
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface DashboardStats {
  total_products: number;
  active_products: number;
  total_orders: number;
  pending_orders: number;
  total_revenue: number;
  monthly_revenue: number;
  total_customers: number;
  conversion_rate: number;
}

interface Product {
  id: string;
  title: string;
  price: number;
  status: string;
  stock_quantity: number;
  created_at: string;
  cover_url?: string;
}

interface Order {
  id: string;
  order_number: string;
  buyer_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  buyer: {
    first_name?: string;
    last_name?: string;
    email: string;
  };
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function SellerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { store, loading: storeLoading, createStore } = useStore();
  const { isSeller } = useRole();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar acceso
  useEffect(() => {
    if (!authLoading && !isSeller) {
      window.location.href = '/';
    }
  }, [authLoading, isSeller]);

  // Cargar datos del dashboard
  useEffect(() => {
    if (!user || !store) return;

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Cargar estadísticas
        // Intentar primero con stock_quantity, si falla intentar sin él
        let productsResult = await supabase
          .from('products')
          .select('id, status, stock_quantity, price, created_at')
          .eq('store_id', store.id);

        if (productsResult.error && productsResult.error.message?.includes('stock_quantity')) {
          // Si stock_quantity no existe, intentar sin él
          productsResult = await supabase
            .from('products')
            .select('id, status, price, created_at')
            .eq('store_id', store.id);
        }

        const ordersResult = await supabase
          .from('orders')
          .select('id, status, total_amount, created_at')
          .eq('seller_id', user.id);

        if (productsResult.error) throw productsResult.error;
        if (ordersResult.error) throw ordersResult.error;

        const products = productsResult.data || [];
        const orders = ordersResult.data || [];

        // Calcular estadísticas
        type ProductItem = { status: string };
        type OrderItem = { status: string; total_amount: number; created_at: string; buyer_id: string };
        
        const totalProducts = products.length;
        const activeProducts = products.filter((p: ProductItem) => p.status === 'active').length;
        const totalOrders = orders.length;
        const pendingOrders = orders.filter((o: OrderItem) => o.status === 'pending').length;
        const totalRevenue = orders.reduce((sum: number, order: OrderItem) => sum + order.total_amount, 0);
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyRevenue = orders
          .filter((order: OrderItem) => {
            const orderDate = new Date(order.created_at);
            return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
          })
          .reduce((sum: number, order: OrderItem) => sum + order.total_amount, 0);

        const uniqueCustomers = new Set(orders.map((o: OrderItem) => o.buyer_id)).size;
        const conversionRate = totalProducts > 0 ? (totalOrders / totalProducts) * 100 : 0;

        setStats({
          total_products: totalProducts,
          active_products: activeProducts,
          total_orders: totalOrders,
          pending_orders: pendingOrders,
          total_revenue: totalRevenue,
          monthly_revenue: monthlyRevenue,
          total_customers: uniqueCustomers,
          conversion_rate: conversionRate,
        });

        // Cargar productos recientes - Intentar con stock_quantity primero
        let recentProductsResult = await supabase
          .from('products')
          .select('id, title, price, status, stock_quantity, created_at, cover_url')
          .eq('store_id', store.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (recentProductsResult.error && recentProductsResult.error.message?.includes('stock_quantity')) {
          // Si stock_quantity no existe, intentar sin él
          recentProductsResult = await supabase
            .from('products')
            .select('id, title, price, status, created_at, cover_url')
            .eq('store_id', store.id)
            .order('created_at', { ascending: false })
            .limit(5);
        }

        if (recentProductsResult.data) {
          setRecentProducts(recentProductsResult.data);
        }

        // Cargar órdenes recientes
        const recentOrdersResult = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            buyer_id,
            status,
            total_amount,
            created_at,
            buyer:profiles!orders_buyer_id_fkey(first_name, last_name, email)
          `)
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (recentOrdersResult.data) {
          setRecentOrders(recentOrdersResult.data);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user, store]);

  // Mostrar loading
  if (authLoading || storeLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">❌ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Si no hay tienda, mostrar formulario para crear una
  if (!store) {
    return <CreateStoreForm onCreateStore={createStore} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard de Vendedor</h1>
              <p className="text-gray-600">Bienvenido, {user?.first_name || user?.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/seller/products/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Producto
              </Link>
              <Link
                href="/dashboard/seller/settings"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configuración
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Productos"
              value={stats.total_products}
              icon={Package}
              color="blue"
            />
            <StatCard
              title="Productos Activos"
              value={stats.active_products}
              icon={TrendingUp}
              color="green"
            />
            <StatCard
              title="Total Órdenes"
              value={stats.total_orders}
              icon={ShoppingCart}
              color="purple"
            />
            <StatCard
              title="Ingresos Totales"
              value={formatCurrency(stats.total_revenue)}
              icon={DollarSign}
              color="yellow"
            />
            <StatCard
              title="Ingresos del Mes"
              value={formatCurrency(stats.monthly_revenue)}
              icon={BarChart3}
              color="indigo"
            />
            <StatCard
              title="Clientes Únicos"
              value={stats.total_customers}
              icon={Users}
              color="pink"
            />
            <StatCard
              title="Órdenes Pendientes"
              value={stats.pending_orders}
              icon={Bell}
              color="orange"
            />
            <StatCard
              title="Tasa de Conversión"
              value={`${stats.conversion_rate.toFixed(1)}%`}
              icon={TrendingUp}
              color="teal"
            />
          </div>
        )}

        {/* Dashboard Analítico Avanzado */}
        <div className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Análisis Detallado</h2>
            <p className="text-gray-600">Estadísticas y métricas avanzadas de tu negocio</p>
          </div>
          <SellerAnalytics periodDays={30} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Productos Recientes */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Productos Recientes</h2>
                <Link
                  href="/dashboard/seller/products"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Ver todos
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {recentProducts.map((product) => (
                <ProductRow key={product.id} product={product} />
              ))}
              {recentProducts.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No tienes productos aún</p>
                  <Link
                    href="/dashboard/seller/products/new"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Crear tu primer producto
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Órdenes Recientes */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Órdenes Recientes</h2>
                <Link
                  href="/dashboard/seller/orders"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Ver todas
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {recentOrders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
              {recentOrders.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No tienes órdenes aún</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Acciones Rápidas</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuickAction
                title="Gestionar Productos"
                description="Agregar, editar o eliminar productos"
                icon={Package}
                href="/dashboard/seller/products"
                color="blue"
              />
              <QuickAction
                title="Ver Órdenes"
                description="Revisar y gestionar órdenes"
                icon={ShoppingCart}
                href="/dashboard/seller/orders"
                color="green"
              />
              <QuickAction
                title="Configurar Tienda"
                description="Personalizar tu tienda"
                icon={Store}
                href="/dashboard/seller/settings"
                color="purple"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    pink: 'bg-pink-100 text-pink-600',
    orange: 'bg-orange-100 text-orange-600',
    teal: 'bg-teal-100 text-teal-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

interface ProductRowProps {
  product: Product;
}

function ProductRow({ product }: ProductRowProps) {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-gray-100 text-gray-800',
    sold: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <div className="flex items-center">
        <img
          src={product.cover_url || 'https://placehold.co/60x60?text=Producto'}
          alt={product.title}
          className="w-12 h-12 object-cover rounded-md mr-4"
        />
        <div>
          <h3 className="text-sm font-medium text-gray-900">{product.title}</h3>
          <p className="text-sm text-gray-600">{formatCurrency(product.price)}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[product.status as keyof typeof statusColors]}`}>
          {product.status}
        </span>
        <div className="flex space-x-1">
          <Link
            href={`/dashboard/seller/products/${product.id}/edit`}
            className="p-1 text-gray-400 hover:text-blue-600"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </Link>
          <Link
            href={`/products/${product.id}`}
            className="p-1 text-gray-400 hover:text-green-600"
            title="Ver"
          >
            <Eye className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

interface OrderRowProps {
  order: Order;
}

function OrderRow({ order }: OrderRowProps) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    shipped: 'bg-blue-100 text-blue-800',
    delivered: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
  };

  const buyerName = order.buyer.first_name && order.buyer.last_name 
    ? `${order.buyer.first_name} ${order.buyer.last_name}`
    : order.buyer.email;

  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <div>
        <h3 className="text-sm font-medium text-gray-900">#{order.order_number}</h3>
        <p className="text-sm text-gray-600">{buyerName}</p>
        <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900">{formatCurrency(order.total_amount)}</p>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[order.status as keyof typeof statusColors]}`}>
          {order.status}
        </span>
      </div>
    </div>
  );
}

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
}

function QuickAction({ title, description, icon: Icon, href, color }: QuickActionProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <Link
      href={href}
      className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="ml-4">
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </Link>
  );
}

// ============================================
// FORMULARIO PARA CREAR TIENDA
// ============================================

interface CreateStoreFormProps {
  onCreateStore: (data: { name: string; slug: string; description?: string; location?: string; contact_email?: string; contact_phone?: string }) => Promise<{ id: string } | null>;
}

function CreateStoreForm({ onCreateStore }: CreateStoreFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    location: '',
    contact_email: '',
    contact_phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('El nombre de la tienda es requerido');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Generar slug automáticamente
      const slug = formData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      await onCreateStore({
        ...formData,
        slug,
      });

      // Recargar la página para mostrar el dashboard
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear tienda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Store className="w-16 h-16 mx-auto text-blue-600 mb-4" />
          <h2 className="text-3xl font-bold text-gray-900">Crear tu Tienda</h2>
          <p className="mt-2 text-gray-600">
            Configura tu tienda para empezar a vender
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nombre de la Tienda *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Mi Tienda Online"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Descripción
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe tu tienda..."
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                Ubicación
              </label>
              <input
                id="location"
                name="location"
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Asunción, Paraguay"
              />
            </div>

            <div>
              <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">
                Email de Contacto
              </label>
              <input
                id="contact_email"
                name="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="contacto@mitienda.com"
              />
            </div>

            <div>
              <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">
                Teléfono de Contacto
              </label>
              <input
                id="contact_phone"
                name="contact_phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="+595 21 123 456"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando...' : 'Crear Tienda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
