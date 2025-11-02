'use client';

// ============================================
// MERCADITO ONLINE PY - ADMIN: CONFIGURACIÓN DE MULTAS
// Configurar porcentaje de multa y otras reglas
// ============================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type PenaltySetting = {
  id: string;
  penalty_percent: number;
  grace_period_hours: number;
  notification_hours_before: number[];
  auto_cancel_membership: boolean;
  membership_cancellation_delay_hours: number;
  is_active: boolean;
};

export default function PenaltySettingsPage() {
  const [setting, setSetting] = useState<PenaltySetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<PenaltySetting>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('penalty_settings')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSetting(data as PenaltySetting);
        setEditData(data);
      } else {
        // Crear configuración por defecto si no existe
        const defaultSetting = {
          penalty_percent: 5.00,
          grace_period_hours: 48,
          notification_hours_before: [72, 48, 24],
          auto_cancel_membership: true,
          membership_cancellation_delay_hours: 0,
          is_active: true,
        };
        setEditData(defaultSetting);
      }
    } catch (err) {
      logger.error('Error loading penalty settings', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        alert('No autenticado');
        return;
      }

      const updateData = {
        ...editData,
        updated_by: session.session.user.id,
        updated_at: new Date().toISOString(),
      };

      if (setting) {
        // Actualizar existente
        const { error } = await (supabase as any)
          .from('penalty_settings')
          .update(updateData)
          .eq('id', setting.id);

        if (error) throw error;
      } else {
        // Crear nuevo
        const { error } = await (supabase as any)
          .from('penalty_settings')
          .insert([updateData]);

        if (error) throw error;
      }

      alert('Configuración guardada exitosamente');
      await loadSettings();
    } catch (err: any) {
      logger.error('Error saving penalty settings', err);
      alert('Error: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Volver
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Configuración de Multas
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configura las reglas de multas por no-pago de subastas
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
                Sistema de Multas
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Las multas se aplican automáticamente cuando un ganador de subasta no completa el pago 
                después del período de gracia. La membresía puede ser cancelada automáticamente.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6 space-y-6">
          {/* Porcentaje de multa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Porcentaje de Multa (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={editData.penalty_percent || 5.0}
              onChange={(e) =>
                setEditData({ ...editData, penalty_percent: parseFloat(e.target.value) })
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Porcentaje del monto adjudicado que se cobra como multa (actualmente: {(editData.penalty_percent || 5.0)}%)
            </p>
          </div>

          {/* Período de gracia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Período de Gracia (horas)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={editData.grace_period_hours || 48}
              onChange={(e) =>
                setEditData({ ...editData, grace_period_hours: parseInt(e.target.value) })
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Tiempo que se espera antes de aplicar la multa (actualmente: {(editData.grace_period_hours || 48)} horas = {(editData.grace_period_hours || 48) / 24} días)
            </p>
          </div>

          {/* Cancelación automática de membresía */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={editData.auto_cancel_membership ?? true}
                onChange={(e) =>
                  setEditData({ ...editData, auto_cancel_membership: e.target.checked })
                }
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Cancelar membresía automáticamente
              </span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-8">
              Si está activado, la membresía se cancela automáticamente cuando se aplica la multa
            </p>
          </div>

          {/* Delay de cancelación */}
          {editData.auto_cancel_membership && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Retraso para Cancelar Membresía (horas)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={editData.membership_cancellation_delay_hours || 0}
                onChange={(e) =>
                  setEditData({ ...editData, membership_cancellation_delay_hours: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Horas después de aplicar la multa antes de cancelar la membresía (0 = inmediato)
              </p>
            </div>
          )}

          {/* Botón guardar */}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </div>

        {/* Ejemplo */}
        <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Ejemplo de Cálculo:
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Si una subasta se adjudica por <strong>1,000,000 Gs</strong> y el ganador no paga:
            <br />
            • Multa: {formatCurrency((editData.penalty_percent || 5.0) / 100 * 1000000)} ({editData.penalty_percent || 5.0}% de 1,000,000)
            <br />
            • Se aplica después de {(editData.grace_period_hours || 48)} horas ({((editData.grace_period_hours || 48) / 24).toFixed(1)} días)
            {editData.auto_cancel_membership && (
              <>
                <br />
                • Membresía cancelada {(editData.membership_cancellation_delay_hours || 0) === 0 ? 'inmediatamente' : `después de ${editData.membership_cancellation_delay_hours} horas`}
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

