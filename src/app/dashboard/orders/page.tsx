'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ShoppingCart, 
  Package, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Eye,
  Filter,
  Printer
} from 'lucide-react';
import OrderPrintView from '@/components/orders/OrderPrintView';

type OrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product: {
    id: string;
    title: string;
    cover_url: string | null;
  };
};

type Order = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  shipping_address: any;
  payment_method: string;
  notes: string | null;
  order_items: OrderItem[];
  buyer: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  } | null;
};

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [store, setStore] = useState<any>(null);

  useEffect(() => {
    loadOrders();
    loadStore();
  }, [statusFilter]);

  async function loadStore() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        return;
      }

      const sellerId = session.session.user.id;
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('is_active', true)
        .maybeSingle();

      if (storeError && storeError.code !== 'PGRST116') {
        console.error('Error cargando tienda:', storeError);
      } else if (storeData) {
        setStore(storeData);
      }
    } catch (err) {
      console.error('Error cargando tienda:', err);
    }
  }

  async function loadOrders() {
    try {
      setLoading(true);
      setError(null);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        setError('No hay sesión activa');
        setLoading(false);
        return;
      }

      const sellerId = session.session.user.id;
      console.log('🛒 Cargando órdenes del vendedor:', sellerId);

      // Obtener órdenes que contienen productos del vendedor
      // Primero obtener order_items del vendedor
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          quantity,
          unit_price,
          total_price,
          product:products (
            id,
            title,
            cover_url
          )
        `)
        .eq('seller_id', sellerId);

      if (itemsError) {
        console.error('Error cargando order_items:', itemsError);
        throw itemsError;
      }

      if (!orderItems || orderItems.length === 0) {
        console.log('ℹ️ No hay order_items para este vendedor');
        setOrders([]);
        setLoading(false);
        return;
      }

      // Obtener IDs únicos de órdenes
      const orderIds = [...new Set(orderItems.map((item: any) => item.order_id))];

      // Obtener órdenes con detalles
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          created_at,
          shipping_address,
          payment_method,
          notes,
          buyer_id
        `)
        .in('id', orderIds)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error cargando órdenes:', ordersError);
        throw ordersError;
      }

      // Filtrar por estado si es necesario
      let filteredOrders = ordersData || [];
      if (statusFilter !== 'all') {
        filteredOrders = filteredOrders.filter((o: any) => o.status === statusFilter);
      }

      // Combinar órdenes con sus items y datos del comprador
      const enrichedOrders = await Promise.all(
        filteredOrders.map(async (order: any) => {
          // Obtener items de esta orden que pertenecen al vendedor
          const orderItemsForThisOrder = orderItems.filter(
            (item: any) => item.order_id === order.id
          );

          // Obtener información del comprador
          let buyer = null;
          if (order.buyer_id) {
            const { data: buyerData } = await supabase
              .from('profiles')
              .select('id, email, first_name, last_name, phone')
              .eq('id', order.buyer_id)
              .single();
            
            buyer = buyerData;
          }

          return {
            ...order,
            order_items: orderItemsForThisOrder.map((item: any) => ({
              id: item.id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              product: item.product,
            })),
            buyer,
          };
        })
      );

      console.log('✅ Órdenes cargadas:', {
        total: enrichedOrders.length,
        orders: enrichedOrders.map(o => ({
          id: o.id,
          status: o.status,
          items_count: o.order_items.length,
          total: o.total_amount
        }))
      });

      setOrders(enrichedOrders as Order[]);
    } catch (err: any) {
      console.error('❌ Error cargando órdenes:', err);
      setError(err.message || 'Error al cargar las órdenes');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    try {
      setUpdating(orderId);
      
      // Using 'as any' to bypass Supabase strict type constraint for updates
      const { error } = await (supabase as any)
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Recargar órdenes
      await loadOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      alert(`Error al actualizar el estado: ${err.message}`);
    } finally {
      setUpdating(null);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'shipped': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'confirmed': return 'Confirmado';
      case 'shipped': return 'Enviado';
      case 'delivered': return 'Entregado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'shipped': return <Truck className="w-4 h-4" />;
      case 'delivered': return <Package className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  }

  const totalRevenue = orders.reduce((sum, order) => {
    // Calcular el total de items del vendedor en esta orden
    const sellerTotal = order.order_items.reduce((itemSum, item) => itemSum + item.total_price, 0);
    return sum + sellerTotal;
  }, 0);

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const confirmedOrders = orders.filter(o => o.status === 'confirmed').length;
  const shippedOrders = orders.filter(o => o.status === 'shipped').length;

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mis Ventas</h1>
              <p className="text-gray-600 mt-1">Gestiona las órdenes de tus productos</p>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Órdenes</p>
                <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingOrders}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Confirmadas</p>
                <p className="text-2xl font-bold text-blue-600">{confirmedOrders}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ingresos Totales</p>
                <p className="text-2xl font-bold text-green-600">
                  {totalRevenue.toLocaleString('es-PY')} Gs.
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtrar por estado:</span>
            {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'Todas' : getStatusText(status)}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Lista de órdenes */}
        {orders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-600 mb-2">
              {statusFilter === 'all' 
                ? 'No tienes órdenes aún' 
                : `No hay órdenes con estado "${getStatusText(statusFilter)}"`}
            </h2>
            <p className="text-gray-500 mb-6">
              {statusFilter === 'all'
                ? 'Cuando recibas pedidos de tus productos, aparecerán aquí'
                : 'Intenta cambiar el filtro para ver otras órdenes'}
            </p>
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ver todas las órdenes
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  {/* Header de la orden */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Orden #{order.id.slice(0, 8)}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(order.created_at).toLocaleDateString('es-PY', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-semibold text-gray-900">
                            {order.order_items.reduce((sum, item) => sum + item.total_price, 0).toLocaleString('es-PY')} Gs.
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPrintOrder(order)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Imprimir
                      </button>
                      <button
                        onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        {selectedOrder?.id === order.id ? 'Ocultar' : 'Ver'} Detalles
                      </button>
                    </div>
                  </div>

                  {/* Productos de la orden */}
                  <div className="space-y-3 mb-4">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                          {item.product.cover_url ? (
                            <Image
                              src={item.product.cover_url}
                              alt={item.product.title}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/products/${item.product.id}`}
                            className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                          >
                            {item.product.title}
                          </Link>
                          <p className="text-sm text-gray-600">
                            Cantidad: {item.quantity} x {item.unit_price.toLocaleString('es-PY')} Gs.
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {item.total_price.toLocaleString('es-PY')} Gs.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Detalles expandidos */}
                  {selectedOrder?.id === order.id && (
                    <div className="border-t pt-4 mt-4 space-y-4">
                      {/* Información del comprador */}
                      {order.buyer && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Información del Comprador
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-700">{order.buyer.email}</span>
                            </div>
                            {order.buyer.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-700">{order.buyer.phone}</span>
                              </div>
                            )}
                            {(order.buyer.first_name || order.buyer.last_name) && (
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-700">
                                  {order.buyer.first_name} {order.buyer.last_name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Dirección de envío */}
                      {order.shipping_address && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Dirección de Envío
                          </h4>
                          <div className="text-sm text-gray-700 space-y-1">
                            <p>{order.shipping_address.fullName}</p>
                            <p>{order.shipping_address.address}</p>
                            {order.shipping_address.city && <p>{order.shipping_address.city}</p>}
                            {order.shipping_address.department && (
                              <p>{order.shipping_address.department}</p>
                            )}
                            {order.shipping_address.phone && (
                              <p className="flex items-center gap-1 mt-2">
                                <Phone className="w-4 h-4" />
                                {order.shipping_address.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Método de pago y notas */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Método de pago</p>
                          <p className="text-sm text-gray-600">
                            {order.payment_method === 'cash' && 'Efectivo contra entrega'}
                            {order.payment_method === 'transfer' && 'Transferencia bancaria'}
                            {order.payment_method === 'card' && 'Tarjeta de crédito/débito'}
                          </p>
                        </div>
                        {order.notes && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Notas del cliente</p>
                            <p className="text-sm text-gray-600">{order.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Actualizar estado */}
                      <div className="border-t pt-4">
                        <p className="text-sm font-medium text-gray-700 mb-3">Actualizar Estado</p>
                        <div className="flex flex-wrap gap-2">
                          {order.status !== 'confirmed' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'confirmed')}
                              disabled={updating === order.id}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              {updating === order.id ? 'Actualizando...' : 'Confirmar Orden'}
                            </button>
                          )}
                          {order.status === 'confirmed' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'shipped')}
                              disabled={updating === order.id}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              {updating === order.id ? 'Actualizando...' : 'Marcar como Enviado'}
                            </button>
                          )}
                          {order.status === 'shipped' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'delivered')}
                              disabled={updating === order.id}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              {updating === order.id ? 'Actualizando...' : 'Marcar como Entregado'}
                            </button>
                          )}
                          {order.status !== 'cancelled' && (
                            <button
                              onClick={() => {
                                if (confirm('¿Estás seguro de cancelar esta orden?')) {
                                  updateOrderStatus(order.id, 'cancelled');
                                }
                              }}
                              disabled={updating === order.id}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              {updating === order.id ? 'Actualizando...' : 'Cancelar'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de impresión */}
      {printOrder && (
        <OrderPrintView
          order={printOrder}
          store={store}
          onClose={() => setPrintOrder(null)}
        />
      )}
    </main>
  );
}

