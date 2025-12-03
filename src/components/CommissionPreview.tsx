// ============================================
// MERCADITO ONLINE PY - COMMISSION PREVIEW
// Componente para mostrar vista previa de comisiones
// LPMS-COMMISSION-START
// ============================================

'use client';

import { Info } from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface CommissionPreviewProps {
  price: number;
  commissionPercent: number;
  commissionAmount: number;
  sellerEarnings: number;
  loading?: boolean;
}

// ============================================
// COMPONENTE
// ============================================

export default function CommissionPreview({
  price,
  commissionPercent,
  commissionAmount,
  sellerEarnings,
  loading = false,
}: CommissionPreviewProps) {
  // No mostrar si el precio es inválido
  if (!price || price <= 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-blue-700">Calculando comisiones...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start gap-2 mb-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <h4 className="font-semibold text-blue-900">Información de Comisiones</h4>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Precio de venta:</span>
          <span className="font-medium text-gray-900">
            {price.toLocaleString('es-PY')} Gs.
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Comisión ({commissionPercent.toFixed(2)}%):</span>
          <span className="font-medium text-red-600">
            -{commissionAmount.toLocaleString('es-PY')} Gs.
          </span>
        </div>
        
        <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between items-center">
          <span className="font-semibold text-gray-900">Lo que recibirás:</span>
          <span className="font-bold text-lg text-green-600">
            {sellerEarnings.toLocaleString('es-PY')} Gs.
          </span>
        </div>
      </div>
      
      {/* Mensaje informativo */}
      <p className="text-xs text-gray-600 mt-3 italic">
        * La comisión se calcula sobre el precio base. El cliente verá el precio con comisión incluida.
      </p>
    </div>
  );
}

// LPMS-COMMISSION-END

