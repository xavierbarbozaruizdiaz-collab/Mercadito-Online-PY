'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, LogIn, LogOut, LayoutDashboard } from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';
import { getActiveSubscription, getMembershipPlanById } from '@/lib/services/membershipService';
import { formatCurrency } from '@/lib/utils';

export default function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [canonAmount, setCanonAmount] = useState<number | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useToast();

  // Cargar información de membresía
  useEffect(() => {
    if (!userId) return;
    
    let mounted = true;
    setLoadingMembership(true);

    (async () => {
      try {
        const subscription = await getActiveSubscription(userId);
        if (!mounted) return;

        if (subscription && subscription.status === 'active') {
          setCanonAmount(subscription.amount_paid);
          
          // Obtener nombre del plan
          const plan = await getMembershipPlanById(subscription.plan_id);
          if (mounted && plan) {
            setPlanName(plan.name);
          }
        } else {
          setCanonAmount(null);
          setPlanName(null);
        }
      } catch (err) {
        console.error('Error loading membership:', err);
        if (mounted) {
          setCanonAmount(null);
          setPlanName(null);
        }
      } finally {
        if (mounted) {
          setLoadingMembership(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [userId]);

  // Escuchar eventos de actualización de membresía
  useEffect(() => {
    const handleMembershipUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { userId: updatedUserId } = customEvent.detail || {};
      if (updatedUserId && updatedUserId === userId) {
        // Recargar membresía
        if (userId) {
          getActiveSubscription(userId).then(subscription => {
            if (subscription && subscription.status === 'active') {
              setCanonAmount(subscription.amount_paid);
              getMembershipPlanById(subscription.plan_id).then(plan => {
                if (plan) setPlanName(plan.name);
              });
            } else {
              setCanonAmount(null);
              setPlanName(null);
            }
          });
        }
      }
    };

    window.addEventListener('membership-updated', handleMembershipUpdate);
    return () => {
      window.removeEventListener('membership-updated', handleMembershipUpdate);
    };
  }, [userId]);

  useEffect(() => {
    let mounted = true;

    // Sesión actual al cargar
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setEmail(data.session?.user.email ?? null);
        setUserId(data.session?.user.id ?? null);
      }
    });

    // Escuchar cambios de autenticación
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (mounted) {
        if (event === 'SIGNED_OUT') {
          setEmail(null);
          setUserId(null);
          setCanonAmount(null);
          setPlanName(null);
          // Redirigir al home cuando se cierra sesión
          router.push('/');
          router.refresh();
        } else {
          setEmail(sess?.user.email ?? null);
          setUserId(sess?.user.id ?? null);
        }
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  async function signOut() {
    if (isSigningOut) return; // Prevenir múltiples clics
    
    setIsSigningOut(true);
    
    try {
      // Cerrar sesión en Supabase con scope global para asegurar que se cierre en todos los lugares
      // Esto previene errores 403 en producción
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('Error al cerrar sesión:', error);
        
        // Si el error es 403, intentar cerrar sesión localmente de todas formas
        if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
          console.warn('Error 403 al cerrar sesión, limpiando sesión localmente');
          
          // Limpiar el estado local y localStorage
          setEmail(null);
          if (typeof window !== 'undefined') {
            Object.keys(localStorage).forEach(key => {
              if (key.includes('supabase') || key.includes('auth')) {
                localStorage.removeItem(key);
              }
            });
            // También limpiar sessionStorage
            sessionStorage.clear();
          }
          
          // Redirigir de todas formas
          router.push('/');
          router.refresh();
          setTimeout(() => {
            window.location.href = '/';
          }, 100);
          
          toast.success('Sesión cerrada localmente');
          setIsSigningOut(false);
          return;
        }
        
        toast.error('Error al cerrar sesión. Por favor intenta nuevamente.');
        setIsSigningOut(false);
        return;
      }
      
      // Limpiar el estado local inmediatamente
      setEmail(null);
      
      // Limpiar cualquier caché local si es necesario
      if (typeof window !== 'undefined') {
        // Limpiar localStorage relacionado con auth
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('auth')) {
            localStorage.removeItem(key);
          }
        });
        // También limpiar sessionStorage
        sessionStorage.clear();
      }
      
      toast.success('Sesión cerrada exitosamente');
      
      // Redirigir y refrescar
      router.push('/');
      router.refresh();
      
      // También hacer refresh completo como fallback
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
      
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      
      // Intentar limpiar localmente aunque haya error
      setEmail(null);
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('auth')) {
            localStorage.removeItem(key);
          }
        });
        sessionStorage.clear();
      }
      
      toast.error('Error al cerrar sesión. Por favor intenta nuevamente.');
      setIsSigningOut(false);
    }
  }

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Log cuando se montan los botones Header/Login
  useEffect(() => {
    console.log('[BTN] Header/Login buttons mounted');
  }, []);

  return (
    <div className="relative flex-shrink-0" ref={menuRef}>
      {/* Botón icono de usuario */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
        aria-label="Menú de usuario"
        aria-expanded={isOpen}
      >
        <User className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Menú desplegable */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
            {!email ? (
              // Sin sesión: Solo mostrar "Entrar"
              <Link
                href="/auth/sign-in"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <LogIn className="w-5 h-5" />
                <span className="font-medium">Entrar</span>
              </Link>
            ) : (
              // Con sesión: Dashboard y Salir
              <>
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-xs text-gray-500">Sesión</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{email}</p>
                </div>

                {/* Canon Abonado */}
                {canonAmount !== null && canonAmount > 0 && planName && (
                  <div className="px-4 py-3 border-b border-gray-200 bg-blue-50">
                    <p className="text-xs text-gray-600 mb-1">Canon Abonado:</p>
                    <p className="text-sm font-semibold text-blue-900 mb-1">
                      {formatCurrency(canonAmount)}
                    </p>
                    <p className="text-xs text-gray-600 mb-2">{planName}</p>
                    <Link
                      href="/memberships"
                      onClick={() => setIsOpen(false)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                    >
                      Ver planes y cambiar →
                    </Link>
                  </div>
                )}

                {loadingMembership && (
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-xs text-gray-500">Cargando membresía...</p>
                  </div>
                )}
                
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="font-medium">Dashboard</span>
                </Link>
                
                <button
                  onClick={() => {
                    setIsOpen(false);
                    signOut();
                  }}
                  disabled={isSigningOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningOut ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="font-medium">Saliendo...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">Salir</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

