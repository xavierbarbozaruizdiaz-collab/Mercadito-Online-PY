'use client';

// ============================================
// MERCADITO ONLINE PY - ADMIN: GESTIÓN DE PLANES DE MEMBRESÍA
// Crear y editar planes con precios configurables
// ============================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';
import { ArrowLeft, Save, Plus, Edit, X, Crown, Shield, Star } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getMembershipPlans, type MembershipPlan } from '@/lib/services/membershipService';

export default function AdminMembershipPlansPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<MembershipPlan>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setLoading(true);
    try {
      const plansData = await getMembershipPlans();
      // Cargar todos los planes (activos e inactivos) desde admin
      const { data: allPlans, error } = await supabase
        .from('membership_plans')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setPlans((allPlans || []).map((p: any) => ({
        ...p,
        features: p.features || [],
      })) as MembershipPlan[]);
    } catch (err) {
      logger.error('Error loading plans', err);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(plan: MembershipPlan) {
    setEditingPlan(plan.id);
    setEditData({
      ...plan,
    });
  }

  function cancelEdit() {
    setEditingPlan(null);
    setEditData({});
  }

  async function savePlan(planId: string) {
    setSaving(planId);
    try {
      const updateData: any = {
        name: editData.name,
        description: editData.description,
        price_monthly: editData.price_monthly,
        price_yearly: editData.price_yearly,
        price_one_time: editData.price_one_time,
        duration_days: editData.duration_days,
        bid_limit: editData.bid_limit,
        bid_limit_formatted: editData.bid_limit_formatted,
        max_products: (editData as any).max_products,
        max_price_base: (editData as any).max_price_base,
        features: editData.features || [],
        is_active: editData.is_active,
        is_popular: editData.is_popular,
        sort_order: editData.sort_order,
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase as any)
        .from('membership_plans')
        .update(updateData)
        .eq('id', planId);

      if (error) throw error;

      await loadPlans();
      setEditingPlan(null);
      setEditData({});
      alert('Plan guardado exitosamente');
    } catch (err: any) {
      logger.error('Error saving plan', err);
      alert('Error: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(null);
    }
  }

  function getPlanIcon(level: string) {
    switch (level) {
      case 'bronze':
        return <Crown className="h-6 w-6 text-amber-600" />;
      case 'silver':
        return <Shield className="h-6 w-6 text-gray-400" />;
      case 'gold':
        return <Star className="h-6 w-6 text-yellow-500" />;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/memberships"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Volver a Membresías
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gestión de Planes de Membresía
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configura precios, características y límites de cada plan
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Nota:</strong> Los cambios en precios y características se reflejan inmediatamente. 
            Los usuarios pueden suscribirse directamente desde las páginas de subastas.
          </p>
        </div>

        {/* Plans List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Cargando planes...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isEditing = editingPlan === plan.id;

              return (
                <div
                  key={plan.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getPlanIcon(plan.level)}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editData.name || plan.name}
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                          ) : (
                            plan.name
                          )}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Nivel: {plan.level}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {plan.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-xs">
                          Activo
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded text-xs">
                          Inactivo
                        </span>
                      )}
                      {plan.is_popular && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-xs">
                          Popular
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Precios */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Precio Mensual
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editData.price_monthly ?? plan.price_monthly}
                          onChange={(e) =>
                            setEditData({ ...editData, price_monthly: parseFloat(e.target.value) })
                          }
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatCurrency(plan.price_monthly)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Precio Anual
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editData.price_yearly ?? plan.price_yearly ?? ''}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              price_yearly: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {plan.price_yearly ? formatCurrency(plan.price_yearly) : 'N/A'}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Pago Único
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editData.price_one_time ?? plan.price_one_time ?? ''}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              price_one_time: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {plan.price_one_time ? formatCurrency(plan.price_one_time) : 'N/A'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Límites */}
                  <div className="space-y-4 mb-4">
                    {/* Límite de puja */}
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Límite de Puja
                      </label>
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="number"
                            value={editData.bid_limit ?? plan.bid_limit ?? ''}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                bid_limit: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                            placeholder="NULL = Ilimitado"
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                          <input
                            type="text"
                            value={editData.bid_limit_formatted ?? plan.bid_limit_formatted ?? ''}
                            onChange={(e) =>
                              setEditData({ ...editData, bid_limit_formatted: e.target.value })
                            }
                            placeholder="Ej: 2.5M Gs, Ilimitado"
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {plan.bid_limit_formatted || 'Ilimitado'}
                        </p>
                      )}
                    </div>

                    {/* Límite de productos */}
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Límite de Productos
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={(editData as any).max_products ?? (plan as any).max_products ?? ''}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              max_products: e.target.value ? parseInt(e.target.value) : null,
                            } as any)
                          }
                          placeholder="NULL = Ilimitado"
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {(plan as any).max_products ?? 'Ilimitado'}
                        </p>
                      )}
                    </div>

                    {/* Límite de precio base */}
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Límite de Precio Base (Gs.)
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={(editData as any).max_price_base ?? (plan as any).max_price_base ?? ''}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              max_price_base: e.target.value ? parseFloat(e.target.value) : null,
                            } as any)
                          }
                          placeholder="NULL = Ilimitado"
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {(plan as any).max_price_base 
                            ? `${((plan as any).max_price_base as number).toLocaleString('es-PY')} Gs.`
                            : 'Ilimitado'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mb-4">
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Características (JSON array)
                    </label>
                    {isEditing ? (
                      <textarea
                        value={JSON.stringify(editData.features || plan.features || [], null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setEditData({ ...editData, features: parsed });
                          } catch {
                            // Invalid JSON, keep as is
                          }
                        }}
                        rows={4}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-xs"
                      />
                    ) : (
                      <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-2 mb-4">
                    {isEditing ? (
                      <>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editData.is_active ?? plan.is_active}
                            onChange={(e) =>
                              setEditData({ ...editData, is_active: e.target.checked })
                            }
                            className="rounded border-gray-300"
                          />
                          <span className="text-gray-700 dark:text-gray-300">Activo</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editData.is_popular ?? plan.is_popular}
                            onChange={(e) =>
                              setEditData({ ...editData, is_popular: e.target.checked })
                            }
                            className="rounded border-gray-300"
                          />
                          <span className="text-gray-700 dark:text-gray-300">Marcar como Popular</span>
                        </label>
                      </>
                    ) : null}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    {isEditing ? (
                      <>
                        <button
                          onClick={cancelEdit}
                          className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                          <X className="h-4 w-4 inline mr-1" />
                          Cancelar
                        </button>
                        <button
                          onClick={() => savePlan(plan.id)}
                          disabled={saving === plan.id}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving === plan.id ? (
                            'Guardando...'
                          ) : (
                            <>
                              <Save className="h-4 w-4 inline mr-1" />
                              Guardar
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(plan)}
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Edit className="h-4 w-4 inline mr-1" />
                        Editar Plan
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

