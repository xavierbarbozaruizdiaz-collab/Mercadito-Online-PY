'use client';

// ============================================
// MERCADITO ONLINE PY - ADMIN: GESTIÓN DE INFLUENCERS
// Lista y gestión de influencers desde panel admin
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getInfluencers,
  deleteInfluencer,
  type Influencer,
} from '@/lib/services/influencerService';
import { logger } from '@/lib/utils/logger';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Users,
  ExternalLink,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function InfluencersAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [filteredInfluencers, setFilteredInfluencers] = useState<Influencer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');

  useEffect(() => {
    loadInfluencers();
  }, []);

  useEffect(() => {
    filterInfluencers();
  }, [searchQuery, filterActive, filterPlatform, influencers]);

  async function loadInfluencers() {
    setLoading(true);
    try {
      const data = await getInfluencers();
      setInfluencers(data);
    } catch (err) {
      logger.error('Error loading influencers', err);
    } finally {
      setLoading(false);
    }
  }

  function filterInfluencers() {
    let filtered = [...influencers];

    // Filtro de búsqueda
    if (searchQuery) {
      filtered = filtered.filter(
        (inf) =>
          inf.influencer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inf.influencer_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inf.contact_email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtro de estado
    if (filterActive === 'active') {
      filtered = filtered.filter((inf) => inf.is_active);
    } else if (filterActive === 'inactive') {
      filtered = filtered.filter((inf) => !inf.is_active);
    }

    // Filtro de plataforma
    if (filterPlatform !== 'all') {
      filtered = filtered.filter((inf) => inf.social_media_platform === filterPlatform);
    }

    setFilteredInfluencers(filtered);
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de desactivar este influencer?')) return;

    try {
      await deleteInfluencer(id);
      await loadInfluencers();
    } catch (err) {
      logger.error('Error deleting influencer', err);
      alert('Error al desactivar influencer');
    }
  }

  const platforms = [...new Set(influencers.map((inf) => inf.social_media_platform))];
  const totalRevenue = influencers.reduce((sum, inf) => sum + inf.total_revenue, 0);
  const totalCommissions = influencers.reduce((sum, inf) => sum + inf.total_commissions_earned, 0);
  const activeCount = influencers.filter((inf) => inf.is_active).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Gestión de Influencers
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gestiona influencers y sus comisiones desde aquí
            </p>
          </div>
          <Link
            href="/admin/influencers/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            <Plus className="h-5 w-5" />
            Nuevo Influencer
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Influencers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {influencers.length}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Activos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ingresos Totales</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(
                    totalRevenue
                  )}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Comisiones Pagadas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(
                    totalCommissions
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, código o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>

            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Todas las plataformas</option>
              {platforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
          </div>
        ) : filteredInfluencers.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <p className="text-gray-600 dark:text-gray-400">No se encontraron influencers</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Influencer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Plataforma
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Comisión
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Ventas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Ingresos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredInfluencers.map((influencer) => (
                    <tr key={influencer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {influencer.influencer_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {influencer.influencer_code}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {influencer.social_media_platform}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {influencer.commission_percent}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {influencer.total_orders}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Intl.NumberFormat('es-PY', {
                          style: 'currency',
                          currency: 'PYG',
                          minimumFractionDigits: 0,
                        }).format(influencer.total_revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {influencer.is_active ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1 w-fit">
                            <CheckCircle className="h-3 w-3" />
                            Activo
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 flex items-center gap-1 w-fit">
                            <XCircle className="h-3 w-3" />
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/influencers/${influencer.id}`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Ver detalles"
                          >
                            <Eye className="h-5 w-5" />
                          </Link>
                          <Link
                            href={`/admin/influencers/${influencer.id}?edit=true`}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                            title="Editar"
                          >
                            <Edit className="h-5 w-5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(influencer.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Desactivar"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                          {influencer.referral_link && (
                            <Link
                              href={influencer.referral_link}
                              target="_blank"
                              className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                              title="Ver link"
                            >
                              <ExternalLink className="h-5 w-5" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Links adicionales */}
        <div className="mt-6 flex gap-4">
          <Link
            href="/admin/influencers/commissions"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Ver Comisiones Pendientes →
          </Link>
        </div>
      </div>
    </div>
  );
}



