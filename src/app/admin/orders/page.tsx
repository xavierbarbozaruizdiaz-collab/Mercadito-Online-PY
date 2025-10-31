'use client';

import { useEffect, useState } from 'react';
import {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  resolveDispute,
  updatePaymentStatus,
  addInternalNotes,
  getOrderStats,
  type OrderAdmin,
  type OrderFilter,
  type OrderStats,
  type OrderStatus,
  type DisputeStatus,
  type PaymentStatus,
} from '@/lib/services/orderAdminService';
import { supabase } from '@/lib/supabaseClient';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [search, setSearch] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<OrderAdmin | null>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeResolution, setDisputeResolution] = useState<'resolved' | 'rejected'>('resolved');
  const [disputeNotes, setDisputeNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [sellers, setSellers] = useState<Array<{ id: string; email: string }>>([]);
  const [buyers, setBuyers] = useState<Array<{ id: string; email: string }>>([]);

  useEffect(() => {
    loadData();
    loadSellersAndBuyers();
  }, [filter, search, sellerId, buyerId, dateFrom, dateTo, page]);

  async function loadData() {
    setLoading(true);
    try {
      console.log('📦 Cargando órdenes...');
      const [ordersData, statsData] = await Promise.all([
        getAllOrders({
          page,
          limit: 20,
          filter,
          search: search || undefined,
          seller_id: sellerId || undefined,
          buyer_id: buyerId || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        }),
        getOrderStats(dateFrom || undefined, dateTo || undefined),
      ]);

      console.log('✅ Órdenes cargadas:', ordersData.orders.length);
      setOrders(ordersData.orders);
      setTotalPages(ordersData.total_pages);
      setStats(statsData);
    } catch (error: any) {
      console.error('❌ Error loading orders:', error);
      alert(`Error cargando órdenes: ${error.message || 'Error desconocido'}`);
      // Establecer valores por defecto para que no quede en loading infinito
      setOrders([]);
      setTotalPages(1);
      setStats({
        total: 0,
        pending: 0,
        paid: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        refunded: 0,
        disputed: 0,
        total_revenue: 0,
        total_refunds: 0,
        average_order_value: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadSellersAndBuyers() {
    try {
      // Cargar lista de vendedores y compradores para filtros
      const [sellersRes, buyersRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, email')
          .eq('role', 'seller')
          .limit(100),
        supabase
          .from('orders')
          .select('buyer_id')
          .limit(100),
      ]);

      if (sellersRes.data) {
        setSellers(sellersRes.data.map((s: any) => ({ id: s.id, email: s.email })));
      }

      if (buyersRes.data) {
        const uniqueBuyerIds = [...new Set(buyersRes.data.map((o: any) => o.buyer_id).filter(Boolean))];
        
        // Limitar a 20 compradores únicos para evitar demasiadas consultas
        const buyersData = await Promise.allSettled(
          uniqueBuyerIds.slice(0, 20).map(async (id) => {
            const { data } = await supabase
              .from('profiles')
              .select('id, email')
              .eq('id', id)
              .single();

            return data ? { id: (data as { id: string; email: string }).id, email: (data as { id: string; email: string }).email } : null;
          })
        );

        const successfulBuyers = buyersData
          .filter((result) => result.status === 'fulfilled' && result.value)
          .map((result) => (result as PromiseFulfilledResult<any>).value);

        setBuyers(successfulBuyers as Array<{ id: string; email: string }>);
      }
    } catch (error: any) {
      console.error('Error cargando vendedores/compradores:', error);
      // Continuar sin bloquear la carga de órdenes
    }
  }

  async function handleStatusChange(order: OrderAdmin, newStatus: OrderStatus) {
    if (!confirm(`¿Cambiar estado de orden #${order.order_number} a ${newStatus}?`)) return;

    setProcessing(order.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      await updateOrderStatus(order.id, newStatus, user.id);
      await loadData();
      if (selectedOrder?.id === order.id) {
        const updated = await getOrderById(order.id);
        if (updated) setSelectedOrder(updated);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  }

  async function handlePaymentStatusChange(order: OrderAdmin, newStatus: PaymentStatus) {
    if (!confirm(`¿Cambiar estado de pago a ${newStatus}?`)) return;

    setProcessing(order.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      await updatePaymentStatus(order.id, newStatus, user.id);
      await loadData();
      if (selectedOrder?.id === order.id) {
        const updated = await getOrderById(order.id);
        if (updated) setSelectedOrder(updated);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  }

  async function handleResolveDispute() {
    if (!selectedOrder) return;
    if (!disputeNotes.trim()) {
      alert('Debes ingresar notas de resolución');
      return;
    }

    setProcessing(selectedOrder.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      await resolveDispute(selectedOrder.id, disputeResolution, user.id, disputeNotes);
      await loadData();
      const updated = await getOrderById(selectedOrder.id);
      if (updated) {
        setSelectedOrder(updated);
        setShowDisputeModal(false);
        setDisputeNotes('');
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  }

  async function handleAddInternalNotes() {
    if (!selectedOrder) return;
    if (!internalNotes.trim()) {
      alert('Debes ingresar notas');
      return;
    }

    setProcessing(selectedOrder.id);
    try {
      await addInternalNotes(selectedOrder.id, internalNotes);
      const updated = await getOrderById(selectedOrder.id);
      if (updated) {
        setSelectedOrder(updated);
        setInternalNotes('');
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getDisputeColor(status: string) {
    switch (status) {
      case 'pending':
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  if (loading && orders.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando órdenes...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestión de Órdenes</h1>
          <p className="text-gray-600 mt-2">Administrar órdenes, disputas y transacciones</p>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Pendientes</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Pagadas</div>
              <div className="text-2xl font-bold text-blue-600">{stats.paid}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Enviadas</div>
              <div className="text-2xl font-bold text-purple-600">{stats.shipped}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Entregadas</div>
              <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Canceladas</div>
              <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Reembolsadas</div>
              <div className="text-2xl font-bold text-gray-600">{stats.refunded}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Disputas</div>
              <div className="text-2xl font-bold text-orange-600">{stats.disputed}</div>
            </div>
          </div>
        )}

        {/* Reporte de ingresos */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
              <div className="text-sm text-green-700 font-medium">Ingresos Totales</div>
              <div className="text-3xl font-bold text-green-900">₲ {stats.total_revenue.toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-700 font-medium">Ticket Promedio</div>
              <div className="text-3xl font-bold text-blue-900">₲ {Math.round(stats.average_order_value).toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
              <div className="text-sm text-red-700 font-medium">Reembolsos</div>
              <div className="text-3xl font-bold text-red-900">₲ {stats.total_refunds.toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <input
                type="text"
                placeholder="Buscar por número de orden..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <input
                type="date"
                placeholder="Fecha desde"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <input
                type="date"
                placeholder="Fecha hasta"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={sellerId}
                onChange={(e) => {
                  setSellerId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los vendedores</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {(['all', 'pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded', 'disputed'] as OrderFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f === 'all' && 'Todas'}
                {f === 'pending' && 'Pendientes'}
                {f === 'paid' && 'Pagadas'}
                {f === 'shipped' && 'Enviadas'}
                {f === 'delivered' && 'Entregadas'}
                {f === 'cancelled' && 'Canceladas'}
                {f === 'refunded' && 'Reembolsadas'}
                {f === 'disputed' && 'Disputas'}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla de órdenes */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orden #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comprador
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Disputa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.order_number || order.id.substring(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.buyer ? (
                        <div>
                          <div>{order.buyer.first_name || order.buyer.last_name ? `${order.buyer.first_name || ''} ${order.buyer.last_name || ''}`.trim() : order.buyer.email}</div>
                          <div className="text-xs text-gray-400">{order.buyer.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.seller ? (
                        <div>
                          <div>{order.seller.first_name || order.seller.last_name ? `${order.seller.first_name || ''} ${order.seller.last_name || ''}`.trim() : order.seller.email}</div>
                          <div className="text-xs text-gray-400">{order.seller.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order, e.target.value as OrderStatus)}
                        disabled={processing === order.id}
                        className={`px-2 py-1 rounded text-xs font-medium border-none ${getStatusColor(order.status)}`}
                      >
                        <option value="pending">Pendiente</option>
                        <option value="confirmed">Confirmada</option>
                        <option value="shipped">Enviada</option>
                        <option value="delivered">Entregada</option>
                        <option value="cancelled">Cancelada</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={order.payment_status}
                        onChange={(e) => handlePaymentStatusChange(order, e.target.value as PaymentStatus)}
                        disabled={processing === order.id}
                        className={`px-2 py-1 rounded text-xs font-medium border-none ${getStatusColor(order.payment_status)}`}
                      >
                        <option value="pending">Pendiente</option>
                        <option value="paid">Pagado</option>
                        <option value="failed">Fallido</option>
                        <option value="refunded">Reembolsado</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getDisputeColor(order.dispute_status)}`}>
                        {order.dispute_status === 'none' && 'Sin disputa'}
                        {order.dispute_status === 'pending' && 'Pendiente'}
                        {order.dispute_status === 'under_review' && 'En revisión'}
                        {order.dispute_status === 'resolved' && 'Resuelta'}
                        {order.dispute_status === 'rejected' && 'Rechazada'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₲ {order.total_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('es-PY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={async () => {
                          const orderDetails = await getOrderById(order.id);
                          if (orderDetails) setSelectedOrder(orderDetails);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-2"
                      >
                        Ver
                      </button>
                      {order.dispute_status !== 'none' && order.dispute_status !== 'resolved' && order.dispute_status !== 'rejected' && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDisputeModal(true);
                          }}
                          className="text-orange-600 hover:text-orange-900"
                        >
                          Resolver
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Página {page} de {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal de detalles de orden */}
        {selectedOrder && !showDisputeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Orden #{selectedOrder.order_number || selectedOrder.id.substring(0, 8)}</h2>
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setInternalNotes('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Información general */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="font-semibold mb-2">Comprador</h3>
                  {selectedOrder.buyer ? (
                    <div className="text-sm">
                      <div>{selectedOrder.buyer.first_name || selectedOrder.buyer.last_name ? `${selectedOrder.buyer.first_name || ''} ${selectedOrder.buyer.last_name || ''}`.trim() : selectedOrder.buyer.email}</div>
                      <div className="text-gray-500">{selectedOrder.buyer.email}</div>
                      {selectedOrder.buyer.phone && <div className="text-gray-500">{selectedOrder.buyer.phone}</div>}
                    </div>
                  ) : (
                    <div className="text-gray-400">N/A</div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Vendedor</h3>
                  {selectedOrder.seller ? (
                    <div className="text-sm">
                      <div>{selectedOrder.seller.first_name || selectedOrder.seller.last_name ? `${selectedOrder.seller.first_name || ''} ${selectedOrder.seller.last_name || ''}`.trim() : selectedOrder.seller.email}</div>
                      <div className="text-gray-500">{selectedOrder.seller.email}</div>
                    </div>
                  ) : (
                    <div className="text-gray-400">N/A</div>
                  )}
                </div>
              </div>

              {/* Items de la orden */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Productos</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      {item.product?.cover_url && (
                        <img src={item.product.cover_url} alt={item.product.title} className="w-16 h-16 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{item.product?.title || 'Producto eliminado'}</div>
                        <div className="text-sm text-gray-500">Cantidad: {item.quantity} × ₲ {item.unit_price.toLocaleString()}</div>
                      </div>
                      <div className="font-semibold">₲ {item.total_price.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totales */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="flex justify-between mb-2">
                  <span>Subtotal:</span>
                  <span>₲ {selectedOrder.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Envío:</span>
                  <span>₲ {selectedOrder.shipping_cost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Impuestos:</span>
                  <span>₲ {selectedOrder.tax_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>₲ {selectedOrder.total_amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Dirección de envío */}
              {selectedOrder.shipping_address && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Dirección de Envío</h3>
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {typeof selectedOrder.shipping_address === 'string' ? (
                      <pre>{selectedOrder.shipping_address}</pre>
                    ) : (
                      <div>
                        {selectedOrder.shipping_address.street && <div>{selectedOrder.shipping_address.street}</div>}
                        {selectedOrder.shipping_address.city && <div>{selectedOrder.shipping_address.city}</div>}
                        {selectedOrder.shipping_address.department && <div>{selectedOrder.shipping_address.department}</div>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Disputa */}
              {selectedOrder.dispute_status !== 'none' && (
                <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h3 className="font-semibold mb-2">Información de Disputa</h3>
                  <div className="text-sm space-y-1">
                    <div><strong>Estado:</strong> <span className={getDisputeColor(selectedOrder.dispute_status)}>{selectedOrder.dispute_status}</span></div>
                    {selectedOrder.dispute_reason && <div><strong>Motivo:</strong> {selectedOrder.dispute_reason}</div>}
                    {selectedOrder.dispute_resolution_notes && (
                      <div><strong>Resolución:</strong> {selectedOrder.dispute_resolution_notes}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Notas internas */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Notas Internas</h3>
                {selectedOrder.internal_notes && (
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg mb-2 whitespace-pre-wrap">
                    {selectedOrder.internal_notes}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Agregar nota interna..."
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddInternalNotes();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddInternalNotes}
                    disabled={processing === selectedOrder.id || !internalNotes.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDisputeModal(true)}
                  disabled={selectedOrder.dispute_status === 'none'}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedOrder.dispute_status === 'none' ? 'Sin disputa' : 'Resolver Disputa'}
                </button>
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setInternalNotes('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de resolución de disputa */}
        {showDisputeModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <h2 className="text-xl font-bold mb-4">Resolver Disputa</h2>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resolución</label>
                  <select
                    value={disputeResolution}
                    onChange={(e) => setDisputeResolution(e.target.value as 'resolved' | 'rejected')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="resolved">Resolver a favor del comprador</option>
                    <option value="rejected">Rechazar disputa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas de Resolución</label>
                  <textarea
                    value={disputeNotes}
                    onChange={(e) => setDisputeNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Explica la resolución de la disputa..."
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleResolveDispute}
                  disabled={processing === selectedOrder.id || !disputeNotes.trim()}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  Resolver
                </button>
                <button
                  onClick={() => {
                    setShowDisputeModal(false);
                    setDisputeNotes('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

