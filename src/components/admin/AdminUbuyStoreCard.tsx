'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAuthHeaders } from '@/lib/auth/clientAuthHeaders';

type OfficialStore = {
  id: string;
  name: string;
  slug: string;
};

export default function AdminUbuyStoreCard() {
  const [store, setStore] = useState<OfficialStore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch('/api/sourced-catalog/settings', {
          credentials: 'include',
          headers,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setError(json.error || 'No se pudo cargar la tienda Ubuy');
          return;
        }
        if (!cancelled) setStore(json.store || null);
      } catch {
        if (!cancelled) setError('No se pudo cargar la tienda Ubuy');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-6 sm:p-8">
      <p className="text-sm font-medium text-indigo-700 mb-1">Tienda oficial Ubuy</p>
      <h2 className="text-xl font-bold text-gray-900">
        {loading ? 'Cargando…' : store?.name || 'Mercadito Internacional'}
      </h2>
      <p className="mt-2 text-sm text-gray-600 max-w-2xl">
        Esta es la tienda que opera el admin. Un botón abre la vitrina pública (como la ve el cliente);
        otro abre el panel normal de vendedor (pedidos, inventario, perfil). El catálogo AliExpress es
        una herramienta aparte.
      </p>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {store?.slug && (
        <p className="mt-1 text-xs text-gray-500">
          Slug: /store/{store.slug}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={store?.slug ? `/store/${store.slug}` : '/stores'}
          className="inline-flex px-4 py-2 rounded-xl bg-indigo-700 text-white text-sm font-medium hover:bg-indigo-800"
        >
          Ver tienda (vitrina pública)
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex px-4 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-900 text-sm font-medium hover:bg-indigo-50"
        >
          Panel normal de la tienda
        </Link>
        <Link
          href="/dashboard/sourced-catalog"
          className="inline-flex px-4 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-900 text-sm font-medium hover:bg-indigo-50"
        >
          Importar AliExpress
        </Link>
        <Link
          href="/dashboard/sourced-fulfillments"
          className="inline-flex px-4 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-900 text-sm font-medium hover:bg-indigo-50"
        >
          Pedidos a origen
        </Link>
      </div>
    </section>
  );
}
