'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type ActivityLog = {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [filter, search, dateFrom, dateTo, page]);

  async function loadLogs() {
    setLoading(true);
    try {
      let query = supabase
        .from('activity_logs')
        .select(`
          id,
          user_id,
          action,
          resource_type,
          resource_id,
          details,
          ip_address,
          user_agent,
          created_at,
          user:profiles!activity_logs_user_id_fkey(id, email, first_name, last_name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * 50, page * 50 - 1);

      if (filter !== 'all') {
        query = query.eq('action', filter);
      }

      if (search) {
        query = query.or(`action.ilike.%${search}%,resource_type.ilike.%${search}%`);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59');
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setLogs((data || []) as ActivityLog[]);
      setTotalPages(Math.ceil((count || 0) / 50));
    } catch (error: any) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  }

  function getActionColor(action: string) {
    if (action.includes('create') || action.includes('insert')) return 'text-green-600';
    if (action.includes('update') || action.includes('edit')) return 'text-blue-600';
    if (action.includes('delete') || action.includes('remove')) return 'text-red-600';
    if (action.includes('login') || action.includes('auth')) return 'text-purple-600';
    return 'text-gray-600';
  }

  // Obtener acciones únicas para filtro
  const uniqueActions = ['all', 'login', 'logout', 'create_product', 'update_product', 'delete_product', 'create_order', 'update_order'];

  if (loading && logs.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando logs...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Logs de Actividad</h1>
          <p className="text-gray-600 mt-2">Historial de actividad del sistema</p>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <input
                type="text"
                placeholder="Buscar por acción o tipo..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <input
                type="date"
                placeholder="Fecha desde"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <input
                type="date"
                placeholder="Fecha hasta"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">Todas las acciones</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="create_product">Crear Producto</option>
                <option value="update_product">Actualizar Producto</option>
                <option value="delete_product">Eliminar Producto</option>
                <option value="create_order">Crear Orden</option>
                <option value="update_order">Actualizar Orden</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla de logs */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha/Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recurso</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detalles</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleString('es-PY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {log.user ? (
                        <div>
                          <div>
                            {log.user.first_name || log.user.last_name
                              ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim()
                              : log.user.email}
                          </div>
                          <div className="text-xs text-gray-400">{log.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Sistema</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.resource_type ? (
                        <div>
                          <div className="font-medium">{log.resource_type}</div>
                          {log.resource_id && (
                            <div className="text-xs text-gray-400">{log.resource_id.substring(0, 8)}...</div>
                          )}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                      {log.details ? (
                        <details className="cursor-pointer">
                          <summary className="text-blue-600 hover:text-blue-800">Ver detalles</summary>
                          <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ip_address || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length === 0 && (
            <div className="p-8 text-center text-gray-500">No hay logs disponibles</div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Página {page} de {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

