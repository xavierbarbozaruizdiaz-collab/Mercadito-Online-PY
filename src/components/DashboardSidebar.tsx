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
  ArrowLeftRight, 
  Users, 
  User, 
  Store, 
  Settings,
  Shield,
  Menu,
  X,
  UserPlus,
  BarChart3,
  Package,
  Ticket,
  Gift,
  Target
} from 'lucide-react';

interface SidebarItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  roles?: ('admin' | 'seller' | 'buyer' | 'affiliate')[]; // Roles que pueden ver este item
}

// Items base (visibles para todos los usuarios autenticados)
const baseSidebarItems: SidebarItem[] = [
  { icon: Home, label: 'Home', href: '/dashboard' },
  { icon: User, label: 'Perfil', href: '/dashboard/profile' },
  { icon: Gift, label: 'Sorteos Ganados', href: '/dashboard/raffles-won' },
];

// Items para vendedores (sin estadísticas, se agregará como botón especial)
const sellerSidebarItems: SidebarItem[] = [
  { icon: Plus, label: 'Nuevo Producto', href: '/dashboard/new-product', roles: ['seller', 'admin'] },
  { icon: ShoppingCart, label: 'Pedidos', href: '/dashboard/orders', roles: ['seller', 'admin'] },
  { icon: ShoppingCart, label: 'Pedidos por conseguir', href: '/dashboard/sourcing-orders', roles: ['seller', 'admin'] },
  { icon: Package, label: 'Inventario', href: '/dashboard/inventory', roles: ['seller', 'admin'] },
  { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics', roles: ['seller', 'admin'] },
  { icon: DollarSign, label: 'Retiros', href: '/dashboard/payouts', roles: ['seller', 'admin'] },
  { icon: ArrowLeftRight, label: 'Transacciones', href: '/dashboard/transactions', roles: ['seller', 'admin'] },
  { icon: Store, label: 'Tienda', href: '/dashboard/store', roles: ['seller', 'admin'] },
  { icon: UserPlus, label: 'Afiliados', href: '/dashboard/store/affiliates', roles: ['seller', 'admin'] },
  { icon: Ticket, label: 'Sorteos', href: '/dashboard/raffles', roles: ['seller', 'admin'] },
  { icon: Target, label: 'Marketing', href: '/dashboard/marketing', roles: ['seller', 'admin'] },
];

// Items para afiliados
const affiliateSidebarItems: SidebarItem[] = [
  { icon: Users, label: 'Dashboard Afiliado', href: '/dashboard/affiliate', roles: ['affiliate', 'admin'] },
];

// Items para administradores
const adminSidebarItems: SidebarItem[] = [
  { icon: Shield, label: 'Dashboard Admin', href: '/dashboard/admin', roles: ['admin'] },
];

interface DashboardSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
  onStatsClick?: () => void;
}

export default function DashboardSidebar({ isOpen: controlledIsOpen, onClose, onCollapseChange, onStatsClick }: DashboardSidebarProps = {}) {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [roleLoadingTimeout, setRoleLoadingTimeout] = useState(false);
  
  const { isAdmin, isSeller, isBuyer, role, loading: roleLoading } = useRole();
  
  // Timeout para evitar que se quede cargando indefinidamente
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (roleLoading) {
        setRoleLoadingTimeout(true);
      }
    }, 3000); // 3 segundos máximo
    
    return () => clearTimeout(timeout);
  }, [roleLoading]);
  
  // Reset timeout cuando termine de cargar
  useEffect(() => {
    if (!roleLoading) {
      setRoleLoadingTimeout(false);
    }
  }, [roleLoading]);
  
  // Notificar cambios de colapso
  useEffect(() => {
    if (onCollapseChange) {
      onCollapseChange(isDesktopCollapsed);
    }
  }, [isDesktopCollapsed, onCollapseChange]);
  
  // Usar estado controlado si se proporciona, sino usar estado interno
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : isMobileMenuOpen;
  const setIsOpen = controlledIsOpen !== undefined ? onClose || (() => {}) : setIsMobileMenuOpen;

  // Cerrar menú al cambiar de ruta en móvil
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const getUserEmail = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    };
    getUserEmail();
  }, []);

  // Filtrar items según el rol del usuario - DEBE DEFINIRSE PRIMERO
  const getVisibleItems = useCallback((): SidebarItem[] => {
    const items: SidebarItem[] = [...baseSidebarItems];

    // Agregar items de vendedor si es seller o admin
    if (isSeller || isAdmin) {
      items.push(...sellerSidebarItems);
    }

    // Agregar items de afiliado si es affiliate o admin
    if ((role === 'affiliate' as any) || isAdmin) {
      items.push(...affiliateSidebarItems);
    }

    // Agregar items de admin solo si es admin
    if (isAdmin) {
      items.push(...adminSidebarItems);
    }

    // Filtrar items duplicados (puede haber solapamiento)
    const uniqueItems = items.filter((item, index, self) =>
      index === self.findIndex((t) => t.href === item.href)
    );

    return uniqueItems;
  }, [isAdmin, isSeller, role]);

  // Usar timeout como fallback si roleLoading está activo demasiado tiempo
  // Si hay timeout, asumir que podemos mostrar items básicos
  const effectiveRoleLoading = roleLoading && !roleLoadingTimeout;
  
  // Función optimizada para obtener items visibles - DEBE DEFINIRSE DESPUÉS DE getVisibleItems
  const getVisibleItemsOptimized = useCallback((): SidebarItem[] => {
    // Si está cargando y no hay timeout, mostrar solo items base
    if (effectiveRoleLoading) {
      return baseSidebarItems;
    }
    
    // Si no hay rol todavía pero no está en loading efectivo, intentar obtener items
    // Si role es null/undefined pero no está loading, mostrar items base
    if (!role && !roleLoading) {
      return baseSidebarItems;
    }
    
    return getVisibleItems();
  }, [effectiveRoleLoading, role, roleLoading, getVisibleItems]);

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Botón hamburguesa para móvil */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-3 min-h-[44px] min-w-[44px] bg-[#1F1F1F] text-white rounded-lg shadow-lg flex items-center justify-center"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Botón hamburguesa para desktop */}
      <button
        onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
        className={`hidden md:flex fixed z-50 p-3 min-h-[44px] min-w-[44px] bg-[#1F1F1F] text-white rounded-lg shadow-lg items-center justify-center hover:bg-[#2A2A2A] transition-all duration-300 ${
          isDesktopCollapsed ? 'top-4 left-4' : 'top-4 left-[260px]'
        }`}
        aria-label="Toggle sidebar"
      >
        {isDesktopCollapsed ? <Menu className="w-6 h-6" /> : <X className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          bg-[#1F1F1F] border-r border-gray-800 min-h-screen fixed left-0 top-0 z-40
          transition-all duration-300 ease-in-out
          md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isDesktopCollapsed ? 'md:w-16' : 'md:w-64'}
          w-64
        `}
      >
        <div className={`p-4 border-b border-gray-800 flex items-center ${isDesktopCollapsed ? 'justify-center' : 'justify-between'}`}>
          <Link 
            href="/dashboard" 
            className={`flex items-center gap-2 ${isDesktopCollapsed ? 'justify-center' : ''}`} 
            onClick={() => setIsOpen(false)}
            title={isDesktopCollapsed ? 'Mercadito Online PY' : ''}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            {!isDesktopCollapsed && (
              <span className="text-white font-semibold text-lg whitespace-nowrap">Mercadito Online PY</span>
            )}
          </Link>
          {/* Botón cerrar en móvil */}
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden text-gray-400 hover:text-white"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      
      <nav className="p-4 space-y-1">
        {getVisibleItemsOptimized().map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center ${isDesktopCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 min-h-[44px] rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
              title={isDesktopCollapsed ? item.label : ''}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isDesktopCollapsed && (
                <span className="font-medium whitespace-nowrap">{item.label}</span>
              )}
            </Link>
          );
        })}
        
        {/* Botón de Estadísticas (solo para vendedores/admin) */}
        {(isSeller || isAdmin) && onStatsClick && (
          <button
            onClick={() => {
              setIsOpen(false);
              onStatsClick();
            }}
            className={`flex items-center ${isDesktopCollapsed ? 'justify-center' : 'gap-3'} w-full px-4 py-3 min-h-[44px] rounded-lg transition-colors text-gray-300 hover:bg-gray-800 hover:text-white`}
            title={isDesktopCollapsed ? 'Estadísticas' : ''}
          >
            <BarChart3 className="w-5 h-5 flex-shrink-0" />
            {!isDesktopCollapsed && (
              <span className="font-medium whitespace-nowrap">Estadísticas</span>
            )}
          </button>
        )}
      </nav>
      
      {/* Sección de usuario en la parte inferior */}
      <div className={`absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800 ${isDesktopCollapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center ${isDesktopCollapsed ? 'justify-center' : 'gap-3'} text-gray-400`}>
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4" />
          </div>
          {!isDesktopCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Usuario</p>
              <p className="text-xs text-gray-500 truncate">{userEmail || 'Cargando...'}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}

