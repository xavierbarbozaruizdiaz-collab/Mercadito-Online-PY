// src/components/PriceAlertButton.tsx
// Botón para crear alertas de precio

'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { MarketplaceFeaturesService } from '@/lib/services/marketplaceFeaturesService';
import Button from './ui/Button';
import { Bell, BellOff } from 'lucide-react';

interface PriceAlertButtonProps {
  productId: string;
  currentPrice: number;
  onAlertCreated?: () => void;
}

export default function PriceAlertButton({
  productId,
  currentPrice,
  onAlertCreated,
}: PriceAlertButtonProps) {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [showForm, setShowForm] = useState(false);

  if (!user) return null;

  const handleCreateAlert = async () => {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      alert('Ingresa un precio válido');
      return;
    }

    if (price >= currentPrice) {
      alert('El precio objetivo debe ser menor al precio actual');
      return;
    }

    setCreating(true);
    try {
      await MarketplaceFeaturesService.createPriceAlert(user.id, productId, price);
      setTargetPrice('');
      setShowForm(false);
      onAlertCreated?.();
      alert('Alerta de precio creada. Te notificaremos cuando el precio baje.');
    } catch (error: any) {
      alert(error.message || 'Error al crear la alerta');
    } finally {
      setCreating(false);
    }
  };

  if (showForm) {
    return (
      <div className="p-4 border rounded-lg bg-blue-50 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio objetivo (menor a {currentPrice.toLocaleString('es-PY')} Gs.)
          </label>
          <input
            type="number"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            placeholder="Ej: 50000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            step="1"
            min="1"
            max={currentPrice - 1}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateAlert} disabled={creating} size="sm">
            {creating ? 'Creando...' : 'Crear Alerta'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowForm(false);
              setTargetPrice('');
            }}
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={() => setShowForm(true)}
      className="flex items-center gap-2"
    >
      <Bell className="w-4 h-4" />
      Alertar cuando baje el precio
    </Button>
  );
}

