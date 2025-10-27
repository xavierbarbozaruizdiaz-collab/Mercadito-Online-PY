'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Product = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, description, price, image_url')
        .order('title', { ascending: true });
      if (error) setError(error.message);
      else setProducts(data ?? []);
    })();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6 text-center">🛒 Mercadito Online PY</h1>

      {error && (
        <pre className="bg-red-50 text-red-700 p-3 rounded mb-4">Error: {error}</pre>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {products.map((p) => (
          <Link href={`/products/${p.id}`} key={p.id} className="block">
            <div className="bg-white rounded-2xl shadow p-4 hover:shadow-lg transition">
              <img
                src={p.image_url ?? 'https://placehold.co/400x300?text=Producto'}
                alt={p.title}
                className="w-full h-48 object-cover rounded-xl mb-3"
              />
              <h2 className="text-lg font-semibold">{p.title}</h2>
              {p.description && <p className="text-gray-600 text-sm">{p.description}</p>}
              <p className="mt-2 text-green-700 font-bold">
                {Number(p.price).toLocaleString('es-PY')} Gs.
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
