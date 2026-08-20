'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Truck } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth/clientAuthHeaders';
import { useToast } from '@/lib/hooks/useToast';

type Fulfillment = {
  id: string;
  order_id: string;
  status: string;
  source_url: string | null;
  source_product_id: string | null;
  tracking_number: string | null;
  notes: string | null;
  created_at: string;
  products: { id: string; title: string; cover_url: string | null; price: number } | null;
  orders: { id: string; status: string; total_amount: number; created_at: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending_purchase: 'Pendiente de compra',
  purchased: 'Comprado en origen',
  shipped: 'Enviado',
  cancelled: 'Cancelado',
};

export default function SourcedFulfillmentsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState<string | null>(null);
  const [items, setItems] = useState<Fulfillment[]>([]);
  const [status, setStatus] = useState('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { tracking: string; notes: string }>>({});

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
      const params = new URLSearchParams({ status, limit: '40' });
      const res = await authFetch(`/api/sourced-fulfillments?${params}`);
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setForbidden(json.error || 'Sin acceso');
        return;
      }
      if (!res.ok) throw new Error(json.error || 'Error cargando fulfillments');
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
  }, [authFetch, status]);

  useEffect(() => {
    load();
  }, [load]);

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
        <Link href="/dashboard/sourced-catalog" className="inline-flex items-center gap-2 text-gray-600 mb-4">
          <ArrowLeft className="w-4 h-4" /> Catálogo internacional
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Truck className="w-7 h-7" /> Fulfillment sourced
        </h1>
        <p className="text-gray-600 mt-1">
          Pedidos pagados de productos estirados. Comprá en AliExpress, pegá el tracking y marcá enviado.
        </p>

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

        <ul className="mt-6 space-y-4">
          {items.length === 0 && (
            <li className="bg-white border rounded-xl p-6 text-gray-500">No hay fulfillments en este filtro.</li>
          )}
          {items.map((item) => (
            <li key={item.id} className="bg-white border rounded-xl p-4 space-y-3">
              <div className="flex gap-3">
                {item.products?.cover_url ? (
                  <img src={item.products.cover_url} alt="" className="w-16 h-16 object-cover rounded" />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.products?.title || 'Producto'}</p>
                  <p className="text-sm text-gray-500">
                    Pedido {item.order_id.slice(0, 8)} · {STATUS_LABEL[item.status] || item.status}
                  </p>
                  {item.source_url && (
                    <a href={item.source_url} target="_blank" rel="noreferrer" className="text-sm text-blue-700 hover:underline">
                      Abrir en AliExpress
                    </a>
                  )}
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
                  placeholder="Notas"
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
          ))}
        </ul>
      </div>
    </main>
  );
}
