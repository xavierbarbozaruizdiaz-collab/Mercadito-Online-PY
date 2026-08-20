'use client';

import Link from 'next/link';
import {
  Bell,
  DollarSign,
  Package,
  Plus,
  ShoppingCart,
  Star,
  Eye,
  ArrowUpRight,
} from 'lucide-react';

type FilterType = 'all' | 'direct' | 'auction' | 'finished_auctions' | 'paused';

type Stats = {
  pendingOrders: number;
  monthlyRevenue: number;
  availableBalance: number;
  activeProducts: number;
  notifications: Array<{
    message: string;
    priority: 'high' | 'medium' | 'low';
    link?: string;
  }>;
};

type Product = {
  id: string;
  title: string;
  price: number;
  cover_url: string | null;
  showcase_position?: number | null;
};

type Props = {
  stats: Stats | null;
  statsLoading: boolean;
  isSeller: boolean;
  filterType: FilterType;
  allProductsCount: number;
  finishedAuctionsCount: number;
  showcaseProducts: Product[];
  storeSlug: string | null;
  hasProducts: boolean;
  updatingShowcase: string | null;
  onFilterChange: (type: FilterType) => void;
  onRemoveFromShowcase: (productId: string) => void;
};

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'direct', label: 'Precio fijo' },
  { id: 'auction', label: 'Subastas' },
];

function formatGs(value: number) {
  return `${value.toLocaleString('es-PY')} Gs.`;
}

export default function SellerHomeHeader({
  stats,
  statsLoading,
  isSeller,
  filterType,
  allProductsCount,
  finishedAuctionsCount,
  showcaseProducts,
  storeSlug,
  hasProducts,
  updatingShowcase,
  onFilterChange,
  onRemoveFromShowcase,
}: Props) {
  if (!isSeller) return null;

  return (
    <div className="space-y-6 mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Tu tienda</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Resumen de ventas, pedidos y productos
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/new-product"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[hsl(var(--primary))] text-white text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Publicar producto
          </Link>
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-white text-sm font-medium hover:bg-[hsl(var(--muted))]"
          >
            <ShoppingCart className="w-4 h-4" />
            Ver pedidos
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Pedidos pendientes',
            value: statsLoading ? '…' : String(stats?.pendingOrders ?? 0),
            icon: ShoppingCart,
          },
          {
            label: 'Ventas del mes',
            value: statsLoading ? '…' : formatGs(stats?.monthlyRevenue ?? 0),
            icon: DollarSign,
          },
          {
            label: 'Saldo disponible',
            value: statsLoading ? '…' : formatGs(stats?.availableBalance ?? 0),
            icon: DollarSign,
          },
          {
            label: 'Productos activos',
            value: statsLoading ? '…' : String(stats?.activeProducts ?? 0),
            icon: Package,
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                  {card.label}
                </p>
                <Icon className="w-4 h-4 text-[hsl(var(--primary))]" />
              </div>
              <p className="text-lg font-semibold text-[hsl(var(--foreground))] truncate">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {stats && stats.notifications.length > 0 && (
        <div className="space-y-2">
          {stats.notifications.map((notif, idx) => (
            <Link
              key={idx}
              href={notif.link || '#'}
              className={`block rounded-xl border p-4 bg-white transition-shadow hover:shadow-sm ${
                notif.priority === 'high'
                  ? 'border-red-200 bg-red-50/50'
                  : notif.priority === 'medium'
                    ? 'border-amber-200 bg-amber-50/50'
                    : 'border-[hsl(var(--border))]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-[hsl(var(--primary))] shrink-0" />
                <p className="flex-1 text-sm font-medium text-[hsl(var(--foreground))]">
                  {notif.message}
                </p>
                <ArrowUpRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="font-semibold text-[hsl(var(--foreground))]">Mis productos</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {allProductsCount} publicados
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilterChange(f.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterType === f.id
                    ? 'bg-[hsl(var(--primary))] text-white'
                    : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:opacity-90'
                }`}
              >
                {f.label}
              </button>
            ))}
            {finishedAuctionsCount > 0 && (
              <button
                type="button"
                onClick={() => onFilterChange('finished_auctions')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterType === 'finished_auctions'
                    ? 'bg-[hsl(var(--primary))] text-white'
                    : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
                }`}
              >
                Finalizadas ({finishedAuctionsCount})
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-[hsl(var(--primary))]" />
              <div>
                <h3 className="font-medium text-[hsl(var(--foreground))]">Vitrina de ofertas</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Destacá hasta 2 productos en la vitrina pública
                </p>
              </div>
            </div>
            <Link
              href="/vitrina"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--primary))] hover:underline"
            >
              <Eye className="w-4 h-4" />
              Ver vitrina
            </Link>
          </div>

          {!hasProducts ? (
            <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-white p-6 text-center">
              <p className="font-medium text-[hsl(var(--foreground))] mb-1">
                Paso 1: publicá tu primer producto
              </p>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                Después podés destacar hasta 2 en la vitrina con el botón de estrella.
              </p>
              <Link
                href="/dashboard/new-product"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(var(--primary))] text-white text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Crear producto
              </Link>
            </div>
          ) : showcaseProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-white p-5">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Paso 2: en la lista de abajo, tocá la estrella en un producto activo para
                agregarlo acá.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {showcaseProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-white p-3"
                >
                  <div className="w-14 h-14 rounded-lg bg-[hsl(var(--muted))] overflow-hidden shrink-0">
                    {product.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.cover_url}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.title}</p>
                    <p className="text-xs text-[hsl(var(--primary))]">
                      {formatGs(product.price)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveFromShowcase(product.id)}
                    disabled={updatingShowcase === product.id}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {storeSlug && (
          <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">
            Tu tienda pública:{' '}
            <Link href={`/store/${storeSlug}`} className="text-[hsl(var(--primary))] hover:underline">
              /store/{storeSlug}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
