'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Home, 
  Plus, 
  ShoppingCart, 
  DollarSign, 
  ArrowLeftRight, 
  Users, 
  User, 
  Store, 
  Settings 
} from 'lucide-react';

interface SidebarItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

const sidebarItems: SidebarItem[] = [
  { icon: Home, label: 'Home', href: '/dashboard' },
  { icon: Plus, label: 'Nuevo Producto', href: '/dashboard/new-product' },
  { icon: ShoppingCart, label: 'Pedidos', href: '/dashboard/orders' },
  { icon: DollarSign, label: 'Retiros', href: '/dashboard/payouts' },
  { icon: ArrowLeftRight, label: 'Transacciones', href: '/dashboard/transactions' },
  { icon: Users, label: 'Afiliado', href: '/dashboard/affiliate' },
  { icon: User, label: 'Perfil', href: '/dashboard/profile' },
  { icon: Store, label: 'Tienda', href: '/dashboard/store' },
  { icon: Settings, label: 'Configuración', href: '/dashboard/settings' },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const getUserEmail = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    };
    getUserEmail();
  }, []);

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
        {sidebarItems.map((item) => {
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

