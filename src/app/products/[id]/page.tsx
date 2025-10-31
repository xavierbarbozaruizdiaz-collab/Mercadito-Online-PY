import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import AddToCartButton from '@/components/AddToCartButton';
import StartConversationButton from '@/components/StartConversationButton';
import ProductReviews from '@/components/ProductReviews';
import ProductQandA from '@/components/ProductQandA';
import PriceAlertButton from '@/components/PriceAlertButton';
import PriceHistoryChart from '@/components/PriceHistoryChart';
import ProductImageGallery from '@/components/ProductImageGallery';
import { Metadata } from 'next';
import { generateProductStructuredData, generateBreadcrumbStructuredData } from '@/lib/structuredData';

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
        canonical: `https://mercadito-online-py.vercel.app/products/${id}`,
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
      created_at,
      categories (
        id,
        name
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
  const p = data as Product & { categories: Category[] };
  
  // Obtener la primera categoría (debería ser solo una)
  const category = p.categories && p.categories.length > 0 ? p.categories[0] : null;

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
      url: `https://mercadito-online-py.vercel.app/store/seller-${p.seller_id}`,
    },
    category: category?.name || 'General',
  });

  const breadcrumbStructuredData = generateBreadcrumbStructuredData([
    { name: 'Inicio', url: 'https://mercadito-online-py.vercel.app/' },
    { name: category?.name || 'Productos', url: `https://mercadito-online-py.vercel.app/search?category=${category?.id || ''}` },
    { name: p.title, url: `https://mercadito-online-py.vercel.app/products/${p.id}` },
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
        <Link href="/" className="underline text-sm">← Volver</Link>

      <div className="bg-white rounded-lg sm:rounded-2xl shadow p-4 sm:p-6 mt-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Galería de imágenes del producto */}
          <div>
            <ProductImageGallery 
              images={displayImages} 
              title={p.title}
            />
            
            {/* Información adicional */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="font-medium text-gray-600">Condición:</span>
                <p className="capitalize">{p.condition.replace('_', ' ')}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="font-medium text-gray-600">Tipo:</span>
                <p className="capitalize">{p.sale_type === 'auction' ? 'Subasta' : 'Venta directa'}</p>
              </div>
            </div>
          </div>

          {/* Información del producto */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">{p.title}</h1>
              {category && (
                <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                  {category.name}
                </span>
              )}
            </div>

            {p.description && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Descripción</h2>
                <p className="text-gray-600 leading-relaxed">{p.description}</p>
              </div>
            )}

            <div className={`${p.sale_type === 'auction' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  {p.sale_type === 'auction' && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🔨</span>
                      <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded-full font-bold">SUBASTA</span>
                    </div>
                  )}
                  <p className={`text-sm ${p.sale_type === 'auction' ? 'text-yellow-600' : 'text-green-600'} font-medium`}>
                    {p.sale_type === 'auction' ? 'Precio base' : 'Precio'}
                  </p>
                  <p className={`text-3xl font-bold ${p.sale_type === 'auction' ? 'text-yellow-700' : 'text-green-700'}`}>
                    {Number(p.price).toLocaleString('es-PY')} Gs.
                  </p>
                  {p.sale_type === 'auction' && (
                    <p className="text-xs text-yellow-600 mt-1">
                      Los compradores pueden ofertar. El mejor precio gana.
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Publicado</p>
                  <p className="text-sm text-gray-600">
                    {new Date(p.created_at).toLocaleDateString('es-PY')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <AddToCartButton productId={p.id} />
              <StartConversationButton 
                product={p as any}
                sellerId={p.seller_id}
                className="flex-1"
              />
            </div>

            {/* Alerta de precio */}
            <div className="mt-4">
              <PriceAlertButton 
                productId={p.id} 
                currentPrice={Number(p.price)}
              />
            </div>

            {/* Información del vendedor */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Información del vendedor</h3>
              <p className="text-sm text-gray-600">
                Este producto fue publicado por un vendedor verificado de nuestra plataforma.
              </p>
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
