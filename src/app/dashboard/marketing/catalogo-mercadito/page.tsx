// ============================================
// MERCADITO ONLINE PY - CATÁLOGO MERCADITO
// Panel para que vendedores gestionen sus productos en el Catálogo General
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useAuth, useStore } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import {
  getStoreProductsForCatalog,
  updateProductGlobalCatalogSettings,
  countActiveCatalogProducts,
  type ProductCatalogInfo,
} from '@/lib/services/productCatalogService';
import {
  Package,
  Calendar,
  Star,
  CheckCircle,
  XCircle,
  Edit,
  AlertCircle,
  Info,
} from 'lucide-react';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function CatalogoMercaditoPage() {
  const { user } = useAuth();
  const { store } = useStore();
  const [products, setProducts] = useState<ProductCatalogInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductCatalogInfo | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (store?.id) {
      loadProducts();
      loadActiveCount();
    }
  }, [store?.id, page]);

  async function loadProducts() {
    if (!store?.id) return;

    try {
      setLoading(true);
      setError(null);

      const result = await getStoreProductsForCatalog(store.id, {
        page,
        pageSize: 20,
      });

      setProducts(result.products);
      setTotal(result.total);
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError(err.message || 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }

  async function loadActiveCount() {
    if (!store?.id) return;

    try {
      const count = await countActiveCatalogProducts(store.id);
      setActiveCount(count);
    } catch (err) {
      console.error('Error loading active count:', err);
    }
  }

  async function handleToggleCatalog(product: ProductCatalogInfo) {
    if (!store?.id) return;

    setUpdatingId(product.id);

    try {
      const willActivate = !product.is_in_global_catalog;
      
      const result = await updateProductGlobalCatalogSettings(
        product.id,
        store.id,
        {
          is_in_global_catalog: willActivate,
          catalog_valid_from: willActivate ? new Date().toISOString() : null,
          catalog_valid_until: null,
          catalog_priority: willActivate ? 1 : 0,
        }
      );

      if (!result.success) {
        alert(result.error || 'Error al actualizar el producto');
        return;
      }

      // Recargar productos y contador
      await loadProducts();
      await loadActiveCount();
    } catch (err: any) {
      console.error('Error updating product:', err);
      alert(err.message || 'Error al actualizar el producto');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleSaveCatalogSettings(
    productId: string,
    settings: {
      is_in_global_catalog: boolean;
      catalog_valid_from?: string | null;
      catalog_valid_until?: string | null;
      catalog_priority?: number;
    }
  ) {
    if (!store?.id) return;

    setUpdatingId(productId);

    try {
      const result = await updateProductGlobalCatalogSettings(
        productId,
        store.id,
        settings
      );

      if (!result.success) {
        alert(result.error || 'Error al actualizar el producto');
        return;
      }

      // Recargar productos y contador
      await loadProducts();
      await loadActiveCount();
      setEditingProduct(null);
    } catch (err: any) {
      console.error('Error updating product:', err);
      alert(err.message || 'Error al actualizar el producto');
    } finally {
      setUpdatingId(null);
    }
  }

  function isProductCurrentlyActive(product: ProductCatalogInfo): boolean {
    if (!product.is_in_global_catalog) return false;

    const now = new Date();

    if (product.catalog_valid_from) {
      const validFrom = new Date(product.catalog_valid_from);
      if (validFrom > now) return false;
    }

    if (product.catalog_valid_until) {
      const validUntil = new Date(product.catalog_valid_until);
      if (validUntil < now) return false;
    }

    return true;
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            No tienes una tienda activa
          </h2>
          <p className="text-gray-600">
            Crea una tienda primero para gestionar el catálogo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Catálogo Mercadito – Ofertas Destacadas
          </h1>
          <p className="text-gray-600 mb-4">
            Elegí hasta 2 productos para que se muestren en el catálogo oficial de ofertas de Mercadito Online PY.
            Estos productos pueden aparecer en la sección de Ofertas y en futuras campañas de publicidad.
          </p>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-blue-900">
                <strong>Productos activos en catálogo:</strong> {activeCount} / 2
              </p>
              {activeCount >= 2 && (
                <p className="text-sm text-blue-700 mt-1">
                  Has alcanzado el límite. Desactiva un producto para agregar otro.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Products Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            <b>Error:</b> {error}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-600 mb-2">
              No tienes productos
            </h2>
            <p className="text-gray-500">
              Crea productos primero para agregarlos al catálogo
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado Catálogo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vigencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prioridad
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => {
                  const isActive = isProductCurrentlyActive(product);
                  const isUpdating = updatingId === product.id;

                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      {/* Producto */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {product.cover_url ? (
                              <Image
                                src={product.cover_url}
                                alt={product.title}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {product.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {product.status === 'active' ? (
                                <span className="text-green-600">Activo</span>
                              ) : (
                                <span className="text-gray-500">{product.status}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Precio */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(product.price)}
                        </p>
                      </td>

                      {/* Estado Catálogo */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3" />
                            En catálogo
                          </span>
                        ) : product.is_in_global_catalog ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <AlertCircle className="w-3 h-3" />
                            Fuera de vigencia
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <XCircle className="w-3 h-3" />
                            No incluido
                          </span>
                        )}
                      </td>

                      {/* Vigencia */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.catalog_valid_from ? (
                          <div>
                            <p className="text-xs">
                              Desde: {new Date(product.catalog_valid_from).toLocaleDateString('es-PY')}
                            </p>
                            {product.catalog_valid_until && (
                              <p className="text-xs">
                                Hasta: {new Date(product.catalog_valid_until).toLocaleDateString('es-PY')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Sin fechas</span>
                        )}
                      </td>

                      {/* Prioridad */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Star className={`w-4 h-4 ${product.catalog_priority > 0 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                          <span className="text-sm text-gray-600">{product.catalog_priority}</span>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingProduct(product)}
                            disabled={isUpdating}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            title="Editar configuración"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleCatalog(product)}
                            disabled={isUpdating || (activeCount >= 2 && !product.is_in_global_catalog)}
                            className={`px-3 py-1 rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                              product.is_in_global_catalog
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                            title={
                              activeCount >= 2 && !product.is_in_global_catalog
                                ? 'Límite alcanzado'
                                : product.is_in_global_catalog
                                ? 'Desactivar del catálogo'
                                : 'Activar en catálogo'
                            }
                          >
                            {isUpdating ? '...' : product.is_in_global_catalog ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit Modal */}
        {editingProduct && (
          <EditCatalogModal
            product={editingProduct}
            activeCount={activeCount}
            onClose={() => setEditingProduct(null)}
            onSave={(settings) => handleSaveCatalogSettings(editingProduct.id, settings)}
            isUpdating={updatingId === editingProduct.id}
          />
        )}
      </div>
    </div>
  );
}

// ============================================
// MODAL DE EDICIÓN
// ============================================

interface EditCatalogModalProps {
  product: ProductCatalogInfo;
  activeCount: number;
  onClose: () => void;
  onSave: (settings: {
    is_in_global_catalog: boolean;
    catalog_valid_from?: string | null;
    catalog_valid_until?: string | null;
    catalog_priority?: number;
  }) => void;
  isUpdating: boolean;
}

function EditCatalogModal({
  product,
  activeCount,
  onClose,
  onSave,
  isUpdating,
}: EditCatalogModalProps) {
  const [isInCatalog, setIsInCatalog] = useState(product.is_in_global_catalog);
  const [validFrom, setValidFrom] = useState(
    product.catalog_valid_from
      ? new Date(product.catalog_valid_from).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  );
  const [validUntil, setValidUntil] = useState(
    product.catalog_valid_until
      ? new Date(product.catalog_valid_until).toISOString().slice(0, 16)
      : ''
  );
  const [priority, setPriority] = useState(product.catalog_priority || 0);

  function handleSave() {
    if (isInCatalog && activeCount >= 2 && !product.is_in_global_catalog) {
      alert('Solo podés tener 2 productos activos en el Catálogo Mercadito. Desactiva uno para agregar otro.');
      return;
    }

    onSave({
      is_in_global_catalog: isInCatalog,
      catalog_valid_from: isInCatalog ? validFrom : null,
      catalog_valid_until: isInCatalog && validUntil ? validUntil : null,
      catalog_priority: isInCatalog ? priority : 0,
    });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Configurar Catálogo Mercadito
        </h2>

        <div className="space-y-4">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Incluir en Catálogo Mercadito
            </label>
            <button
              onClick={() => setIsInCatalog(!isInCatalog)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isInCatalog ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isInCatalog ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {isInCatalog && (
            <>
              {/* Fecha desde */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha desde
                </label>
                <input
                  type="datetime-local"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Fecha hasta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha hasta (opcional)
                </label>
                <input
                  type="datetime-local"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Prioridad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridad (0-10)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Mayor número = mayor prioridad en el feed
                </p>
              </div>
            </>
          )}

          {isInCatalog && activeCount >= 2 && !product.is_in_global_catalog && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ Has alcanzado el límite de 2 productos activos. Desactiva uno para agregar este.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isUpdating ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}




