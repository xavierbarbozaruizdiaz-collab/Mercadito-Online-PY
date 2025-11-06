'use client';

// ============================================
// MERCADITO ONLINE PY - DASHBOARD VENDEDOR - SORTEOS
// Gestión de sorteos para vendedores
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Ticket, Plus, Clock, CheckCircle, XCircle, Gift, Users } from 'lucide-react';
import {
  getActiveRaffles,
  getPendingRaffles,
  createRaffle,
  type Raffle,
  type CreateRaffleData
} from '@/lib/services/raffleService';
import { supabase } from '@/lib/supabaseClient';

type Tab = 'active' | 'pending' | 'ended' | 'create';

export default function SellerRafflesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [myRaffles, setMyRaffles] = useState<Raffle[]>([]);
  const [pendingRaffles, setPendingRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateRaffleData>({
    title: '',
    description: '',
    product_id: '',
    raffle_type: 'seller_raffle',
    min_purchase_amount: 50000,
    tickets_per_amount: 100000,
    start_date: '',
    end_date: '',
    draw_date: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        router.push('/auth/sign-in');
        return;
      }

      const userId = session.user.id;
      setCurrentUserId(userId);

      // Cargar sorteos del vendedor
      const [active, pending] = await Promise.all([
        getActiveRaffles({ include_ended: false }),
        getPendingRaffles()
      ]);

      // Filtrar solo los sorteos del vendedor
      setMyRaffles(active.filter(r => r.seller_id === userId));
      setPendingRaffles(pending.filter(r => r.seller_id === userId));
    } catch (err: any) {
      console.error('Error loading raffles:', err);
      alert(`Error: ${err.message || 'Error al cargar sorteos'}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRaffle() {
    if (!currentUserId) return;

    // Validaciones
    if (!formData.title.trim()) {
      alert('El título es obligatorio');
      return;
    }
    if (!formData.product_id) {
      alert('Debes seleccionar un producto');
      return;
    }
    if (!formData.start_date || !formData.end_date || !formData.draw_date) {
      alert('Debes completar todas las fechas');
      return;
    }

    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const draw = new Date(formData.draw_date);

    if (start >= end || end >= draw) {
      alert('Las fechas deben ser válidas: inicio < fin < sorteo');
      return;
    }

    try {
      setCreating(true);
      await createRaffle(formData, currentUserId);
      alert('✅ Sorteo creado exitosamente. Esperando aprobación del administrador.');
      setFormData({
        title: '',
        description: '',
        product_id: '',
        raffle_type: 'seller_raffle',
        min_purchase_amount: 50000,
        tickets_per_amount: 100000,
        start_date: '',
        end_date: '',
        draw_date: '',
      });
      setActiveTab('active');
      await loadData();
    } catch (err: any) {
      alert(`Error: ${err.message || 'Error al crear sorteo'}`);
    } finally {
      setCreating(false);
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

  const currentRaffles = activeTab === 'active' ? myRaffles : pendingRaffles;

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Ticket className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-900">Mis Sorteos</h1>
            </div>
            <button
              onClick={() => setActiveTab('create')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Crear Sorteo
            </button>
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
              Activos ({myRaffles.length})
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
              onClick={() => setActiveTab('create')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'create'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plus className="w-5 h-5 mx-auto" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        {activeTab === 'create' ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Crear Nuevo Sorteo</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título del sorteo *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ej: Sorteo de iPhone 15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe el sorteo..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Producto a sortear *
                </label>
                <input
                  type="text"
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="ID del producto (ej: copiar desde la URL del producto)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ingresa el ID del producto que quieres sortear. Debe ser un producto de tu tienda.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de inicio *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de fin *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de sorteo *
                </label>
                <input
                  type="datetime-local"
                  value={formData.draw_date}
                  onChange={(e) => setFormData({ ...formData, draw_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Fecha en que se realizará el sorteo y se seleccionará el ganador
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  ℹ️ Tu sorteo será enviado para aprobación. Un administrador lo revisará y lo activará.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleCreateRaffle}
                  disabled={creating}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creando...' : 'Crear Sorteo'}
                </button>
                <button
                  onClick={() => setActiveTab('active')}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
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
                    ? 'No tienes sorteos pendientes de aprobación'
                    : 'No tienes sorteos activos'}
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
                      {raffle.status === 'draft' && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                          Pendiente de aprobación
                        </span>
                      )}
                      {raffle.status === 'active' && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                          Activo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Estadísticas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                    <div>
                      <Link
                        href={`/raffles/${raffle.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Ver sorteo →
                      </Link>
                    </div>
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

