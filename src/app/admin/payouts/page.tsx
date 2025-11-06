'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Clock, DollarSign, AlertCircle } from 'lucide-react';

type PayoutRequest = {
  id: string;
  seller_id: string;
  amount: number;
  payment_method: string;
  payment_details: any;
  status: string;
  admin_notes?: string;
  rejection_reason?: string;
  created_at: string;
  processed_at?: string;
  seller?: { email: string; first_name?: string; last_name?: string };
  store?: { name: string };
};

export default function AdminPayoutsPage() {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<PayoutRequest | null>(null);
  const [actionNotes, setActionNotes] = useState('');

  useEffect(() => {
    loadRequests();
  }, [filterStatus]);

  async function loadRequests() {
    setLoading(true);
    try {
      let query = supabase
        .from('payout_requests')
        .select(`
          *,
          seller:profiles!payout_requests_seller_id_fkey(email, first_name, last_name),
          store:stores(name)
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      logger.error('Error loading payout requests', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleProcess(status: 'approved' | 'rejected') {
    if (!selectedRequest) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        alert('No autenticado');
        return;
      }

      const { error } = await (supabase as any).rpc('process_payout_request', {
        p_request_id: selectedRequest.id,
        p_status: status,
        p_admin_id: session.session.user.id,
        p_admin_notes: actionNotes || null,
        p_rejection_reason: status === 'rejected' ? actionNotes : null,
      });

      if (error) throw error;

      alert(`Solicitud ${status === 'approved' ? 'aprobada' : 'rechazada'} exitosamente`);
      setSelectedRequest(null);
      setActionNotes('');
      loadRequests();
    } catch (err: any) {
      logger.error('Error processing payout request', err);
      alert('Error: ' + (err.message || 'Error desconocido'));
    }
  }

  async function handleComplete(requestId: string) {
    if (!confirm('¿Marcar este retiro como completado? Esto indica que el pago ya fue realizado.')) return;

    try {
      const { error } = await (supabase as any).rpc('complete_payout', {
        p_request_id: requestId,
      });

      if (error) throw error;

      alert('Retiro marcado como completado');
      loadRequests();
    } catch (err: any) {
      logger.error('Error completing payout', err);
      alert('Error: ' + (err.message || 'Error desconocido'));
    }
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al panel</span>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Gestión de Retiros
              </h1>
              <p className="text-gray-600 mt-2">Aprobar y procesar solicitudes de retiro</p>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg ${
              filterStatus === 'all' ? 'bg-black text-white' : 'bg-white text-gray-700 border'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg ${
              filterStatus === 'pending' ? 'bg-yellow-600 text-white' : 'bg-white text-gray-700 border'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-4 py-2 rounded-lg ${
              filterStatus === 'approved' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'
            }`}
          >
            Aprobadas
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-4 py-2 rounded-lg ${
              filterStatus === 'completed' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border'
            }`}
          >
            Completadas
          </button>
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`px-4 py-2 rounded-lg ${
              filterStatus === 'rejected' ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border'
            }`}
          >
            Rechazadas
          </button>
        </div>

        {/* Lista de solicitudes */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detalles</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No hay solicitudes de retiro
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {request.seller?.email || request.seller_id}
                        </div>
                        {(request.seller?.first_name || request.seller?.last_name) && (
                          <div className="text-xs text-gray-500">
                            {request.seller?.first_name} {request.seller?.last_name}
                          </div>
                        )}
                        {request.store && (
                          <div className="text-xs text-gray-500">Tienda: {request.store.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {request.amount.toLocaleString('es-PY')} Gs.
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.payment_method === 'bank_transfer' && 'Transferencia Bancaria'}
                        {request.payment_method === 'paypal' && 'PayPal'}
                        {request.payment_method === 'mobile_wallet' && 'Billetera Móvil'}
                        {request.payment_method === 'cash' && 'Efectivo'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="max-w-xs truncate">
                          {request.payment_method === 'bank_transfer' && (
                            <>
                              {request.payment_details?.bank_name || ''} - 
                              {request.payment_details?.account_number || ''}
                            </>
                          )}
                          {request.payment_method === 'paypal' && (
                            <>Email: {request.payment_details?.email || ''}</>
                          )}
                          {request.payment_method === 'mobile_wallet' && (
                            <>Número: {request.payment_details?.phone_number || ''}</>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.created_at).toLocaleDateString('es-PY')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'approved' || request.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          request.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {request.status === 'pending' && 'Pendiente'}
                          {request.status === 'approved' && 'Aprobada'}
                          {request.status === 'processing' && 'En Proceso'}
                          {request.status === 'completed' && 'Completada'}
                          {request.status === 'rejected' && 'Rechazada'}
                          {request.status === 'failed' && 'Fallida'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedRequest(request)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Procesar
                            </button>
                          </div>
                        )}
                        {(request.status === 'approved' || request.status === 'processing') && (
                          <button
                            onClick={() => handleComplete(request.id)}
                            className="text-green-600 hover:text-green-800"
                          >
                            Completar
                          </button>
                        )}
                        {request.status === 'rejected' && request.rejection_reason && (
                          <span className="text-xs text-gray-500">{request.rejection_reason}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de procesamiento */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">Procesar Solicitud</h2>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Vendedor:</strong> {selectedRequest.seller?.email || selectedRequest.seller_id}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Monto:</strong> {selectedRequest.amount.toLocaleString('es-PY')} Gs.
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Método:</strong> {selectedRequest.payment_method === 'bank_transfer' ? 'Transferencia Bancaria' : selectedRequest.payment_method}
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Notas (opcional)</label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Agregar notas sobre la aprobación/rechazo..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleProcess('approved')}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  Aprobar
                </button>
                <button
                  onClick={() => handleProcess('rejected')}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <XCircle className="w-4 h-4 inline mr-2" />
                  Rechazar
                </button>
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setActionNotes('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
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

