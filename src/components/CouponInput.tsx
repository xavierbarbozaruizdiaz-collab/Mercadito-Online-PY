// src/components/CouponInput.tsx
// Componente para ingresar y aplicar cupones de descuento

'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { CouponService, CouponValidationResult } from '@/lib/services/couponService';
import Button from './ui/Button';
import { Input } from './ui';
import LoadingSpinner from './ui/LoadingSpinner';
import { CheckCircle, XCircle, Tag } from 'lucide-react';

interface CouponInputProps {
  orderAmount: number;
  onCouponApplied?: (result: CouponValidationResult) => void;
  onCouponRemoved?: () => void;
  appliedCoupon?: CouponValidationResult | null;
  className?: string;
}

export default function CouponInput({
  orderAmount,
  onCouponApplied,
  onCouponRemoved,
  appliedCoupon,
  className = '',
}: CouponInputProps) {
  const { user } = useAuth();
  const [couponCode, setCouponCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<CouponValidationResult | null>(null);

  const handleApply = async () => {
    if (!user) {
      alert('Debes iniciar sesión para usar cupones');
      return;
    }

    if (!couponCode.trim()) {
      alert('Ingresa un código de cupón');
      return;
    }

    setValidating(true);
    setValidationResult(null);

    try {
      const result = await CouponService.validateCoupon(
        couponCode.trim(),
        user.id,
        orderAmount
      );

      setValidationResult(result);

      if (result.valid) {
        setCouponCode('');
        onCouponApplied?.(result);
      }
    } catch (error: any) {
      setValidationResult({
        valid: false,
        discount_amount: 0,
        message: error.message || 'Error al validar el cupón',
      });
    } finally {
      setValidating(false);
    }
  };

  const handleRemove = () => {
    setCouponCode('');
    setValidationResult(null);
    onCouponRemoved?.();
  };

  if (appliedCoupon?.valid) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Cupón aplicado: {appliedCoupon.coupon_id}
              </p>
              <p className="text-xs text-green-600">
                Descuento: {appliedCoupon.discount_amount.toLocaleString('es-PY')} Gs.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="text-green-700 hover:text-green-800"
          >
            Remover
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        Código de Cupón
      </label>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={couponCode}
            onChange={(e) => {
              setCouponCode(e.target.value.toUpperCase());
              setValidationResult(null);
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApply();
              }
            }}
            placeholder="Ingresa el código del cupón"
            className="pl-10"
            disabled={validating}
          />
        </div>
        <Button
          onClick={handleApply}
          disabled={validating || !couponCode.trim()}
          variant="outline"
        >
          {validating ? (
            <LoadingSpinner size="sm" className="mr-2" />
          ) : (
            'Aplicar'
          )}
        </Button>
      </div>

      {validationResult && !validationResult.valid && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <XCircle className="w-4 h-4" />
          <span>{validationResult.message}</span>
        </div>
      )}

      {validationResult && validationResult.valid && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span>
            Cupón válido. Descuento: {validationResult.discount_amount.toLocaleString('es-PY')} Gs.
          </span>
        </div>
      )}
    </div>
  );
}

