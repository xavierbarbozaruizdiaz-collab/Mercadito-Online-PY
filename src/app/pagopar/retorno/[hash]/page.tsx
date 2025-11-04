'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/utils/logger';

export default function PagoparRetornoPage() {
  const params = useParams();
  const router = useRouter();
  const hash = params.hash as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hash) {
      setError('No se recibió el hash de Pagopar');
      setLoading(false);
      return;
    }

    // Pagopar envía el hash como parámetro en la URL
    // Este hash contiene información sobre el pago
    // Necesitamos extraer el orderId o invoiceId del hash o consultarlo
    
    // Intentar extraer información del hash o consultar estado
    checkPaymentStatus(hash);
  }, [hash]);

  async function checkPaymentStatus(pagoparHash: string) {
    try {
      // Consultar estado del pago usando el hash
      // Pagopar puede enviar el hash con información codificada
      // O podemos usar el hash para consultar la factura
      
      // Por ahora, buscar en localStorage si guardamos el orderId antes de redirigir
      if (typeof window !== 'undefined') {
        const orderId = localStorage.getItem('pagopar_order_id');
        
        if (orderId) {
          // Consultar estado de la orden
          const response = await fetch(`/api/payments/pagopar/status?hash=${pagoparHash}&order_id=${orderId}`);
          const data = await response.json();
          
          if (data.success) {
            // Limpiar localStorage
            localStorage.removeItem('pagopar_order_id');
            
            // Redirigir a página de éxito con información del pago
            router.push(`/checkout/success?orderId=${orderId}&pagopar_invoice=${data.invoice_id || ''}&status=${data.status}`);
            return;
          }
        }
      }

      // Si no encontramos orderId, intentar buscar la orden por el hash en la BD
      // Por ahora, redirigir a página de éxito genérica
      logger.info('Pagopar retorno recibido', { hash: pagoparHash });
      
      // Redirigir a página de éxito sin orderId específico
      router.push(`/checkout/success?pagopar_hash=${pagoparHash}`);
      
    } catch (err: any) {
      logger.error('Error verificando estado de pago Pagopar', err);
      setError('Error al verificar el estado del pago. Por favor, contacta al soporte.');
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando estado del pago...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-4">Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/dashboard/orders"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ver Mis Pedidos
              </Link>
              <Link
                href="/"
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return null;
}






