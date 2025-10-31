'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  getAllUsers,
  getUserStats,
  getOnlineUsers,
  getOnlineSellers,
  updateUser,
  banUser,
  unbanUser,
  type UserProfile,
  type UserFilter,
  type UserStats,
} from '@/lib/services/userService';

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<UserFilter>('all');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<UserProfile[]>([]);
  const [onlineSellers, setOnlineSellers] = useState<UserProfile[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [originalRole, setOriginalRole] = useState<string | null>(null);
  const [banningUser, setBanningUser] = useState<UserProfile | null>(null);
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    loadData();
    // Refrescar cada 30 segundos para actualizar usuarios en línea
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [filter, search, page]);

  async function loadData() {
    setLoading(true);
    try {
      const [usersData, statsData, onlineData, sellersData] = await Promise.all([
        getAllUsers({ page, limit: 20, filter, search: search || undefined }),
        getUserStats(),
        getOnlineUsers(),
        getOnlineSellers(),
      ]);

      setUsers(usersData.users);
      setTotalPages(usersData.total_pages);
      setStats(statsData);
      setOnlineUsers(onlineData);
      setOnlineSellers(sellersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(user: UserProfile) {
    if (processing) return;
    setProcessing(user.id);

    try {
      await updateUser(user.id, { is_active: !user.is_active });
      await loadData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  }


  function formatDate(dateString: string | null) {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function isOnline(user: UserProfile) {
    if (!user.last_seen) return false;
    const lastSeen = new Date(user.last_seen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / 1000 / 60;
    return diffMinutes < 5;
  }

  function getRoleColor(role: string) {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'seller':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  if (loading && users.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando usuarios...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600 mt-2">Administrar usuarios, roles y permisos</p>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Total Usuarios</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total_users}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Usuarios Activos</div>
              <div className="text-2xl font-bold text-green-600">{stats.active_users}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Vendedores</div>
              <div className="text-2xl font-bold text-blue-600">{stats.total_sellers}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Usuarios en Línea</div>
              <div className="text-2xl font-bold text-purple-600">{stats.online_users}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Vendedores en Línea</div>
              <div className="text-2xl font-bold text-indigo-600">{stats.online_sellers}</div>
            </div>
          </div>
        )}

        {/* Usuarios en línea */}
        {(onlineUsers.length > 0 || onlineSellers.length > 0) && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {onlineUsers.length > 0 && (
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <h3 className="font-semibold text-gray-900 mb-2">Usuarios en Línea ({onlineUsers.length})</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {onlineUsers.slice(0, 5).map((user) => (
                    <div key={user.id} className="text-sm flex items-center justify-between">
                      <span className="text-gray-700">
                        {user.first_name || user.last_name
                          ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                          : user.email}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                  ))}
                  {onlineUsers.length > 5 && (
                    <div className="text-xs text-gray-500">+{onlineUsers.length - 5} más</div>
                  )}
                </div>
              </div>
            )}

            {onlineSellers.length > 0 && (
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <h3 className="font-semibold text-gray-900 mb-2">Vendedores en Línea ({onlineSellers.length})</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {onlineSellers.slice(0, 5).map((user) => (
                    <div key={user.id} className="text-sm flex items-center justify-between">
                      <span className="text-gray-700">
                        {user.first_name || user.last_name
                          ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                          : user.email}
                      </span>
                      <span className="text-xs text-gray-500">
                        {user.total_products || 0} productos
                      </span>
                    </div>
                  ))}
                  {onlineSellers.length > 5 && (
                    <div className="text-xs text-gray-500">+{onlineSellers.length - 5} más</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filtros y búsqueda */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {(['all', 'buyers', 'sellers', 'admins', 'active', 'inactive', 'online'] as UserFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' && 'Todos'}
                  {f === 'buyers' && 'Compradores'}
                  {f === 'sellers' && 'Vendedores'}
                  {f === 'admins' && 'Admins'}
                  {f === 'active' && 'Activos'}
                  {f === 'inactive' && 'Inactivos'}
                  {f === 'online' && 'En Línea'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla de usuarios */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actividad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estadísticas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => {
                  const online = isOnline(user);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.email}
                              className="h-10 w-10 rounded-full mr-3"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                              <span className="text-gray-600 text-sm">
                                {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                              {user.first_name || user.last_name
                                ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                : user.email}
                              {online && (
                                <span className="h-2 w-2 bg-green-500 rounded-full" title="En línea"></span>
                              )}
                              {user.banned_at && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs font-medium" title={`Baneado: ${user.ban_reason || 'Sin razón'}`}>
                                  BANEADO
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            {user.phone && <div className="text-xs text-gray-400">{user.phone}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(user.role)}`}>
                          {user.role === 'buyer' && 'Comprador'}
                          {user.role === 'seller' && 'Vendedor'}
                          {user.role === 'admin' && 'Administrador'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={processing === user.id}
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            user.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          } ${processing === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>Última vez: {formatDate(user.last_seen)}</div>
                        {user.last_login_at && (
                          <div className="text-xs">Login: {formatDate(user.last_login_at)}</div>
                        )}
                        {user.login_count !== null && (
                          <div className="text-xs">Logins: {user.login_count}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>Productos: {user.total_products || 0}</div>
                        <div>Órdenes: {user.total_orders || 0}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setOriginalRole(user.role);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/profile?userId=${user.id}&admin=true`)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Ver Perfil
                        </button>
                        {user.banned_at ? (
                          <button
                            onClick={async () => {
                              if (confirm('¿Desbanear a este usuario?')) {
                                try {
                                  setProcessing(user.id);
                                  await unbanUser(user.id);
                                  await loadData();
                                } catch (error: any) {
                                  alert(`Error: ${error.message}`);
                                } finally {
                                  setProcessing(null);
                                }
                              }
                            }}
                            disabled={processing === user.id}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            title="Desbanear usuario"
                          >
                            Desbanear
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setBanningUser(user);
                              setBanReason('');
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Banear usuario"
                          >
                            Banear
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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

        {/* Modal de edición */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Editar Usuario</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, role: e.target.value as 'buyer' | 'seller' | 'admin' })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="buyer">Comprador</option>
                    <option value="seller">Vendedor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    defaultValue={editingUser.first_name || ''}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, first_name: e.target.value || null })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                  <input
                    type="text"
                    defaultValue={editingUser.last_name || ''}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, last_name: e.target.value || null })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    defaultValue={editingUser.phone || ''}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, phone: e.target.value || null })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    defaultValue={editingUser.bio || ''}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, bio: e.target.value || null })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={async () => {
                    if (editingUser) {
                      try {
                        if (editingUser.role !== originalRole && !confirm(`¿Cambiar rol de ${editingUser.email} a ${editingUser.role}?`)) {
                          return;
                        }
                        await updateUser(editingUser.id, {
                          role: editingUser.role,
                          first_name: editingUser.first_name,
                          last_name: editingUser.last_name,
                          phone: editingUser.phone,
                          bio: editingUser.bio,
                        });
                        await loadData();
                        setEditingUser(null);
                      } catch (error: any) {
                        alert(`Error: ${error.message}`);
                      }
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Guardar
                </button>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setOriginalRole(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de banear */}
        {banningUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4 text-red-600">Banear Usuario</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-700 mb-2">
                    ¿Estás seguro de que deseas banear a <strong>{banningUser.email}</strong>?
                  </p>
                  <p className="text-xs text-gray-500">
                    El usuario será desactivado y no podrá iniciar sesión hasta que sea desbaneado.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Razón del ban (requerida)
                  </label>
                  <textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    rows={4}
                    placeholder="Ej: Violación de términos de servicio, actividad fraudulenta, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={async () => {
                    if (!banReason.trim()) {
                      alert('Debes ingresar una razón para banear al usuario');
                      return;
                    }
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) throw new Error('No autenticado');
                      
                      setProcessing(banningUser.id);
                      await banUser(banningUser.id, banReason.trim(), user.id);
                      await loadData();
                      setBanningUser(null);
                      setBanReason('');
                      alert('✅ Usuario baneado');
                    } catch (error: any) {
                      alert(`Error: ${error.message}`);
                    } finally {
                      setProcessing(null);
                    }
                  }}
                  disabled={processing === banningUser.id || !banReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {processing === banningUser.id ? 'Baneando...' : 'Confirmar Ban'}
                </button>
                <button
                  onClick={() => {
                    setBanningUser(null);
                    setBanReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

