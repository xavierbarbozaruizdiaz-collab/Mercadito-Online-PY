'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ProfileEnsurer() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);

  useEffect(() => {
    ensureProfile();
  }, []);

  const ensureProfile = async () => {
    try {
      const { data, error } = await (supabase as any).rpc('ensure_user_profile');
      
      if (error) {
        setMessage('Error creando perfil: ' + error.message);
        setProfileExists(false);
        return;
      }
      
      if (typeof data === 'string' && data.startsWith('SUCCESS')) {
        setMessage(data);
        setProfileExists(true);
        
        if (data.includes('creado')) {
          // Si se creó el perfil, recargar la página para que el admin layout funcione
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } else {
        setMessage(data || 'Error desconocido');
        setProfileExists(false);
      }
    } catch (err) {
      setMessage('Error inesperado creando perfil');
      setProfileExists(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-700">Creando perfil de usuario...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Verificación de Perfil</h2>
      
      <div className="space-y-4">
        {message && (
          <div className={`p-3 rounded ${
            message.includes('creado') || message.includes('existe') ? 'bg-green-50 text-green-800 border border-green-200' :
            'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}
        
        {profileExists === true && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800">✅ Perfil Verificado</h3>
            <p className="text-green-700 mt-1">
              Tu perfil de usuario está listo. Ahora puedes acceder a todas las funcionalidades.
            </p>
            <div className="mt-3 space-x-2">
              <a 
                href="/dashboard" 
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Ir al Dashboard
              </a>
              <a 
                href="/admin" 
                className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Panel Admin
              </a>
            </div>
          </div>
        )}
        
        {profileExists === false && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-semibold text-red-800">❌ Error de Perfil</h3>
            <p className="text-red-700 mt-1">
              No se pudo crear o verificar tu perfil. Por favor, intenta cerrar sesión y volver a iniciar sesión.
            </p>
            <div className="mt-3">
              <button
                onClick={() => window.location.href = '/auth/sign-in'}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Ir a Iniciar Sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
