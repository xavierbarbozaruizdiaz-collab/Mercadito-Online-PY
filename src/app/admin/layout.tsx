'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // 1) sesión
        const { data: { user }, error: uErr } = await supabase.auth.getUser();
        if (uErr || !user) {
          window.location.href = '/';
          return;
        }

        // 2) perfil por ID (cumple RLS: “Users can view own profile”)
        const { data: profile, error: pErr } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .single();

        if (pErr || !profile) {
          alert('No se encontró perfil para este usuario.');
          window.location.href = '/';
          return;
        }

        if (profile.role !== 'admin') {
          alert('Acceso restringido. No eres administrador.');
          window.location.href = '/';
          return;
        }

        setAllowed(true);
      } catch {
        window.location.href = '/';
      }
    })();
  }, []);

  if (allowed === null) return <main className="p-8">Verificando permisos…</main>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <nav className="flex gap-4">
          <Link href="/admin" className="font-semibold">Panel Admin</Link>
          <Link href="/admin/categories" className="underline">Categorías</Link>
        </nav>
        <Link href="/" className="underline text-sm">← Volver</Link>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
