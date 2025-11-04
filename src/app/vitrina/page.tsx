// ============================================
// MERCADITO ONLINE PY - VITRINA DE OFERTAS
// Página pública para mostrar productos destacados de todas las tiendas
// ============================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { Store, Package, MapPin } from 'lucide-react';

interface ShowcaseProduct {
  id: string;
  title: string;
  description: string | null;
  price: number;
  compare_price: number | null;
  cover_url: string | null;
  store_id: string;
  store: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  };
  showcase_position: number;
}

export default function VitrinaPage() {
  const [products, setProducts] = useState<ShowcaseProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadShowcaseProducts();
  }, []);

  async function loadShowcaseProducts() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('products')
        .select(`
          id,
          title,
          description,
          price,
          compare_price,
          cover_url,
          store_id,
          showcase_position,
          stores!inner (
            id,
            name,
            slug,
            logo_url
          )
        `)
        .eq('in_showcase', true)
        .eq('status', 'active')
        .order('showcase_position', { ascending: true })
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      // Transformar datos
      const transformedProducts = (data || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        price: p.price,
        compare_price: p.compare_price,
        cover_url: p.cover_url,
        store_id: p.store_id,
        showcase_position: p.showcase_position,
        store: Array.isArray(p.stores) ? p.stores[0] : p.stores,
      }));

      setProducts(transformedProducts);
    } catch (err: any) {
      console.error('Error loading showcase products:', err);
      setError(err.message || 'Error al cargar productos destacados');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-12 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Vitrina de Ofertas</h1>
              <p className="text-purple-100 mt-1">
                Productos destacados de todas las tiendas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            <b>Error:</b> {error}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">⭐</div>
            <h2 className="text-xl font-medium text-gray-600 mb-2">
              Aún no hay ofertas destacadas
            </h2>
            <p className="text-gray-500">
              Las tiendas pueden destacar hasta 2 productos en la vitrina de ofertas
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-600">
                {products.length} producto{products.length !== 1 ? 's' : ''} destacado{products.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="bg-white rounded-lg shadow-md border overflow-hidden hover:shadow-lg transition-all group"
                >
                  {/* Imagen del producto */}
                  <div className="relative h-48 bg-gray-100">
                    {product.cover_url ? (
                      <Image
                        src={product.cover_url}
                        alt={product.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <Package className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Badge de vitrina */}
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full shadow-lg">
                        ⭐ Destacado
                      </span>
                    </div>
                  </div>

                  {/* Información del producto */}
                  <div className="p-4">
                    {/* Tienda */}
                    <div className="flex items-center gap-2 mb-2">
                      {product.store.logo_url ? (
                        <img
                          src={product.store.logo_url}
                          alt={product.store.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                          <Store className="w-4 h-4 text-purple-600" />
                        </div>
                      )}
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/store/${product.store.slug}`;
                        }}
                        className="text-xs text-gray-600 hover:text-purple-600 font-medium truncate cursor-pointer"
                      >
                        {product.store.name}
                      </span>
                    </div>

                    {/* Título */}
                    <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                      {product.title}
                    </h3>

                    {/* Precio */}
                    <div className="flex items-center gap-2">
                      {product.compare_price && (
                        <span className="text-sm text-gray-500 line-through">
                          {product.compare_price.toLocaleString('es-PY')} Gs.
                        </span>
                      )}
                      <span className="text-xl font-bold text-purple-600">
                        {product.price.toLocaleString('es-PY')} Gs.
                      </span>
                    </div>

                    {/* Badge de descuento si hay compare_price */}
                    {product.compare_price && product.compare_price > product.price && (
                      <div className="mt-2">
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                          {Math.round(((product.compare_price - product.price) / product.compare_price) * 100)}% OFF
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

