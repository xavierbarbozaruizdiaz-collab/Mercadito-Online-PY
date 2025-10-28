'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AdminRoleAssigner from '@/components/AdminRoleAssigner';

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
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Panel del vendedor</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Link
            href="/orders"
            className="px-3 sm:px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors text-sm sm:text-base text-center"
          >
            📦 Mis pedidos
          </Link>
          <Link
            href="/dashboard/new-product"
            className="px-3 sm:px-4 py-2 rounded bg-black text-white hover:bg-gray-800 transition-colors text-sm sm:text-base text-center"
          >
            + Nuevo producto
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-xl font-medium text-gray-600 mb-2">No tienes productos aún</h2>
          <p className="text-gray-500 mb-6">Comienza agregando tu primer producto</p>
          <Link
            href="/dashboard/new-product"
            className="px-6 py-3 rounded bg-black text-white hover:bg-gray-800 transition-colors"
          >
            Crear mi primer producto
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Mis productos ({products.length})</h2>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {product.cover_url && (
                  <img
                    src={product.cover_url}
                    alt={product.title}
                    className="w-full h-40 sm:h-48 object-cover"
                  />
                )}
                <div className="p-3 sm:p-4">
                  <h3 className="font-medium text-base sm:text-lg mb-2 line-clamp-2">{product.title}</h3>
                  <p className="text-lg sm:text-2xl font-bold text-green-600 mb-3">
                    {product.price.toLocaleString()} Gs.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link
                      href={`/dashboard/edit-product/${product.id}`}
                      className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-center hover:bg-blue-600 transition-colors text-sm"
                    >
                      ✏️ Editar
                    </Link>
                    <Link
                      href={`/products/${product.id}`}
                      className="flex-1 px-3 py-2 bg-gray-500 text-white rounded text-center hover:bg-gray-600 transition-colors text-sm"
                    >
                      👁️ Ver
                    </Link>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      disabled={deletingId === product.id}
                      className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {deletingId === product.id ? '⏳' : '🗑️'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Role Assigner */}
      <div className="mt-8">
        <AdminRoleAssigner />
      </div>
    </main>
  );
}
