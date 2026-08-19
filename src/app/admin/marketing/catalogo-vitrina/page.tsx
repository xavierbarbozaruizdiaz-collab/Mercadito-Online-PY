'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getGlobalCatalogProductsForWeb } from '@/lib/services/globalCatalogService';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Star,
  ExternalLink,
  Copy,
  Eye,
  Calendar,
  Store,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';
import Link from 'next/link';

// ============================================
// TIPOS
// ============================================

interface GlobalCatalogProduct {
  id: string;
  title: string;
  price: number;
  cover_url: string | null;
  status: string;
  store_id: string;
  catalog_valid_from: string | null;
  catalog_valid_until: string | null;
  catalog_priority: number;
  stores: {
    id: string;
    name: string;
    slug: string;
  } | null;
  categories: {
    id: string;
    name: string;
  } | null;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function AdminCatalogoVitrinaPage() {
  const [products, setProducts] = useState<GlobalCatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const toast = useToast();

  // Cargar productos del catálogo global
  useEffect(() => {
    loadProducts();
  }, [page]);

  async function loadProducts() {
    try {
      setLoading(true);
      const response = await getGlobalCatalogProductsForWeb({
        page,
        pageSize: 50, // Mostrar 50 productos por página
      });

      if (page === 1) {
        setProducts(response.products as any);
      } else {
        setProducts((prev) => [...prev, ...(response.products as any)]);
      }

      setHasMore(response.hasMore);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading global catalog products:', error);
      toast.error('Error al cargar productos del catálogo');
    } finally {
      setLoading(false);
    }
  }

  // Copiar URL del feed
  function copyFeedUrl() {
    const feedUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/feeds/global/vitrina`
      : '/feeds/global/vitrina';
    
    navigator.clipboard.writeText(feedUrl);
    toast.success('URL del feed copiada al portapapeles');
  }

  // Verificar si un producto está vigente
  function isProductValid(product: GlobalCatalogProduct): boolean {
    const now = new Date();
    
    if (product.catalog_valid_from) {
      const validFrom = new Date(product.catalog_valid_from);
      if (validFrom > now) return false;
    }
    
    if (product.catalog_valid_until) {
      const validUntil = new Date(product.catalog_valid_until);
      if (validUntil < now) return false;
    }
    
    return product.status === 'active';
  }

  // Obtener estado del producto
  function getProductStatus(product: GlobalCatalogProduct): {
    label: string;
    color: string;
    icon: React.ReactNode;
  } {
    if (!isProductValid(product)) {
      return {
        label: 'Inactivo/Expirado',
        color: 'bg-gray-100 text-gray-800',
        icon: <XCircle className="w-3 h-3" />,
      };
    }

    return {
      label: 'Activo',
      color: 'bg-green-100 text-green-800',
      icon: <CheckCircle className="w-3 h-3" />,
    };
  }

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando productos del catálogo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Catálogo de Vitrina (Global)</h1>
              <p className="text-gray-600 mt-1">Gestiona los productos del Catálogo General de Mercadito</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadProducts}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Información del Feed */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-900">Feed del Catálogo Global</h3>
              </div>
              <p className="text-sm text-blue-800 mb-3">
                Esta URL contiene todos los productos del Catálogo General de Mercadito (vitrina). Puedes usarla en plataformas de publicidad como Meta, TikTok o Google Shopping.
              </p>
              <div className="flex items-center gap-2 bg-white rounded p-2 border border-blue-200">
                <code className="text-sm text-blue-900 flex-1 truncate">
                  {typeof window !== 'undefined'
                    ? `${window.location.origin}/feeds/global/vitrina`
                    : '/feeds/global/vitrina'}
                </code>
                <button
                  onClick={copyFeedUrl}
                  className="text-blue-600 hover:text-blue-800 p-1 flex-shrink-0"
                  title="Copiar URL"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <a
                  href={typeof window !== 'undefined' ? `${window.location.origin}/feeds/global/vitrina` : '/feeds/global/vitrina'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 p-1 flex-shrink-0"
                  title="Abrir feed en nueva pestaña"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Total de Productos</div>
            <div className="text-2xl font-bold text-gray-900">{total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Productos Activos</div>
            <div className="text-2xl font-bold text-green-600">
              {products.filter((p) => isProductValid(p)).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Productos Expirados/Inactivos</div>
            <div className="text-2xl font-bold text-gray-600">
              {products.filter((p) => !isProductValid(p)).length}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de productos */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos en el catálogo</h3>
            <p className="text-gray-600">Los vendedores pueden agregar productos al catálogo desde su panel.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tienda
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prioridad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vigencia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => {
                    const status = getProductStatus(product);
                    const store = product.stores;

                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {product.cover_url ? (
                              <img
                                src={product.cover_url}
                                alt={product.title}
                                className="h-10 w-10 rounded object-cover mr-3"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded bg-gray-200 mr-3 flex items-center justify-center">
                                <Star className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{product.title}</div>
                              {product.categories && (
                                <div className="text-xs text-gray-500">{product.categories.name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {store ? (
                            <div>
                              <div className="text-sm text-gray-900">{store.name}</div>
                              <div className="text-xs text-gray-500">{store.slug}</div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Sin tienda</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(product.price)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{product.catalog_priority}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs text-gray-600">
                            {product.catalog_valid_from && (
                              <div className="flex items-center gap-1 mb-1">
                                <Calendar className="w-3 h-3" />
                                Desde: {formatDate(product.catalog_valid_from)}
                              </div>
                            )}
                            {product.catalog_valid_until && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Hasta: {formatDate(product.catalog_valid_until)}
                              </div>
                            )}
                            {!product.catalog_valid_from && !product.catalog_valid_until && (
                              <span className="text-gray-400">Sin límite</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/products/${product.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            Ver
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {hasMore && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <button
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={loading}
                  className="w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Cargando...' : 'Cargar más productos'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

