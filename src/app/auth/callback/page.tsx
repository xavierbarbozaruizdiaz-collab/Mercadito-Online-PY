'use client';

// Forzar renderizado dinámico para evitar prerender
export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/lib/hooks/useToast';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        // Obtener parámetros de la URL directamente desde window.location para evitar problemas con useSearchParams
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // Obtener el código de autorización de la URL (puede estar en query o hash)
        const code = urlParams.get('code') || hashParams.get('code');
        const errorParam = urlParams.get('error') || hashParams.get('error');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
        
        // También verificar si hay access_token en el hash (OAuth flow alternativo)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        // Si hay un error en la URL, mostrarlo
        if (errorParam) {
          const errorMessage = errorDescription 
            ? decodeURIComponent(errorDescription)
            : 'Error al autenticar. Por favor intenta nuevamente.';
          setError(errorMessage);
          toast.error(errorMessage);
          setLoading(false);
          setTimeout(() => {
            router.push('/auth/sign-in');
          }, 3000);
          return;
        }

        // Si hay access_token en el hash, significa que OAuth ya autenticó
        if (accessToken && refreshToken) {
          // Supabase ya procesó la autenticación, solo necesitamos verificar la sesión
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // Limpiar el hash de la URL
            window.history.replaceState({}, '', window.location.pathname);
            
            // Crear o actualizar perfil con datos de OAuth
            try {
              const userMetadata = session.user.user_metadata || {};
              const fullName = userMetadata.full_name || userMetadata.name || '';
              const firstName = fullName.split(' ')[0] || userMetadata.first_name || '';
              const lastName = fullName.split(' ').slice(1).join(' ') || userMetadata.last_name || '';
              const avatarUrl = userMetadata.avatar_url || userMetadata.picture || null;

              // Verificar si el perfil existe
              const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, avatar_url')
                .eq('id', session.user.id)
                .single();

              if (!existingProfile) {
                // Crear perfil si no existe
                const { error: profileError } = await supabase
                  .from('profiles')
                  .insert({
                    id: session.user.id,
                    email: session.user.email || '',
                    first_name: firstName || null,
                    last_name: lastName || null,
                    avatar_url: avatarUrl,
                    role: 'buyer',
                  });

                if (profileError) {
                  console.warn('Error al crear perfil (puede que ya exista):', profileError);
                }
              } else {
                // Actualizar perfil con datos de OAuth si faltan
                const updateData: any = {};
                
                if (!existingProfile.first_name && firstName) {
                  updateData.first_name = firstName;
                }
                if (!existingProfile.last_name && lastName) {
                  updateData.last_name = lastName;
                }
                if (!existingProfile.avatar_url && avatarUrl) {
                  updateData.avatar_url = avatarUrl;
                }

                if (Object.keys(updateData).length > 0) {
                  const { error: updateError } = await supabase
                    .from('profiles')
                    .update(updateData)
                    .eq('id', session.user.id);

                  if (updateError) {
                    console.warn('Error al actualizar perfil:', updateError);
                  }
                }
              }
            } catch (profileErr) {
              console.warn('Error al manejar perfil de OAuth:', profileErr);
            }

            toast.success('Sesión iniciada exitosamente');
            router.push('/');
            return;
          }
        }

        // Si no hay código, puede ser que ya se haya procesado o hay un problema
        if (!code) {
          // Verificar si ya hay una sesión activa
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // Ya hay sesión, redirigir al home
            router.push('/');
            return;
          }
          
          // Si no hay sesión ni código, redirigir al login
          setError('No se recibió código de autorización');
          toast.error('Error al procesar la autenticación. Por favor intenta nuevamente.');
          setLoading(false);
          setTimeout(() => {
            router.push('/auth/sign-in');
          }, 3000);
          return;
        }

        // Intercambiar el código por la sesión
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('Error al intercambiar código por sesión:', exchangeError);
          setError(exchangeError.message);
          toast.error('Error al autenticar. Por favor intenta nuevamente.');
          setLoading(false);
          setTimeout(() => {
            router.push('/auth/sign-in');
          }, 3000);
          return;
        }

        if (data.session && data.user) {
          // Crear o actualizar perfil con datos de OAuth
          try {
            const userMetadata = data.user.user_metadata || {};
            const fullName = userMetadata.full_name || userMetadata.name || '';
            const firstName = fullName.split(' ')[0] || userMetadata.first_name || '';
            const lastName = fullName.split(' ').slice(1).join(' ') || userMetadata.last_name || '';
            const avatarUrl = userMetadata.avatar_url || userMetadata.picture || null;

            // Verificar si el perfil existe
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', data.user.id)
              .single();

            if (!existingProfile) {
              // Crear perfil si no existe
              const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                  id: data.user.id,
                  email: data.user.email || '',
                  first_name: firstName || null,
                  last_name: lastName || null,
                  avatar_url: avatarUrl,
                  role: 'buyer',
                });

              if (profileError) {
                console.warn('Error al crear perfil (puede que ya exista):', profileError);
              }
            } else {
              // Actualizar perfil con datos de OAuth si faltan
              const updateData: any = {};
              
              if (!existingProfile.first_name && firstName) {
                updateData.first_name = firstName;
              }
              if (!existingProfile.last_name && lastName) {
                updateData.last_name = lastName;
              }
              if (!existingProfile.avatar_url && avatarUrl) {
                updateData.avatar_url = avatarUrl;
              }

              if (Object.keys(updateData).length > 0) {
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update(updateData)
                  .eq('id', data.user.id);

                if (updateError) {
                  console.warn('Error al actualizar perfil:', updateError);
                }
              }
            }
          } catch (profileErr) {
            // No bloquear el login si hay error al crear/actualizar perfil
            console.warn('Error al manejar perfil de OAuth:', profileErr);
          }

          toast.success('Sesión iniciada exitosamente');
          
          // Redirigir al home
          router.push('/');
        } else {
          setError('No se pudo crear la sesión');
          toast.error('Error al autenticar. Por favor intenta nuevamente.');
          setLoading(false);
          setTimeout(() => {
            router.push('/auth/sign-in');
          }, 3000);
        }
      } catch (err) {
        console.error('Error en callback de autenticación:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
        toast.error('Error al procesar la autenticación. Por favor intenta nuevamente.');
        setLoading(false);
        setTimeout(() => {
          router.push('/auth/sign-in');
        }, 3000);
      }
    }

    handleCallback();
  }, [router, toast]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="text-center">
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Procesando autenticación...</p>
          </>
        ) : error ? (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error de autenticación</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">Redirigiendo al inicio de sesión...</p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Autenticación exitosa</h2>
            <p className="text-gray-600">Redirigiendo...</p>
          </>
        )}
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </main>
    }>
      <CallbackContent />
    </Suspense>
  );
}

