'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';
import {
  ArrowLeft,
  Save,
  Target,
  DollarSign,
  Calendar,
  Link as LinkIcon,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface Store {
  id: string;
  name: string;
  slug: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    store_id: '',
    campaign_type: 'individual' as 'general' | 'individual',
    objective: 'traffic',
    budget_amount: '',
    budget_type: 'daily' as 'daily' | 'lifetime',
    target_url: '',
    status: 'draft' as 'draft' | 'active' | 'paused',
  });

  useEffect(() => {
    loadStores();
  }, [user]);

  async function loadStores() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) return;

      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug')
        .eq('seller_id', session.session.user.id)
        .eq('is_active', true);

      if (error) throw error;
      setStores(data || []);
      
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, store_id: data[0].id }));
      }
    } catch (err) {
      logger.error('Error loading stores', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        alert('Debes iniciar sesión');
        return;
      }

      const response = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          budget_amount: formData.budget_amount ? parseFloat(formData.budget_amount) : null,
          created_by: session.session.user.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error creando campaña');
      }

      router.push(`/dashboard/marketing/${result.id}`);
    } catch (err) {
      logger.error('Error creating campaign', err);
      alert('Error al crear campaña: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/marketing"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a campañas
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Campaña de Marketing</h1>
          <p className="text-gray-600 mt-1">Crea una nueva campaña publicitaria para promocionar tus productos</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Nombre de la campaña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la campaña *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Promoción de Verano 2025"
            />
          </div>

          {/* Tipo de campaña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de campaña *
            </label>
            <select
              value={formData.campaign_type}
              onChange={(e) => setFormData({ ...formData, campaign_type: e.target.value as 'general' | 'individual' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="individual">Individual (solo para mi tienda)</option>
              <option value="general">General (para toda la plataforma)</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              {formData.campaign_type === 'individual' 
                ? 'Solo los productos de tu tienda serán promocionados'
                : 'Todos los productos de la plataforma serán promocionados (solo admins)'}
            </p>
          </div>

          {/* Tienda (solo si es individual) */}
          {formData.campaign_type === 'individual' && stores.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tienda *
              </label>
              <select
                required={formData.campaign_type === 'individual'}
                value={formData.store_id}
                onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecciona una tienda</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Objetivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Objetivo *
            </label>
            <select
              value={formData.objective}
              onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="traffic">Tráfico</option>
              <option value="conversions">Conversiones</option>
              <option value="engagement">Interacción</option>
              <option value="awareness">Concientización</option>
            </select>
          </div>

          {/* Presupuesto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Presupuesto
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.budget_amount}
                onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de presupuesto
              </label>
              <select
                value={formData.budget_type}
                onChange={(e) => setFormData({ ...formData, budget_type: e.target.value as 'daily' | 'lifetime' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Diario</option>
                <option value="lifetime">Total</option>
              </select>
            </div>
          </div>

          {/* URL objetivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL objetivo *
            </label>
            <input
              type="url"
              required
              value={formData.target_url}
              onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://mercadito-online-py.vercel.app/store/mi-tienda"
            />
            <p className="text-sm text-gray-500 mt-1">
              URL a la que se dirigirá el tráfico de la campaña
            </p>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado inicial
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'active' | 'paused' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Borrador</option>
              <option value="active">Activa</option>
              <option value="paused">Pausada</option>
            </select>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link
              href="/dashboard/marketing"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Guardando...' : 'Crear Campaña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

