'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Product = {
  id: string;
  title: string;
  price: number;
  cover_url: string | null;
  created_at: string;
};

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user?.id) return;

        const { data, error } = await supabase
          .from('products')
          .select('id, title, price, cover_url, created_at')
          .eq('seller_id', session.session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error('Error loading products:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function deleteProduct(productId: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.')) {
      return;
    }

    setDeletingId(productId);
    
    try {
      // 1. Obtener imágenes del producto para eliminarlas del storage
      const { data: images } = await supabase
        .from('product_images')
        .select('url')
        .eq('product_id', productId);

      // 2. Eliminar producto (esto eliminará automáticamente las imágenes por CASCADE)
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      // 3. Eliminar imágenes del storage
      if (images && images.length > 0) {
        const fileNames = images.map(img => {
          const url = img.url;
          const match = url.match(/products\/([^\/]+)\/(.+)$/);
          return match ? `${match[1]}/${match[2]}` : null;
        }).filter(Boolean);

        if (fileNames.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('product-images')
            .remove(fileNames.filter((name): name is string => name !== null));

          if (storageError) {
            console.warn('Error eliminando imágenes del storage:', storageError);
          }
        }
      }

      // 4. Actualizar lista local
      setProducts(prev => prev.filter(p => p.id !== productId));

    } catch (err: any) {
      alert('Error al eliminar producto: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header mejorado */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 sm:p-8 mb-8 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Panel del Vendedor</h1>
              <p className="text-blue-100 text-sm sm:text-base">
                Gestiona tus productos y ventas desde aquí
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/orders"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-white font-semibold transition-all border border-white/30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Mis pedidos
              </Link>
              <Link
                href="/dashboard/new-product"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 hover:bg-gray-100 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nuevo producto
              </Link>
            </div>
          </div>
        </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando productos...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">No tienes productos aún</h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Comienza a vender agregando tu primer producto al marketplace
          </p>
          <Link
            href="/dashboard/new-product"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear mi primer producto
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Mis Productos
            </h2>
            <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-semibold text-sm">
              {products.length} producto{products.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                <div className="relative overflow-hidden">
                  {product.cover_url ? (
                    <img
                      src={product.cover_url}
                      alt={product.title}
                      className="w-full h-48 sm:h-56 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-48 sm:h-56 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-5 sm:p-6">
                  <h3 className="font-bold text-lg mb-3 line-clamp-2 text-gray-900 group-hover:text-blue-600 transition-colors">
                    {product.title}
                  </h3>
                  <p className="text-xl sm:text-2xl font-bold text-green-600 mb-4">
                    {product.price.toLocaleString('es-PY')} Gs.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link
                      href={`/dashboard/edit-product/${product.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </Link>
                    <Link
                      href={`/products/${product.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Ver
                    </Link>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      disabled={deletingId === product.id}
                      className="px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                    >
                      {deletingId === product.id ? (
                        <svg className="w-4 h-4 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
