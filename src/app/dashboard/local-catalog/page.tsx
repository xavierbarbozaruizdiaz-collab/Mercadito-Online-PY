'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Package,
  RefreshCw,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
} from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth/clientAuthHeaders';
import { useToast } from '@/lib/hooks/useToast';
import EnqueueSourcedPurchaseModal from '@/components/sourced/EnqueueSourcedPurchaseModal';

type LocalSettings = {
  markup_percent: number;
  buffer_percent: number;
  default_source: string;
  import_token: string;
};

type LocalProduct = {
  id: string;
  title: string;
  price: number;
  cover_url: string | null;
  status: string;
  source_url: string | null;
  source_price: number | null;
  source_currency?: string | null;
};

const PAGE_SIZE = 40;

function buildBookmarklet(apiUrl: string, token: string) {
  const js = `javascript:(function(){try{var t=${JSON.stringify(token)};var api=${JSON.stringify(apiUrl)};var title=(document.querySelector('h1')||document.querySelector('[itemprop=name]')||document.querySelector('title'))?.innerText||document.title||'';var priceText='';var priceEl=document.querySelector('[itemprop=price],.price,.product-price,.precio,strong');if(priceEl)priceText=priceEl.textContent||'';if(!priceText){var m=document.body.innerText.match(/([\\d.\\s]{4,})\\s*Gs\\.?/i);if(m)priceText=m[1];}var img=(document.querySelector('meta[property=\"og:image\"]')||{}).content||(document.querySelector('img')||{}).src||'';var body={title:title.trim(),price:priceText,image_url:img,source:'Cellshop',currency:'PYG',source_url:location.href};fetch(api,{method:'POST',headers:{'Content-Type':'application/json','x-import-token':t},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(j){alert(j.ok?'Importado (oculto hasta tildar En tienda): '+(j.product&&j.product.title||'ok'):('Error: '+(j.error||r.status)));}).catch(function(e){alert('Error: '+e.message);});}catch(e){alert('Bookmarklet error: '+e.message);}})();`;
  return js;
}

export default function LocalCatalogPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [settings, setSettings] = useState<LocalSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [visibleTotal, setVisibleTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [enqueueProduct, setEnqueueProduct] = useState<LocalProduct | null>(null);
  const [enqueueSubmitting, setEnqueueSubmitting] = useState(false);
  const [bookmarkletHref, setBookmarkletHref] = useState('');
  const [categoryUrl, setCategoryUrl] = useState('');
  const [maxPages, setMaxPages] = useState(1);
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
      const [settingsRes, productsRes] = await Promise.all([
        authFetch('/api/local-catalog/settings'),
        authFetch(`/api/local-catalog/products?page=1&limit=${PAGE_SIZE}`),
      ]);
      if (settingsRes.status === 403) {
        const json = await settingsRes.json().catch(() => ({}));
        setForbidden(json.error || 'Sin acceso');
        return;
      }
      if (!settingsRes.ok) {
        const json = await settingsRes.json().catch(() => ({}));
        throw new Error(json.error || 'Error cargando ajustes');
      }
      const settingsJson = await settingsRes.json();
      setStoreName(settingsJson.store?.name || '');
      setStoreSlug(settingsJson.store?.slug || '');
      setSettings(settingsJson.settings);

      if (productsRes.ok) {
        const productsJson = await productsRes.json();
        setProducts(productsJson.data || []);
        setTotal(productsJson.pagination?.total || 0);
        setVisibleTotal(productsJson.pagination?.visible_total || 0);
        setPage(1);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!settings?.import_token) {
      setBookmarkletHref('');
      return;
    }
    const apiUrl = `${window.location.origin}/api/admin/import-local-product`;
    setBookmarkletHref(buildBookmarklet(apiUrl, settings.import_token));
  }, [settings?.import_token]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await authFetch('/api/local-catalog/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          store_name: storeName,
          markup_percent: settings.markup_percent,
          buffer_percent: settings.buffer_percent,
          default_source: settings.default_source,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'No se pudo guardar');
      setStoreName(json.store?.name || storeName);
      setSettings(json.settings);
      toast.success('Márgenes y nombre guardados');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function regenerateToken() {
    setSaving(true);
    try {
      const res = await authFetch('/api/local-catalog/settings', {
        method: 'PATCH',
        body: JSON.stringify({ regenerate_token: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'No se pudo regenerar');
      setSettings(json.settings);
      toast.success('Token regenerado — actualizá el bookmarklet');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function importCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryUrl.trim()) {
      toast.error('Pegá la URL de una categoría de Cellshop');
      return;
    }
    setImporting(true);
    setImportLog(null);
    try {
      const res = await authFetch('/api/local-catalog/import-category', {
        method: 'POST',
        body: JSON.stringify({
          category_url: categoryUrl.trim(),
          max_pages: maxPages,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'No se pudo importar');
      const msg = `Encontrados ${json.found} · nuevos ${json.imported} · actualizados ${json.updated} · errores ${json.skipped} (páginas ${json.pages_fetched}). Quedan pausados hasta tildar «En tienda».`;
      setImportLog(msg);
      toast.success('Categoría importada');
      await load();
    } catch (err: any) {
      setImportLog(err.message || 'Error');
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  }

  async function toggleVisible(product: LocalProduct, visible: boolean) {
    setTogglingId(product.id);
    const prevStatus = product.status;
    setProducts((list) =>
      list.map((p) =>
        p.id === product.id ? { ...p, status: visible ? 'active' : 'paused' } : p
      )
    );
    setVisibleTotal((n) => {
      const wasVisible = prevStatus === 'active';
      if (visible && !wasVisible) return n + 1;
      if (!visible && wasVisible) return Math.max(0, n - 1);
      return n;
    });
    try {
      const res = await authFetch('/api/local-catalog/products', {
        method: 'PATCH',
        body: JSON.stringify({ id: product.id, visible }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'No se pudo cambiar visibilidad');
    } catch (err: any) {
      setProducts((list) =>
        list.map((p) => (p.id === product.id ? { ...p, status: prevStatus } : p))
      );
      setVisibleTotal((n) => {
        const wasVisible = prevStatus === 'active';
        if (visible && !wasVisible) return Math.max(0, n - 1);
        if (!visible && wasVisible) return n + 1;
        return n;
      });
      toast.error(err.message);
    } finally {
      setTogglingId(null);
    }
  }

  async function loadMore() {
    if (loadingMore) return;
    const next = page + 1;
    setLoadingMore(true);
    try {
      const res = await authFetch(`/api/local-catalog/products?page=${next}&limit=${PAGE_SIZE}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Error');
      const rows = (json.data || []) as LocalProduct[];
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...rows.filter((r) => !seen.has(r.id))];
      });
      setTotal(json.pagination?.total || total);
      if (typeof json.pagination?.visible_total === 'number') {
        setVisibleTotal(json.pagination.visible_total);
      }
      setPage(next);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingMore(false);
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

  if (loading) {
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
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-2 text-gray-600 mb-4">
            <ArrowLeft className="w-4 h-4" /> Volver al panel admin
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-8 h-8" /> Catálogo local (Cellshop)
          </h1>
          <p className="text-gray-600 mt-1">
            Importá por categoría o bookmarklet (entran ocultos). Tildá «En tienda» para publicar en
            la vitrina. Cuando el cliente confirma, comprás a mano en Cellshop.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link
              href="/dashboard/sourced-fulfillments?platform=cellshop"
              className="text-blue-700 hover:underline"
            >
              Cola de pedidos Cellshop
            </Link>
            {storeSlug && (
              <Link href={`/store/${storeSlug}`} className="text-blue-700 hover:underline">
                Ver vitrina pública
              </Link>
            )}
          </div>
        </div>

        {settings && (
          <form onSubmit={saveSettings} className="bg-white rounded-xl border p-5 space-y-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5" /> Tienda y márgenes
            </h2>
            <p className="text-sm text-gray-600">
              Venta = precio Cellshop × (1 + markup%) × (1 + buffer%), redondeado a 1.000 Gs.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm sm:col-span-2">
                Nombre de la tienda
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  maxLength={120}
                />
              </label>
              <label className="text-sm">
                Markup %
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={settings.markup_percent}
                  onChange={(e) =>
                    setSettings({ ...settings, markup_percent: Number(e.target.value) })
                  }
                />
              </label>
              <label className="text-sm">
                Buffer %
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={settings.buffer_percent}
                  onChange={(e) =>
                    setSettings({ ...settings, buffer_percent: Number(e.target.value) })
                  }
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Etiqueta de origen
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={settings.default_source}
                  onChange={(e) =>
                    setSettings({ ...settings, default_source: e.target.value })
                  }
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </form>
        )}

        <form onSubmit={importCategory} className="bg-white rounded-xl border p-5 space-y-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Download className="w-5 h-5" /> Importar categoría Cellshop
          </h2>
          <p className="text-sm text-gray-600">
            Pegá la URL de un listado (ej. smartphones). Se importan hasta ~24 productos por página
            (máx. 3 páginas). Quedan en borrador; vos tildás cuáles van a la tienda.
          </p>
          <label className="block text-sm">
            URL de categoría
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 font-mono text-xs sm:text-sm"
              placeholder="https://cellshop.com.py/todos-los-departamentos/tecnologia/..."
              value={categoryUrl}
              onChange={(e) => setCategoryUrl(e.target.value)}
            />
          </label>
          <label className="block text-sm w-40">
            Páginas (1–3)
            <select
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={importing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Importando…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Importar
              </>
            )}
          </button>
          {importLog && (
            <p className="text-sm text-gray-700 bg-gray-50 border rounded-lg px-3 py-2">{importLog}</p>
          )}
        </form>

        {settings && (
          <div className="bg-white rounded-xl border p-5 space-y-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Store className="w-5 h-5" /> Bookmarklet de importación
            </h2>
            <p className="text-sm text-gray-600">
              Arrastrá el enlace a la barra de favoritos. En una ficha de{' '}
              <a
                href="https://cellshop.com.py/"
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 hover:underline"
              >
                cellshop.com.py
              </a>
              , abrí el favorito para mandar el producto (también entra oculto).
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              {bookmarkletHref ? (
                <a
                  href={bookmarkletHref}
                  className="inline-flex px-4 py-2 rounded-xl bg-indigo-700 text-white text-sm font-medium"
                  onClick={(e) => e.preventDefault()}
                  title="Arrastrá este enlace a favoritos"
                >
                  Importar a Mercadito Local
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => copyText('Token', settings.import_token)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar token
              </button>
              <button
                type="button"
                onClick={regenerateToken}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerar token
              </button>
            </div>
            <p className="text-xs text-gray-500 break-all font-mono">{settings.import_token}</p>
          </div>
        )}

        <div className="bg-white rounded-xl border p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5" /> Catálogo ({total})
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Visibles en tienda: {visibleTotal} de {total}. Mostrando {products.length}.
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              className="p-2 rounded-lg border hover:bg-gray-50"
              aria-label="Recargar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {products.length === 0 ? (
            <p className="text-sm text-gray-500">
              Todavía no hay productos. Importá una categoría o usá el bookmarklet.
            </p>
          ) : (
            <>
              <ul className="divide-y">
                {products.map((p) => {
                  const cost = Number(p.source_price) || 0;
                  const sale = Number(p.price) || 0;
                  const margin = sale - cost;
                  const inStore = p.status === 'active';
                  return (
                    <li
                      key={p.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <label className="flex items-center gap-2 shrink-0 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={inStore}
                          disabled={togglingId === p.id}
                          onChange={(e) => toggleVisible(p, e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700 whitespace-nowrap">En tienda</span>
                      </label>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {p.cover_url ? (
                          <img
                            src={p.cover_url}
                            alt=""
                            className="w-12 h-12 object-cover rounded shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/products/${p.id}`}
                            className="font-medium hover:underline line-clamp-1"
                            title={p.title}
                          >
                            {p.title}
                          </Link>
                          <div className="mt-1 flex flex-wrap gap-x-3 text-sm">
                            <span className="text-amber-800">
                              Costo{' '}
                              <span className="font-semibold">
                                {cost.toLocaleString('es-PY')} Gs.
                              </span>
                            </span>
                            <span>
                              Venta{' '}
                              <span className="font-semibold">
                                {sale.toLocaleString('es-PY')} Gs.
                              </span>
                            </span>
                            <span className={margin >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                              Margen {margin.toLocaleString('es-PY')} Gs.
                            </span>
                            {!inStore && (
                              <span className="text-gray-400">Pausado</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        {p.source_url && (
                          <a
                            href={p.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Abrir Cellshop
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setEnqueueProduct(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-black text-white rounded-lg"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Encolar compra
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {products.length < total && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-4 py-2 border rounded-xl text-sm disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <Loader2 className="w-4 h-4 animate-spin inline" />
                    ) : (
                      `Cargar más (${products.length} de ${total})`
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <EnqueueSourcedPurchaseModal
        open={Boolean(enqueueProduct)}
        product={
          enqueueProduct
            ? {
                ...enqueueProduct,
                source_price: enqueueProduct.source_price,
                source_currency: 'PYG',
              }
            : null
        }
        submitting={enqueueSubmitting}
        onClose={() => setEnqueueProduct(null)}
        onSubmit={async (payload) => {
          setEnqueueSubmitting(true);
          try {
            const res = await authFetch('/api/sourced-fulfillments', {
              method: 'POST',
              body: JSON.stringify(payload),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || 'No se pudo encolar');
            toast.success('Compra encolada');
            const url = enqueueProduct?.source_url;
            setEnqueueProduct(null);
            if (url) window.open(url, '_blank', 'noopener,noreferrer');
          } catch (err: any) {
            toast.error(err.message);
          } finally {
            setEnqueueSubmitting(false);
          }
        }}
      />
    </main>
  );
}
