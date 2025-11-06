'use client';

// ============================================
// MERCADITO ONLINE PY - ADVERTENCIA DE LÍMITE DE PRECIO
// Muestra advertencia cuando el precio excede el límite del plan
// ============================================

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { checkCanPublishProduct, type CanPublishResult } from '@/lib/services/membershipService';
import { AlertTriangle, Crown } from 'lucide-react';
import Link from 'next/link';

interface PriceLimitWarningProps {
  priceBase: number;
  onValidationChange?: (canPublish: boolean, reason?: string) => void;
}

export default function PriceLimitWarning({ priceBase, onValidationChange }: PriceLimitWarningProps) {
  const [validation, setValidation] = useState<CanPublishResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (priceBase > 0) {
      validatePrice();
    } else {
      setValidation(null);
      onValidationChange?.(true);
    }
  }, [priceBase]);

  async function validatePrice() {
    if (priceBase <= 0) return;

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setValidation(null);
        return;
      }

      const result = await checkCanPublishProduct(session.user.id, priceBase);
      setValidation(result);
      onValidationChange?.(result.can_publish, result.reason);
    } catch (err) {
      console.error('Error validating price', err);
    } finally {
      setLoading(false);
    }
  }

  if (!validation || validation.can_publish || (validation as any).is_store_owner) {
    return null;
  }

  if (validation.price_exceeds_limit) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
              Precio excede el límite de tu plan
            </p>
            <p className="text-xs text-red-700 dark:text-red-300 mb-2">
              {validation.reason}
            </p>
            {validation.suggested_plan_level && (
              <Link
                href={`/memberships?plan=${validation.suggested_plan_level}`}
                className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs font-medium"
              >
                <Crown className="h-3 w-3" />
                Actualizar a {validation.suggested_plan_name || validation.suggested_plan_level}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}


