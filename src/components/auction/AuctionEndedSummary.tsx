// ============================================
// MERCADITO ONLINE PY - AUCTION ENDED SUMMARY
// Componente para mostrar resumen de comisiones cuando subasta finaliza
// LPMS-COMMISSION-START
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle, Info } from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface AuctionEndedSummaryProps {
  auctionId: string;
  productTitle?: string;
}

interface CommissionSummary {
  auctionFinalPrice: number;
  buyerCommissionPercent: number;
  buyerCommissionAmount: number;
  buyerTotalPaid: number;
  sellerCommissionPercent: number;
  sellerCommissionAmount: number;
  sellerEarnings: number;
  orderId?: string;
}

// Helper para formatear moneda
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================
// COMPONENTE
// ============================================

export default function AuctionEndedSummary({
  auctionId,
  productTitle,
}: AuctionEndedSummaryProps) {
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, [auctionId]);

  async function loadSummary() {
    setLoading(true);
    try {
      // Buscar platform_fees relacionado con esta subasta
      // Puede estar en la orden generada o en datos de la notificación
      const { data: fees, error } = await supabase
        .from('platform_fees')
        .select(`
          auction_final_price,
          buyer_commission_percent,
          buyer_commission_amount,
          buyer_total_paid,
          seller_commission_percent,
          seller_commission_amount,
          seller_earnings,
          order_id
        `)
        .eq('transaction_type', 'auction')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, es aceptable si aún no hay orden
        console.warn('Error loading commission summary:', error);
      }

      if (fees) {
        setSummary({
          auctionFinalPrice: fees.auction_final_price || 0,
          buyerCommissionPercent: fees.buyer_commission_percent || 0,
          buyerCommissionAmount: fees.buyer_commission_amount || 0,
          buyerTotalPaid: fees.buyer_total_paid || 0,
          sellerCommissionPercent: fees.seller_commission_percent || 0,
          sellerCommissionAmount: fees.seller_commission_amount || 0,
          sellerEarnings: fees.seller_earnings || 0,
          orderId: fees.order_id,
        });
      } else {
        // Si no hay platform_fees aún, intentar obtener datos del producto
        const { data: product } = await supabase
          .from('products')
          .select('current_bid, commission_percent_applied')
          .eq('id', auctionId)
          .single();

        if (product && product.current_bid) {
          // Obtener comisiones usando el servicio
          const { getCommissionForAuction, calculateAuctionCommissions } = 
            await import('@/lib/services/commissionService');
          
          // Necesitamos sellerId, obtenerlo del producto
          const { data: productFull } = await supabase
            .from('products')
            .select('seller_id, store_id')
            .eq('id', auctionId)
            .single();

          if (productFull) {
            const commissions = await getCommissionForAuction(
              productFull.seller_id,
              productFull.store_id || undefined
            );

            const calculated = await calculateAuctionCommissions(
              product.current_bid,
              productFull.seller_id,
              productFull.store_id || undefined
            );

            setSummary({
              auctionFinalPrice: product.current_bid,
              buyerCommissionPercent: commissions.buyer_commission_percent,
              buyerCommissionAmount: calculated.buyer_commission_amount,
              buyerTotalPaid: calculated.buyer_total_paid,
              sellerCommissionPercent: commissions.seller_commission_percent,
              sellerCommissionAmount: calculated.seller_commission_amount,
              sellerEarnings: calculated.seller_earnings,
            });
          }
        }
      }
    } catch (err) {
      console.error('Error loading auction summary:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-6 p-6 bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
          <span className="text-sm text-green-700">Cargando información de comisiones...</span>
        </div>
      </div>
    );
  }

  if (!summary || summary.auctionFinalPrice <= 0) {
    return null;
  }

  return (
    <div className="mt-6 p-6 bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="w-6 h-6 text-green-600" />
        <h3 className="text-lg font-bold text-gray-900">Subasta Finalizada</h3>
      </div>
      
      {productTitle && (
        <p className="text-sm text-gray-700 mb-4 font-medium">📦 {productTitle}</p>
      )}
      
      <div className="space-y-3">
        {/* Precio final */}
        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
          <span className="text-gray-700 font-medium">Precio final de la subasta:</span>
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrency(summary.auctionFinalPrice)}
          </span>
        </div>
        
        {/* Desglose de comisiones */}
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3">Desglose de Comisiones</h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Precio de subasta:</span>
              <span className="font-medium">{formatCurrency(summary.auctionFinalPrice)}</span>
            </div>
            
            <div className="flex justify-between text-red-600">
              <span>Comisión vendedor ({summary.sellerCommissionPercent.toFixed(2)}%):</span>
              <span className="font-medium">-{formatCurrency(summary.sellerCommissionAmount)}</span>
            </div>
            
            <div className="border-t border-gray-300 pt-2 flex justify-between">
              <span className="font-bold text-gray-900">Lo que recibirás:</span>
              <span className="text-xl font-bold text-green-600">
                {formatCurrency(summary.sellerEarnings)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Información adicional */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800">
            <Info className="w-4 h-4 inline mr-1" />
            El comprador pagará un adicional de {summary.buyerCommissionPercent.toFixed(2)}% (
            {formatCurrency(summary.buyerCommissionAmount)}) como comisión. Total que pagará:{' '}
            <span className="font-semibold">{formatCurrency(summary.buyerTotalPaid)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// LPMS-COMMISSION-END

