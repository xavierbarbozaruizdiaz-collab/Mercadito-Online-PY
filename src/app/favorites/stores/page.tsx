// ============================================
// MERCADITO ONLINE PY - TIENDAS FAVORITAS
// Página para mostrar las tiendas favoritas del usuario
// ============================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { getUserFavoriteStores, removeStoreFavorite } from '@/lib/services/storeFavoriteService';
import { Store, Heart, MapPin, Package, Star, ExternalLink } from 'lucide-react';

interface FavoriteStore {
  id: string;
  created_at: string;
  store: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logo_url: string | null;
    cover_image_url: string | null;
    location: string | null;
    is_active: boolean;
  };
}

export default function FavoriteStoresPage() {
  const [favorites, setFavorites] = useState<FavoriteStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id || null;
      setCurrentUserId(userId);

      if (!userId) {
        setError('Debes iniciar sesión para ver tus tiendas favoritas');
        setLoading(false);
        return;
      }

      await loadFavoriteStores(userId);
    })();
  }, []);

  async function loadFavoriteStores(userId: string) {
    try {
      setLoading(true);
      setError(null);

      const data = await getUserFavoriteStores(userId);
      setFavorites(data as FavoriteStore[]);
    } catch (err: any) {
      console.error('Error loading favorite stores:', err);
      setError(err.message || 'Error al cargar tiendas favoritas');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveFavorite(storeId: string, favoriteId: string) {
    if (!currentUserId) return;

    if (!confirm('¿Estás seguro de que quieres quitar esta tienda de favoritos?')) {
      return;
    }

    setRemovingId(favoriteId);
    try {
      await removeStoreFavorite(storeId, currentUserId);
      // Actualizar lista local
      setFavorites(favorites.filter(fav => fav.id !== favoriteId));
    } catch (err: any) {
      console.error('Error removing favorite:', err);
      alert('Error al quitar de favoritos: ' + (err.message || 'Error desconocido'));
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          </div>
        </div>
      </main>
    );
  }

  if (!currentUserId) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-600 mb-2">
              Inicia sesión para ver tus tiendas favoritas
            </h2>
            <Link
              href="/auth/sign-in"
              className="inline-block mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white py-12 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Heart className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Tiendas Favoritas</h1>
              <p className="text-red-100 mt-1">
                Tus tiendas guardadas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            <b>Error:</b> {error}
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">💔</div>
            <h2 className="text-xl font-medium text-gray-600 mb-2">
              No tienes tiendas favoritas aún
            </h2>
            <p className="text-gray-500 mb-6">
              Visita las tiendas y agrega tus favoritas usando el botón de corazón
            </p>
            <Link
              href="/stores"
              className="inline-block px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Ver Todas las Tiendas
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-600">
                {favorites.length} tienda{favorites.length !== 1 ? 's' : ''} favorita{favorites.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favorites.map((favorite) => {
                const store = favorite.store;
                if (!store.is_active) return null; // No mostrar tiendas inactivas

                return (
                  <div
                    key={favorite.id}
                    className="bg-white rounded-lg shadow-md border overflow-hidden hover:shadow-lg transition-all group"
                  >
                    {/* Cover Image */}
                    <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200">
                      {store.cover_image_url ? (
                        <Image
                          src={store.cover_image_url}
                          alt={store.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Store className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Store Info */}
                    <div className="p-4">
                      {/* Logo y Nombre */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border-2 border-white shadow-md -mt-8">
                          {store.logo_url ? (
                            <Image
                              src={store.logo_url}
                              alt={store.name}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                              <Store className="w-8 h-8 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <h3 className="font-semibold text-lg text-gray-900 mb-1 line-clamp-2 group-hover:text-red-600 transition-colors">
                            {store.name}
                          </h3>
                          {store.location && (
                            <p className="text-xs text-gray-600 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {store.location}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Descripción */}
                      {store.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {store.description}
                        </p>
                      )}

                      {/* Acciones */}
                      <div className="flex gap-2">
                        <Link
                          href={`/store/${store.slug}`}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Visitar
                        </Link>
                        <button
                          onClick={() => handleRemoveFavorite(store.id, favorite.id)}
                          disabled={removingId === favorite.id}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          title="Quitar de favoritos"
                        >
                          {removingId === favorite.id ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Heart className="w-4 h-4 fill-current" />
                              <span className="hidden sm:inline">Quitar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

