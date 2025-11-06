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
    let isVerifying = false;

    // Cache simple en sessionStorage para evitar verificaciones múltiples simultáneas
    const cacheKey = 'dashboard_permission_check';
    const cacheExpiry = 5000; // 5 segundos de cache
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const { allowed: cachedAllowed, role: cachedRole, timestamp } = JSON.parse(cached);
        const now = Date.now();
        
        // Si el cache es reciente (menos de 5 segundos), usarlo
        if (now - timestamp < cacheExpiry && cachedAllowed !== null) {
          if (mounted) {
            setAllowed(cachedAllowed);
            setUserRole(cachedRole);
            setLoading(false);
            
            // Verificar acceso según la ruta con el rol cacheado
            const isAdminRoute = pathname?.includes('/admin');
            const isSellerRoute = pathname?.includes('/seller');
            const isAffiliateRoute = pathname?.includes('/affiliate');
            const isBuyerRoute = pathname?.includes('/buyer');
            
            let hasAccess = false;
            if (isAdminRoute) {
              hasAccess = cachedRole === 'admin';
            } else if (isSellerRoute) {
              hasAccess = cachedRole === 'seller' || cachedRole === 'admin';
            } else if (isAffiliateRoute) {
              hasAccess = cachedRole === 'affiliate' || cachedRole === 'admin';
            } else if (isBuyerRoute) {
              hasAccess = cachedRole === 'buyer' || cachedRole === 'admin';
            } else {
              hasAccess = true;
            }
            
            if (!hasAccess && cachedAllowed) {
              // Redirigir según el rol del usuario
              if (cachedRole === 'seller') {
                window.location.href = '/dashboard';
              } else if (cachedRole === 'affiliate') {
                window.location.href = '/dashboard/affiliate';
              } else if (cachedRole === 'buyer') {
                window.location.href = '/dashboard/buyer';
              } else {
                window.location.href = '/auth/sign-in';
              }
            }
          }
          return; // Salir temprano si usamos el cache
        }
      } catch (e) {
        // Si el cache está corrupto, continuar con verificación normal
        sessionStorage.removeItem(cacheKey);
      }
    }

    // Timeout de seguridad aumentado a 10 segundos para múltiples pestañas
    timeoutId = setTimeout(() => {
      if (mounted && allowed === null && !isVerifying) {
        console.warn('Timeout verificando permisos de dashboard - redirigiendo a login');
        setAllowed(false);
        setLoading(false);
        sessionStorage.removeItem(cacheKey);
        window.location.href = '/auth/sign-in';
      }
    }, 10000);

    (async () => {
      if (isVerifying) return; // Evitar verificaciones simultáneas
      isVerifying = true;

      try {
        // Verificar sesión con timeout reducido para múltiples pestañas
        const sessionPromise = supabase.auth.getSession();
        const sessionTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 2000)
        );
        
        let sessionData: any;
        try {
          const result = await Promise.race([sessionPromise, sessionTimeout]);
          sessionData = result as any;
        } catch (sessionError) {
          if (mounted) {
            console.error('Error obteniendo sesión:', sessionError);
            setAllowed(false);
            setLoading(false);
            sessionStorage.removeItem(cacheKey);
            window.location.href = '/auth/sign-in';
          }
          isVerifying = false;
          return;
        }
        
        const { data: { session }, error: sessionErr } = sessionData;
        
        if (sessionErr || !session?.user) {
          if (mounted) {
            setAllowed(false);
            setLoading(false);
            sessionStorage.removeItem(cacheKey);
            window.location.href = '/auth/sign-in';
          }
          isVerifying = false;
          return;
        }

        const user = session.user;

        // Verificar perfil y rol con timeout reducido
        const profilePromise = supabase
          .from('profiles')
          .select('id, role, email')
          .eq('id', user.id)
          .single();
        
        const profileTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile timeout')), 2000)
        );

        let profileData: any;
        try {
          const result = await Promise.race([profilePromise, profileTimeout]);
          profileData = result as any;
        } catch (profileError: any) {
          if (mounted) {
            console.error('Error obteniendo perfil:', profileError);
            setAllowed(false);
            setLoading(false);
            sessionStorage.removeItem(cacheKey);
            window.location.href = '/auth/sign-in';
          }
          isVerifying = false;
          return;
        }

        const { data: profile, error: pErr } = profileData;

        if (pErr || !profile) {
          if (mounted) {
            setAllowed(false);
            setLoading(false);
            sessionStorage.removeItem(cacheKey);
            window.location.href = '/auth/sign-in';
          }
          isVerifying = false;
          return;
        }

        const role = (profile as { role?: string }).role || 'buyer';

        if (mounted) {
          setUserRole(role);
        }

        // Verificar acceso según la ruta
        const isAdminRoute = pathname?.includes('/admin');
        const isSellerRoute = pathname?.includes('/seller');
        const isAffiliateRoute = pathname?.includes('/affiliate');
        const isBuyerRoute = pathname?.includes('/buyer');

        let hasAccess = false;

        if (isAdminRoute) {
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

        if (mounted) {
          setAllowed(hasAccess);
          setLoading(false);
          clearTimeout(timeoutId);
          
          // Guardar en cache para otras pestañas
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({
              allowed: hasAccess,
              role,
              timestamp: Date.now()
            }));
          } catch (e) {
            // Si sessionStorage no está disponible, continuar sin cache
          }
          
          if (!hasAccess) {
            // Redirigir según el rol del usuario
            if (role === 'seller') {
              window.location.href = '/dashboard';
            } else if (role === 'affiliate') {
              window.location.href = '/dashboard/affiliate';
            } else if (role === 'buyer') {
              window.location.href = '/dashboard/buyer';
            } else {
              window.location.href = '/auth/sign-in';
            }
          }
        }
        isVerifying = false;
      } catch (error) {
        console.error('Error en verificación de dashboard:', error);
        if (mounted) {
          setAllowed(false);
          setLoading(false);
          clearTimeout(timeoutId);
          sessionStorage.removeItem(cacheKey);
        }
        isVerifying = false;
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
      <div className="md:ml-64">
        {/* Profile Ensurer y Admin Role Assigner - Solo mostrar si NO es admin */}
        {/* Si ya es admin, no necesita verificar perfil ni asignar rol */}
        {userRole !== 'admin' && (
          <>
            <ProfileEnsurer />
            <AdminRoleAssigner />
          </>
        )}
        
        {/* Contenido del dashboard */}
        {children}
      </div>
    </div>
  );
}

