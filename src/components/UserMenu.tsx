'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Sesión actual al cargar
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setEmail(data.session?.user.email ?? null);
    });

    // Escuchar cambios de autenticación
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setEmail(sess?.user.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    location.reload();
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
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-700">{email}</span>

      {/* Enlace al panel del vendedor */}
      <Link href="/dashboard" className="underline">
        Dashboard
      </Link>

      <button onClick={signOut} className="border rounded px-2 py-1">
        Salir
      </button>
    </div>
  );
}

