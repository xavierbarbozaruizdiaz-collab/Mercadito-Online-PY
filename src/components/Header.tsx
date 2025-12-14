'use client';

// ============================================
// MERCADITO ONLINE PY - HEADER COMPONENT
// Header del sitio con navegación y acciones
// ============================================

import Link from 'next/link';
import { Gavel, Ticket } from 'lucide-react';
import Logo from '@/components/Logo';
import MobileMenu from '@/components/MobileMenu';
import AuctionsNavLink from '@/components/AuctionsNavLink';
import RafflesNavLink from '@/components/RafflesNavLink';
import CartButton from '@/components/CartButton';
import UserMenu from '@/components/UserMenu';

type HeaderProps = {
  siteName: string;
};

export function Header({ siteName }: HeaderProps) {
  // Generar versión corta del nombre para móvil (primeras palabras)
  const shortName = siteName.split(' ').slice(0, 2).join(' ');

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Menú móvil y Logo */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
            <MobileMenu />
            <Link 
              href="/" 
              className="flex items-center gap-2 sm:gap-3 min-w-0 group"
            >
              {/* Logo PWA - con fallback si no existe la imagen */}
              <div className="relative">
                <Logo />
                <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 rounded-full transition-colors"></div>
              </div>
              <span className="text-base sm:text-xl md:text-2xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors truncate">
                <span className="hidden sm:inline">{siteName}</span>
                <span className="sm:hidden">{shortName}</span>
              </span>
            </Link>
          </div>
          
          {/* Navegación central (solo desktop) */}
          <div className="hidden md:flex flex-1 justify-center items-center gap-4">
            <AuctionsNavLink />
            <RafflesNavLink />
          </div>
          
          {/* Iconos de subastas/sorteos y acciones derecha juntos */}
          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 flex-shrink-0">
            {/* Iconos en móvil */}
            <div className="md:hidden flex items-center gap-1">
              <Link
                href="/auctions"
                className="flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                aria-label="Subastas"
              >
                <Gavel className="w-5 h-5 sm:w-6 sm:h-6" />
              </Link>
              <Link
                href="/raffles"
                className="flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all"
                aria-label="Sorteos"
              >
                <Ticket className="w-5 h-5 sm:w-6 sm:h-6" />
              </Link>
            </div>
            
            {/* Acciones derecha */}
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


















