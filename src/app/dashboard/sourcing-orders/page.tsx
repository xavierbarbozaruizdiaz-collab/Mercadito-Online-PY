// ============================================
// MERCADITO ONLINE PY - SOURCING ORDERS (VENDEDOR)
// Página para gestionar pedidos "por conseguir" asignados a la tienda
// ============================================

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { 
  ShoppingCart, 
  User, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  AlertCircle,
  ArrowLeft,
  Eye,
  Filter,
  PackageSearch
} from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';

type SourcingOrder = {
  id: string;
  user_id: string;
  assigned_store_id: string;
  raw_query: string;
  normalized: Record<string, any>;
  status: string;
  source: string;
  channel: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
};

export default function SellerSourcingOrdersPage() {
  const [orders, setOrders] = useState<SourcingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<SourcingOrder | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [isFallbackStore, setIsFallbackStore] = useState<boolean | null>(null);
  const [checkingFallback, setCheckingFallback] = useState(true);
  const toast = useToast();

  useEffect(() => {
    checkFallbackStore();
  }, []);

  useEffect(() => {
    if (isFallbackStore === true) {
      loadOrders();
    } else if (isFallbackStore === false) {
      setLoading(false);
    }
  }, [statusFilter, isFallbackStore]);

  async function checkFallbackStore() {
    try {
      setCheckingFallback(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user?.id) {
        setError('No hay sesión activa');
        setIsFallbackStore(false);
        setCheckingFallback(false);
        return;
      }

      const userId = sessionData.session.user.id;
      
      // Verificar si el usuario tiene una tienda fallback
      const { data: stores, error: storeError } = await supabase
        .from('stores')
        .select('id, is_fallback_store, is_active')
        .eq('seller_id', userId)
        .eq('is_fallback_store', true)
        .eq('is_active', true)
        .limit(1);

      if (storeError) {
        console.error('Error verificando tienda fallback:', storeError);
        setIsFallbackStore(false);
      } else {
        setIsFallbackStore(stores && stores.length > 0);
      }
    } catch (err) {
      console.error('Error verificando tienda fallback:', err);
      setIsFallbackStore(false);
    } finally {
      setCheckingFallback(false);
    }
  }

  async function loadOrders() {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user?.id) {
        setError('No hay sesión activa');
        setLoading(false);
        return;
      }

      // Obtener sourcing_orders en modo store
      const params = new URLSearchParams({
        mode: 'store',
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      // Obtener el token de sesión para enviarlo en el header
      const session = sessionData?.session;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/assistant/sourcing-orders?${params.toString()}`, {
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al cargar pedidos');
      }

      const result = await response.json();
      setOrders(result.data || []);

    } catch (err: any) {
      console.error('Error cargando sourcing_orders:', err);
      setError(err.message || 'Error al cargar pedidos');
      toast.error('Error al cargar pedidos por conseguir');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(orderId: string, newStatus: string) {
    if (!confirm(`¿Cambiar el estado a "${getStatusText(newStatus)}"?`)) return;

    setUpdating(orderId);
    try {
      // Obtener el token de sesión para enviarlo en el header
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/assistant/sourcing-orders/${orderId}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al actualizar estado');
      }

      await loadOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
      toast.success('Estado actualizado exitosamente');
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      toast.error(`Error al actualizar el estado: ${err.message}`);
    } finally {
      setUpdating(null);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending_sourcing': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'sourcing': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'found': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'pending_sourcing': return 'Pendiente';
      case 'sourcing': return 'Buscando';
      case 'found': return 'Encontrado';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'pending_sourcing': return <Clock className="w-4 h-4" />;
      case 'sourcing': return <Search className="w-4 h-4" />;
      case 'found': return <PackageSearch className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  }

  const pendingCount = orders.filter(o => o.status === 'pending_sourcing').length;
  const sourcingCount = orders.filter(o => o.status === 'sourcing').length;
  const foundCount = orders.filter(o => o.status === 'found').length;
  const completedCount = orders.filter(o => o.status === 'completed').length;

  if (checkingFallback || loading) {
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

  // Si la tienda no es fallback, mostrar mensaje informativo
  if (isFallbackStore === false) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al dashboard
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pedidos por conseguir</h1>
              <p className="text-gray-600 mt-1">Gestiona los pedidos "por conseguir" asignados a tu tienda</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PackageSearch className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Tu tienda no está designada como Fallback Store
            </h2>
            <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
              Solo la tienda marcada como <strong>"Fallback Store"</strong> puede ver y gestionar los pedidos "por conseguir". 
              Cuando un comprador busca un producto que no está disponible, el sistema asigna automáticamente ese pedido a la tienda fallback.
            </p>
            <div className="bg-white rounded-lg p-4 mb-6 max-w-xl mx-auto text-left">
              <p className="text-sm font-semibold text-gray-900 mb-2">Para activar esta funcionalidad:</p>
              <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                <li>Ve a <strong>/admin/stores</strong> en el panel de administración</li>
                <li>Filtra por <strong>"Aprobadas"</strong> para ver las tiendas activas</li>
                <li>Haz clic en <strong>"🏪 Marcar como Fallback"</strong> en tu tienda</li>
                <li>Confirma la acción</li>
              </ol>
            </div>
            <div className="flex gap-4 justify-center">
              <Link
                href="/admin/stores"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Ir a Admin de Tiendas
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Volver al Dashboard
              </Link>
            </div>
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
              <h1 className="text-3xl font-bold text-gray-900">Pedidos por conseguir</h1>
              <p className="text-gray-600 mt-1">Gestiona los pedidos "por conseguir" asignados a tu tienda</p>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Buscando</p>
                <p className="text-2xl font-bold text-gray-900">{sourcingCount}</p>
              </div>
              <Search className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Encontrados</p>
                <p className="text-2xl font-bold text-gray-900">{foundCount}</p>
              </div>
              <PackageSearch className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completados</p>
                <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('pending_sourcing')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'pending_sourcing'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setStatusFilter('sourcing')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'sourcing'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Buscando
            </button>
            <button
              onClick={() => setStatusFilter('found')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'found'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Encontrados
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'completed'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Completados
            </button>
          </div>
        </div>

        {/* Lista de pedidos */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <PackageSearch className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay pedidos por conseguir {statusFilter !== 'all' ? `con estado "${getStatusText(statusFilter)}"` : ''}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Búsqueda</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => {
                    const customerName = order.profiles 
                      ? `${order.profiles.first_name || ''} ${order.profiles.last_name || ''}`.trim() || order.profiles.email
                      : 'Cliente';
                    
                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(order.created_at).toLocaleDateString('es-PY', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>{customerName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-md">
                            <p className="font-medium">{order.raw_query}</p>
                            {order.profiles?.email && (
                              <p className="text-xs text-gray-500 mt-1">{order.profiles.email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                            {getStatusText(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Ver
                            </button>
                            {order.status === 'pending_sourcing' && (
                              <button
                                onClick={() => updateStatus(order.id, 'sourcing')}
                                disabled={updating === order.id}
                                className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                              >
                                {updating === order.id ? '...' : 'Empezar'}
                              </button>
                            )}
                            {order.status === 'sourcing' && (
                              <button
                                onClick={() => updateStatus(order.id, 'found')}
                                disabled={updating === order.id}
                                className="text-purple-600 hover:text-purple-800 font-medium disabled:opacity-50"
                              >
                                {updating === order.id ? '...' : 'Encontrado'}
                              </button>
                            )}
                            {order.status === 'found' && (
                              <button
                                onClick={() => updateStatus(order.id, 'completed')}
                                disabled={updating === order.id}
                                className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                              >
                                {updating === order.id ? '...' : 'Completar'}
                              </button>
                            )}
                            {(order.status === 'pending_sourcing' || order.status === 'sourcing') && (
                              <button
                                onClick={() => updateStatus(order.id, 'cancelled')}
                                disabled={updating === order.id}
                                className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                              >
                                {updating === order.id ? '...' : 'Cancelar'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de detalle */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Detalle del pedido</h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Búsqueda</label>
                    <p className="mt-1 text-gray-900">{selectedOrder.raw_query}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Cliente</label>
                    <p className="mt-1 text-gray-900">
                      {selectedOrder.profiles 
                        ? `${selectedOrder.profiles.first_name || ''} ${selectedOrder.profiles.last_name || ''}`.trim() || selectedOrder.profiles.email
                        : 'N/A'}
                    </p>
                    {selectedOrder.profiles?.email && (
                      <p className="text-sm text-gray-500">{selectedOrder.profiles.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Estado</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusIcon(selectedOrder.status)}
                        {getStatusText(selectedOrder.status)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Fecha de creación</label>
                    <p className="mt-1 text-gray-900">
                      {new Date(selectedOrder.created_at).toLocaleString('es-PY')}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Última actualización</label>
                    <p className="mt-1 text-gray-900">
                      {new Date(selectedOrder.updated_at).toLocaleString('es-PY')}
                    </p>
                  </div>

                  {selectedOrder.normalized && Object.keys(selectedOrder.normalized).length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Datos normalizados</label>
                      <pre className="mt-1 p-3 bg-gray-50 rounded text-xs text-gray-700 overflow-x-auto">
                        {JSON.stringify(selectedOrder.normalized, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Cambiar estado</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedOrder.status === 'pending_sourcing' && (
                        <>
                          <button
                            onClick={() => {
                              updateStatus(selectedOrder.id, 'sourcing');
                              setSelectedOrder(null);
                            }}
                            disabled={updating === selectedOrder.id}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            Empezar búsqueda
                          </button>
                          <button
                            onClick={() => {
                              updateStatus(selectedOrder.id, 'cancelled');
                              setSelectedOrder(null);
                            }}
                            disabled={updating === selectedOrder.id}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                      {selectedOrder.status === 'sourcing' && (
                        <>
                          <button
                            onClick={() => {
                              updateStatus(selectedOrder.id, 'found');
                              setSelectedOrder(null);
                            }}
                            disabled={updating === selectedOrder.id}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                          >
                            Marcar como encontrado
                          </button>
                          <button
                            onClick={() => {
                              updateStatus(selectedOrder.id, 'cancelled');
                              setSelectedOrder(null);
                            }}
                            disabled={updating === selectedOrder.id}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                      {selectedOrder.status === 'found' && (
                        <>
                          <button
                            onClick={() => {
                              updateStatus(selectedOrder.id, 'completed');
                              setSelectedOrder(null);
                            }}
                            disabled={updating === selectedOrder.id}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            Completar
                          </button>
                          <button
                            onClick={() => {
                              updateStatus(selectedOrder.id, 'cancelled');
                              setSelectedOrder(null);
                            }}
                            disabled={updating === selectedOrder.id}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

