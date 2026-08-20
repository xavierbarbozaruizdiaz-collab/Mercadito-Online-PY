'use client';

type BrandWordmarkProps = {
  siteName: string;
  compact?: boolean;
};

/** Tipografía de marca: Mercadito + Online + badge PY */
export function BrandWordmark({ siteName, compact = false }: BrandWordmarkProps) {
  const name = siteName.trim();
  const isMercadito =
    name.toLowerCase().includes('mercadito') && name.toLowerCase().includes('py');

  if (!isMercadito) {
    return (
      <span className="font-bold text-lg sm:text-xl text-[hsl(var(--foreground))] tracking-tight truncate">
        {name}
      </span>
    );
  }

  if (compact) {
    return (
      <span className="flex items-baseline gap-1 min-w-0">
        <span className="font-bold text-base text-[hsl(var(--foreground))] tracking-tight truncate">
          Mercadito
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--primary))] shrink-0">
          PY
        </span>
      </span>
    );
  }

  return (
    <span className="flex items-baseline gap-1 sm:gap-1.5 min-w-0">
      <span className="font-bold text-lg sm:text-xl text-[hsl(var(--foreground))] tracking-tight truncate">
        Mercadito
      </span>
      <span className="font-semibold text-lg sm:text-xl text-[hsl(var(--primary))] tracking-tight hidden sm:inline">
        Online
      </span>
      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--primary))] shrink-0">
        PY
      </span>
    </span>
  );
}
