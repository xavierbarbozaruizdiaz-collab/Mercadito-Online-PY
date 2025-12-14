'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/lib/hooks/useToast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CheckCircle, XCircle, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { logger } from '@/lib/utils/logger';

interface PendingSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  subscription_type: string;
  amount_paid: number;
  payment_method: string | null;
  created_at: string;
  user_email?: string;
  plan_name?: string;
  plan_level?: string;
}

export default function AdminMembershipsPendingPage() {
  const toast = useToast();
  const [subscriptions, setSubscriptions] = useState<PendingSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingSubscriptions();
  }, []);

  async function loadPendingSubscriptions() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('membership_subscriptions')
        .select(`
          id,
          user_id,
          plan_id,
          status,
          subscription_type,
          amount_paid,
          payment_method,
          created_at
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enriquecer con datos de usuario y plan
      const enriched = await Promise.all(
        (data || []).map(async (sub: any) => {
          // Obtener email del usuario
          const { data: userData } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', sub.user_id)
            .single();

          // Obtener nombre del plan
          const { data: planData } = await supabase
            .from('membership_plans')
            .select('name, level')
            .eq('id', sub.plan_id)
            .single();

          return {
            ...sub,
            user_email: userData?.email || 'N/A',
            plan_name: planData?.name || 'N/A',
            plan_level: planData?.level || 'N/A',
          };
        })
      );

      setSubscriptions(enriched);
    } catch (err) {
      logger.error('Error loading pending subscriptions', err);
      toast.error('Error al cargar suscripciones pendientes');
    } finally {
      setLoading(false);
    }
  }

  async function approveSubscription(subscriptionId: string) {
    try {
      setProcessingId(subscriptionId);
      
      const { data, error } = await (supabase as any).rpc(
        'approve_pending_membership_subscription',
        { p_subscription_id: subscriptionId }
      );

      if (error) throw error;

      toast.success('Membresía aprobada exitosamente');

      // Disparar evento para recargar perfil del usuario
      const subscription = subscriptions.find(s => s.id === subscriptionId);
      if (subscription) {
        // Disparar evento personalizado para que el usuario recargue su perfil
        window.dispatchEvent(
          new CustomEvent('membership-updated', {
            detail: { userId: subscription.user_id },
          })
        );
      }

      // Recargar lista
      await loadPendingSubscriptions();
    } catch (err: any) {
      logger.error('Error approving subscription', err);
      toast.error(err.message || 'Error al aprobar la membresía');
    } finally {
      setProcessingId(null);
    }
  }

  async function rejectSubscription(subscriptionId: string) {
    try {
      setProcessingId(subscriptionId);
      
      const { data, error } = await (supabase as any).rpc(
        'reject_pending_membership_subscription',
        { p_subscription_id: subscriptionId }
      );

      if (error) throw error;

      toast.success('Membresía rechazada');
      await loadPendingSubscriptions();
    } catch (err: any) {
      logger.error('Error rejecting subscription', err);
      toast.error(err.message || 'Error al rechazar la membresía');
    } finally {
      setProcessingId(null);
    }
  }

  async function deleteSubscription(subscriptionId: string) {
    if (!confirm('¿Estás seguro de eliminar esta solicitud? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setProcessingId(subscriptionId);
      
      const { data, error } = await (supabase as any).rpc(
        'delete_membership_subscription',
        { p_subscription_id: subscriptionId }
      );

      if (error) throw error;

      toast.success('Solicitud eliminada');
      await loadPendingSubscriptions();
    } catch (err: any) {
      logger.error('Error deleting subscription', err);
      toast.error(err.message || 'Error al eliminar la solicitud');
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Canon de Participación Pendientes</h1>
        <p className="text-gray-600">Aprobar o rechazar solicitudes de canon de participación</p>
      </div>

      {subscriptions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay solicitudes pendientes</h3>
          <p className="text-gray-600">Todas las solicitudes han sido procesadas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((subscription) => (
            <div
              key={subscription.id}
              className="bg-white rounded-lg shadow p-6 border border-gray-200"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {subscription.plan_name}
                    </h3>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                      Pendiente
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Usuario:</span>
                      <p className="text-gray-900">{subscription.user_email}</p>
                    </div>
                    <div>
                      <span className="font-medium">Monto:</span>
                      <p className="text-gray-900">{formatCurrency(subscription.amount_paid)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Tipo:</span>
                      <p className="text-gray-900 capitalize">
                        {subscription.subscription_type === 'monthly' ? 'Mensual' :
                         subscription.subscription_type === 'yearly' ? 'Anual' :
                         'Pago único'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Fecha:</span>
                      <p className="text-gray-900">{formatDate(subscription.created_at)}</p>
                    </div>
                  </div>
                  {subscription.payment_method && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Método de pago:</span>{' '}
                      <span className="text-gray-900">{subscription.payment_method}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => approveSubscription(subscription.id)}
                  disabled={processingId === subscription.id}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId === subscription.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Aprobar</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => rejectSubscription(subscription.id)}
                  disabled={processingId === subscription.id}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Rechazar</span>
                </button>
                <button
                  onClick={() => deleteSubscription(subscription.id)}
                  disabled={processingId === subscription.id}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
