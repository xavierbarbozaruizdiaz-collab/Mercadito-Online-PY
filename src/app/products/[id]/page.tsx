import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import AddToCartButton from '@/components/AddToCartButton';
import StartConversationButton from '@/components/StartConversationButton';
import ProductReviews from '@/components/ProductReviews';
import ProductQandA from '@/components/ProductQandA';
import PriceAlertButton from '@/components/PriceAlertButton';
import PriceHistoryChart from '@/components/PriceHistoryChart';
import ProductImageGallery from '@/components/ProductImageGallery';
import ProductQuantitySelector from './ProductQuantitySelector';
import WholesalePriceBadge from '@/components/WholesalePriceBadge';
import ProductPageClient from './ProductPageClient';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Metadata } from 'next';
import { generateProductStructuredData, generateBreadcrumbStructuredData } from '@/lib/structuredData';
import { SITE_URL } from '@/lib/config/site';

type Product = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  cover_url: string | null;
  condition: string;
  sale_type: string;
  category_id: string | null;
  seller_id: string;
  store_id?: string | null;
  wholesale_enabled?: boolean;
  wholesale_min_quantity?: number | null;
  wholesale_discount_percent?: number | null;
  stock_quantity?: number | null;
  stock_management_enabled?: boolean;
  created_at: string;
};

type Category = {
  id: string;
  name: string;
};

export const revalidate = 0; // sin cache en dev

// Función para generar metadatos dinámicos
export async function generateMetadata(
  props: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await props.params;
  
  try {
    const { data: product } = await supabase
      .from('products')
      .select(`
        title,
        description,
        price,
        cover_url,
        condition,
        sale_type,
        categories (name)
      `)
      .eq('id', id)
      .single();

    if (!product) {
      return {
        title: 'Producto no encontrado | Mercadito Online PY',
        description: 'El producto que buscas no está disponible.',
      };
    }

    const productData = product as any; // Cast para evitar errores de tipo
    const category = productData.categories?.[0]?.name || 'General';
    const price = Number(productData.price).toLocaleString('es-PY');
    
    return {
      title: `${productData.title} | Mercadito Online PY`,
      description: productData.description || `Compra ${productData.title} por ${price} Gs. ${category} - Mercadito Online PY`,
      keywords: [
        productData.title,
        category,
        'comprar',
        'venta',
        'Paraguay',
        'Mercadito Online PY',
        productData.condition,
        productData.sale_type === 'auction' ? 'subasta' : 'venta directa'
      ],
      openGraph: {
        title: productData.title,
        description: productData.description || `Compra ${productData.title} por ${price} Gs.`,
        images: productData.cover_url ? [productData.cover_url] : [],
        type: 'website',
        locale: 'es_PY',
        siteName: 'Mercadito Online PY',
      },
      twitter: {
        card: 'summary_large_image',
        title: productData.title,
        description: productData.description || `Compra ${productData.title} por ${price} Gs.`,
        images: productData.cover_url ? [productData.cover_url] : [],
      },
      alternates: {
        canonical: `${SITE_URL}/products/${id}`,
      },
    };
  } catch (error) {
    return {
      title: 'Error | Mercadito Online PY',
      description: 'Error al cargar el producto.',
    };
  }
}

export default async function ProductPage(
  props: { params: Promise<{ id: string }> } // 👈 en Next 15 params es Promise
) {
  const { id } = await props.params; // 👈 OBLIGATORIO: await

  // Obtener sesión del usuario actual para verificar si es el vendedor
  // En Server Components, usar cookies() para obtener la sesión
  let currentUserId: string | null = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    currentUserId = session?.user?.id || null;
  } catch (err) {
    // Si falla obtener sesión en servidor, será null (no es crítico)
    console.warn('No se pudo obtener sesión en servidor:', err);
    currentUserId = null;
  }

  const { data, error } = await supabase
    .from('products')
      .select(`
      id, 
      title, 
      description, 
      price, 
      cover_url,
      condition,
      sale_type,
      category_id,
      seller_id,
      store_id,
      wholesale_enabled,
      wholesale_min_quantity,
      wholesale_discount_percent,
      stock_quantity,
      stock_management_enabled,
      created_at,
      categories (
        id,
        name
      ),
      stores (
        id,
        name,
        slug,
        logo_url,
        description
      )
    `)
    .eq('id', id)
    .single();

  // Cargar todas las imágenes del producto
  const { data: productImages } = await supabase
    .from('product_images')
    .select('id, url, idx')
    .eq('product_id', id)
    .order('idx', { ascending: true });

  if (error || !data) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <Link href="/" className="underline text-sm">← Volver</Link>
        <h1 className="text-2xl font-semibold mt-3">Producto no encontrado</h1>
        {error && (
          <pre className="bg-red-50 text-red-700 p-3 mt-3 rounded">{error.message}</pre>
        )}
      </main>
    );
  }

  // El tipo correcto es que categories viene como array desde Supabase
  const p = data as Product & { 
    categories: Category[];
    stores?: Array<{
      id: string;
      name: string;
      slug: string;
      logo_url: string | null;
      description: string | null;
    }> | null;
  };
  
  // Obtener la primera categoría (debería ser solo una)
  const category = p.categories && p.categories.length > 0 ? p.categories[0] : null;
  
  // Obtener información de la tienda si existe (cargar directamente si no viene en la query)
  let store: { id: string; name: string; slug: string; logo_url: string | null; description: string | null; contact_phone?: string | null; phone?: string | null } | null = null;
  let storePhone: string | null = null;
  
  if (p.stores && p.stores.length > 0) {
    store = p.stores[0];
    storePhone = (p.stores[0] as any).contact_phone || (p.stores[0] as any).phone || null;
  } else if (p.store_id) {
    // Si no viene en la relación, cargar directamente
    try {
      const { data: storeData } = await supabase
        .from('stores')
        .select('id, name, slug, logo_url, description, contact_phone, phone')
        .eq('id', p.store_id)
        .single();
      
      if (storeData) {
        store = storeData;
        storePhone = storeData.contact_phone || storeData.phone || null;
      }
    } catch (err) {
      console.warn('No se pudo cargar información de la tienda:', err);
    }
  }
  
  // Obtener información del vendedor si no hay tienda
  let sellerInfo: { name: string; email?: string; phone?: string | null } | null = null;
  let sellerPhone: string | null = null;
  if (!store && p.seller_id) {
    try {
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name, phone')
        .eq('id', p.seller_id)
        .single();
      
      if (sellerProfile) {
        sellerInfo = {
          name: sellerProfile.first_name && sellerProfile.last_name 
            ? `${sellerProfile.first_name} ${sellerProfile.last_name}`
            : sellerProfile.email?.split('@')[0] || 'Vendedor',
          email: sellerProfile.email,
          phone: sellerProfile.phone || null
        };
        sellerPhone = sellerProfile.phone || null;
      }
    } catch (err) {
      console.warn('No se pudo cargar información del vendedor:', err);
    }
  } else if (p.seller_id && !storePhone) {
    // Si hay tienda pero no tiene teléfono, intentar obtener el del vendedor
    try {
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', p.seller_id)
        .single();
      
      if (sellerProfile?.phone) {
        sellerPhone = sellerProfile.phone;
      }
    } catch (err) {
      // Ignorar error, no es crítico
    }
  }

  // Preparar array de imágenes: si hay imágenes en product_images, usarlas; si no, usar cover_url
        const images = (productImages && productImages.length > 0) 
          ? productImages.map((img: any) => img.url).sort((a: string, b: string) => {
              // Ordenar por idx si está disponible
              const imgA = productImages.find((img: any) => img.url === a) as any;
              const imgB = productImages.find((img: any) => img.url === b) as any;
              return (imgA?.idx || 0) - (imgB?.idx || 0);
            })
          : (p.cover_url ? [p.cover_url] : []);
  
  // Si no hay imágenes, usar placeholder
  const displayImages = images.length > 0 ? images : ['https://placehold.co/800x600?text=Producto'];
  const mainImage = displayImages[0];

  // Generar structured data
  const productStructuredData = generateProductStructuredData({
    id: p.id,
    title: p.title,
    description: p.description || '',
    price: Number(p.price),
    currency: 'PYG',
    image: mainImage || '',
    condition: p.condition,
    availability: 'InStock',
    seller: {
      name: 'Vendedor Verificado',
      url: `${SITE_URL}/store/seller-${p.seller_id}`,
    },
    category: category?.name || 'General',
  });

  const breadcrumbStructuredData = generateBreadcrumbStructuredData([
    { name: 'Inicio', url: `${SITE_URL}/` },
    { name: category?.name || 'Productos', url: `${SITE_URL}/search?category=${category?.id || ''}` },
    { name: p.title, url: `${SITE_URL}/products/${p.id}` },
  ]);

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productStructuredData),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData),
        }}
      />
      
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="mb-4">
          <Breadcrumbs
            items={[
              ...(category ? [{ label: category.name, href: `/search?category=${category.id}` }] : []),
              { label: p.title }
            ]}
          />
        </div>

      <div className="bg-white rounded-lg sm:rounded-2xl shadow p-4 sm:p-6 mt-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Galería de imágenes del producto */}
          <div>
            <ProductImageGallery 
              images={displayImages} 
              title={p.title}
            />
            
            {/* Información adicional */}
            <div className="grid grid-cols-2 gap-4 text-sm sm:text-base">
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="font-bold text-gray-700 sm:text-gray-600">Condición:</span>
                <p className="capitalize font-medium text-gray-900 sm:text-gray-700">{p.condition.replace('_', ' ')}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="font-bold text-gray-700 sm:text-gray-600">Tipo:</span>
                <p className="capitalize font-medium text-gray-900 sm:text-gray-700">{p.sale_type === 'auction' ? 'Subasta' : 'Venta directa'}</p>
              </div>
            </div>
          </div>

          {/* Información del producto */}
          <div className="space-y-6">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 text-gray-900">{p.title}</h1>
              {category && (
                <span className="inline-block bg-blue-100 text-blue-800 text-sm sm:text-base px-3 py-1 rounded-full font-medium">
                  {category.name}
                </span>
              )}
            </div>

            {p.description && (
              <div>
                <h2 className="text-base sm:text-lg font-bold mb-2 text-gray-900">Descripción</h2>
                <p className="text-sm sm:text-base text-gray-700 sm:text-gray-600 leading-relaxed font-medium">{p.description}</p>
              </div>
            )}

            <div className={`${p.sale_type === 'auction' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  {p.sale_type === 'auction' && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🔨</span>
                      <span className="text-xs sm:text-sm bg-yellow-500 text-white px-2 py-1 rounded-full font-bold">SUBASTA</span>
                    </div>
                  )}
                  <p className={`text-sm sm:text-base ${p.sale_type === 'auction' ? 'text-yellow-600' : 'text-green-600'} font-bold`}>
                    {p.sale_type === 'auction' ? 'Precio base' : 'Precio'}
                  </p>
                  <p className={`text-2xl sm:text-3xl md:text-4xl font-bold ${p.sale_type === 'auction' ? 'text-yellow-700' : 'text-green-700'}`}>
                    {Number(p.price).toLocaleString('es-PY')} Gs.
                  </p>
                  {p.sale_type === 'auction' && (
                    <p className="text-xs sm:text-sm text-yellow-600 mt-1 font-medium">
                      Los compradores pueden ofertar. El mejor precio gana.
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm sm:text-base text-gray-600 sm:text-gray-500 font-medium">Publicado</p>
                  <p className="text-sm sm:text-base text-gray-700 sm:text-gray-600 font-bold">
                    {new Date(p.created_at).toLocaleDateString('es-PY')}
                  </p>
                </div>
              </div>
            </div>

            {/* Componente cliente para manejar sesión y mostrar botones condicionalmente */}
            <ProductPageClient 
              product={{
                ...p,
                title: p.title,
                price: Number(p.price),
              }}
              sellerPhone={sellerPhone}
              storePhone={storePhone}
            />

            {/* Alerta de precio */}
            <div className="mt-4">
              <PriceAlertButton 
                productId={p.id} 
                currentPrice={Number(p.price)}
              />
            </div>

            {/* Información del vendedor/tienda */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-base sm:text-lg mb-2 text-gray-900">Información del vendedor</h3>
              {store ? (
                <div className="flex items-center gap-3">
                  {store.logo_url ? (
                    <img
                      src={store.logo_url}
                      alt={store.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center border-2 border-white">
                      <span className="text-purple-600 font-bold text-lg">
                        {store.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <Link
                      href={`/store/${store.slug}`}
                      className="text-blue-600 hover:text-blue-800 font-bold text-base sm:text-lg hover:underline"
                    >
                      {store.name}
                    </Link>
                    {store.description && (
                      <p className="text-xs sm:text-sm text-gray-700 sm:text-gray-500 mt-1 line-clamp-2 font-medium">
                        {store.description}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/store/${store.slug}`}
                    className="text-sm sm:text-base text-blue-600 hover:text-blue-800 font-bold"
                  >
                    Ver tienda →
                  </Link>
                </div>
              ) : sellerInfo ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-300 sm:bg-gray-200 flex items-center justify-center border-2 border-gray-600 sm:border-gray-300">
                    <span className="text-gray-700 sm:text-gray-600 font-bold text-lg">
                      {sellerInfo.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-base sm:text-lg text-gray-900">{sellerInfo.name}</p>
                    {sellerInfo.email && (
                      <p className="text-xs sm:text-sm text-gray-700 sm:text-gray-500 font-medium">{sellerInfo.email}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm sm:text-base text-gray-700 sm:text-gray-600 font-medium">
                  Este producto fue publicado por un vendedor verificado de nuestra plataforma.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Marketplace Features Avanzadas */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Historial de precios */}
        <PriceHistoryChart 
          productId={p.id} 
          currentPrice={Number(p.price)}
        />

        {/* Preguntas y respuestas */}
        <ProductQandA
          productId={p.id}
          sellerId={p.seller_id}
          currentUserId={undefined}
        />

        {/* Reseñas del producto */}
        <ProductReviews productId={p.id} storeId={p.store_id || undefined} />
      </div>
      </main>
    </>
  );
}
