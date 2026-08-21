'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Search, X } from 'lucide-react';

export type EnqueueProductOption = {
  id: string;
  title: string;
  cover_url?: string | null;
  price?: number;
  source_price?: number | null;
  source_shipping_price?: number | null;
  source_currency?: string | null;
  source_url?: string | null;
  source_product_id?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Preselected product (catalog row). If omitted, user picks from `products`. */
  product?: EnqueueProductOption | null;
  products?: EnqueueProductOption[];
  /** Total sourced SKUs in store (may be > products.length while loading). */
  productsTotal?: number;
  loadingProducts?: boolean;
  onLoadMoreProducts?: () => void;
  submitting?: boolean;
  onSubmit: (payload: {
    product_id: string;
    customer_name: string;
    customer_phone: string;
    customer_notes: string;
  }) => Promise<void> | void;
};

function formatSale(price?: number) {
  if (typeof price !== 'number' || !Number.isFinite(price)) return null;
  return `${price.toLocaleString('es-PY')} Gs.`;
}

function formatCost(p: EnqueueProductOption) {
  const source = Number(p.source_price);
  if (!Number.isFinite(source) || source <= 0) return null;
  const shipping = Number(p.source_shipping_price) || 0;
  const currency = (p.source_currency || 'USD').toUpperCase();
  const total = source + shipping;
  return shipping > 0
    ? `Costo ${currency} ${total.toFixed(2)}`
    : `Costo ${currency} ${source.toFixed(2)}`;
}

export default function EnqueueSourcedPurchaseModal({
  open,
  onClose,
  product,
  products = [],
  productsTotal,
  loadingProducts = false,
  onLoadMoreProducts,
  submitting = false,
  onSubmit,
}: Props) {
  const [productId, setProductId] = useState(product?.id || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setProductId(product?.id || '');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerNotes('');
    setQuery('');
  }, [open, product?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.source_product_id || '').toLowerCase().includes(q)
    );
  }, [products, query]);

  if (!open) return null;

  const selected =
    product || products.find((p) => p.id === productId) || null;
  const canSubmit = Boolean(productId) && !submitting;
  const totalKnown = productsTotal ?? products.length;
  const hasMore = products.length < totalKnown;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await onSubmit({
      product_id: productId,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_notes: customerNotes,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="enqueue-purchase-title"
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="enqueue-purchase-title" className="text-lg font-bold text-gray-900">
              Encolar compra en origen
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Registrá el cliente y abrí AliExpress o Cellshop para comprar a mano.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {product ? (
            <div className="flex gap-3 p-3 rounded-xl bg-gray-50 border">
              {product.cover_url ? (
                <img src={product.cover_url} alt="" className="w-14 h-14 object-cover rounded" />
              ) : (
                <div className="w-14 h-14 bg-gray-200 rounded" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium line-clamp-2">{product.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[formatCost(product), formatSale(product.price)].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-end justify-between gap-2">
                <span className="text-sm font-medium text-gray-700">Producto importado</span>
                <span className="text-xs text-gray-500">
                  {products.length} de {totalKnown} cargados
                </span>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por título o ID AliExpress…"
                />
              </div>
              <div className="border rounded-xl max-h-56 overflow-y-auto divide-y">
                {filtered.length === 0 && !loadingProducts ? (
                  <p className="p-4 text-sm text-gray-500">No hay productos que coincidan.</p>
                ) : (
                  filtered.map((p) => {
                    const active = productId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProductId(p.id)}
                        className={`w-full flex items-center gap-3 p-2.5 text-left hover:bg-gray-50 ${
                          active ? 'bg-emerald-50 ring-inset ring-1 ring-emerald-600' : ''
                        }`}
                      >
                        {p.cover_url ? (
                          <img
                            src={p.cover_url}
                            alt=""
                            className="w-12 h-12 object-cover rounded shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium line-clamp-2">{p.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {[formatCost(p), formatSale(p.price)].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
                {loadingProducts && (
                  <div className="p-3 flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Cargando productos…
                  </div>
                )}
              </div>
              {hasMore && onLoadMoreProducts && (
                <button
                  type="button"
                  onClick={onLoadMoreProducts}
                  disabled={loadingProducts}
                  className="w-full text-sm py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cargar más productos ({products.length} de {totalKnown})
                </button>
              )}
              {!productId && (
                <p className="text-xs text-amber-700">Elegí un producto de la lista.</p>
              )}
            </div>
          )}

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Nombre del cliente</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Opcional"
              maxLength={120}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">WhatsApp / teléfono</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Opcional"
              maxLength={40}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Notas</span>
            <textarea
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm min-h-[72px]"
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Variante, color, dirección, etc."
              maxLength={500}
            />
          </label>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Encolar
            </button>
            {selected?.source_url && (
              <a
                href={selected.source_url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-gray-50"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir origen
              </a>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
