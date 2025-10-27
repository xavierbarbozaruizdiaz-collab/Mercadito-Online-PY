'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMsg(error ? `Error: ${error.message}` : 'Sesión iniciada. Recargá la página.');
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setMsg(error ? `Error: ${error.message}` : 'Usuario creado. Revisá tu email si hace falta.');
  }

  return (
    <main className="min-h-screen p-8 max-w-sm mx-auto">
      <Link href="/" className="underline text-sm">← Volver</Link>
      <h1 className="text-2xl font-bold mt-3 mb-4">Acceder</h1>

      <form className="space-y-3" onSubmit={signIn}>
        <input className="w-full border rounded p-2" type="email" placeholder="Email"
               value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full border rounded p-2" type="password" placeholder="Contraseña"
               value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full bg-black text-white rounded p-2">Iniciar sesión</button>
      </form>

      <button onClick={signUp} className="w-full border rounded p-2 mt-3">
        Crear cuenta
      </button>

      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </main>
  );
}
