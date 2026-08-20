'use client';

// ============================================
// MERCADITO ONLINE PY - HEADER COMPONENT
// Header del sitio con navegación y acciones
// ============================================

import Link from 'next/link';
import { Gavel, Ticket } from 'lucide-react';
import Logo from '@/components/Logo';
import { BrandWordmark } from '@/components/BrandWordmark';
import MobileMenu from '@/components/MobileMenu';
import AuctionsNavLink from '@/components/AuctionsNavLink';
import RafflesNavLink from '@/components/RafflesNavLink';
import CartButton from '@/components/CartButton';
import UserMenu from '@/components/UserMenu';

type HeaderProps = {
  siteName: string;
};

export function Header({ siteName }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[hsl(var(--border))] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
            <MobileMenu />
            <Link
              href="/"
              className="flex items-center gap-2.5 min-w-0 rounded-xl py-1 pr-2 -ml-1 hover:bg-[hsl(var(--muted))]/50 transition-colors"
              aria-label={`${siteName} - Inicio`}
            >
              <Logo />
              <span className="sm:hidden">
                <BrandWordmark siteName={siteName} compact />
              </span>
              <span className="hidden sm:block">
                <BrandWordmark siteName={siteName} />
              </span>
            </Link>
          </div>

          <div className="hidden md:flex flex-1 justify-center items-center gap-2">
            <AuctionsNavLink />
            <RafflesNavLink />
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 flex-shrink-0">
            <div className="md:hidden flex items-center gap-1">
              <Link
                href="/auctions"
                className="flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
                aria-label="Subastas"
              >
                <Gavel className="w-5 h-5 sm:w-6 sm:h-6" />
              </Link>
              <Link
                href="/raffles"
                className="flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-[hsl(var(--muted-foreground))] hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                aria-label="Sorteos"
              >
                <Ticket className="w-5 h-5 sm:w-6 sm:h-6" />
              </Link>
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2">
              <CartButton />
              <UserMenu />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
