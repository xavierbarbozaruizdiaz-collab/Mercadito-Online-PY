'use client';

// ============================================
// MERCADITO ONLINE PY - PANEL ADMIN - SORTEOS
// Gestión completa de sorteos para administradores
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Ticket, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Gift,
  Settings,
  Users,
  Filter,
  Search
} from 'lucide-react';
import {
  getActiveRaffles,
  getPendingRaffles,
  approveRaffle,
  rejectRaffle,
  drawRaffleWinner,
  getRaffleSettings,
  updateRaffleSetting,
  type Raffle
} from '@/lib/services/raffleService';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/lib/hooks/useToast';

type Tab = 'active' | 'pending' | 'ended' | 'settings';

export default function AdminRafflesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [activeRaffles, setActiveRaffles] = useState<Raffle[]>([]);
  const [pendingRaffles, setPendingRaffles] = useState<Raffle[]>([]);
  const [endedRaffles, setEndedRaffles] = useState<Raffle[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      // Verificar que es admin
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        router.push('/auth/sign-in');
        return;
      }

      const userId = session.user.id;
      setCurrentUserId(userId);

      // Verificar rol admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (profile?.role !== 'admin') {
        router.push('/');
        return;
      }

      // Cargar datos
      const [active, pending, ended, settingsData] = await Promise.all([
        getActiveRaffles({ include_ended: false }),
        getPendingRaffles(),
        getActiveRaffles({ include_ended: true }).then(raffles => 
          raffles.filter(r => r.status === 'ended' || r.status === 'drawn')
        ),
        getRaffleSettings()
      ]);

      setActiveRaffles(active);
      setPendingRaffles(pending);
      setEndedRaffles(ended);
      setSettings(settingsData);
    } catch (err: any) {
      console.error('Error loading admin raffles:', err);
      toast.error(`Error: ${err.message || 'Error al cargar datos'}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(raffleId: string) {
    if (!currentUserId) return;
    
    if (!confirm('¿Aprobar y activar este sorteo?')) return;

    try {
      setProcessing(raffleId);
      await approveRaffle(raffleId, currentUserId);
      await loadData();
      toast.success('✅ Sorteo aprobado y activado exitosamente');
    } catch (err: any) {
      toast.error(`Error: ${err.message || 'Error al aprobar sorteo'}`);
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(raffleId: string) {
    if (!confirm('¿Rechazar este sorteo? Esta acción no se puede deshacer.')) return;

    try {
      setProcessing(raffleId);
      await rejectRaffle(raffleId);
      await loadData();
      toast.success('✅ Sorteo rechazado');
    } catch (err: any) {
      toast.error(`Error: ${err.message || 'Error al rechazar sorteo'}`);
    } finally {
      setProcessing(null);
    }
  }

  async function handleDraw(raffleId: string) {
    if (!confirm('¿Realizar el sorteo ahora? Esta acción seleccionará el ganador.')) return;

    try {
      setProcessing(raffleId);
      const result = await drawRaffleWinner(raffleId);
      await loadData();
      toast.success(`✅ Sorteo realizado! Ganador: ${result.winner_name} (${result.winner_email})`);
      toast.info('📧 Email de notificación enviado al ganador');
    } catch (err: any) {
      toast.error(`Error: ${err.message || 'Error al realizar sorteo'}`);
    } finally {
      setProcessing(null);
    }
  }

  async function handleToggleGlobalEnabled() {
    if (!currentUserId) return;

    const newValue = !settings.global_enabled?.enabled;
    
    try {
      setProcessing('settings');
      await updateRaffleSetting('global_enabled', { enabled: newValue }, currentUserId);
      await loadData();
      toast.success(`✅ Sistema de sorteos ${newValue ? 'habilitado' : 'deshabilitado'}`);
    } catch (err: any) {
      toast.error(`Error: ${err.message || 'Error al actualizar configuración'}`);
    } finally {
      setProcessing(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando...</p>
          </div>
        </div>
      </main>
    );
  }

  const currentRaffles = activeTab === 'active' 
    ? activeRaffles 
    : activeTab === 'pending' 
    ? pendingRaffles 
    : endedRaffles;

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Ticket className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Sorteos</h1>
            </div>
            <Link
              href="/admin/raffles/create"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Crear Sorteo
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'active'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Activos ({activeRaffles.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pendientes ({pendingRaffles.length})
            </button>
            <button
              onClick={() => setActiveTab('ended')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'ended'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Finalizados ({endedRaffles.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-5 h-5 mx-auto" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        {activeTab === 'settings' ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Configuración Global</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-gray-900">Sistema de Sorteos</h3>
                  <p className="text-sm text-gray-600">
                    Habilitar o deshabilitar el sistema de sorteos globalmente
                  </p>
                </div>
                <button
                  onClick={handleToggleGlobalEnabled}
                  disabled={processing === 'settings'}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    settings.global_enabled?.enabled
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                  } disabled:opacity-50`}
                >
                  {processing === 'settings' ? '...' : settings.global_enabled?.enabled ? 'Habilitado' : 'Deshabilitado'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {currentRaffles.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {activeTab === 'pending' 
                    ? 'No hay sorteos pendientes de aprobación'
                    : activeTab === 'ended'
                    ? 'No hay sorteos finalizados'
                    : 'No hay sorteos activos'}
                </p>
              </div>
            ) : (
              currentRaffles.map((raffle) => (
                <div
                  key={raffle.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {raffle.title}
                      </h3>
                      {raffle.description && (
                        <p className="text-gray-600 mb-2">{raffle.description}</p>
                      )}
                      {raffle.product && (
                        <p className="text-sm text-gray-600">
                          Producto: <span className="font-medium">{raffle.product.title}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {raffle.status === 'draft' && activeTab === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(raffle.id)}
                            disabled={processing === raffle.id}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleReject(raffle.id)}
                            disabled={processing === raffle.id}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            Rechazar
                          </button>
                        </>
                      )}
                      {raffle.status === 'active' && activeTab === 'active' && (
                        <button
                          onClick={() => handleDraw(raffle.id)}
                          disabled={processing === raffle.id}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                          <Gift className="w-4 h-4" />
                          Realizar Sorteo
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Estadísticas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-xs text-gray-500">Tickets</p>
                        <p className="font-semibold text-gray-900">{raffle.total_tickets}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500">Participantes</p>
                        <p className="font-semibold text-gray-900">{raffle.total_participants}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="text-xs text-gray-500">Fecha de sorteo</p>
                        <p className="font-semibold text-gray-900 text-sm">
                          {new Date(raffle.draw_date).toLocaleDateString('es-PY')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        raffle.is_enabled ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <div>
                        <p className="text-xs text-gray-500">Estado</p>
                        <p className="font-semibold text-gray-900 text-sm">
                          {raffle.is_enabled ? 'Activo' : 'Inactivo'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Información adicional */}
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Tipo: {raffle.raffle_type === 'purchase_based' ? 'Por compras' : 'De vendedor'}</p>
                    {raffle.seller && (
                      <p>
                        Vendedor: {raffle.seller.first_name && raffle.seller.last_name
                          ? `${raffle.seller.first_name} ${raffle.seller.last_name}`
                          : raffle.seller.email}
                      </p>
                    )}
                    {raffle.winner_id && (
                      <p className="text-green-600 font-semibold">
                        ✅ Ganador seleccionado
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}

