'use client';

// ============================================
// MERCADITO ONLINE PY - DASHBOARD: AFILIADO
// Dashboard principal del vendedor afiliado
// ============================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserAffiliate, type StoreAffiliate } from '@/lib/services/affiliateService';
import {
  getAffiliateCommissionSummary,
  type AffiliateCommissionSummary,
} from '@/lib/services/affiliateCommissionService';
import {
  DollarSign,
  TrendingUp,
  Package,
  Link as LinkIcon,
  Copy,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function AffiliateDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<StoreAffiliate | null>(null);
  const [summary, setSummary] = useState<AffiliateCommissionSummary | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    loadAffiliateData();
  }, []);

  async function loadAffiliateData() {
    try {
      setLoading(true);

      const affiliateData = await getCurrentUserAffiliate();
      if (!affiliateData) {
        alert('No eres un afiliado. Debes ser invitado por un dueño de tienda.');
        router.push('/dashboard');
        return;
      }

      setAffiliate(affiliateData);

      if (affiliateData.status === 'active') {
        const summaryData = await getAffiliateCommissionSummary(affiliateData.id);
        setSummary(summaryData);
      }
    } catch (err: any) {
      console.error('Error cargando datos del afiliado', err);
      alert(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }

  async function copyReferralLink() {
    if (!affiliate?.referral_link) return;

    const fullLink = `${window.location.origin}${affiliate.referral_link}`;
    await navigator.clipboard.writeText(fullLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1A1A1A]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!affiliate) {
    return null;
  }

  if (affiliate.status === 'pending') {
    return (
      <div className="min-h-screen bg-[#1A1A1A] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold text-yellow-400 mb-2">Invitación Pendiente</h2>
            <p className="text-gray-300">
              Tu solicitud de afiliado está pendiente de aprobación por el dueño de la tienda.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (affiliate.status === 'suspended') {
    return (
      <div className="min-h-screen bg-[#1A1A1A] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold text-red-400 mb-2">Cuenta Suspendida</h2>
            <p className="text-gray-300">
              {affiliate.termination_reason || 'Tu cuenta de afiliado ha sido suspendida.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Mi Panel de Afiliado</h1>
          <p className="text-gray-400">
            Tienda: {affiliate.store?.name || 'N/A'} • Comisión: {affiliate.commission_percent}%
          </p>
        </div>

        {/* Stats Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Pendiente</span>
                <DollarSign className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(summary.pending_balance)}
              </div>
              <div className="text-xs text-gray-500 mt-1">En escrow</div>
            </div>

            <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Disponible</span>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(summary.available_balance)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Listo para retiro</div>
            </div>

            <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Total Ganado</span>
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(summary.total_earnings)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Histórico</div>
            </div>

            <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Este Mes</span>
                <Package className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(summary.commissions_this_month)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Comisiones</div>
            </div>
          </div>
        )}

        {/* Referral Link */}
        <div className="bg-[#252525] rounded-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">Mi Link de Referido</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-[#1A1A1A] border border-gray-700 rounded-lg p-3">
              <code className="text-sm text-gray-300 break-all">
                {affiliate.referral_link ? `${window.location.origin}${affiliate.referral_link}` : 'No disponible'}
              </code>
            </div>
            <button
              onClick={copyReferralLink}
              className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {linkCopied ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copiar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Link
            href="/dashboard/affiliate/products"
            className="bg-[#252525] rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors"
          >
            <Package className="w-8 h-8 text-blue-500 mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">Mis Productos</h3>
            <p className="text-gray-400 text-sm">Ver productos asignados para vender</p>
          </Link>

          <Link
            href="/dashboard/affiliate/commissions"
            className="bg-[#252525] rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors"
          >
            <DollarSign className="w-8 h-8 text-green-500 mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">Mis Comisiones</h3>
            <p className="text-gray-400 text-sm">Ver historial y detalles de comisiones</p>
          </Link>

          <Link
            href="/dashboard/affiliate/sales"
            className="bg-[#252525] rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors"
          >
            <TrendingUp className="w-8 h-8 text-purple-500 mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">Mis Ventas</h3>
            <p className="text-gray-400 text-sm">Ver historial de ventas realizadas</p>
          </Link>
        </div>

        {/* Next Payment Info */}
        {summary && summary.next_payment_date && (
          <div className="bg-[#252525] rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-2">Próximo Pago</h2>
            <p className="text-gray-300">
              Fecha estimada: {new Date(summary.next_payment_date).toLocaleDateString('es-PY')}
            </p>
            <p className="text-gray-300">
              Monto estimado:{' '}
              {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(summary.next_payment_amount)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}




