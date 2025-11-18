'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import ProfileEnsurer from '@/components/ProfileEnsurer';
import AdminRoleAssigner from '@/components/AdminRoleAssigner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    // Timeout de seguridad: si después de 10 segundos no hay respuesta, mostrar error
    timeoutId = setTimeout(() => {
      if (mounted && allowed === null) {
        console.error('Timeout verificando permisos de admin');
        setProfileError(true);
      }
    }, 10000);

    (async () => {
      try {
        console.log('🔐 Iniciando verificación de permisos admin...');
        
        // 1) sesión - usar getSession en lugar de getUser para evitar problemas
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr || !session?.user) {
          console.error('❌ Error de autenticación:', sessionErr);
          if (mounted) {
            window.location.href = '/auth/sign-in';
          }
          return;
        }
        const user = session.user;

        console.log('✅ Usuario autenticado:', user.email);

        // 2) perfil por ID (con políticas RLS simplificadas)
        console.log('📋 Consultando perfil...');
        const { data: profile, error: pErr } = await supabase
          .from('profiles')
          .select('id, role, email')
          .eq('id', user.id)
          .single();

        if (pErr) {
          console.error('❌ Error cargando perfil:', pErr);
          // Si es error de recursión u otro error RLS
          if (pErr.code === '42P27' || pErr.message?.includes('infinite recursion')) {
            console.error('🚨 Error de recursión infinita detectado');
            if (mounted) {
              setProfileError(true);
            }
            return;
          }
          
          // Intentar crear perfil si no existe
          console.log('🆕 Intentando crear perfil...');
          const { error: insertErr } = await (supabase as any)
            .from('profiles')
            .insert([{ id: user.id, email: user.email || '', role: 'buyer' }]);
          
          if (insertErr) {
            console.error('❌ Error creando perfil:', insertErr);
            if (mounted) {
              setProfileError(true);
            }
            return;
          }
          
          // Recargar después de crear perfil
          if (mounted) {
            window.location.reload();
          }
          return;
        }

        if (!profile) {
          console.warn('⚠️ No se encontró perfil, creando uno con rol admin...');
          // Si no hay perfil, intentar crear uno y asignar admin
          const { error: insertErr } = await (supabase as any)
            .from('profiles')
            .insert([{ id: user.id, email: user.email || '', role: 'admin' }]);
          
          if (insertErr) {
            console.error('❌ Error creando perfil admin:', insertErr);
            if (mounted) {
              setProfileError(true);
            }
            return;
          }
          
          console.log('✅ Perfil admin creado, recargando...');
          // Recargar para verificar el nuevo perfil
          if (mounted) {
            setAllowed(true);
          }
          return;
        }

        const profileData = profile as { id: string; role: string; email?: string } | null;
        console.log('📊 Perfil encontrado. Rol:', profileData?.role);
        
        // Si no es admin, mostrar opción de asignar rol
        if (!profileData || profileData.role !== 'admin') {
          console.warn('⚠️ Usuario no es admin. Rol actual:', profileData?.role);
          // No redirigir inmediatamente, mostrar opción de asignar admin
          if (mounted) {
            setAllowed(false);
          }
          return;
        }

        console.log('✅ Usuario es admin, acceso permitido');
        if (mounted) {
          setAllowed(true);
        }
      } catch (err: any) {
        console.error('❌ Error inesperado:', err);
        if (mounted) {
          setProfileError(true);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  if (profileError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <ProfileEnsurer />
        </div>
      </div>
    );
  }

  if (allowed === null) {
    return (
      <main className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-700">Verificando permisos de administrador…</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (allowed === false) {
    return (
      <main className="p-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Acceso Restringido</h2>
            <p className="text-gray-700 mb-4">
              No tienes permisos de administrador. Necesitas el rol 'admin' en tu perfil para acceder al panel.
            </p>
          </div>
          
          {/* Componente para asignar rol de admin */}
          <AdminRoleAssigner />
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Alternativa: Usar SQL Directo</h3>
            <p className="text-sm text-blue-800 mb-2">
              También puedes ejecutar el script <code className="bg-blue-100 px-2 py-1 rounded text-xs">assign_admin.sql</code> en Supabase SQL Editor.
            </p>
            <div className="mt-3 space-x-2">
              <a 
                href="/dashboard" 
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                Ir al Dashboard
              </a>
              <a 
                href="/" 
                className="inline-block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
              >
                Volver al inicio
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <nav className="flex gap-4">
          <Link href="/admin" className="font-semibold">Panel Admin</Link>
          <Link href="/admin/categories" className="underline">Categorías</Link>
          <Link href="/admin/marketing/catalogo-vitrina" className="underline">Catálogo Vitrina</Link>
        </nav>
        <Link href="/" className="underline text-sm">← Volver</Link>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
