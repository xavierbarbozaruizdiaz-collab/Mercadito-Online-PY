'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Limpiar timeout al desmontar el componente o cambiar entre sign-in/sign-up
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isSignUp]); // También limpiar cuando cambie el modo

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    
    // Limpiar timeout anterior si existe
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Timeout de seguridad: si después de 8 segundos no hay respuesta, resetear
    timeoutRef.current = setTimeout(() => {
      setMsg('⏱️ Tiempo de espera agotado. Por favor intenta nuevamente.');
      setLoading(false);
    }, 8000);
    
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setMsg(`Error: ${error.message}`);
        setLoading(false);
      } else {
        // Actualizar login_count y last_login_at
        if (authData?.user) {
          // Usar UPSERT en lugar de UPDATE para manejar usuarios sin perfil
          try {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('login_count')
              .eq('id', authData.user.id)
              .single();

            const currentCount = (existingProfile as any)?.login_count || 0;
            const now = new Date().toISOString();

            // UPSERT: insertar si no existe, actualizar si existe
            await supabase
              .from('profiles')
              .upsert({
                id: authData.user.id,
                login_count: currentCount + 1,
                last_login_at: now,
                last_seen: now,
              }, {
                onConflict: 'id'
              });
          } catch (profileError) {
            // Silenciosamente manejar errores de perfil (no crítico para el login)
            console.warn('Error actualizando perfil:', profileError);
          }
        }

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setMsg('✅ Sesión iniciada. Redirigiendo...');
        setLoading(false);
        // Redirigir a la página principal después del login exitoso
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      }
    } catch (err) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      console.error('Error en signIn:', err);
      setMsg(`Error: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      setLoading(false);
    }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    
    // Limpiar timeout anterior si existe
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Timeout de seguridad: si después de 8 segundos no hay respuesta, resetear
    timeoutRef.current = setTimeout(() => {
      setMsg('⏱️ Tiempo de espera agotado. Por favor intenta nuevamente.');
      setLoading(false);
    }, 8000);
    
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      
      if (error) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setMsg(`Error: ${error.message}`);
        setLoading(false);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setMsg('✅ Usuario creado exitosamente. Redirigiendo...');
        setLoading(false);
        
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
        
        // Redirigir a la página principal después de crear cuenta
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
    } catch (err) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      console.error('Error en signUp:', err);
      setMsg(`Error: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      setLoading(false);
    }
  }

  function handleCancel() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setLoading(false);
    setMsg(null);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Link 
              href="/" 
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors text-sm"
              onClick={handleCancel}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver
            </Link>
            {loading && (
              <button
                onClick={handleCancel}
                className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>

          {/* Logo/Title Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isSignUp ? 'Crear cuenta' : 'Bienvenido'}
            </h1>
            <p className="text-gray-500">
              {isSignUp ? 'Únete a Mercadito Online PY' : 'Inicia sesión en tu cuenta'}
            </p>
          </div>

          {/* Sign In Form */}
          {!isSignUp && (
            <form className="space-y-5" onSubmit={signIn}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <input
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl py-3 px-4 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Iniciando sesión...
                  </span>
                ) : (
                  'Iniciar sesión'
                )}
              </button>
            </form>
          )}

          {/* Sign Up Form */}
          {isSignUp && (
            <form className="space-y-5" onSubmit={signUp}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <input
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl py-3 px-4 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creando cuenta...
                  </span>
                ) : (
                  'Crear cuenta'
                )}
              </button>
            </form>
          )}

          {/* Toggle Sign Up/Sign In */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                // Limpiar timeout antes de cambiar modo
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                  timeoutRef.current = null;
                }
                setIsSignUp(!isSignUp);
                setMsg(null);
                setEmail('');
                setPassword('');
                setLoading(false);
              }}
              disabled={loading}
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
            >
              {isSignUp ? (
                <>¿Ya tienes cuenta? <span className="font-semibold">Inicia sesión</span></>
              ) : (
                <>¿No tienes cuenta? <span className="font-semibold">Crea una aquí</span></>
              )}
            </button>
          </div>

          {/* Message */}
          {msg && (
            <div className={`mt-6 p-4 rounded-xl ${
              msg.startsWith('Error') 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              <p className="text-sm text-center">{msg}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Al continuar, aceptas nuestros términos y condiciones
        </p>
      </div>
    </main>
  );
}
