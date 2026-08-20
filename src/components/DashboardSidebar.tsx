'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRole } from '@/lib/hooks/useAuth';
import {
  Home,
  Plus,
  ShoppingCart,
  DollarSign,
  User,
  Store,
  Shield,
  Menu,
  X,
  Gift,
  ChevronDown,
  MoreHorizontal,
  BarChart3,
  Package,
  ArrowLeftRight,
  UserPlus,
  Ticket,
  Target,
  Gavel,
  ExternalLink,
} from 'lucide-react';
import Logo from '@/components/Logo';
import { BrandWordmark } from '@/components/BrandWordmark';

interface SidebarItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

const buyerItems: SidebarItem[] = [
  { icon: Home, label: 'Inicio', href: '/dashboard' },
  { icon: User, label: 'Perfil', href: '/dashboard/profile' },
  { icon: Gavel, label: 'Mis pujas', href: '/dashboard/my-bids' },
  { icon: Gift, label: 'Sorteos ganados', href: '/dashboard/raffles-won' },
];

const sellerMainItems: SidebarItem[] = [
  { icon: Home, label: 'Inicio', href: '/dashboard' },
  { icon: Plus, label: 'Publicar producto', href: '/dashboard/new-product' },
  { icon: ShoppingCart, label: 'Pedidos', href: '/dashboard/orders' },
  { icon: DollarSign, label: 'Dinero y retiros', href: '/dashboard/payouts' },
  { icon: Store, label: 'Mi tienda', href: '/dashboard/store' },
  { icon: User, label: 'Perfil', href: '/dashboard/profile' },
];

const sellerMoreItems: SidebarItem[] = [
  { icon: Package, label: 'Inventario', href: '/dashboard/inventory' },
  { icon: BarChart3, label: 'Estadísticas', href: '/dashboard/analytics' },
  { icon: ArrowLeftRight, label: 'Transacciones', href: '/dashboard/transactions' },
  { icon: ShoppingCart, label: 'Pedidos por conseguir', href: '/dashboard/sourcing-orders' },
  { icon: Target, label: 'Marketing', href: '/dashboard/marketing' },
  { icon: Ticket, label: 'Sorteos', href: '/dashboard/raffles' },
  { icon: UserPlus, label: 'Afiliados', href: '/dashboard/store/affiliates' },
  { icon: Gavel, label: 'Mis pujas', href: '/dashboard/my-bids' },
  { icon: Gift, label: 'Sorteos ganados', href: '/dashboard/raffles-won' },
];

interface DashboardSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
  onStatsClick?: () => void;
}

export default function DashboardSidebar({
  isOpen: controlledIsOpen,
  onClose,
  onCollapseChange,
  onStatsClick,
}: DashboardSidebarProps = {}) {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [roleLoadingTimeout, setRoleLoadingTimeout] = useState(false);

  const { isAdmin, isSeller, role, loading: roleLoading } = useRole();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (roleLoading) setRoleLoadingTimeout(true);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [roleLoading]);

  useEffect(() => {
    if (!roleLoading) setRoleLoadingTimeout(false);
  }, [roleLoading]);

  useEffect(() => {
    onCollapseChange?.(isDesktopCollapsed);
  }, [isDesktopCollapsed, onCollapseChange]);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : isMobileMenuOpen;
  const setIsOpen = controlledIsOpen !== undefined ? onClose || (() => {}) : setIsMobileMenuOpen;

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const getUserEmail = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.email) setUserEmail(session.user.email);
    };
    getUserEmail();
  }, []);

  const effectiveRoleLoading = roleLoading && !roleLoadingTimeout;
  const showSellerNav = isSeller || isAdmin;

  const isActive = useCallback(
    (href: string) =>
      pathname === href || (href !== '/dashboard' && pathname?.startsWith(href)),
    [pathname]
  );

  useEffect(() => {
    if (showSellerNav && sellerMoreItems.some((item) => isActive(item.href))) {
      setMoreOpen(true);
    }
  }, [pathname, showSellerNav, isActive]);

  const renderLink = (item: SidebarItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setIsOpen(false)}
        className={`flex items-center ${isDesktopCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors ${
          active
            ? 'bg-[hsl(var(--primary))] text-white'
            : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
        }`}
        title={isDesktopCollapsed ? item.label : ''}
      >
        <Icon className="w-5 h-5 shrink-0" />
        {!isDesktopCollapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const mainItems = showSellerNav ? sellerMainItems : buyerItems;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-3 min-h-[44px] min-w-[44px] bg-white border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl shadow-sm flex items-center justify-center"
        aria-label="Abrir menú"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <aside
        className={`
          bg-white border-r border-[hsl(var(--border))] h-screen fixed left-0 top-0 z-40
          transition-all duration-300 ease-in-out flex flex-col shadow-sm
          md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isDesktopCollapsed ? 'md:w-[72px]' : 'md:w-64'}
          w-[min(100vw-2rem,18rem)]
        `}
      >
        <div
          className={`p-4 border-b border-[hsl(var(--border))] flex items-center shrink-0 ${
            isDesktopCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <Link
            href="/dashboard"
            className={`flex items-center gap-2.5 ${isDesktopCollapsed ? 'justify-center' : ''}`}
            onClick={() => setIsOpen(false)}
            title="Mercadito Online PY"
          >
            <Logo className="w-9 h-9" />
            {!isDesktopCollapsed && (
              <BrandWordmark siteName="Mercadito Online PY" compact />
            )}
          </Link>
          <button
            type="button"
            onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
            className="hidden md:flex p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
            aria-label={isDesktopCollapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            {isDesktopCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {effectiveRoleLoading ? (
            <p className="px-3 py-2 text-sm text-[hsl(var(--muted-foreground))]">Cargando…</p>
          ) : (
            <>
              {mainItems.map(renderLink)}

              {showSellerNav && !isDesktopCollapsed && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setMoreOpen(!moreOpen)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                  >
                    <span className="flex items-center gap-3">
                      <MoreHorizontal className="w-5 h-5" />
                      Más herramientas
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {moreOpen && (
                    <div className="mt-1 ml-1 space-y-0.5 border-l-2 border-[hsl(var(--muted))] pl-2">
                      {sellerMoreItems.map(renderLink)}
                      {onStatsClick && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onStatsClick();
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                        >
                          <BarChart3 className="w-5 h-5 shrink-0" />
                          Resumen detallado
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {showSellerNav && isDesktopCollapsed && sellerMoreItems.slice(0, 3).map(renderLink)}

              {isAdmin && (
                <div className="pt-2 mt-2 border-t border-[hsl(var(--border))]">
                  {renderLink({ icon: Shield, label: 'Administrar sitio', href: '/admin' })}
                </div>
              )}

              {!showSellerNav && role === 'buyer' && (
                <div className="pt-2 mt-2 border-t border-[hsl(var(--border))]">
                  {renderLink({
                    icon: Store,
                    label: 'Vender en Mercadito',
                    href: '/dashboard/become-seller',
                  })}
                </div>
              )}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-[hsl(var(--border))] shrink-0 space-y-2">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className={`flex items-center ${isDesktopCollapsed ? 'justify-center' : 'gap-2'} px-3 py-2 rounded-xl text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]`}
            title="Volver al sitio"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            {!isDesktopCollapsed && <span>Volver al sitio</span>}
          </Link>
          <div
            className={`flex items-center ${isDesktopCollapsed ? 'justify-center' : 'gap-3'} px-2 py-1`}
          >
            <div className="w-8 h-8 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            </div>
            {!isDesktopCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[hsl(var(--foreground))] truncate">
                  {userEmail || 'Cargando…'}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
