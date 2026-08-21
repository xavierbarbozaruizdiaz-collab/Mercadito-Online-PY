'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, ExternalLink, Loader2, Plus, Truck } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth/clientAuthHeaders';
import { useToast } from '@/lib/hooks/useToast';
import EnqueueSourcedPurchaseModal, {
  type EnqueueProductOption,
} from '@/components/sourced/EnqueueSourcedPurchaseModal';

type Fulfillment = {
  id: string;
  order_id: string | null;
  status: string;
  origin: 'checkout' | 'manual' | string;
  source_platform: string | null;
  source_url: string | null;
  source_product_id: string | null;
  tracking_number: string | null;
  notes: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_notes: string | null;
  created_at: string;
  products: { id: string; title: string; cover_url: string | null; price: number } | null;
  orders: {
    id: string;
    status: string;
    total_amount: number;
    created_at: string;
    shipping_address?: unknown;
    notes?: string | null;
  } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending_purchase: 'Pendiente de compra',
  purchased: 'Comprado en origen',
  shipped: 'Enviado',
  cancelled: 'Cancelado',
};

function platformLabel(platform: string | null | undefined) {
  if (platform === 'cellshop') return 'Cellshop';
  if (platform === 'aliexpress' || !platform) return 'AliExpress';
  return platform;
}

function buyLabel(platform: string | null | undefined) {
  return platform === 'cellshop' ? 'Comprar en Cellshop' : 'Comprar en AliExpress';
}

export default function SourcedFulfillmentsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState<string | null>(null);
  const [items, setItems] = useState<Fulfillment[]>([]);
  const [status, setStatus] = useState('all');
  const [platform, setPlatform] = useState('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { tracking: string; notes: string }>>({});
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [productOptions, setProductOptions] = useState<EnqueueProductOption[]>([]);
  const [productsTotal, setProductsTotal] = useState(0);
  const [productsPage, setProductsPage] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const authFetch = useCallback(async (url: string, init?: RequestInit) => {
    const headers = await getAuthHeaders();
    return fetch(url, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(init?.headers || {}),
      },
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, limit: '40', platform });
      const res = await authFetch(`/api/sourced-fulfillments?${params}`);
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setForbidden(json.error || 'Sin acceso');
        return;
      }
      if (!res.ok) throw new Error(json.error || 'Error cargando pedidos');
      const rows = (json.data || []) as Fulfillment[];
      setItems(rows);
      const next: Record<string, { tracking: string; notes: string }> = {};
      rows.forEach((row) => {
        next[row.id] = { tracking: row.tracking_number || '', notes: row.notes || '' };
      });
      setDrafts(next);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, status, platform]);

  const loadProductsPage = useCallback(
    async (page: number, append: boolean) => {
      setLoadingProducts(true);
      try {
        const [ubuyRes, localRes] = await Promise.all([
          authFetch(`/api/sourced-catalog/products?page=${page}&limit=40`),
          authFetch(`/api/local-catalog/products?page=${page}&limit=40`),
        ]);
        const ubuyJson = await ubuyRes.json().catch(() => ({}));
        const localJson = await localRes.json().catch(() => ({}));
        const ubuyRows = ubuyRes.ok ? ((ubuyJson.data || []) as EnqueueProductOption[]) : [];
        const localRows = localRes.ok ? ((localJson.data || []) as EnqueueProductOption[]) : [];
        const ubuyTotal = ubuyJson.pagination?.total || 0;
        const localTotal = localJson.pagination?.total || 0;
        setProductsTotal(ubuyTotal + localTotal);
        setProductsPage(page);
        setProductOptions((prev) => {
          const merged = append ? [...prev, ...ubuyRows, ...localRows] : [...ubuyRows, ...localRows];
          const seen = new Set<string>();
          return merged.filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          });
        });
      } catch {
        /* ignore */
      } finally {
        setLoadingProducts(false);
      }
    },
    [authFetch]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadProductsPage(1, false);
  }, [loadProductsPage]);

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('platform');
      if (p) setPlatform(p);
    } catch {
      /* ignore */
    }
  }, []);

  async function updateFulfillment(id: string, patch: Record<string, string>) {
    setSavingId(id);
    try {
      const res = await authFetch(`/api/sourced-fulfillments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'No se pudo actualizar');
      toast.success('Actualizado');
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado`);
    } catch {
      toast.error('No se pudo copiar');
    }
  }

  if (loading && items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </main>
    );
  }

  if (forbidden) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <Link href="/admin" className="inline-flex items-center gap-2 text-gray-600 mb-4">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
        <p>{forbidden}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap gap-3 text-sm mb-4">
          <Link href="/dashboard/sourced-catalog" className="inline-flex items-center gap-2 text-gray-600">
            <ArrowLeft className="w-4 h-4" /> Catálogo Ubuy
          </Link>
          <Link href="/dashboard/local-catalog" className="text-gray-600 hover:underline">
            Catálogo Cellshop
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="w-7 h-7" /> Pedidos a origen
            </h1>
            <p className="text-gray-600 mt-1">
              Cola para comprar a mano en AliExpress o Cellshop. Pegá el tracking y marcá enviado.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setManualOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white text-sm font-medium shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nuevo pedido manual
          </button>
        </div>

        <div className="mt-4 flex gap-2 flex-wrap">
          {['all', 'pending_purchase', 'purchased', 'shipped', 'cancelled'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-3 py-1 rounded-full text-sm ${status === s ? 'bg-black text-white' : 'bg-white border'}`}
            >
              {s === 'all' ? 'Todos' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2 flex-wrap">
          {[
            { id: 'all', label: 'Todos los orígenes' },
            { id: 'aliexpress', label: 'AliExpress' },
            { id: 'cellshop', label: 'Cellshop' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              className={`px-3 py-1 rounded-full text-sm ${platform === p.id ? 'bg-emerald-700 text-white' : 'bg-white border'}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <ul className="mt-6 space-y-4">
          {items.length === 0 && (
            <li className="bg-white border rounded-xl p-6 text-gray-500">
              No hay pedidos en este filtro. Usá &quot;Nuevo pedido manual&quot; o encolá desde el catálogo.
            </li>
          )}
          {items.map((item) => {
            const isManual = item.origin === 'manual';
            return (
              <li key={item.id} className="bg-white border rounded-xl p-4 space-y-3">
                <div className="flex gap-3">
                  {item.products?.cover_url ? (
                    <img src={item.products.cover_url} alt="" className="w-16 h-16 object-cover rounded" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.products?.title || 'Producto'}</p>
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ${
                          isManual ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {isManual ? 'Manual' : 'Checkout'}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                        {platformLabel(item.source_platform)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {item.order_id ? `Pedido ${item.order_id.slice(0, 8)} · ` : ''}
                      {STATUS_LABEL[item.status] || item.status}
                    </p>
                    {(item.customer_name || item.customer_phone || item.customer_notes) && (
                      <p className="text-sm text-gray-700 mt-1">
                        {[item.customer_name, item.customer_phone].filter(Boolean).join(' · ')}
                        {item.customer_notes ? ` — ${item.customer_notes}` : ''}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.source_url && (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {buyLabel(item.source_platform)}
                        </a>
                      )}
                      {item.source_product_id && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                          onClick={() => copyText('ID origen', item.source_product_id!)}
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {item.source_product_id}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    placeholder="Tracking"
                    value={drafts[item.id]?.tracking || ''}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [item.id]: { tracking: e.target.value, notes: prev[item.id]?.notes || '' },
                      }))
                    }
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    placeholder="Notas internas"
                    value={drafts[item.id]?.notes || ''}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [item.id]: { tracking: prev[item.id]?.tracking || '', notes: e.target.value },
                      }))
                    }
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={savingId === item.id}
                    className="px-3 py-1.5 text-sm border rounded-lg"
                    onClick={() =>
                      updateFulfillment(item.id, {
                        tracking_number: drafts[item.id]?.tracking || '',
                        notes: drafts[item.id]?.notes || '',
                      })
                    }
                  >
                    Guardar tracking
                  </button>
                  {item.status === 'pending_purchase' && (
                    <button
                      type="button"
                      disabled={savingId === item.id}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg"
                      onClick={() => updateFulfillment(item.id, { status: 'purchased' })}
                    >
                      Marcar comprado
                    </button>
                  )}
                  {item.status === 'purchased' && (
                    <button
                      type="button"
                      disabled={savingId === item.id}
                      className="px-3 py-1.5 text-sm bg-black text-white rounded-lg"
                      onClick={() => updateFulfillment(item.id, { status: 'shipped' })}
                    >
                      Marcar enviado
                    </button>
                  )}
                  {(item.status === 'pending_purchase' || item.status === 'purchased') && (
                    <button
                      type="button"
                      disabled={savingId === item.id}
                      className="px-3 py-1.5 text-sm text-red-700 border border-red-200 rounded-lg"
                      onClick={() => updateFulfillment(item.id, { status: 'cancelled' })}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <EnqueueSourcedPurchaseModal
        open={manualOpen}
        products={productOptions}
        productsTotal={productsTotal}
        loadingProducts={loadingProducts}
        onLoadMoreProducts={() => loadProductsPage(productsPage + 1, true)}
        submitting={manualSubmitting}
        onClose={() => setManualOpen(false)}
        onSubmit={async (payload) => {
          setManualSubmitting(true);
          try {
            const res = await authFetch('/api/sourced-fulfillments', {
              method: 'POST',
              body: JSON.stringify(payload),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || 'No se pudo crear');
            toast.success('Pedido manual creado');
            setManualOpen(false);
            const url = json.data?.source_url as string | undefined;
            if (url) window.open(url, '_blank', 'noopener,noreferrer');
            await load();
          } catch (err: any) {
            toast.error(err.message || 'Error');
          } finally {
            setManualSubmitting(false);
          }
        }}
      />
    </main>
  );
}
