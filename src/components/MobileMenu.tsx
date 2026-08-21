'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Home, Gavel, ShoppingBag, Ticket } from 'lucide-react';
import Logo from '@/components/Logo';

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navigationItems = [
    { href: '/', label: 'Inicio', icon: Home },
    { href: '/auctions', label: 'Subastas', icon: Gavel },
    { href: '/raffles', label: 'Sorteos', icon: Ticket },
    { href: '/stores', label: 'Tiendas', icon: ShoppingBag },
  ];

  return (
    <>
      {/* Botón hamburguesa */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-3 min-h-[44px] min-w-[44px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] flex items-center justify-center rounded-xl hover:bg-[hsl(var(--muted))]"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Menú móvil */}
      <nav
        className={`
          fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50
          transform transition-transform duration-300 ease-in-out
          md:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Logo className="w-10 h-10" />
            <span className="text-sm font-bold text-[hsl(var(--foreground))]">Menú</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-3 min-h-[44px] min-w-[44px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] flex items-center justify-center rounded-xl"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="py-4">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 mx-2 min-h-[44px] rounded-xl transition-colors
                  ${isActive
                    ? 'bg-[hsl(var(--primary))] text-white'
                    : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

