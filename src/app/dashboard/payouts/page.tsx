'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';
import Link from 'next/link';
import { ArrowLeft, Plus, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

type PayoutRequest = {
  id: string;
  amount: number;
  payment_method: string;
  payment_details: any;
  status: string;
  admin_notes?: string;
  rejection_reason?: string;
  created_at: string;
  processed_at?: string;
  completed_at?: string;
};

export default function PayoutsPage() {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    account_number: '',
    bank_name: '',
    account_name: '',
    paypal_email: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) return;

      // Cargar balance disponible
      const { data: balance } = await (supabase as any)
        .from('seller_balance')
        .select('available_balance')
        .eq('seller_id', session.session.user.id)
        .maybeSingle();

      setAvailableBalance(balance?.available_balance || 0);

      // Cargar solicitudes
      const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('seller_id', session.session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      logger.error('Error loading payout data', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        alert('No autenticado');
        return;
      }

      const amount = parseFloat(formData.amount);
      const minWithdrawal = 50000; // Mínimo 50,000 Gs.

      if (amount < minWithdrawal) {
        alert(`El monto mínimo de retiro es ${minWithdrawal.toLocaleString('es-PY')} Gs.`);
        return;
      }

      if (amount > availableBalance) {
        alert(`Balance insuficiente. Disponible: ${availableBalance.toLocaleString('es-PY')} Gs.`);
        return;
      }

      // Preparar payment_details según método
      let paymentDetails: any = {};
      if (formData.payment_method === 'bank_transfer') {
        if (!formData.account_number || !formData.bank_name || !formData.account_name) {
          alert('Completa todos los datos bancarios');
          return;
        }
        paymentDetails = {
          account_number: formData.account_number,
          bank_name: formData.bank_name,
          account_name: formData.account_name,
        };
      } else if (formData.payment_method === 'paypal') {
        if (!formData.paypal_email) {
          alert('Ingresa tu email de PayPal');
          return;
        }
        paymentDetails = {
          email: formData.paypal_email,
        };
      }

      // Llamar función SQL
      const { data, error } = await (supabase as any).rpc('create_payout_request', {
        p_seller_id: session.session.user.id,
        p_amount: amount,
        p_payment_method: formData.payment_method,
        p_payment_details: paymentDetails,
        p_store_id: null, // Opcional, puede ser null
      });

      if (error) throw error;

      alert('Solicitud de retiro creada exitosamente');
      setShowForm(false);
      setFormData({
        amount: '',
        payment_method: 'bank_transfer',
        account_number: '',
        bank_name: '',
        account_name: '',
        paypal_email: '',
      });
      loadData();
    } catch (err: any) {
      logger.error('Error creating payout request', err);
      alert('Error: ' + (err.message || 'Error desconocido'));
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending':
        return 'text-yellow-400';
      case 'approved':
      case 'processing':
        return 'text-blue-400';
      case 'completed':
        return 'text-green-400';
      case 'rejected':
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
      case 'processing':
        return <AlertCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#1A1A1A] p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#1A1A1A] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-gray-400 hover:text-gray-200 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al dashboard</span>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-200">Retiros</h1>
              <p className="text-gray-400 mt-2">Solicita retiro de tus ganancias</p>
            </div>
            {availableBalance >= 50000 && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Nueva Solicitud</span>
              </button>
            )}
          </div>
        </div>

        {/* Card de Balance Disponible */}
        <div className="mb-6 bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg border border-green-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-300 mb-1">Balance Disponible</p>
              <p className="text-3xl font-bold text-green-400">
                {availableBalance.toLocaleString('es-PY')} Gs.
              </p>
              <p className="text-xs text-green-400 mt-2">
                Monto mínimo de retiro: 50,000 Gs.
              </p>
            </div>
            <DollarSign className="w-12 h-12 text-green-400" />
          </div>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="mb-6 bg-[#252525] rounded-lg border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-200 mb-4">Nueva Solicitud de Retiro</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Monto (Gs.) *
                </label>
                <input
                  type="number"
                  step="1000"
                  min="50000"
                  max={availableBalance}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1A1A1A] border border-gray-600 rounded-md text-gray-200"
                  placeholder={`Mínimo: 50,000 Gs.`}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Método de Pago *
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1A1A1A] border border-gray-600 rounded-md text-gray-200"
                  required
                >
                  <option value="bank_transfer">Transferencia Bancaria</option>
                  <option value="paypal">PayPal</option>
                  <option value="mobile_wallet">Billetera Móvil</option>
                  <option value="cash">Efectivo (Recoger)</option>
                </select>
              </div>

              {formData.payment_method === 'bank_transfer' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Número de Cuenta *
                    </label>
                    <input
                      type="text"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-gray-600 rounded-md text-gray-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Banco *
                    </label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-gray-600 rounded-md text-gray-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Nombre del Titular *
                    </label>
                    <input
                      type="text"
                      value={formData.account_name}
                      onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-gray-600 rounded-md text-gray-200"
                      required
                    />
                  </div>
                </>
              )}

              {formData.payment_method === 'paypal' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email de PayPal *
                  </label>
                  <input
                    type="email"
                    value={formData.paypal_email}
                    onChange={(e) => setFormData({ ...formData, paypal_email: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1A1A1A] border border-gray-600 rounded-md text-gray-200"
                    required
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Crear Solicitud
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      amount: '',
                      payment_method: 'bank_transfer',
                      account_number: '',
                      bank_name: '',
                      account_name: '',
                      paypal_email: '',
                    });
                  }}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Solicitudes */}
        <div className="bg-[#252525] rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-gray-200">Historial de Solicitudes</h2>
          </div>
          <div className="overflow-x-auto">
            {requests.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No hay solicitudes de retiro
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-[#1A1A1A]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Monto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Método</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-[#1A1A1A]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(request.created_at).toLocaleDateString('es-PY')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">
                        {request.amount.toLocaleString('es-PY')} Gs.
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {request.payment_method === 'bank_transfer' && 'Transferencia Bancaria'}
                        {request.payment_method === 'paypal' && 'PayPal'}
                        {request.payment_method === 'mobile_wallet' && 'Billetera Móvil'}
                        {request.payment_method === 'cash' && 'Efectivo'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-2 ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          <span className="text-sm">
                            {request.status === 'pending' && 'Pendiente'}
                            {request.status === 'approved' && 'Aprobada'}
                            {request.status === 'processing' && 'En Proceso'}
                            {request.status === 'completed' && 'Completada'}
                            {request.status === 'rejected' && 'Rechazada'}
                            {request.status === 'failed' && 'Fallida'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {request.admin_notes || request.rejection_reason || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

