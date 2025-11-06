'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setMsg({ type: 'success', text: 'Sesión iniciada correctamente. Redirigiendo...' });
      setTimeout(() => window.location.href = '/', 1500);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Error al iniciar sesión' });
    } finally {
      setLoading(false);
    }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setMsg({ type: 'success', text: 'Usuario creado. Revisa tu email para confirmar tu cuenta.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Error al crear cuenta' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al inicio
          </Link>
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
            </h1>
            <p className="text-gray-600">
              {isSignUp ? 'Únete a nuestra plataforma' : 'Accede a tu cuenta'}
            </p>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
          {msg && (
            <div className={`mb-6 p-4 rounded-xl border-2 flex items-start gap-3 ${
              msg.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className={`flex-shrink-0 ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {msg.type === 'success' ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <p className="font-medium flex-1 text-sm">{msg.text}</p>
            </div>
          )}

          <form onSubmit={isSignUp ? signUp : signIn} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200 transition-all"
                required
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200 transition-all"
                required
                minLength={6}
              />
            </div>

            {/* Botón principal */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {isSignUp ? 'Creando cuenta...' : 'Iniciando sesión...'}
                </>
              ) : (
                <>
                  {isSignUp ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Crear cuenta
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Iniciar sesión
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          {/* Cambiar entre sign in y sign up */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMsg(null);
              }}
              className="w-full text-center text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              {isSignUp ? (
                <>
                  ¿Ya tienes cuenta?{' '}
                  <span className="text-blue-600 hover:text-blue-700 font-semibold">Inicia sesión</span>
                </>
              ) : (
                <>
                  ¿No tienes cuenta?{' '}
                  <span className="text-blue-600 hover:text-blue-700 font-semibold">Crea una aquí</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
