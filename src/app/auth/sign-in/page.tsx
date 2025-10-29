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
    
    if (error) {
      setMsg(`Error: ${error.message}`);
    } else {
      setMsg('Sesión iniciada. Redirigiendo...');
      // Redirigir al dashboard después del login exitoso
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const { data, error } = await supabase.auth.signUp({ email, password });
    
    if (error) {
      setMsg(`Error: ${error.message}`);
    } else {
      setMsg('Usuario creado exitosamente. Revisá tu email de bienvenida.');
      
      // Enviar email de bienvenida (en segundo plano)
      if (data.user?.email) {
        fetch('/api/email/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: data.user.email,
            userName: data.user.email.split('@')[0],
          }),
        }).catch(err => console.error('Error enviando email de bienvenida:', err));
      }
    }
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
