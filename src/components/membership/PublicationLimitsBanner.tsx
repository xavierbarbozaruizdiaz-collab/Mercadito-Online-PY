'use client';

// ============================================
// MERCADITO ONLINE PY - BANNER DE LÍMITES DE PUBLICACIÓN
// Muestra límites actuales y permite actualizar membresía
// ============================================

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getUserPublicationLimits, type PublicationLimits } from '@/lib/services/membershipService';
import { AlertTriangle, Package, DollarSign, Crown, Store } from 'lucide-react';
import Link from 'next/link';

export default function PublicationLimitsBanner() {
  const [limits, setLimits] = useState<PublicationLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLimits();
  }, []);

  async function loadLimits() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      const userLimits = await getUserPublicationLimits(session.user.id);
      setLimits(userLimits);
    } catch (err) {
      console.error('Error loading publication limits', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !limits) {
    return null;
  }

  // Si es dueño de tienda, no mostrar banner (no tiene límites)
  if (limits.is_store_owner) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <Store className="h-5 w-5 text-green-600 dark:text-green-400" />
          <div>
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              Tienda Activa
            </p>
            <p className="text-xs text-green-700 dark:text-green-300">
              Puedes publicar productos sin límites de cantidad ni precio.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si no puede publicar (sin membresía o expirada)
  if (!limits.can_publish) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
              Membresía Requerida
            </p>
            <p className="text-xs text-red-700 dark:text-red-300 mb-3">
              {limits.message}
            </p>
            {limits.requires_upgrade && limits.suggested_plan_level && (
              <Link
                href={`/memberships?plan=${limits.suggested_plan_level}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                <Crown className="h-4 w-4" />
                Suscribirse a {limits.suggested_plan_name || limits.suggested_plan_level}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Mostrar límites actuales
  const isAtLimit = limits.max_products !== null && limits.current_products >= limits.max_products;
  const isNearLimit = limits.max_products !== null && 
    limits.current_products >= (limits.max_products * 0.8); // 80% del límite

  return (
    <div className={`border rounded-lg p-4 mb-6 ${
      isAtLimit 
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
        : isNearLimit
        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
    }`}>
      <div className="flex items-start gap-3">
        {isAtLimit ? (
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        ) : (
          <Package className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className={`text-sm font-medium ${
              isAtLimit
                ? 'text-red-900 dark:text-red-100'
                : 'text-blue-900 dark:text-blue-100'
            }`}>
              Plan {limits.membership_level ? limits.membership_level.charAt(0).toUpperCase() + limits.membership_level.slice(1) : 'Free'}
            </p>
            {limits.membership_expires_at && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                (Expira: {new Date(limits.membership_expires_at).toLocaleDateString('es-PY')})
              </span>
            )}
          </div>
          
          <div className="space-y-2">
            {/* Límite de productos */}
            <div className="flex items-center gap-2 text-xs">
              <Package className="h-3 w-3" />
              <span className={isAtLimit ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}>
                Productos: {limits.current_products} / {limits.max_products ?? '∞'}
                {limits.products_remaining !== null && ` (${limits.products_remaining} restantes)`}
              </span>
            </div>
            
            {/* Límite de precio */}
            {limits.max_price_base !== null && (
              <div className="flex items-center gap-2 text-xs">
                <DollarSign className="h-3 w-3" />
                <span className="text-gray-700 dark:text-gray-300">
                  Precio máximo: {limits.max_price_base.toLocaleString('es-PY')} Gs.
                </span>
              </div>
            )}
            {limits.max_price_base === null && (
              <div className="flex items-center gap-2 text-xs">
                <DollarSign className="h-3 w-3" />
                <span className="text-gray-700 dark:text-gray-300">
                  Precio: Sin límite
                </span>
              </div>
            )}
          </div>

          {/* Botón de actualización si está en el límite */}
          {isAtLimit && limits.requires_upgrade && limits.suggested_plan_level && (
            <Link
              href={`/memberships?plan=${limits.suggested_plan_level}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium mt-3"
            >
              <Crown className="h-3 w-3" />
              Actualizar a {limits.suggested_plan_name || limits.suggested_plan_level}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}


