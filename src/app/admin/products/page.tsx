'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAllProducts,
  approveProduct,
  rejectProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  getTopSellingProducts,
  getProductsWithoutSales,
  type ProductAdmin,
  type ProductFilter,
  type ProductStats,
} from '@/lib/services/productAdminService';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ProductFilter>('pending');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingProduct, setEditingProduct] = useState<ProductAdmin | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [showReports, setShowReports] = useState(false);
  const [topSelling, setTopSelling] = useState<ProductAdmin[]>([]);
  const [noSales, setNoSales] = useState<ProductAdmin[]>([]);

  useEffect(() => {
    loadData();
    loadCategories();
  }, [filter, search, categoryId, sellerId, page]);

  useEffect(() => {
    if (showReports) {
      loadReports();
    }
  }, [showReports]);

  async function loadData() {
    setLoading(true);
    try {
      const [productsData, statsData] = await Promise.all([
        getAllProducts({
          page,
          limit: 20,
          filter,
          search: search || undefined,
          category_id: categoryId || undefined,
          seller_id: sellerId || undefined,
        }),
        getProductStats(),
      ]);

      setProducts(productsData.products);
      setTotalPages(productsData.total_pages);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    const { data } = await supabase.from('categories').select('id, name').order('name');
    if (data) setCategories(data);
  }

  async function loadReports() {
    const [top, noSales] = await Promise.all([
      getTopSellingProducts(10),
      getProductsWithoutSales(20),
    ]);
    setTopSelling(top);
    setNoSales(noSales);
  }

  async function handleApprove(product: ProductAdmin) {
    if (!confirm(`¿Aprobar el producto "${product.title}"?`)) return;

    setProcessing(product.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      await approveProduct(product.id, user.id);
      await loadData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(product: ProductAdmin) {
    const reason = prompt('Motivo del rechazo (opcional):');
    if (reason === null) return; // Usuario canceló

    setProcessing(product.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      await rejectProduct(product.id, user.id, reason || undefined);
      await loadData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  }

  async function handleDelete(product: ProductAdmin) {
    if (!confirm(`¿Eliminar permanentemente el producto "${product.title}"?`)) return;

    setProcessing(product.id);
    try {
      await deleteProduct(product.id);
      await loadData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  }

  async function handleUpdateStatus(product: ProductAdmin, newStatus: string) {
    setProcessing(product.id);
    try {
      await updateProduct(product.id, { status: newStatus });
      await loadData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getApprovalColor(status: string) {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  if (loading && products.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando productos...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestión de Productos</h1>
            <p className="text-gray-600 mt-2">Administrar productos, aprobaciones y reportes</p>
          </div>
          <button
            onClick={() => setShowReports(!showReports)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            {showReports ? 'Ocultar' : 'Mostrar'} Reportes
          </button>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Pendientes</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Aprobados</div>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Rechazados</div>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Activos</div>
              <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Pausados</div>
              <div className="text-2xl font-bold text-gray-600">{stats.paused}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Archivados</div>
              <div className="text-2xl font-bold text-gray-600">{stats.archived}</div>
            </div>
          </div>
        )}

        {/* Reportes */}
        {showReports && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">Más Vendidos</h3>
              <div className="space-y-2">
                {topSelling.length === 0 ? (
                  <p className="text-gray-500 text-sm">No hay datos disponibles</p>
                ) : (
                  topSelling.slice(0, 5).map((product) => (
                    <div key={product.id} className="flex items-center gap-3 text-sm">
                      {product.cover_url && (
                        <img src={product.cover_url} alt={product.title} className="w-12 h-12 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{product.title}</div>
                        <div className="text-gray-500">₲ {product.price.toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">Sin Ventas</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {noSales.length === 0 ? (
                  <p className="text-gray-500 text-sm">No hay productos sin ventas</p>
                ) : (
                  noSales.map((product) => (
                    <div key={product.id} className="flex items-center gap-3 text-sm">
                      {product.cover_url && (
                        <img src={product.cover_url} alt={product.title} className="w-12 h-12 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{product.title}</div>
                        <div className="text-gray-500">₲ {product.price.toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filtros y búsqueda */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar productos..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {(['all', 'pending', 'approved', 'rejected', 'active', 'paused', 'archived'] as ProductFilter[]).map((f) => (
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
                  {f === 'all' && 'Todos'}
                  {f === 'pending' && 'Pendientes'}
                  {f === 'approved' && 'Aprobados'}
                  {f === 'rejected' && 'Rechazados'}
                  {f === 'active' && 'Activos'}
                  {f === 'paused' && 'Pausados'}
                  {f === 'archived' && 'Archivados'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla de productos */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aprobación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
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
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {product.cover_url ? (
                          <img src={product.cover_url} alt={product.title} className="w-16 h-16 object-cover rounded" />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-gray-400 text-xs">Sin imagen</span>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.title}</div>
                          {product.category && (
                            <div className="text-xs text-gray-500">{product.category.name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.seller ? (
                        <div>
                          <div>{product.seller.first_name || product.seller.last_name ? `${product.seller.first_name || ''} ${product.seller.last_name || ''}`.trim() : product.seller.email}</div>
                          <div className="text-xs text-gray-400">{product.seller.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={product.status}
                        onChange={(e) => handleUpdateStatus(product, e.target.value)}
                        disabled={processing === product.id}
                        className={`px-2 py-1 rounded text-xs font-medium border-none ${getStatusColor(product.status)}`}
                      >
                        <option value="active">Activo</option>
                        <option value="paused">Pausado</option>
                        <option value="archived">Archivado</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getApprovalColor(product.approval_status)}`}>
                        {product.approval_status === 'pending' && 'Pendiente'}
                        {product.approval_status === 'approved' && 'Aprobado'}
                        {product.approval_status === 'rejected' && 'Rechazado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₲ {product.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(product.created_at).toLocaleDateString('es-PY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        {product.approval_status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(product)}
                              disabled={processing === product.id}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                              title="Aprobar"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleReject(product)}
                              disabled={processing === product.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              title="Rechazar"
                            >
                              ✗
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          disabled={processing === product.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          title="Eliminar"
                        >
                          🗑
                        </button>
                      </div>
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

        {/* Modal de edición */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Editar Producto</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <input
                    type="text"
                    defaultValue={editingProduct.title}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                  <input
                    type="number"
                    defaultValue={editingProduct.price}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado de Aprobación</label>
                  <select
                    value={editingProduct.approval_status}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, approval_status: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="approved">Aprobado</option>
                    <option value="rejected">Rechazado</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={async () => {
                    if (editingProduct) {
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) throw new Error('No autenticado');

                        await updateProduct(editingProduct.id, {
                          title: editingProduct.title,
                          price: editingProduct.price,
                          approval_status: editingProduct.approval_status,
                        });

                        if (editingProduct.approval_status === 'approved') {
                          await approveProduct(editingProduct.id, user.id);
                        } else if (editingProduct.approval_status === 'rejected') {
                          await rejectProduct(editingProduct.id, user.id);
                        }

                        await loadData();
                        setEditingProduct(null);
                      } catch (error: any) {
                        alert(`Error: ${error.message}`);
                      }
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditingProduct(null)}
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

