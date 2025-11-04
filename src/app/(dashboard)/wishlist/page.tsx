// src/app/(dashboard)/wishlist/page.tsx
// Página de wishlist/favoritos del usuario

'use client';

import { useWishlist } from '@/lib/hooks/useWishlist';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import WishlistButton from '@/components/WishlistButton';
import AddToCartButton from '@/components/AddToCartButton';

export default function WishlistPage() {
  const { user } = useAuth();
  const { products, loading, removeFromWishlist, refresh } = useWishlist();

  if (!user) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <EmptyState
          title="Inicia sesión para continuar"
          description="Debes iniciar sesión para ver tu lista de favoritos"
          action={{
            label: "Iniciar Sesión",
            onClick: () => window.location.href = '/auth/sign-in'
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
            Mis Favoritos
          </h1>
          <p className="text-gray-600 mt-2">
            {products.length} producto{products.length !== 1 ? 's' : ''} en tu
            lista de favoritos
          </p>
        </div>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              title="No tienes productos en tu lista de favoritos"
              description="Agrega productos a tu lista de favoritos para guardarlos para más tarde"
              action={{
                label: "Explorar Productos",
                onClick: () => window.location.href = '/'
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 lg:grid-cols-9 gap-2 sm:gap-3 lg:gap-4">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <Link href={`/products/${product.id}`}>
                <div className="relative aspect-square w-full">
                  <Image
                    src={product.cover_url || '/placeholder-product.png'}
                    alt={product.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <WishlistButton productId={product.id} variant="icon" />
                  </div>
                  {product.compare_price && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
                      {Math.round(
                        ((product.compare_price - product.price) /
                          product.compare_price) *
                          100
                      )}{' '}
                     % OFF
                    </div>
                  )}
                </div>
              </Link>
              <CardContent className="p-4">
                <Link href={`/products/${product.id}`}>
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
                    {product.title}
                  </h3>
                </Link>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatCurrency(product.price)}
                  </span>
                  {product.compare_price && (
                    <span className="text-sm text-gray-500 line-through">
                      {formatCurrency(product.compare_price)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <AddToCartButton
                    productId={product.id}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await removeFromWishlist(product.id);
                      refresh();
                    }}
                    aria-label="Eliminar de favoritos"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

