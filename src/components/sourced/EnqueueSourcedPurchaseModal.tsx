'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, X } from 'lucide-react';

export type EnqueueProductOption = {
  id: string;
  title: string;
  cover_url?: string | null;
  price?: number;
  source_url?: string | null;
  source_product_id?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Preselected product (catalog row). If omitted, user picks from `products`. */
  product?: EnqueueProductOption | null;
  products?: EnqueueProductOption[];
  submitting?: boolean;
  onSubmit: (payload: {
    product_id: string;
    customer_name: string;
    customer_phone: string;
    customer_notes: string;
  }) => Promise<void> | void;
};

export default function EnqueueSourcedPurchaseModal({
  open,
  onClose,
  product,
  products = [],
  submitting = false,
  onSubmit,
}: Props) {
  const [productId, setProductId] = useState(product?.id || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setProductId(product?.id || '');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerNotes('');
  }, [open, product?.id]);

  if (!open) return null;

  const selected =
    product || products.find((p) => p.id === productId) || null;
  const canSubmit = Boolean(productId) && !submitting;

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
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="enqueue-purchase-title" className="text-lg font-bold text-gray-900">
              Encolar compra en AliExpress
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Registrá el cliente y abrí AliExpress para comprar a mano.
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
                <img src={product.cover_url} alt="" className="w-12 h-12 object-cover rounded" />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium line-clamp-2">{product.title}</p>
                {typeof product.price === 'number' && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {product.price.toLocaleString('es-PY')} Gs.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Producto importado</span>
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
              >
                <option value="">Elegí un producto…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
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
                Abrir AliExpress
              </a>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
