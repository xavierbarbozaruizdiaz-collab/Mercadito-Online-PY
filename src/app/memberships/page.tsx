'use client';

// ============================================
// MERCADITO ONLINE PY - PÁGINA PÚBLICA DE MEMBRESÍAS
// Muestra planes disponibles con precios
// ============================================

import { useState, useEffect } from 'react';
import { getMembershipPlans, type MembershipPlan } from '@/lib/services/membershipService';
import { formatCurrency } from '@/lib/utils';
import { Crown, Shield, Star, Check, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MembershipsPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

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

  function handleSubscribe(plan: MembershipPlan, subscriptionType: 'monthly' | 'yearly' | 'one_time') {
    const price = subscriptionType === 'yearly' 
      ? plan.price_yearly || plan.price_monthly * 12
      : subscriptionType === 'one_time'
      ? plan.price_one_time || plan.price_monthly
      : plan.price_monthly;
    
    router.push(`/checkout?type=membership&plan_id=${plan.id}&subscription_type=${subscriptionType}&amount=${price}`);
  }

  function getPlanIcon(level: string) {
    switch (level) {
      case 'bronze':
        return <Crown className="h-8 w-8 text-amber-600" />;
      case 'silver':
        return <Shield className="h-8 w-8 text-gray-400" />;
      case 'gold':
        return <Star className="h-8 w-8 text-yellow-500" />;
      default:
        return <Zap className="h-8 w-8" />;
    }
  }

  function getPlanColor(level: string) {
    switch (level) {
      case 'bronze':
        return 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50';
      case 'silver':
        return 'border-gray-300 bg-gradient-to-br from-gray-50 to-slate-50';
      case 'gold':
        return 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Cargando planes...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Planes de Membresía</h1>
          <p className="text-xl text-purple-100 max-w-2xl mx-auto">
            Elige el plan perfecto para participar en subastas. Desde plan básico hasta ilimitado.
          </p>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-xl border-2 p-8 ${getPlanColor(plan.level)} ${
                plan.is_popular ? 'ring-4 ring-blue-500 scale-105' : ''
              } shadow-lg hover:shadow-2xl transition-all`}
            >
              {plan.is_popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-500 text-white text-sm font-bold px-4 py-1 rounded-full shadow-lg">
                    ⭐ MÁS POPULAR
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  {getPlanIcon(plan.level)}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                {plan.description && (
                  <p className="text-sm text-gray-600">{plan.description}</p>
                )}
              </div>

              {/* Pricing */}
              <div className="text-center mb-6">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Mensual</p>
                  <p className="text-4xl font-bold text-gray-900">
                    {formatCurrency(plan.price_monthly)}
                  </p>
                </div>
                {plan.price_yearly && plan.price_yearly > 0 && (
                  <div className="bg-green-100 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-600 mb-1">Anual (Ahorra)</p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatCurrency(plan.price_yearly)}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Ahorra {formatCurrency((plan.price_monthly * 12) - plan.price_yearly)} al año
                    </p>
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 min-h-[200px]">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start text-sm text-gray-700">
                    <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
                <li className="flex items-start text-sm font-semibold text-gray-900 border-t pt-3 mt-3">
                  <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Límite de puja: {plan.bid_limit_formatted || 'Ilimitado'}</span>
                </li>
              </ul>

              {/* Subscribe Buttons */}
              <div className="space-y-3">
                {plan.price_monthly > 0 && (
                  <button
                    onClick={() => handleSubscribe(plan, 'monthly')}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md hover:shadow-lg"
                  >
                    Suscribirse Mensual
                  </button>
                )}
                {plan.price_yearly && plan.price_yearly > 0 && (
                  <button
                    onClick={() => handleSubscribe(plan, 'yearly')}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-md hover:shadow-lg"
                  >
                    Suscribirse Anual
                    <span className="block text-xs mt-1 opacity-90">
                      Mejor precio
                    </span>
                  </button>
                )}
                {plan.price_one_time && plan.price_one_time > 0 && (
                  <button
                    onClick={() => handleSubscribe(plan, 'one_time')}
                    className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold shadow-md hover:shadow-lg"
                  >
                    Pago Único
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-16 bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            ¿Por qué necesitas una membresía?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {/* <Gavel className="h-8 w-8 text-blue-600" /> */}
                <span className="text-2xl">⚖️</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Participa en Subastas</h3>
              <p className="text-sm text-gray-600">
                Los usuarios con membresía Gratis solo pueden ver subastas. Necesitas al menos Bronce para pujar.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Protección contra Shill Bidding</h3>
              <p className="text-sm text-gray-600">
                Las membresías verificadas aseguran que solo usuarios comprometidos puedan pujar.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Mayor Límite de Puja</h3>
              <p className="text-sm text-gray-600">
                Planes superiores ofrecen límites más altos o ilimitados para pujas más grandes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


