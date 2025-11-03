'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  Gavel
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
];

// Items para vendedores
const sellerSidebarItems: SidebarItem[] = [
  { icon: Plus, label: 'Nuevo Producto', href: '/dashboard/new-product', roles: ['seller', 'admin'] },
  { icon: ShoppingCart, label: 'Pedidos', href: '/dashboard/orders', roles: ['seller', 'admin'] },
  { icon: DollarSign, label: 'Retiros', href: '/dashboard/payouts', roles: ['seller', 'admin'] },
  { icon: ArrowLeftRight, label: 'Transacciones', href: '/dashboard/transactions', roles: ['seller', 'admin'] },
  { icon: Store, label: 'Tienda', href: '/dashboard/store', roles: ['seller', 'admin'] },
  { icon: Gavel, label: 'Dashboard Vendedor', href: '/dashboard/seller', roles: ['seller', 'admin'] },
];

// Items para afiliados
const affiliateSidebarItems: SidebarItem[] = [
  { icon: Users, label: 'Dashboard Afiliado', href: '/dashboard/affiliate', roles: ['affiliate', 'admin'] },
];

// Items para administradores
const adminSidebarItems: SidebarItem[] = [
  { icon: Shield, label: 'Dashboard Admin', href: '/dashboard/admin', roles: ['admin'] },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string>('');
  const { isAdmin, isSeller, isBuyer, role, loading: roleLoading } = useRole();

  useEffect(() => {
    const getUserEmail = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    };
    getUserEmail();
  }, []);

  // Filtrar items según el rol del usuario
  const getVisibleItems = (): SidebarItem[] => {
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
  };

  return (
    <aside className="w-64 bg-[#1F1F1F] border-r border-gray-800 min-h-screen fixed left-0 top-0 z-40">
      <div className="p-4 border-b border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span className="text-white font-semibold text-lg">Mercadito Online PY</span>
        </Link>
      </div>
      
      <nav className="p-4 space-y-1">
        {!roleLoading && getVisibleItems().map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
        {roleLoading && (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto"></div>
          </div>
        )}
      </nav>
      
      {/* Sección de usuario en la parte inferior */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Usuario</p>
            <p className="text-xs text-gray-500 truncate">{userEmail || 'Cargando...'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

