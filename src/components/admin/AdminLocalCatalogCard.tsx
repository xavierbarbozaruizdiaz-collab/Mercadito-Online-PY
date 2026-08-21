'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAuthHeaders } from '@/lib/auth/clientAuthHeaders';

type OfficialStore = {
  id: string;
  name: string;
  slug: string;
};

export default function AdminLocalCatalogCard() {
  const [store, setStore] = useState<OfficialStore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch('/api/local-catalog/settings', {
          credentials: 'include',
          headers,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setError(json.error || 'No se pudo cargar la tienda local');
          return;
        }
        if (!cancelled) setStore(json.store || null);
      } catch {
        if (!cancelled) setError('No se pudo cargar la tienda local');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 sm:p-8">
      <p className="text-sm font-medium text-emerald-800 mb-1">Tienda oficial local</p>
      <h2 className="text-xl font-bold text-gray-900">
        {loading ? 'Cargando…' : store?.name || 'Mercadito Local'}
      </h2>
      <p className="mt-2 text-sm text-gray-600 max-w-2xl">
        Catálogo Cellshop (y similares): importás con bookmarklet, fijás márgenes en Gs. y comprás a
        mano cuando el cliente confirma. Independiente de la tienda Ubuy / AliExpress.
      </p>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {store?.slug && (
        <p className="mt-1 text-xs text-gray-500">Slug: /store/{store.slug}</p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={store?.slug ? `/store/${store.slug}` : '/stores'}
          className="inline-flex px-4 py-2 rounded-xl bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800"
        >
          Ver vitrina pública
        </Link>
        <Link
          href="/dashboard/local-catalog"
          className="inline-flex px-4 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-900 text-sm font-medium hover:bg-emerald-50"
        >
          Márgenes y bookmarklet
        </Link>
        <Link
          href="/dashboard/sourced-fulfillments?platform=cellshop"
          className="inline-flex px-4 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-900 text-sm font-medium hover:bg-emerald-50"
        >
          Pedidos Cellshop
        </Link>
      </div>
    </section>
  );
}
