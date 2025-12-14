'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'facebook' | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Feature flag para mostrar/ocultar el botón de Facebook
  const enableFacebookLogin = process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN === 'true';

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
        
        // Mensajes más amigables en español según el tipo de error
        let errorMessage = '';
        if (error.message?.includes('Invalid login credentials') || error.message?.includes('Invalid credentials')) {
          errorMessage = 'Email o contraseña incorrectos. Por favor verifica tus credenciales.';
          // No mostrar toast para credenciales incorrectas, solo el mensaje en el formulario
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = 'Por favor confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.';
          toast.warning('Email no confirmado');
        } else if (error.message?.includes('Too many requests')) {
          errorMessage = 'Demasiados intentos. Por favor espera unos minutos antes de intentar nuevamente.';
          toast.warning('Demasiados intentos');
        } else {
          errorMessage = error.message || 'Error al iniciar sesión. Por favor intenta nuevamente.';
          toast.error('Error al iniciar sesión');
        }
        
        setMsg(errorMessage);
        setLoading(false);
      } else {
        // Actualizar login_count y last_login_at
        // Using 'as any' to bypass Supabase strict type constraint for updates
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
            // Using 'as any' to bypass Supabase strict type constraint
            await (supabase as any)
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

  async function signInWithOAuth(provider: 'google' | 'facebook') {
    setOauthLoading(provider);
    setMsg(null);
    
    try {
      // Obtener la URL de callback basada en el entorno
      const redirectTo = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/callback`
        : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`;
      
      // Configurar opciones según el proveedor
      const options: any = {
        redirectTo,
      };
      
      // Solo agregar queryParams para Google si es necesario
      // Nota: Estos parámetros pueden causar errores 400 si Google no los acepta
      // o si la configuración en Google Cloud Console no los permite
      if (provider === 'google') {
        // Comentar queryParams si causan problemas
        // options.queryParams = {
        //   access_type: 'offline',
        //   prompt: 'consent',
        // };
      }
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options,
      });

      if (error) {
        console.error(`Error al iniciar sesión con ${provider}:`, error);
        
        // Mensaje más específico si el proveedor no está habilitado
        if (error.message?.includes('not enabled') || error.message?.includes('Unsupported provider')) {
          toast.error(
            `${provider === 'google' ? 'Google' : 'Facebook'} no está configurado en Supabase. Por favor, configura el proveedor OAuth en el dashboard de Supabase. Ver OAUTH_SETUP.md para instrucciones.`
          );
        } else {
          toast.error(`Error al iniciar sesión con ${provider}. Por favor intenta nuevamente.`);
        }
        
        setOauthLoading(null);
      }
      // Si no hay error, el usuario será redirigido automáticamente
      // No necesitamos hacer nada más aquí
    } catch (err) {
      console.error(`Error al iniciar sesión con ${provider}:`, err);
      toast.error(`Error al iniciar sesión con ${provider}. Por favor intenta nuevamente.`);
      setOauthLoading(null);
    }
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
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Contraseña
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none p-1"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
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
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none p-1"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
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

          {/* OAuth Buttons */}
          <div className="mt-6 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">O continúa con</span>
              </div>
            </div>

            <div className={`grid gap-3 ${enableFacebookLogin ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <button
                type="button"
                onClick={() => signInWithOAuth('google')}
                disabled={loading || oauthLoading !== null}
                className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {oauthLoading === 'google' ? (
                  <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                <span className="text-sm font-medium text-gray-700">Google</span>
              </button>

              {enableFacebookLogin && (
                <button
                  type="button"
                  onClick={() => signInWithOAuth('facebook')}
                  disabled={loading || oauthLoading !== null}
                  className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {oauthLoading === 'facebook' ? (
                    <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  )}
                  <span className="text-sm font-medium text-gray-700">Facebook</span>
                </button>
              )}
            </div>
          </div>

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
              disabled={loading || oauthLoading !== null}
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
              msg.startsWith('Error') || msg.includes('incorrectos') || msg.includes('confirma') || msg.includes('Demasiados')
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              <div className="text-sm text-center">
                <p className="mb-2">{msg}</p>
                {(msg.includes('incorrectos') || msg.includes('Email o contraseña')) && (
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium inline-block"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                )}
              </div>
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
