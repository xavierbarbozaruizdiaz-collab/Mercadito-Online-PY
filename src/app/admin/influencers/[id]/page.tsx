'use client';

// ============================================
// MERCADITO ONLINE PY - ADMIN: DETALLE DE INFLUENCER
// Página de detalle y edición de influencer
// ============================================

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  getInfluencerById,
  updateInfluencer,
  getInfluencerCommissions,
  getInfluencerStats,
  type Influencer,
  type InfluencerCommission,
  type InfluencerStats,
} from '@/lib/services/influencerService';
import { logger } from '@/lib/utils/logger';
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  DollarSign,
  TrendingUp,
  Users,
  ShoppingBag,
  Calendar,
  ExternalLink,
  Copy,
  CheckCircle,
} from 'lucide-react';

export default function InfluencerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const influencerId = params.id as string;
  const isEditMode = searchParams.get('edit') === 'true';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [influencer, setInfluencer] = useState<Influencer | null>(null);
  const [commissions, setCommissions] = useState<InfluencerCommission[]>([]);
  const [stats, setStats] = useState<InfluencerStats | null>(null);
  const [editData, setEditData] = useState<Partial<Influencer>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, [influencerId]);

  async function loadData() {
    setLoading(true);
    try {
      const [inf, coms, sts] = await Promise.all([
        getInfluencerById(influencerId),
        getInfluencerCommissions(influencerId),
        getInfluencerStats(influencerId),
      ]);

      setInfluencer(inf);
      setEditData(inf || {});
      setCommissions(coms);
      setStats(sts);
    } catch (err) {
      logger.error('Error loading influencer details', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!influencer) return;

    setSaving(true);
    try {
      await updateInfluencer(influencerId, editData as any);
      await loadData();
      router.push(`/admin/influencers/${influencerId}`);
    } catch (err: any) {
      logger.error('Error updating influencer', err);
      alert(err.message || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  }

  function copyReferralLink() {
    if (!influencer?.referral_link) return;

    const fullLink = `${window.location.origin}${influencer.referral_link}`;
    navigator.clipboard.writeText(fullLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!influencer) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Influencer no encontrado</p>
          <Link
            href="/admin/influencers"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 mt-4 inline-block"
          >
            Volver a la lista
          </Link>
        </div>
      </div>
    );
  }

  const displayInfluencer = isEditMode ? editData : influencer;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/influencers"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Volver
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {displayInfluencer.influencer_name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {displayInfluencer.influencer_code} • {displayInfluencer.social_media_platform}
              </p>
            </div>
            {isEditMode ? (
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/admin/influencers/${influencerId}`)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                >
                  <Save className="h-5 w-5" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push(`/admin/influencers/${influencerId}?edit=true`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                <Edit className="h-5 w-5" />
                Editar
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ventas Totales</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.total_orders || influencer.total_orders}
                </p>
              </div>
              <ShoppingBag className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ingresos Totales</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat('es-PY', {
                    style: 'currency',
                    currency: 'PYG',
                    minimumFractionDigits: 0,
                  }).format(stats?.total_revenue || influencer.total_revenue)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Comisiones Ganadas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat('es-PY', {
                    style: 'currency',
                    currency: 'PYG',
                    minimumFractionDigits: 0,
                  }).format(stats?.total_commissions || influencer.total_commissions_earned)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Comisiones Pendientes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat('es-PY', {
                    style: 'currency',
                    currency: 'PYG',
                    minimumFractionDigits: 0,
                  }).format(stats?.pending_commissions || 0)}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información General */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Información General
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre
                  </label>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editData.influencer_name || ''}
                      onChange={(e) =>
                        setEditData({ ...editData, influencer_name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{influencer.influencer_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Código
                  </label>
                  <p className="text-gray-900 dark:text-white font-mono text-sm">
                    {influencer.influencer_code}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Plataforma
                  </label>
                  {isEditMode ? (
                    <select
                      value={editData.social_media_platform || ''}
                      onChange={(e) =>
                        setEditData({ ...editData, social_media_platform: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                      <option value="youtube">YouTube</option>
                      <option value="facebook">Facebook</option>
                      <option value="twitter">Twitter</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      {influencer.social_media_platform}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Comisión (%)
                  </label>
                  {isEditMode ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={editData.commission_percent || 0}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          commission_percent: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      {influencer.commission_percent}%
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estado
                  </label>
                  {isEditMode ? (
                    <select
                      value={editData.is_active ? 'true' : 'false'}
                      onChange={(e) =>
                        setEditData({ ...editData, is_active: e.target.value === 'true' })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      {influencer.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          <CheckCircle className="h-4 w-4" />
                          Activo
                        </span>
                      ) : (
                        'Inactivo'
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Comisiones Recientes */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Comisiones Recientes
                </h2>
                <Link
                  href="/admin/influencers/commissions"
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  Ver todas →
                </Link>
              </div>
              {commissions.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No hay comisiones aún</p>
              ) : (
                <div className="space-y-2">
                  {commissions.slice(0, 5).map((commission) => (
                    <div
                      key={commission.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Orden #{commission.order_id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(commission.created_at).toLocaleDateString('es-PY')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {new Intl.NumberFormat('es-PY', {
                            style: 'currency',
                            currency: 'PYG',
                            minimumFractionDigits: 0,
                          }).format(commission.commission_amount)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {commission.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Referral Link */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Link de Referencia
              </h2>
              {influencer.referral_link ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}${influencer.referral_link}`}
                      className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white outline-none"
                    />
                    <button
                      onClick={copyReferralLink}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                      title="Copiar"
                    >
                      {copied ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <Link
                    href={influencer.referral_link}
                    target="_blank"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver página pública
                  </Link>
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">No hay link disponible</p>
              )}
            </div>

            {/* Métricas Adicionales */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Métricas
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Clics</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {influencer.total_clicks}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Visitas</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {influencer.total_visits}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Registros</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {influencer.total_registrations}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Comisiones Pagadas
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('es-PY', {
                      style: 'currency',
                      currency: 'PYG',
                      minimumFractionDigits: 0,
                    }).format(influencer.total_commissions_paid)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


