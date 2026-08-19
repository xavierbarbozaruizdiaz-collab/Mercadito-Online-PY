'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ProfileEnsurer from '@/components/ProfileEnsurer';

const NAV = [
  { href: '/admin', label: 'Inicio', exact: true },
  { href: '/dashboard/admin/hero', label: 'Portada' },
  { href: '/admin/products', label: 'Productos' },
  { href: '/admin/orders', label: 'Pedidos' },
  { href: '/admin/stores', label: 'Tiendas' },
  { href: '/admin/users', label: 'Usuarios' },
  { href: '/admin/raffles', label: 'Sorteos' },
  { href: '/admin/settings', label: 'Ajustes' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    timeoutId = setTimeout(() => {
      if (mounted && allowed === null) {
        setProfileError(true);
      }
    }, 10000);

    (async () => {
      try {
        const {
          data: { session },
          error: sessionErr,
        } = await supabase.auth.getSession();
        if (sessionErr || !session?.user) {
          if (mounted) window.location.href = '/auth/sign-in?redirect=/admin';
          return;
        }

        setEmail(session.user.email || null);

        const { data: profile, error: pErr } = await supabase
          .from('profiles')
          .select('id, role, email')
          .eq('id', session.user.id)
          .single();

        if (pErr) {
          if (pErr.code === '42P27' || pErr.message?.includes('infinite recursion')) {
            if (mounted) setProfileError(true);
            return;
          }

          const { error: insertErr } = await (supabase as any)
            .from('profiles')
            .insert([{ id: session.user.id, email: session.user.email || '', role: 'buyer' }]);

          if (insertErr) {
            if (mounted) setProfileError(true);
            return;
          }
          if (mounted) window.location.reload();
          return;
        }

        if (!profile) {
          await (supabase as any)
            .from('profiles')
            .insert([{ id: session.user.id, email: session.user.email || '', role: 'buyer' }]);
          if (mounted) setAllowed(false);
          return;
        }

        const role = (profile as { role?: string }).role;
        if (mounted) setAllowed(role === 'admin');
      } catch {
        if (mounted) setProfileError(true);
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
      <div className="min-h-screen bg-[hsl(var(--background))] p-6 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <ProfileEnsurer />
        </div>
      </div>
    );
  }

  if (allowed === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-6">
        <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-6 py-5 flex items-center gap-3 shadow-sm">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-[hsl(var(--primary))] border-t-transparent" />
          <span className="text-[hsl(var(--foreground))]">Preparando tu panel…</span>
        </div>
      </main>
    );
  }

  if (allowed === false) {
    return (
      <main className="min-h-screen bg-[hsl(var(--background))] p-6 sm:p-8">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">
              Acceso restringido
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-5">
              Esta sección es solo para administradores del sitio. Si necesitás acceso, contactá a
              quien administra Mercadito Online PY.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="inline-flex px-4 py-2 rounded-xl bg-[hsl(var(--primary))] text-white text-sm font-medium hover:opacity-90"
              >
                Ir a mi cuenta
              </Link>
              <Link
                href="/"
                className="inline-flex px-4 py-2 rounded-xl border border-[hsl(var(--border))] text-sm font-medium hover:bg-[hsl(var(--muted))]"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Link href="/admin" className="text-lg font-bold text-[hsl(var(--primary))]">
                Panel de control
              </Link>
              {email && (
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 truncate max-w-[220px] sm:max-w-none">
                  {email}
                </p>
              )}
            </div>
            <Link
              href="/"
              className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
            >
              Ver sitio
            </Link>
          </div>
          <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[hsl(var(--primary))] text-white'
                      : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
