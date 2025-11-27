'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AddToCartButton from '@/components/AddToCartButton';
import StartConversationButton from '@/components/StartConversationButton';
import ProductQuantitySelector from './ProductQuantitySelector';
import WholesalePriceBadge from '@/components/WholesalePriceBadge';
import Link from 'next/link';
import { trackViewItem } from '@/lib/tracking/dataLayer';

interface ProductPageClientProps {
  product: {
    id: string;
    title?: string;
    price?: number;
    seller_id: string;
    sale_type: string;
    wholesale_enabled?: boolean;
    stock_quantity?: number | null;
    stock_management_enabled?: boolean;
  };
  sellerPhone?: string | null;
  storePhone?: string | null;
}

export default function ProductPageClient({ product, sellerPhone, storePhone }: ProductPageClientProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setCurrentUserId(session?.user?.id || null);
      } catch (err) {
        console.warn('Error obteniendo sesión:', err);
        setCurrentUserId(null);
      } finally {
        setLoading(false);
      }
    };

    getCurrentUser();
  }, []);

  // Track view_item cuando se monta el componente
  useEffect(() => {
    if (product.id && product.title && product.price !== undefined) {
      trackViewItem({
        item_id: product.id,
        item_name: product.title,
        price: product.price,
        quantity: 1,
      });
    }
  }, [product.id, product.title, product.price]);

  // Si está cargando, mostrar botón por defecto (se ocultará cuando cargue)
  if (loading) {
    return (
      <div className="flex space-x-4">
        <div className="h-12 w-48 bg-gray-200 animate-pulse rounded-lg"></div>
        <div className="flex-1 h-12 bg-gray-200 animate-pulse rounded-lg"></div>
      </div>
    );
  }

  const isSeller = currentUserId === product.seller_id;

  return (
    <>
      {/* Selector de cantidad y precio mayorista - Solo para venta directa y si NO es el vendedor */}
      {product.sale_type === 'direct' && !isSeller && (
        <ProductQuantitySelector
          product={product as any}
          onQuantityChange={setSelectedQuantity}
        />
      )}

      {/* Badge de precio mayorista - Solo para venta directa y si NO es el vendedor */}
      {product.sale_type === 'direct' && product.wholesale_enabled && !isSeller && (
        <WholesalePriceBadge
          product={product as any}
          currentQuantity={selectedQuantity}
          showDetailed={false}
        />
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch">
        {/* Solo mostrar botón de agregar al carrito si el usuario NO es el vendedor */}
        {!isSeller && (
          <div className="flex-1 min-w-0">
            <AddToCartButton 
              productId={product.id} 
              quantity={selectedQuantity}
            />
          </div>
        )}
        {isSeller && (
          <Link
            href={`/dashboard/edit-product/${product.id}`}
            className="flex-1 min-w-0 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base bg-blue-600 text-white hover:bg-blue-700 text-center flex items-center justify-center shadow-sm hover:shadow-md"
          >
            Editar Producto
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <StartConversationButton 
            product={product as any}
            sellerId={product.seller_id}
            sellerPhone={sellerPhone}
            storePhone={storePhone}
          />
        </div>
      </div>
    </>
  );
}

