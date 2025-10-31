'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
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

  // Si no hay sesión → link para entrar
  if (!email) {
    return (
      <Link className="underline" href="/auth/sign-in">
        Entrar
      </Link>
    );
  }

  // Con sesión → email, link al Dashboard y botón Salir
  return (
    <div className="flex items-center gap-2 sm:gap-3 text-sm">
      <span className="text-gray-700 hidden sm:inline truncate max-w-[120px]">{email}</span>

      {/* Enlace al panel del vendedor */}
      <Link 
        href="/dashboard" 
        className="text-blue-600 hover:text-blue-800 hover:underline transition-colors font-medium"
      >
        Dashboard
      </Link>

      <button 
        onClick={signOut}
        disabled={isSigningOut}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg
          transition-all duration-200
          ${isSigningOut 
            ? 'bg-gray-400 text-white cursor-not-allowed' 
            : 'bg-red-500 hover:bg-red-600 text-white hover:shadow-md active:scale-95'
          }
          font-medium text-sm
        `}
        title={isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
      >
        {isSigningOut ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="hidden sm:inline">Saliendo...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Salir</span>
          </>
        )}
      </button>
    </div>
  );
}

