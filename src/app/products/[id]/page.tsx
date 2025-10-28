import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import AddToCartButton from '@/components/AddToCartButton';

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
  created_at: string;
};

type Category = {
  id: string;
  name: string;
};

export const revalidate = 0; // sin cache en dev

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
      created_at,
      categories (
        id,
        name
      )
    `)
    .eq('id', id)
    .single();

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

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <Link href="/" className="underline text-sm">← Volver</Link>

      <div className="bg-white rounded-lg sm:rounded-2xl shadow p-4 sm:p-6 mt-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Imagen del producto */}
          <div className="space-y-4">
            <img
              src={p.cover_url ?? 'https://placehold.co/800x600?text=Producto'}
              alt={p.title}
              className="w-full rounded-lg sm:rounded-xl object-cover"
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

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Precio</p>
                  <p className="text-3xl font-bold text-green-700">
                    {Number(p.price).toLocaleString('es-PY')} Gs.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Publicado</p>
                  <p className="text-sm text-gray-600">
                    {new Date(p.created_at).toLocaleDateString('es-PY')}
                  </p>
                </div>
              </div>
            </div>

            <AddToCartButton productId={p.id} />

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
    </main>
  );
}
