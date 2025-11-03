'use client';

// ============================================
// MERCADITO ONLINE PY - DASHBOARD LAYOUT COMÚN
// Layout compartido para todos los dashboards dentro de (dashboard)
// ============================================

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import DashboardSidebar from '@/components/DashboardSidebar';
import ProfileEnsurer from '@/components/ProfileEnsurer';
import AdminRoleAssigner from '@/components/AdminRoleAssigner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    // Timeout reducido a 5 segundos para mejor UX
    timeoutId = setTimeout(() => {
      if (mounted && allowed === null) {
        console.error('Timeout verificando permisos de dashboard');
        setAllowed(false);
        setLoading(false);
      }
    }, 5000);

    (async () => {
      try {
        // TEMPORALMENTE PERMITIR ACCESO PARA DEBUG - REMOVER DESPUÉS
        let session = null;
        let profile = null;
        let role = 'buyer';
        
        try {
          // Verificar sesión
          const { data: { session: sessionData }, error: sessionErr } = await supabase.auth.getSession();
          if (sessionErr || !sessionData?.user) {
            console.warn('[DEBUG] No hay sesión, pero permitiendo acceso temporalmente para debug');
          } else {
            session = sessionData;
            const user = session.user;

            // Verificar perfil y rol
            const { data: profileData, error: pErr } = await supabase
              .from('profiles')
              .select('id, role, email')
              .eq('id', user.id)
              .single();

            if (pErr) {
              console.warn('[DEBUG] Error obteniendo perfil, pero permitiendo acceso temporalmente');
            } else {
              profile = profileData;
              if (profile) {
                role = (profile as { role?: string }).role || 'buyer';
              }
            }
          }
        } catch (err) {
          console.warn('[DEBUG] Error en verificación, pero permitiendo acceso temporalmente');
        }

        if (mounted) {
          setUserRole(role);
        }

        // Verificar acceso según la ruta
        const isAdminRoute = pathname?.includes('/admin');
        const isSellerRoute = pathname?.includes('/seller');
        const isAffiliateRoute = pathname?.includes('/affiliate');
        const isBuyerRoute = pathname?.includes('/buyer');

        let hasAccess = false;

        // TEMPORALMENTE PERMITIR ACCESO PARA DEBUG
        if (!session || !profile) {
          console.warn('[DEBUG] No hay sesión o perfil, permitiendo acceso temporalmente para debug');
          hasAccess = true;
        } else if (isAdminRoute) {
          hasAccess = role === 'admin';
        } else if (isSellerRoute) {
          hasAccess = role === 'seller' || role === 'admin';
        } else if (isAffiliateRoute) {
          hasAccess = role === 'affiliate' || role === 'admin';
        } else if (isBuyerRoute) {
          hasAccess = role === 'buyer' || role === 'admin';
        } else {
          // Para otras rutas de dashboard, permitir si está autenticado
          hasAccess = true;
        }

        // ============================================
        // DEBUG AGRESIVO PARA DASHBOARD
        // ============================================
        console.log('[DEBUG/DASHBOARD] Verificando permisos...');
        console.log('[DEBUG/DASHBOARD] pathname:', pathname);
        console.log('[DEBUG/DASHBOARD] session:', session ? 'existe' : 'no existe');
        console.log('[DEBUG/DASHBOARD] profile:', profile ? JSON.stringify(profile, null, 2) : 'no existe');
        console.log('[DEBUG/DASHBOARD] role:', role);
        console.log('[DEBUG/DASHBOARD] hasAccess:', hasAccess);
        
        if (!session) {
          console.error('[ERROR/DASHBOARD] No hay sesión - Usuario no autenticado');
        }
        
        if (!profile) {
          console.error('[ERROR/DASHBOARD] No hay perfil - Verifica que el usuario tiene registro en profiles');
        }
        
        if (!hasAccess) {
          console.error('[ERROR/DASHBOARD] No tiene acceso a:', pathname);
          console.error('[ERROR/DASHBOARD] Role requerido vs actual - Ruta:', pathname, 'Role:', role);
        }

        if (mounted) {
          setAllowed(hasAccess);
          setLoading(false);
          
          if (!hasAccess) {
            // Redirigir según el rol del usuario
            if (role === 'seller') {
              window.location.href = '/dashboard/seller';
            } else if (role === 'affiliate') {
              window.location.href = '/dashboard/affiliate';
            } else if (role === 'buyer') {
              window.location.href = '/dashboard/buyer';
            } else {
              window.location.href = '/';
            }
          }
        }
      } catch (error) {
        console.error('Error en verificación de dashboard:', error);
        if (mounted) {
          setAllowed(false);
          setLoading(false);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [pathname]);

  // Mostrar carga mientras se verifica
  if (loading || allowed === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Denegar acceso si no está permitido
  if (!allowed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-medium text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600 mb-4">No tienes permisos para acceder a esta sección.</p>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  // Renderizar dashboard con sidebar
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Contenido principal con margen para sidebar */}
      <div className="ml-64">
        {/* Profile Ensurer y Admin Role Assigner */}
        <ProfileEnsurer />
        {userRole === 'admin' && <AdminRoleAssigner />}
        
        {/* Contenido del dashboard */}
        {children}
      </div>
    </div>
  );
}

