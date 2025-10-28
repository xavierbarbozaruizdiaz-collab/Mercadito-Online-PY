'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminRoleAssigner() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('is_user_admin');
      
      if (error) {
        setMessage('Error verificando estado: ' + error.message);
        return;
      }
      
      setIsAdmin(data);
      setMessage(data ? '✅ Eres administrador' : '❌ No eres administrador');
    } catch (err) {
      setMessage('Error verificando estado');
    }
  };

  const assignAdminRole = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const { data, error } = await supabase.rpc('assign_admin_role');
      
      if (error) {
        setMessage('Error asignando rol: ' + error.message);
        return;
      }
      
      if (data && data.startsWith('SUCCESS')) {
        setMessage(`✅ ${data}`);
        setIsAdmin(true);
      } else {
        setMessage(`❌ ${data}`);
      }
    } catch (err) {
      setMessage('Error asignando rol de administrador');
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
