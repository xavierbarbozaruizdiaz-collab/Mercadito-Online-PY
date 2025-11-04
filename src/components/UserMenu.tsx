'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, LogIn, LogOut, LayoutDashboard } from 'lucide-react';

export default function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    // Sesión actual al cargar
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setEmail(data.session?.user.email ?? null);
    });

    // Escuchar cambios de autenticación
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (mounted) {
        if (event === 'SIGNED_OUT') {
          setEmail(null);
          // Redirigir al home cuando se cierra sesión
          router.push('/');
          router.refresh();
        } else {
          setEmail(sess?.user.email ?? null);
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
      // Cerrar sesión en Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error al cerrar sesión:', error);
        alert('Error al cerrar sesión. Por favor intenta nuevamente.');
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
      }
      
      // Redirigir y refrescar
      router.push('/');
      router.refresh();
      
      // También hacer refresh completo como fallback
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
      
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      alert('Error al cerrar sesión. Por favor intenta nuevamente.');
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

