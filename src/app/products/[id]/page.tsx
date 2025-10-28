import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import AddToCartButton from '@/components/AddToCartButton';

type Product = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
};

export const revalidate = 0; // sin cache en dev

export default async function ProductPage(
  props: { params: Promise<{ id: string }> } // 👈 en Next 15 params es Promise
) {
  const { id } = await props.params; // 👈 OBLIGATORIO: await

  const { data, error } = await supabase
    .from('products')
    .select('id, title, description, price, image_url')
    .eq('id', id)
    .single();

  if (error || !data) {
    return (
      <main className="min-h-screen p-8">
        <Link href="/" className="underline text-sm">← Volver</Link>
        <h1 className="text-2xl font-semibold mt-3">Producto no encontrado</h1>
        {error && (
          <pre className="bg-red-50 text-red-700 p-3 mt-3 rounded">{error.message}</pre>
        )}
      </main>
    );
  }

  const p = data as Product;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <Link href="/" className="underline text-sm">← Volver</Link>

      <div className="bg-white rounded-2xl shadow p-6 mt-3 grid md:grid-cols-2 gap-6">
        <img
          src={p.image_url ?? 'https://placehold.co/800x600?text=Producto'}
          alt={p.title}
          className="w-full rounded-xl object-cover"
        />

        <div>
          <h1 className="text-3xl font-bold">{p.title}</h1>
          {p.description && <p className="text-gray-600 mt-2">{p.description}</p>}
          <p className="mt-4 text-2xl font-bold text-green-700">
            {Number(p.price).toLocaleString('es-PY')} Gs.
          </p>

          <AddToCartButton productId={p.id} />
        </div>
      </div>
    </main>
  );
}
