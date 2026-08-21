'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Settings,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth/clientAuthHeaders';
import { useToast } from '@/lib/hooks/useToast';
import EnqueueSourcedPurchaseModal from '@/components/sourced/EnqueueSourcedPurchaseModal';
import {
  ALIEXPRESS_CATEGORY_FEEDS,
  defaultAirFriendlyCategoryIds,
  initialImportSelection,
} from '@/lib/services/aliexpressCategoryMap';

type CatalogSettings = {
  usd_pyg: number;
  markup_percent: number;
  buffer_percent: number;
  default_delivery_min_days: number;
  default_delivery_max_days: number;
};

type AeItem = {
  productId: string;
  title: string;
  imageUrl: string | null;
  productUrl: string | null;
  salePrice: number;
  currency: string;
  shippingPrice: number;
  previewPricePyg: number;
};

type ImportedProduct = {
  id: string;
  title: string;
  price: number;
  cover_url: string | null;
  status: string;
  source_product_id: string;
  source_url: string | null;
  source_price: number | null;
  source_shipping_price?: number | null;
  source_currency?: string | null;
  fx_rate_used?: number | null;
  markup_percent?: number | null;
  last_source_synced_at: string | null;
  source_available: boolean | null;
};

const IMPORTED_PAGE_SIZE = 40;

function formatMoney(n: number, digits = 2) {
  return n.toLocaleString('es-PY', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function costBreakdown(p: ImportedProduct, fallbackFx?: number) {
  const currency = (p.source_currency || 'USD').toUpperCase();
  const source = Number(p.source_price);
  const shipping = Number(p.source_shipping_price) || 0;
  const fx = Number(p.fx_rate_used) || Number(fallbackFx) || 0;
  const hasSource = Number.isFinite(source) && source > 0;
  const costSource = hasSource ? source + shipping : null;
  const costPyg =
    costSource != null && fx > 0 ? Math.round(costSource * fx) : null;
  const sale = Number(p.price) || 0;
  const marginPyg = costPyg != null ? sale - costPyg : null;
  const marginPct =
    marginPyg != null && costPyg != null && costPyg > 0
      ? (marginPyg / costPyg) * 100
      : null;
  return { currency, source, shipping, hasSource, costSource, costPyg, sale, marginPyg, marginPct };
}

export default function SourcedCatalogPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [settings, setSettings] = useState<CatalogSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [keywords, setKeywords] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<AeItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [importing, setImporting] = useState(false);

  const [imported, setImported] = useState<ImportedProduct[]>([]);
  const [importedTotal, setImportedTotal] = useState(0);
  const [importedPage, setImportedPage] = useState(1);
  const [importedLoadingMore, setImportedLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [autoImporting, setAutoImporting] = useState(false);
  const [autoImportLog, setAutoImportLog] = useState<string | null>(null);
  const [selectedAeCategories, setSelectedAeCategories] = useState<Record<string, boolean>>(() =>
    initialImportSelection()
  );
  const [enqueueProduct, setEnqueueProduct] = useState<ImportedProduct | null>(null);
  const [enqueueSubmitting, setEnqueueSubmitting] = useState(false);

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

  const loadSettingsAndProducts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [settingsRes, productsRes] = await Promise.all([
        authFetch('/api/sourced-catalog/settings'),
        authFetch(`/api/sourced-catalog/products?page=1&limit=${IMPORTED_PAGE_SIZE}`),
      ]);

      if (settingsRes.status === 403) {
        const json = await settingsRes.json().catch(() => ({}));
        setForbidden(json.error || 'No tenés acceso a la tienda fallback');
        return;
      }

      if (!settingsRes.ok) {
        const json = await settingsRes.json().catch(() => ({}));
        throw new Error(json.error || 'Error cargando ajustes');
      }

      const settingsJson = await settingsRes.json();
      setStoreName(settingsJson.store?.name || '');
      setSettings(settingsJson.settings);
      if (Array.isArray(settingsJson.importCategoryIds) && settingsJson.importCategoryIds.length > 0) {
        setSelectedAeCategories(initialImportSelection(settingsJson.importCategoryIds));
      }

      if (productsRes.ok) {
        const productsJson = await productsRes.json();
        setImported(productsJson.data || []);
        setImportedTotal(productsJson.pagination?.total || 0);
        setImportedPage(1);
      }
    } catch (err: any) {
      const message = err.message || 'Error cargando el catálogo';
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, toast]);

  const loadMoreImported = useCallback(async () => {
    if (importedLoadingMore) return;
    const nextPage = importedPage + 1;
    setImportedLoadingMore(true);
    try {
      const res = await authFetch(
        `/api/sourced-catalog/products?page=${nextPage}&limit=${IMPORTED_PAGE_SIZE}`
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Error cargando más productos');
      const rows = (json.data || []) as ImportedProduct[];
      setImported((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...rows.filter((r) => !seen.has(r.id))];
      });
      setImportedTotal(json.pagination?.total || importedTotal);
      setImportedPage(nextPage);
    } catch (err: any) {
      toast.error(err.message || 'Error cargando más');
    } finally {
      setImportedLoadingMore(false);
    }
  }, [authFetch, importedLoadingMore, importedPage, importedTotal, toast]);

  useEffect(() => {
    loadSettingsAndProducts();
  }, [loadSettingsAndProducts]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    try {
      const res = await authFetch('/api/sourced-catalog/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'No se pudo guardar');
      setSettings(json.settings);
      toast.success('Ajustes de precio y envío guardados');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingSettings(false);
    }
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!keywords.trim()) return;
    setSearching(true);
    try {
      const res = await authFetch('/api/sourced-catalog/search', {
        method: 'POST',
        body: JSON.stringify({ keywords: keywords.trim(), page: 1, pageSize: 20 }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Error buscando');
      setResults(json.items || []);
      setSelected({});
      if ((json.items || []).length === 0) {
        toast.error('No hay resultados en AliExpress para esa búsqueda');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function runImport() {
    const ids = Object.keys(selected).filter((id) => selected[id]);
    if (ids.length === 0) {
      toast.error('Seleccioná al menos un producto');
      return;
    }
    setImporting(true);
    try {
      const res = await authFetch('/api/sourced-catalog/import', {
        method: 'POST',
        body: JSON.stringify({ productIds: ids, keyword: keywords.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Error importando');
      toast.success(`Importados ${json.imported}, actualizados ${json.updated}, omitidos ${json.skipped}`);
      setSelected({});
      await loadSettingsAndProducts();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  }

  async function runAutoImport() {
    const categoryIds = Object.keys(selectedAeCategories).filter((id) => selectedAeCategories[id]);
    if (categoryIds.length === 0) {
      toast.error('Seleccioná al menos una categoría liviana para avión');
      return;
    }
    setAutoImporting(true);
    setAutoImportLog(null);
    try {
      let offset = 0;
      let imported = 0;
      let updated = 0;
      let skipped = 0;
      const lines: string[] = [];
      let totalFeeds = 0;
      let done = false;
      let guard = 0;

      while (!done && guard < 20) {
        const res = await authFetch('/api/sourced-catalog/import-recommended', {
          method: 'POST',
          body: JSON.stringify({
            categoryOffset: offset,
            categoryLimit: 3,
            pageSize: 12,
            categoryIds,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Error importando recomendados');
        imported += json.imported || 0;
        updated += json.updated || 0;
        skipped += json.skipped || 0;
        totalFeeds = json.totalFeeds || totalFeeds;
        (json.categories || []).forEach((row: { aeName: string; mercadito: string; count: number }) => {
          lines.push(`${row.mercadito} ← ${row.aeName}: ${row.count}`);
        });
        if ((json.errors || []).length) {
          lines.push('Errores:');
          json.errors.forEach((err: string) => lines.push(`- ${err}`));
        }
        offset = json.nextOffset || offset;
        done = !!json.done;
        guard += 1;
        if (!done) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }

      const summary = `Listo. ${imported} nuevos, ${updated} actualizados, ${skipped} omitidos. Rubros AliExpress: ${totalFeeds}.`;
      setAutoImportLog([summary, ...lines].join('\n'));
      toast.success(summary);
      await loadSettingsAndProducts();
    } catch (err: any) {
      toast.error(err.message);
      setAutoImportLog(err.message);
    } finally {
      setAutoImporting(false);
    }
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-700" />
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-3xl mx-auto">
          <Link href="/admin" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Volver al panel admin
          </Link>
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-2">No se pudo cargar el catálogo</h1>
            <p className="text-gray-700">{loadError}</p>
            <p className="text-sm text-gray-500 mt-3">
              Si acabamos de publicar Ubuy, hay que correr la migración SQL en Supabase de producción
              y tener ALIEXPRESS_APP_KEY / ALIEXPRESS_APP_SECRET en Vercel.
            </p>
            <button
              type="button"
              onClick={() => loadSettingsAndProducts()}
              className="mt-4 px-4 py-2 bg-black text-white rounded-lg"
            >
              Reintentar
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (forbidden) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-3xl mx-auto">
          <Link href="/admin" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Volver al panel admin
          </Link>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <Globe className="w-10 h-10 text-blue-600 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Catálogo internacional</h1>
            <p className="text-gray-700">{forbidden}</p>
            <p className="text-sm text-gray-500 mt-3">
              Este catálogo es de la tienda oficial de Mercadito. Entrá con una cuenta admin.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Volver al panel admin
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Catálogo internacional</h1>
          <p className="text-gray-600 mt-1">
            Tienda oficial de Mercadito (la que opera el admin): {storeName || 'Mercadito Internacional'}.
            El cliente paga acá; después comprás en AliExpress.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href="/dashboard/sourced-fulfillments" className="text-blue-700 hover:underline inline-flex items-center gap-1">
              <Truck className="w-4 h-4" /> Pedidos a AliExpress
            </Link>
            <Link href="/dashboard/sourcing-orders" className="text-blue-700 hover:underline">
              Pedidos por conseguir
            </Link>
          </div>
        </div>

        {settings && (
          <form onSubmit={saveSettings} className="bg-white rounded-xl border p-5 space-y-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5" /> Precio landed (PYG)
            </h2>
            <p className="text-sm text-gray-600">
              (precio origen + envío) × tipo de cambio × (1 + markup) × (1 + buffer), redondeado a 1.000 Gs.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <label className="text-sm">
                USD → PYG
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={settings.usd_pyg}
                  onChange={(e) => setSettings({ ...settings, usd_pyg: Number(e.target.value) })}
                />
              </label>
              <label className="text-sm">
                Markup %
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={settings.markup_percent}
                  onChange={(e) => setSettings({ ...settings, markup_percent: Number(e.target.value) })}
                />
              </label>
              <label className="text-sm">
                Buffer %
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={settings.buffer_percent}
                  onChange={(e) => setSettings({ ...settings, buffer_percent: Number(e.target.value) })}
                />
              </label>
              <label className="text-sm">
                Entrega min (días)
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={settings.default_delivery_min_days}
                  onChange={(e) =>
                    setSettings({ ...settings, default_delivery_min_days: Number(e.target.value) })
                  }
                />
              </label>
              <label className="text-sm">
                Entrega máx (días)
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={settings.default_delivery_max_days}
                  onChange={(e) =>
                    setSettings({ ...settings, default_delivery_max_days: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={savingSettings}
              className="px-4 py-2 bg-black text-white rounded-lg disabled:opacity-50"
            >
              {savingSettings ? 'Guardando...' : 'Guardar ajustes'}
            </button>
          </form>
        )}

        <div className="bg-white rounded-xl border p-5 space-y-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw className="w-5 h-5" /> Importar recomendados (Drop Shipping)
          </h2>
          <p className="text-sm text-gray-600">
            Elegí rubros livianos para avión. Electrodomésticos, hogar, ferretería y autos vienen
            desmarcados porque suelen ser pesados o voluminosos. El feed de AliExpress no filtra por peso
            exacto: esto evita importar categorías enteras que no conviene traer.
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            <button
              type="button"
              className="px-3 py-1 border rounded-lg"
              onClick={() => {
                const air = new Set(defaultAirFriendlyCategoryIds());
                const next: Record<string, boolean> = {};
                for (const feed of ALIEXPRESS_CATEGORY_FEEDS) {
                  next[feed.aeCategoryId] = air.has(feed.aeCategoryId);
                }
                setSelectedAeCategories(next);
              }}
            >
              Solo livianos
            </button>
            <button
              type="button"
              className="px-3 py-1 border rounded-lg"
              onClick={() => {
                const next: Record<string, boolean> = {};
                for (const feed of ALIEXPRESS_CATEGORY_FEEDS) next[feed.aeCategoryId] = true;
                setSelectedAeCategories(next);
              }}
            >
              Todas
            </button>
            <button
              type="button"
              className="px-3 py-1 border rounded-lg"
              onClick={() => {
                const next: Record<string, boolean> = {};
                for (const feed of ALIEXPRESS_CATEGORY_FEEDS) next[feed.aeCategoryId] = false;
                setSelectedAeCategories(next);
              }}
            >
              Ninguna
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto border rounded-lg p-3">
            {ALIEXPRESS_CATEGORY_FEEDS.map((feed) => (
              <label key={feed.aeCategoryId} className="flex items-start gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={!!selectedAeCategories[feed.aeCategoryId]}
                  onChange={(e) =>
                    setSelectedAeCategories((prev) => ({
                      ...prev,
                      [feed.aeCategoryId]: e.target.checked,
                    }))
                  }
                />
                <span>
                  {feed.labelEs}
                  {feed.heavyAir ? (
                    <span className="ml-1 text-xs text-amber-700">pesado</span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/auth/aliexpress/callback"
              className="px-4 py-2 bg-white border border-indigo-200 text-indigo-900 rounded-lg"
            >
              Autorizar AliExpress
            </a>
            <button
              type="button"
              onClick={runAutoImport}
              disabled={autoImporting}
              className="px-4 py-2 bg-indigo-700 text-white rounded-lg disabled:opacity-50"
            >
              {autoImporting ? 'Importando categorías…' : 'Importar seleccionadas'}
            </button>
          </div>
          {autoImportLog && (
            <pre className="text-xs bg-gray-50 border rounded-lg p-3 whitespace-pre-wrap text-gray-700">
              {autoImportLog}
            </pre>
          )}
        </div>

        <form onSubmit={runSearch} className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Search className="w-5 h-5" /> Buscar en AliExpress
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              className="flex-1 border rounded-lg px-3 py-2"
              placeholder="Ej: auriculares bluetooth, notebook 16gb..."
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
            <button
              type="submit"
              disabled={searching}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {searching ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </form>

        {results.length > 0 && (
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">{results.length} resultados</h3>
              <button
                type="button"
                onClick={runImport}
                disabled={importing || selectedCount === 0}
                className="px-4 py-2 bg-black text-white rounded-lg disabled:opacity-50"
              >
                {importing ? 'Importando...' : `Importar seleccionados (${selectedCount})`}
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((item) => (
                <label
                  key={item.productId}
                  className={`border rounded-lg p-3 cursor-pointer ${selected[item.productId] ? 'border-black ring-1 ring-black' : 'border-gray-200'}`}
                >
                  <div className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={!!selected[item.productId]}
                      onChange={(e) =>
                        setSelected((prev) => ({ ...prev, [item.productId]: e.target.checked }))
                      }
                    />
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="w-16 h-16 object-cover rounded" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.currency} {item.salePrice.toFixed(2)}
                        {item.shippingPrice ? ` + envío ${item.shippingPrice.toFixed(2)}` : ''}
                      </p>
                      <p className="text-sm font-bold mt-1">
                        {item.previewPricePyg.toLocaleString('es-PY')} Gs.
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border p-5">
          <div className="mb-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5" /> Ya publicados ({importedTotal})
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Mostrando {imported.length} de {importedTotal}. Costo = precio AE + envío (lo que
              pagás vos); Venta = precio público en Mercadito.
            </p>
          </div>
          {imported.length === 0 ? (
            <p className="text-gray-500 text-sm">Todavía no hay SKUs sourced en esta tienda.</p>
          ) : (
            <>
              <ul className="divide-y">
                {imported.map((p) => {
                  const c = costBreakdown(p, settings?.usd_pyg);
                  return (
                    <li key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
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
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/products/${p.id}`}
                            className="font-medium hover:underline line-clamp-1"
                            title={p.title}
                          >
                            {p.title}
                          </Link>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
                            {c.hasSource ? (
                              <span className="text-amber-800">
                                Costo{' '}
                                <span className="font-semibold">
                                  {c.currency} {formatMoney(c.costSource!)}
                                </span>
                                {c.shipping > 0
                                  ? ` (${formatMoney(c.source)} + envío ${formatMoney(c.shipping)})`
                                  : ''}
                                {c.costPyg != null
                                  ? ` · ≈ ${c.costPyg.toLocaleString('es-PY')} Gs.`
                                  : ''}
                              </span>
                            ) : (
                              <span className="text-gray-400">Costo AE no disponible</span>
                            )}
                            <span className="text-gray-900">
                              Venta{' '}
                              <span className="font-semibold">
                                {c.sale.toLocaleString('es-PY')} Gs.
                              </span>
                            </span>
                            {c.marginPyg != null && (
                              <span className={c.marginPyg >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                                Margen {c.marginPyg.toLocaleString('es-PY')} Gs.
                                {c.marginPct != null ? ` (${formatMoney(c.marginPct, 0)}%)` : ''}
                              </span>
                            )}
                            <span className="text-gray-400">{p.status}</span>
                            {p.source_available === false && (
                              <span className="text-red-600">origen no disponible</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end shrink-0">
                        {p.source_url && (
                          <a
                            href={p.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Abrir en AliExpress
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setEnqueueProduct(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-black text-white rounded-lg hover:bg-gray-800"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Encolar compra
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {imported.length < importedTotal && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={loadMoreImported}
                    disabled={importedLoadingMore}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    {importedLoadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Cargar más ({imported.length} de {importedTotal})
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <EnqueueSourcedPurchaseModal
        open={Boolean(enqueueProduct)}
        product={enqueueProduct}
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
            toast.success('Compra encolada. Abrí AliExpress desde la cola.');
            setEnqueueProduct(null);
            if (enqueueProduct?.source_url) {
              window.open(enqueueProduct.source_url, '_blank', 'noopener,noreferrer');
            }
          } catch (err: any) {
            toast.error(err.message || 'Error al encolar');
          } finally {
            setEnqueueSubmitting(false);
          }
        }}
      />
    </main>
  );
}
