'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type HeaderNavPillProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: number;
  badgeClassName?: string;
  alertDot?: boolean;
};

export function HeaderNavPill({
  href,
  label,
  icon: Icon,
  active = false,
  badge,
  badgeClassName,
  alertDot = false,
}: HeaderNavPillProps) {
  return (
    <Link
      href={href}
      className={cn(
        'relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
        active
          ? 'bg-[hsl(var(--primary))] text-white shadow-sm'
          : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))]'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.25 : 2} />
      <span>{label}</span>
      {typeof badge === 'number' && badge > 0 && (
        <span
          className={cn(
            'min-w-[1.25rem] h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[11px] font-bold',
            active
              ? 'bg-white/20 text-white'
              : 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]',
            badgeClassName
          )}
        >
          {badge}
        </span>
      )}
      {alertDot && (
        <span className="absolute top-1 right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
      )}
    </Link>
  );
}
