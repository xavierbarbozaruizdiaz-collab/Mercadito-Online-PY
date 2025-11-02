'use client';

// ============================================
// MERCADITO ONLINE PY - ADMIN: GESTIÓN DE MEMBRESÍAS
// Panel de administración para gestionar membresías de usuarios
// ============================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';
import { ArrowLeft, Crown, User, Search, Edit, Save, X, Calendar, DollarSign } from 'lucide-react';

type MembershipLevel = 'free' | 'bronze' | 'silver' | 'gold';
type UserMembership = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  membership_level: MembershipLevel;
  membership_expires_at: string | null;
  created_at: string;
};

export default function AdminMembershipsPage() {
  const [users, setUsers] = useState<UserMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MembershipLevel | 'all'>('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    membership_level: MembershipLevel;
    membership_expires_at: string;
  } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, [search, filter]);

  async function loadUsers() {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, email, first_name, last_name, membership_level, membership_expires_at, created_at')
        .order('created_at', { ascending: false });

      if (search.trim()) {
        query = query.or(
          `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
        );
      }

      if (filter !== 'all') {
        query = query.eq('membership_level', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setUsers((data || []) as UserMembership[]);
    } catch (err) {
      logger.error('Error loading users', err);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(user: UserMembership) {
    setEditingUser(user.id);
    setEditData({
      membership_level: user.membership_level,
      membership_expires_at: user.membership_expires_at
        ? new Date(user.membership_expires_at).toISOString().split('T')[0]
        : '',
    });
  }

  function cancelEdit() {
    setEditingUser(null);
    setEditData(null);
  }

  async function saveEdit(userId: string) {
    if (!editData) return;

    setSaving(userId);
    try {
      const updateData: any = {
        membership_level: editData.membership_level,
      };

      if (editData.membership_expires_at) {
        // Si es Free, no establecer fecha de expiración
        if (editData.membership_level === 'free') {
          updateData.membership_expires_at = null;
        } else {
          updateData.membership_expires_at = new Date(editData.membership_expires_at).toISOString();
        }
      } else if (editData.membership_level !== 'free') {
        // Si no hay fecha pero el nivel no es free, establecer 30 días desde hoy
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        updateData.membership_expires_at = expiresAt.toISOString();
      }

      const { error } = await (supabase as any)
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      await loadUsers();
      cancelEdit();
    } catch (err: any) {
      logger.error('Error updating membership', err);
      alert('Error: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(null);
    }
  }

  function getMembershipColor(level: MembershipLevel): string {
    switch (level) {
      case 'free':
        return 'bg-gray-100 text-gray-800';
      case 'bronze':
        return 'bg-amber-100 text-amber-800';
      case 'silver':
        return 'bg-gray-200 text-gray-900';
      case 'gold':
        return 'bg-yellow-100 text-yellow-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getMembershipLabel(level: MembershipLevel): string {
    switch (level) {
      case 'free':
        return 'Gratis';
      case 'bronze':
        return 'Bronce';
      case 'silver':
        return 'Plata';
      case 'gold':
        return 'Oro';
      default:
        return level;
    }
  }

  function getBidLimit(level: MembershipLevel): string {
    switch (level) {
      case 'free':
        return 'No puede pujar';
      case 'bronze':
        return 'Hasta 2,500,000 Gs';
      case 'silver':
        return 'Hasta 10,000,000 Gs';
      case 'gold':
        return 'Sin límite';
      default:
        return 'N/A';
    }
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function isExpired(expiresAt: string | null): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch = !search.trim() || 
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = filter === 'all' || user.membership_level === filter;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Volver al Panel
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Membresías</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Administra las membresías de usuarios para participar en subastas
              </p>
            </div>
            <Link
              href="/admin/memberships/plans"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Crown className="h-5 w-5" />
              Gestionar Planes
            </Link>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Nota:</strong> Los usuarios con membresía <strong>Gratis</strong> solo pueden ver subastas pero no pueden pujar. 
            Se requiere al menos <strong>Bronce</strong> para participar.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {(['free', 'bronze', 'silver', 'gold'] as MembershipLevel[]).map((level) => {
            const count = users.filter((u) => u.membership_level === level && !isExpired(u.membership_expires_at)).length;
            return (
              <div key={level} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{getMembershipLabel(level)}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                  </div>
                  <Crown className={`h-8 w-8 ${getMembershipColor(level).split(' ')[0]}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por email o nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {(['all', 'free', 'bronze', 'silver', 'gold'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {f === 'all' ? 'Todas' : getMembershipLabel(f)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Membresía
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Límite de Puja
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Expira
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((user) => {
                    const expired = isExpired(user.membership_expires_at);
                    const isEditing = editingUser === user.id;

                    return (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 p-2 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {user.first_name || user.last_name
                                  ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                  : 'Sin nombre'}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <select
                              value={editData?.membership_level || 'free'}
                              onChange={(e) =>
                                setEditData({
                                  ...editData!,
                                  membership_level: e.target.value as MembershipLevel,
                                })
                              }
                              className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            >
                              <option value="free">Gratis</option>
                              <option value="bronze">Bronce</option>
                              <option value="silver">Plata</option>
                              <option value="gold">Oro</option>
                            </select>
                          ) : (
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${getMembershipColor(
                                user.membership_level
                              )}`}
                            >
                              {getMembershipLabel(user.membership_level)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {getBidLimit(user.membership_level)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <input
                              type="date"
                              value={editData?.membership_expires_at || ''}
                              onChange={(e) =>
                                setEditData({
                                  ...editData!,
                                  membership_expires_at: e.target.value,
                                })
                              }
                              disabled={editData?.membership_level === 'free'}
                              className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600"
                            />
                          ) : (
                            <span className="text-sm text-gray-900 dark:text-white">
                              {user.membership_level === 'free' ? (
                                'N/A'
                              ) : user.membership_expires_at ? (
                                formatDate(user.membership_expires_at)
                              ) : (
                                'Sin fecha'
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.membership_level === 'free' ? (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs">
                              Sin acceso
                            </span>
                          ) : expired ? (
                            <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs">
                              Expirada
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                              Activa
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={cancelEdit}
                                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                              >
                                <X className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => saveEdit(user.id)}
                                disabled={saving === user.id}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                              >
                                {saving === user.id ? (
                                  'Guardando...'
                                ) : (
                                  <Save className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(user)}
                              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No se encontraron usuarios</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

