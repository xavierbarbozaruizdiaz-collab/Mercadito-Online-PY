'use client';

// ============================================
// MERCADITO ONLINE PY - ADMIN: NUEVO INFLUENCER
// Formulario para crear nuevo influencer
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createInfluencer,
  type CreateInfluencerParams,
} from '@/lib/services/influencerService';
import { logger } from '@/lib/utils/logger';
import { ArrowLeft, Save, CheckCircle } from 'lucide-react';

export default function NewInfluencerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateInfluencerParams>({
    influencer_name: '',
    influencer_code: '',
    social_media_platform: 'instagram',
    contact_email: '',
    contact_phone: '',
    bio: '',
    commission_percent: 10,
    commission_type: 'gateway_fee_percent',
    can_track_all_stores: true,
    assigned_stores: [],
    min_sales_threshold: 0,
    max_commission_per_month: undefined,
    min_commission_per_order: 0,
    max_commission_per_order: undefined,
    payment_method: 'bank_transfer',
    payment_schedule: 'monthly',
    payment_threshold: 0,
    notes: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Generar código único si no se proporcionó
      let code = formData.influencer_code.trim();
      if (!code) {
        code = `${formData.social_media_platform.toUpperCase()}_${formData.influencer_name
          .toUpperCase()
          .replace(/\s+/g, '_')}`;
      }

      const influencer = await createInfluencer({
        ...formData,
        influencer_code: code,
      });

      router.push(`/admin/influencers/${influencer.id}`);
    } catch (err: any) {
      logger.error('Error creating influencer', err);
      alert(err.message || 'Error al crear influencer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/influencers"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Volver
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Nuevo Influencer
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Crea un nuevo influencer para marketing
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="space-y-6">
            {/* Información básica */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Información Básica
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre/Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.influencer_name}
                    onChange={(e) =>
                      setFormData({ ...formData, influencer_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Ej: @juan_perez"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Código Único
                  </label>
                  <input
                    type="text"
                    value={formData.influencer_code}
                    onChange={(e) =>
                      setFormData({ ...formData, influencer_code: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Se genera automáticamente si está vacío"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Ej: INSTAGRAM_JUAN_PEREZ
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Plataforma *
                  </label>
                  <select
                    required
                    value={formData.social_media_platform}
                    onChange={(e) =>
                      setFormData({ ...formData, social_media_platform: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="facebook">Facebook</option>
                    <option value="twitter">Twitter</option>
                    <option value="other">Otra</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email de Contacto
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Biografía/Descripción
                  </label>
                  <textarea
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Configuración de comisiones */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Configuración de Comisiones
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    % Comisión sobre Gateway Fee *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.commission_percent}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        commission_percent: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Ej: 10% de la comisión de pasarela
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mínimo de Ventas
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_sales_threshold || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        min_sales_threshold: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Configuración de pagos */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Configuración de Pagos
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_method: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="bank_transfer">Transferencia Bancaria</option>
                    <option value="paypal">PayPal</option>
                    <option value="cash">Efectivo</option>
                    <option value="mobile_wallet">Billetera Móvil</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Frecuencia de Pago
                  </label>
                  <select
                    value={formData.payment_schedule}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_schedule: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quincenal</option>
                    <option value="monthly">Mensual</option>
                    <option value="per_order">Por Orden</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notas Internas
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Notas internas sobre este influencer..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-4">
            <Link
              href="/admin/influencers"
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {loading ? (
                'Guardando...'
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



