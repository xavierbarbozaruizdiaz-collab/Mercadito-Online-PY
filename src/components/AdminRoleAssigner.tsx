'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminRoleAssigner() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const checkAdminStatus = async () => {
    try {
      // Primero intentar con is_user_admin
      const { data: data1, error: error1 } = await supabase.rpc('is_user_admin');
      
      if (!error1 && data1 !== null) {
        setIsAdmin(data1);
        setMessage(data1 ? '✅ Eres administrador' : '❌ No eres administrador');
        return;
      }

      // Si falla, intentar con is_current_user_admin
      const { data: data2, error: error2 } = await supabase.rpc('is_current_user_admin');
      
      if (!error2 && data2 !== null) {
        setIsAdmin(data2);
        setMessage(data2 ? '✅ Eres administrador' : '❌ No eres administrador');
        return;
      }

      // Si ambas fallan, verificar directamente desde profiles
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        const isAdminUser = (profile as any)?.role === 'admin';
        setIsAdmin(isAdminUser);
        setMessage(isAdminUser ? '✅ Eres administrador' : '❌ No eres administrador');
      } else {
        setMessage('Error: No estás autenticado');
      }
    } catch (err: any) {
      setMessage('Error verificando estado: ' + (err?.message || 'Error desconocido'));
    }
  };

  const assignAdminRole = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      // Intentar con assign_admin_role (retorna TEXT)
      const { data, error } = await (supabase as any).rpc('assign_admin_role');
      
      if (error) {
        // Si falla, intentar asignar directamente
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: insertError } = await (supabase as any)
            .from('profiles')
            .upsert({ 
              id: user.id, 
              email: user.email || '', 
              role: 'admin' 
            }, { onConflict: 'id' });
          
          if (insertError) {
            setMessage('Error asignando rol: ' + insertError.message);
            return;
          }
          
          setMessage('✅ Rol de administrador asignado exitosamente');
          setIsAdmin(true);
          // Recargar después de un momento para que el layout detecte el cambio
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          setMessage('Error: No estás autenticado');
        }
        return;
      }
      
      // Si la función RPC funciona
      if (typeof data === 'string' && data.includes('SUCCESS')) {
        setMessage(`✅ ${data}`);
        setIsAdmin(true);
        // Recargar después de un momento
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (typeof data === 'object' && data !== null) {
        // Si retorna JSON (assign_current_user_admin)
        const jsonData = data as any;
        if (jsonData.success) {
          setMessage(`✅ ${jsonData.message}`);
          setIsAdmin(true);
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          setMessage(`❌ ${jsonData.message}`);
        }
      } else {
        setMessage(`❌ ${data || 'Error desconocido'}`);
      }
    } catch (err: any) {
      setMessage('Error asignando rol: ' + (err?.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Gestión de Rol de Administrador</h2>
      
      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={checkAdminStatus}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Verificar Estado
          </button>
          
          <button
            onClick={assignAdminRole}
            disabled={loading || isAdmin === true}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Asignando...' : 'Asignar Rol Admin'}
          </button>
        </div>
        
        {message && (
          <div className={`p-3 rounded ${
            message.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' :
            message.includes('❌') ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message}
          </div>
        )}
        
        {isAdmin === true && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800">🎉 ¡Felicidades!</h3>
            <p className="text-green-700 mt-1">
              Ahora tienes acceso completo al panel de administración. 
              Puedes gestionar categorías, productos y ver todas las métricas del sistema.
            </p>
            <div className="mt-3">
              <a 
                href="/admin" 
                className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Ir al Panel Admin
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
