'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';
import Link from 'next/link';
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle } from 'lucide-react';

type Transaction = {
  id: string;
  order_id?: string;
  transaction_type: 'commission' | 'payout' | 'refund';
  amount: number;
  status: string;
  created_at: string;
  order?: { id: string; total_amount: number };
  platform_fee?: {
    commission_amount: number;
    base_amount: number;
    seller_earnings: number;
  };
  payout_request?: {
    amount: number;
    payment_method: string;
    status: string;
  };
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadTransactions();
  }, [filterType, dateFrom, dateTo]);

  async function loadTransactions() {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) return;

      const sellerId = session.session.user.id;

      // Obtener comisiones (platform_fees)
      const { data: fees, error: feesError } = await supabase
        .from('platform_fees')
        .select(`
          id,
          order_id,
          transaction_type,
          commission_amount,
          base_amount,
          seller_earnings,
          status,
          payment_status,
          created_at,
          order:orders(id, total_amount)
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (feesError) throw feesError;

      // Obtener solicitudes de retiro (payout_requests)
      const { data: payouts, error: payoutsError } = await supabase
        .from('payout_requests')
        .select('id, amount, payment_method, status, created_at')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (payoutsError) throw payoutsError;

      // Combinar y transformar
      const allTransactions: Transaction[] = [];

      // Agregar comisiones
      (fees || []).forEach((fee: any) => {
        allTransactions.push({
          id: fee.id,
          order_id: fee.order_id,
          transaction_type: 'commission',
          amount: fee.seller_earnings || fee.base_amount || 0,
          status: fee.status,
          created_at: fee.created_at,
          order: fee.order,
          platform_fee: {
            commission_amount: fee.commission_amount || 0,
            base_amount: fee.base_amount || 0,
            seller_earnings: fee.seller_earnings || 0,
          },
        });
      });

      // Agregar retiros
      (payouts || []).forEach((payout: any) => {
        allTransactions.push({
          id: payout.id,
          transaction_type: 'payout',
          amount: payout.amount,
          status: payout.status,
          created_at: payout.created_at,
          payout_request: {
            amount: payout.amount,
            payment_method: payout.payment_method,
            status: payout.status,
          },
        });
      });

      // Ordenar por fecha
      allTransactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Filtrar
      let filtered = allTransactions;
      if (filterType !== 'all') {
        filtered = filtered.filter(t => t.transaction_type === filterType);
      }
      if (dateFrom) {
        filtered = filtered.filter(t => new Date(t.created_at) >= new Date(dateFrom));
      }
      if (dateTo) {
        filtered = filtered.filter(t => new Date(t.created_at) <= new Date(dateTo));
      }

      setTransactions(filtered);
    } catch (err) {
      logger.error('Error loading transactions', err);
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-200">Historial de Transacciones</h1>
          <p className="text-gray-400 mt-2">Movimientos de tus balances y comisiones</p>
        </div>

        {/* Filtros */}
        <div className="mb-6 bg-[#252525] rounded-lg border border-gray-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Tipo</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 bg-[#1A1A1A] border border-gray-600 rounded-md text-gray-200"
              >
                <option value="all">Todos</option>
                <option value="commission">Comisiones</option>
                <option value="payout">Retiros</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-[#1A1A1A] border border-gray-600 rounded-md text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-[#1A1A1A] border border-gray-600 rounded-md text-gray-200"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setFilterType('all');
                }}
                className="w-full px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Lista de transacciones */}
        <div className="bg-[#252525] rounded-lg border border-gray-700 overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No hay transacciones
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="p-6 hover:bg-[#1A1A1A] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        transaction.transaction_type === 'commission' 
                          ? 'bg-green-900/30 text-green-400' 
                          : 'bg-blue-900/30 text-blue-400'
                      }`}>
                        {transaction.transaction_type === 'commission' ? (
                          <TrendingUp className="w-6 h-6" />
                        ) : (
                          <TrendingDown className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-200">
                          {transaction.transaction_type === 'commission' ? 'Comisión por Venta' : 'Solicitud de Retiro'}
                        </p>
                        <p className="text-sm text-gray-400">
                          {new Date(transaction.created_at).toLocaleDateString('es-PY', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {transaction.order && (
                          <p className="text-xs text-gray-500 mt-1">
                            Orden #{transaction.order.id.slice(0, 8)}
                          </p>
                        )}
                        {transaction.payout_request && (
                          <p className="text-xs text-gray-500 mt-1">
                            Método: {transaction.payout_request.payment_method === 'bank_transfer' ? 'Transferencia' : transaction.payout_request.payment_method}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        transaction.transaction_type === 'commission' ? 'text-green-400' : 'text-blue-400'
                      }`}>
                        {transaction.transaction_type === 'commission' ? '+' : '-'}
                        {transaction.amount.toLocaleString('es-PY')} Gs.
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {transaction.status === 'pending' && (
                          <span className="text-xs text-yellow-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Pendiente
                          </span>
                        )}
                        {(transaction.status === 'confirmed' || transaction.status === 'completed') && (
                          <span className="text-xs text-green-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Completada
                          </span>
                        )}
                        {transaction.status === 'refunded' && (
                          <span className="text-xs text-red-400">Reembolsada</span>
                        )}
                      </div>
                      {transaction.platform_fee && (
                        <p className="text-xs text-gray-500 mt-1">
                          Comisión: -{transaction.platform_fee.commission_amount.toLocaleString('es-PY')} Gs.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

