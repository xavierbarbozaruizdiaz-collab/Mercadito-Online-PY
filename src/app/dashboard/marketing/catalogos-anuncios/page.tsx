// ============================================
// MERCADITO ONLINE PY - MIS CATÁLOGOS DE ANUNCIOS
// Panel para que vendedores gestionen sus catálogos de anuncios por tienda
// ============================================

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth, useStore } from '@/lib/hooks/useAuth';
import { useToast } from '@/lib/hooks/useToast';
import {
  getStoreAdCatalogs,
  createStoreAdCatalog,
  updateStoreAdCatalog,
  deleteStoreAdCatalog,
  getStoreAdCatalogById,
  addProductToCatalog,
  removeProductFromCatalog,
  getAvailableProductsForCatalog,
  regenerateCatalogFromFilters,
  type StoreAdCatalog,
  type CatalogWithProducts,
} from '@/lib/services/storeAdCatalogService';
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Settings,
  RefreshCw,
  X,
  Check,
  Search,
  Filter,
  Eye,
  EyeOff,
  AlertCircle,
  Info,
  Calendar,
  Link as LinkIcon,
  Copy,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function CatalogosAnunciosPage() {
  const { user } = useAuth();
  const { store } = useStore();
  const toast = useToast();
  const [catalogs, setCatalogs] = useState<StoreAdCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<StoreAdCatalog | null>(null);
  const [viewingCatalog, setViewingCatalog] = useState<CatalogWithProducts | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  useEffect(() => {
    if (store?.id) {
      loadCatalogs();
    }
  }, [store?.id]);

  async function loadCatalogs() {
    if (!store?.id) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getStoreAdCatalogs(store.id, { includeInactive: true });
      setCatalogs(data);
    } catch (err: any) {
      console.error('Error loading catalogs:', err);
      setError(err.message || 'Error al cargar catálogos');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCatalog(payload: {
    slug: string;
    name: string;
    type?: string;
    filters?: Record<string, any>;
  }) {
    if (!store?.id) return;

    try {
      await createStoreAdCatalog(store.id, payload);
      setShowCreateModal(false);
      await loadCatalogs();
      toast.success('Catálogo creado exitosamente');
    } catch (err: any) {
      console.error('Error creating catalog:', err);
      toast.error(err.message || 'Error al crear el catálogo');
    }
  }

  async function handleUpdateCatalog(
    catalogId: string,
    payload: {
      name?: string;
      type?: string;
      filters?: Record<string, any>;
      is_active?: boolean;
    }
  ) {
    if (!store?.id) return;

    try {
      await updateStoreAdCatalog(catalogId, store.id, payload);
      setEditingCatalog(null);
      await loadCatalogs();
      if (viewingCatalog?.id === catalogId) {
        await loadCatalogDetails(catalogId);
      }
      toast.success('Catálogo actualizado exitosamente');
    } catch (err: any) {
      console.error('Error updating catalog:', err);
      toast.error(err.message || 'Error al actualizar el catálogo');
    }
  }

  async function handleDeleteCatalog(catalogId: string) {
    if (!store?.id) return;
    if (!confirm('¿Estás seguro de eliminar este catálogo? Esta acción no se puede deshacer.')) {
      return;
    }

    setDeletingId(catalogId);
    try {
      await deleteStoreAdCatalog(catalogId, store.id);
      await loadCatalogs();
      if (viewingCatalog?.id === catalogId) {
        setViewingCatalog(null);
      }
      toast.success('Catálogo eliminado exitosamente');
    } catch (err: any) {
      console.error('Error deleting catalog:', err);
      toast.error(err.message || 'Error al eliminar el catálogo');
    } finally {
      setDeletingId(null);
    }
  }

  async function loadCatalogDetails(catalogId: string) {
    if (!store?.id) return;

    try {
      const catalog = await getStoreAdCatalogById(catalogId, store.id);
      setViewingCatalog(catalog);
    } catch (err: any) {
      console.error('Error loading catalog details:', err);
      toast.error(err.message || 'Error al cargar detalles del catálogo');
    }
  }

  async function handleRegenerateCatalog(catalogId: string) {
    if (!store?.id) return;

    setRegeneratingId(catalogId);
    try {
      await regenerateCatalogFromFilters(catalogId, store.id);
      await loadCatalogDetails(catalogId);
      toast.success('Catálogo regenerado exitosamente');
    } catch (err: any) {
      console.error('Error regenerating catalog:', err);
      toast.error(err.message || 'Error al regenerar el catálogo');
    } finally {
      setRegeneratingId(null);
    }
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Debes iniciar sesión para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Debes tener una tienda para gestionar catálogos de anuncios.</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline mt-2 inline-block">
            Volver al dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mis Catálogos de Anuncios</h1>
            <p className="text-gray-600 mt-2">
              Gestiona tus catálogos de productos para publicidad y feeds externos
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nuevo Catálogo
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">¿Qué son los catálogos de anuncios?</p>
              <p>
                Los catálogos de anuncios te permiten organizar tus productos en grupos específicos
                para usar en campañas de publicidad (Meta, TikTok, etc.). Puedes crear múltiples catálogos
                con diferentes filtros o selección manual de productos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Cargando catálogos...</p>
        </div>
      ) : catalogs.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No tienes catálogos aún</h3>
          <p className="text-gray-600 mb-6">
            Crea tu primer catálogo de anuncios para organizar tus productos
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Crear Primer Catálogo
          </button>
        </div>
      ) : (
        <>
          {/* Lista de Catálogos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {catalogs.map((catalog) => (
              <div
                key={catalog.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{catalog.name}</h3>
                    <p className="text-sm text-gray-500">Slug: {catalog.slug}</p>
                    <p className="text-sm text-gray-500">Tipo: {catalog.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {catalog.is_active ? (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        Activo
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                        Inactivo
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Productos:</span>
                    <span className="font-semibold">{catalog.products_count}</span>
                  </div>
                  {catalog.last_generated_at && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Última regeneración:</span>
                      <span className="text-gray-900">
                        {formatDate(catalog.last_generated_at)}
                      </span>
                    </div>
                  )}
                  {catalog.is_active && store?.slug && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                        <LinkIcon className="w-3 h-3" />
                        <span className="font-medium">URL del Feed:</span>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-50 rounded p-2">
                        <code className="text-xs text-gray-800 flex-1 truncate">
                          {typeof window !== 'undefined' 
                            ? `${window.location.origin}/feeds/store/${store.slug}/${catalog.slug}`
                            : `/feeds/store/${store.slug}/${catalog.slug}`}
                        </code>
                        <button
                          onClick={() => {
                            const feedUrl = typeof window !== 'undefined'
                              ? `${window.location.origin}/feeds/store/${store.slug}/${catalog.slug}`
                              : `/feeds/store/${store.slug}/${catalog.slug}`;
                            navigator.clipboard.writeText(feedUrl);
                            toast.success('URL copiada al portapapeles');
                          }}
                          className="text-gray-600 hover:text-gray-900 p-1"
                          title="Copiar URL"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => loadCatalogDetails(catalog.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200 transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Ver
                  </button>
                  <button
                    onClick={() => setEditingCatalog(catalog)}
                    className="flex items-center justify-center gap-2 bg-blue-100 text-blue-700 px-3 py-2 rounded hover:bg-blue-200 transition-colors text-sm"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCatalog(catalog.id)}
                    disabled={deletingId === catalog.id}
                    className="flex items-center justify-center gap-2 bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200 transition-colors text-sm disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal Crear Catálogo */}
      {showCreateModal && (
        <CreateCatalogModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateCatalog}
        />
      )}

      {/* Modal Editar Catálogo */}
      {editingCatalog && (
        <EditCatalogModal
          catalog={editingCatalog}
          onClose={() => setEditingCatalog(null)}
          onUpdate={(payload) => handleUpdateCatalog(editingCatalog.id, payload)}
        />
      )}

      {/* Modal Ver Catálogo */}
      {viewingCatalog && (
        <ViewCatalogModal
          catalog={viewingCatalog}
          storeId={store.id}
          storeSlug={store.slug}
          onClose={() => setViewingCatalog(null)}
          onRegenerate={() => handleRegenerateCatalog(viewingCatalog.id)}
          onAddProduct={async (productId) => {
            try {
              await addProductToCatalog(viewingCatalog.id, productId, store.id);
              const updatedCatalog = await getStoreAdCatalogById(viewingCatalog.id, store.id);
              setViewingCatalog(updatedCatalog);
              toast.success('Producto agregado al catálogo');
            } catch (err: any) {
              console.error('Error adding product to catalog:', err);
              toast.error(err.message || 'Error al agregar el producto');
            }
          }}
          onRemoveProduct={async (productId) => {
            try {
              await removeProductFromCatalog(viewingCatalog.id, productId, store.id);
              const updatedCatalog = await getStoreAdCatalogById(viewingCatalog.id, store.id);
              setViewingCatalog(updatedCatalog);
              toast.success('Producto eliminado del catálogo');
            } catch (err: any) {
              console.error('Error removing product from catalog:', err);
              toast.error(err.message || 'Error al eliminar el producto');
            }
          }}
          regenerating={regeneratingId === viewingCatalog.id}
        />
      )}
    </div>
  );
}

// ============================================
// MODAL CREAR CATÁLOGO
// ============================================

function CreateCatalogModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (payload: { slug: string; name: string; type?: string }) => void;
}) {
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('default');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug.trim() || !name.trim()) {
      alert('Completa todos los campos requeridos');
      return;
    }
    onCreate({ slug: slug.trim().toLowerCase(), name: name.trim(), type });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Nuevo Catálogo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug (identificador único)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="default, ofertas, nuevos"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Solo letras minúsculas, números y guiones. Debe ser único para tu tienda.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Catálogo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mi catálogo general"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="default">General</option>
              <option value="collection">Colección</option>
              <option value="promotional">Promocional</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Crear Catálogo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// MODAL EDITAR CATÁLOGO
// ============================================

function EditCatalogModal({
  catalog,
  onClose,
  onUpdate,
}: {
  catalog: StoreAdCatalog;
  onClose: () => void;
  onUpdate: (payload: { name?: string; type?: string; is_active?: boolean }) => void;
}) {
  const [name, setName] = useState(catalog.name);
  const [type, setType] = useState(catalog.type);
  const [isActive, setIsActive] = useState(catalog.is_active);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onUpdate({ name, type, is_active: isActive });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Editar Catálogo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Catálogo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="default">General</option>
              <option value="collection">Colección</option>
              <option value="promotional">Promocional</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Catálogo activo
            </label>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// MODAL VER CATÁLOGO
// ============================================

function ViewCatalogModal({
  catalog,
  storeId,
  storeSlug,
  onClose,
  onRegenerate,
  onAddProduct,
  onRemoveProduct,
  regenerating,
}: {
  catalog: CatalogWithProducts;
  storeId: string;
  storeSlug: string;
  onClose: () => void;
  onRegenerate: () => void;
  onAddProduct: (productId: string) => Promise<void>;
  onRemoveProduct: (productId: string) => Promise<void>;
  regenerating: boolean;
}) {
  const toast = useToast();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Obtener IDs de productos ya en el catálogo (se actualiza cuando cambia el catálogo)
  const catalogProductIds = useMemo(
    () => new Set(catalog.products.map((cp) => cp.product_id)),
    [catalog.products]
  );

  async function loadAvailableProducts() {
    try {
      const result = await getAvailableProductsForCatalog(storeId, catalog.id, {
        search: searchQuery,
        limit: 50,
      });
      // Filtrar adicionalmente en el frontend por si acaso
      const filtered = result.products.filter((p) => !catalogProductIds.has(p.id));
      setAvailableProducts(filtered);
    } catch (err: any) {
      console.error('Error loading available products:', err);
      // Si hay error, mostrar productos vacíos en lugar de fallar completamente
      setAvailableProducts([]);
      // El error 406 no debería romper la funcionalidad, solo mostrar menos productos
    }
  }

  useEffect(() => {
    if (showAddProduct) {
      loadAvailableProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddProduct, searchQuery, catalog.products.length]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{catalog.name}</h2>
            <p className="text-sm text-gray-500 mt-1">Slug: {catalog.slug} • {catalog.products_count} productos</p>
            {catalog.is_active && (
              <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <LinkIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-900 mb-1">URL del Feed:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-blue-800 flex-1 truncate">
                      {typeof window !== 'undefined' 
                        ? `${window.location.origin}/feeds/store/${storeSlug}/${catalog.slug}`
                        : `/feeds/store/${storeSlug}/${catalog.slug}`}
                    </code>
                    <button
                      onClick={() => {
                        const feedUrl = typeof window !== 'undefined'
                          ? `${window.location.origin}/feeds/store/${storeSlug}/${catalog.slug}`
                          : `/feeds/store/${storeSlug}/${catalog.slug}`;
                        navigator.clipboard.writeText(feedUrl);
                        toast.success('URL copiada al portapapeles');
                      }}
                      className="text-blue-600 hover:text-blue-800 p-1 flex-shrink-0"
                      title="Copiar URL"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setShowAddProduct(!showAddProduct)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar Productos
          </button>
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerar desde Filtros
          </button>
        </div>

        {/* Agregar Productos */}
        {showAddProduct && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {availableProducts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay productos disponibles</p>
              ) : (
                availableProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between bg-white p-3 rounded border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      {product.cover_url && (
                        <img
                          src={product.cover_url}
                          alt={product.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{product.title}</p>
                        <p className="text-sm text-gray-500">${product.price.toLocaleString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onAddProduct(product.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      Agregar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Lista de Productos */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos en el Catálogo</h3>
          {catalog.products.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay productos en este catálogo</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {catalog.products.map((cp) => (
                <div
                  key={cp.id}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center gap-3">
                    {cp.product?.cover_url && (
                      <img
                        src={cp.product.cover_url}
                        alt={cp.product.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{cp.product?.title || 'Producto'}</p>
                      <p className="text-sm text-gray-500">
                        ${cp.product?.price.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveProduct(cp.product_id)}
                    className="text-red-600 hover:text-red-700 p-2"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


