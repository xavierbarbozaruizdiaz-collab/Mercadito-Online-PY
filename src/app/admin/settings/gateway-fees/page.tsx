'use client';

// ============================================
// MERCADITO ONLINE PY - ADMIN: CONFIGURACIÓN DE GATEWAY FEES
// Configuración de comisiones por pasarela de pago
// ============================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getGatewaySettings,
  upsertGatewaySetting,
  updateGatewaySetting,
  type PaymentGatewaySetting,
} from '@/lib/services/gatewayFeeService';
import { logger } from '@/lib/utils/logger';
import { ArrowLeft, Save, Plus, Edit, CheckCircle, X } from 'lucide-react';

export default function GatewayFeesSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [settings, setSettings] = useState<PaymentGatewaySetting[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<PaymentGatewaySetting>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const data = await getGatewaySettings();
      setSettings(data);
    } catch (err) {
      logger.error('Error loading gateway settings', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(id?: string) {
    setSaving(id || 'new');

    try {
      if (id) {
        // Actualizar existente
        await updateGatewaySetting(id, editData as any);
      } else {
        // Crear nuevo (requiere más campos)
        if (!editData.gateway_provider || !editData.gateway_name) {
          throw new Error('Provider y nombre son requeridos');
        }
        await upsertGatewaySetting({
          gateway_provider: editData.gateway_provider,
          gateway_name: editData.gateway_name,
          fee_percent: editData.fee_percent || 5.0,
          fixed_fee: editData.fixed_fee || 0,
          is_active: editData.is_active ?? true,
          is_default: editData.is_default ?? false,
        });
      }

      await loadSettings();
      setEditingId(null);
      setEditData({});
    } catch (err: any) {
      logger.error('Error saving gateway setting', err);
      alert(err.message || 'Error al guardar');
    } finally {
      setSaving(null);
    }
  }

  function startEdit(setting: PaymentGatewaySetting) {
    setEditingId(setting.id);
    setEditData(setting);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData({});
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
            Configuración de Comisiones de Pasarela
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configura las comisiones que cobran las pasarelas de pago
          </p>
        </div>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Nota:</strong> Las comisiones de pasarela se utilizan para calcular las
            comisiones de influencers. Los influencers reciben un porcentaje de estas comisiones.
          </p>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Pasarela
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Comisión (%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Fee Fijo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {settings.map((setting) => (
                  <tr key={setting.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {setting.gateway_name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {setting.gateway_provider}
                          {setting.is_default && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-xs">
                              Por defecto
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === setting.id ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={editData.fee_percent || 0}
                          onChange={(e) =>
                            setEditData({ ...editData, fee_percent: parseFloat(e.target.value) })
                          }
                          className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-white">
                          {setting.fee_percent}%
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === setting.id ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editData.fixed_fee || 0}
                          onChange={(e) =>
                            setEditData({ ...editData, fixed_fee: parseFloat(e.target.value) })
                          }
                          className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-white">
                          {setting.fixed_fee > 0
                            ? new Intl.NumberFormat('es-PY', {
                                style: 'currency',
                                currency: 'PYG',
                              }).format(setting.fixed_fee)
                            : '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === setting.id ? (
                        <select
                          value={editData.is_active ? 'true' : 'false'}
                          onChange={(e) =>
                            setEditData({ ...editData, is_active: e.target.value === 'true' })
                          }
                          className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="true">Activo</option>
                          <option value="false">Inactivo</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            setting.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {setting.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingId === setting.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={cancelEdit}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400"
                          >
                            <X className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleSave(setting.id)}
                            disabled={saving === setting.id}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                          >
                            {saving === setting.id ? (
                              'Guardando...'
                            ) : (
                              <CheckCircle className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(setting)}
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Info adicional */}
        <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Ejemplo de Cálculo:
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Si una orden de 1,000,000 Gs usa Stripe (5% de comisión):
            <br />
            • Gateway Fee: 50,000 Gs (5% de 1,000,000)
            <br />
            • Si un influencer tiene 10% de comisión sobre gateway fee: 5,000 Gs (10% de 50,000)
          </p>
        </div>
      </div>
    </div>
  );
}

