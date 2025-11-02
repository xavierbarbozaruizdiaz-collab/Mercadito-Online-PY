'use client';

// ============================================
// MERCADITO ONLINE PY - MODAL DE SUSCRIPCIÓN A MEMBRESÍA
// Muestra planes disponibles cuando usuario free intenta pujar
// ============================================

import { useState, useEffect } from 'react';
import { X, Crown, Check, Zap, Shield, Star } from 'lucide-react';
import { getMembershipPlans, type MembershipPlan } from '@/lib/services/membershipService';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MembershipSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan?: (planId: string, subscriptionType: 'monthly' | 'yearly' | 'one_time') => void;
}

export default function MembershipSubscriptionModal({
  isOpen,
  onClose,
  onSelectPlan,
}: MembershipSubscriptionModalProps) {
  const router = useRouter();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadPlans();
    }
  }, [isOpen]);

  async function loadPlans() {
    setLoading(true);
    try {
      const plansData = await getMembershipPlans();
      setPlans(plansData);
    } catch (err) {
      console.error('Error loading plans', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectPlan(plan: MembershipPlan, subscriptionType: 'monthly' | 'yearly' | 'one_time') {
    if (onSelectPlan) {
      onSelectPlan(plan.id, subscriptionType);
    } else {
      // Redirigir a checkout con parámetros
      const price = subscriptionType === 'yearly' 
        ? plan.price_yearly || plan.price_monthly * 12
        : subscriptionType === 'one_time'
        ? plan.price_one_time || plan.price_monthly
        : plan.price_monthly;
      
      router.push(`/checkout?type=membership&plan_id=${plan.id}&subscription_type=${subscriptionType}&amount=${price}`);
    }
    onClose();
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
        return <Zap className="h-6 w-6" />;
    }
  }

  function getPlanColor(level: string) {
    switch (level) {
      case 'bronze':
        return 'border-amber-300 bg-amber-50 dark:bg-amber-900/20';
      case 'silver':
        return 'border-gray-300 bg-gray-50 dark:bg-gray-900/20';
      case 'gold':
        return 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Suscríbete para Pujar
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Elige un plan de membresía para participar en subastas
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">Cargando planes...</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative rounded-lg border-2 p-6 ${getPlanColor(plan.level)} ${
                    plan.is_popular ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {plan.is_popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        POPULAR
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <div className="flex justify-center mb-2">
                      {getPlanIcon(plan.level)}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {plan.name}
                    </h3>
                    {plan.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {plan.description}
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start text-sm text-gray-700 dark:text-gray-300">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    <li className="flex items-start text-sm font-semibold text-gray-900 dark:text-white">
                      <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Límite: {plan.bid_limit_formatted || 'Ilimitado'}</span>
                    </li>
                  </ul>

                  {/* Pricing */}
                  <div className="space-y-3">
                    {plan.price_monthly > 0 && (
                      <button
                        onClick={() => handleSelectPlan(plan, 'monthly')}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Mensual: {formatCurrency(plan.price_monthly)}
                      </button>
                    )}
                    {plan.price_yearly && plan.price_yearly > 0 && (
                      <button
                        onClick={() => handleSelectPlan(plan, 'yearly')}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Anual: {formatCurrency(plan.price_yearly)}
                        <span className="block text-xs mt-0.5">
                          Ahorra {formatCurrency((plan.price_monthly * 12) - plan.price_yearly)}
                        </span>
                      </button>
                    )}
                    {plan.price_one_time && plan.price_one_time > 0 && (
                      <button
                        onClick={() => handleSelectPlan(plan, 'one_time')}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Pago único: {formatCurrency(plan.price_one_time)}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/memberships"
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                Ver más información sobre las membresías →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



