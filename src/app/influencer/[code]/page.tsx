'use client';

// ============================================
// MERCADITO ONLINE PY - DASHBOARD PÚBLICO DE INFLUENCER
// Página pública para que influencers vean sus métricas
// ============================================

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  getInfluencerByCode,
  getInfluencerStats,
  getInfluencerCommissions,
  type Influencer,
  type InfluencerStats,
  type InfluencerCommission,
} from '@/lib/services/influencerService';
import { logger } from '@/lib/utils/logger';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Copy,
  CheckCircle,
  ExternalLink,
  Calendar,
} from 'lucide-react';

export default function InfluencerPublicPage() {
  const params = useParams();
  const code = params.code as string;
  const [loading, setLoading] = useState(true);
  const [influencer, setInfluencer] = useState<Influencer | null>(null);
  const [stats, setStats] = useState<InfluencerStats | null>(null);
  const [commissions, setCommissions] = useState<InfluencerCommission[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, [code]);

  async function loadData() {
    setLoading(true);
    try {
      const inf = await getInfluencerByCode(code);
      
      if (!inf) {
        setLoading(false);
        return;
      }

      const [sts, coms] = await Promise.all([
        getInfluencerStats(inf.id, undefined, undefined),
        getInfluencerCommissions(inf.id),
      ]);

      setInfluencer(inf);
      setStats(sts);
      setCommissions(coms.slice(0, 10)); // Últimas 10
    } catch (err) {
      logger.error('Error loading influencer data', err);
    } finally {
      setLoading(false);
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {influencer.influencer_name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {influencer.social_media_platform} • {influencer.commission_percent}% comisión
              </p>
              {influencer.bio && (
                <p className="text-gray-600 dark:text-gray-400 mt-2">{influencer.bio}</p>
              )}
            </div>
            {influencer.is_verified && (
              <div className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Verificado
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ventas</p>
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Ingresos Generados</p>
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Comisiones</p>
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Visitas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {influencer.total_visits}
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Referral Link */}
        {influencer.referral_link && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Tu Link de Referencia
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}${influencer.referral_link}`}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={copyReferralLink}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    Copiar
                  </>
                )}
              </button>
              <a
                href={influencer.referral_link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <ExternalLink className="h-5 w-5" />
                Ver
              </a>
            </div>
          </div>
        )}

        {/* Comisiones Recientes */}
        {commissions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Comisiones Recientes
            </h2>
            <div className="space-y-2">
              {commissions.map((commission) => (
                <div
                  key={commission.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Orden #{commission.order_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(commission.created_at).toLocaleDateString('es-PY', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {new Intl.NumberFormat('es-PY', {
                        style: 'currency',
                        currency: 'PYG',
                        minimumFractionDigits: 0,
                      }).format(commission.commission_amount)}
                    </p>
                    <p
                      className={`text-xs ${
                        commission.status === 'paid'
                          ? 'text-green-600 dark:text-green-400'
                          : commission.status === 'pending'
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {commission.status === 'paid'
                        ? 'Pagado'
                        : commission.status === 'pending'
                        ? 'Pendiente'
                        : commission.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

