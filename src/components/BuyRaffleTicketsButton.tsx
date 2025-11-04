'use client';

// ============================================
// MERCADITO ONLINE PY - COMPRAR CUPONES DE SORTEO
// Componente para comprar cupones directamente
// ============================================

import { useState } from 'react';
import { Ticket, Plus, Minus, ShoppingCart } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface BuyRaffleTicketsButtonProps {
  raffleId: string;
  ticketPrice: number;
  maxTicketsPerUser?: number | null;
  currentUserTickets?: number;
  onPurchaseComplete?: () => void;
}

export default function BuyRaffleTicketsButton({
  raffleId,
  ticketPrice,
  maxTicketsPerUser,
  currentUserTickets = 0,
  onPurchaseComplete,
}: BuyRaffleTicketsButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const maxAllowed = maxTicketsPerUser 
    ? Math.max(0, maxTicketsPerUser - currentUserTickets)
    : 999;

  const totalPrice = quantity * ticketPrice;

  async function handlePurchase() {
    if (quantity <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    if (maxTicketsPerUser && (currentUserTickets + quantity) > maxTicketsPerUser) {
      alert(`Solo puedes tener máximo ${maxTicketsPerUser} tickets en este sorteo`);
      return;
    }

    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        alert('Debes iniciar sesión para comprar cupones');
        return;
      }

      // Verificar que el sorteo permite compra directa
      const { data: raffle, error: raffleError } = await supabase
        .from('raffles')
        .select('allow_direct_purchase, ticket_price, status, is_enabled')
        .eq('id', raffleId)
        .single();

      if (raffleError || !raffle) {
        throw new Error('Sorteo no encontrado');
      }

      if (!raffle.allow_direct_purchase) {
        throw new Error('Este sorteo no permite compra directa de cupones');
      }

      if (raffle.status !== 'active' || !raffle.is_enabled) {
        throw new Error('Este sorteo no está activo');
      }

      if (raffle.ticket_price !== ticketPrice) {
        throw new Error('El precio del cupón ha cambiado. Por favor recarga la página.');
      }

      // Crear orden para la compra de cupones
      // Por ahora, creamos tickets directamente (en producción, deberías crear una orden primero)
      const ticketsToCreate: Array<{
        raffle_id: string;
        user_id: string;
        ticket_number: string;
        ticket_type: string;
        purchase_amount: number;
      }> = [];
      const userId = session.user.id;

      // Obtener siguiente número de secuencia
      const { data: lastTickets } = await supabase
        .from('raffle_tickets')
        .select('ticket_number')
        .eq('raffle_id', raffleId)
        .order('created_at', { ascending: false })
        .limit(1);

      let sequence = 1;
      if (lastTickets && lastTickets.length > 0 && lastTickets[0]?.ticket_number) {
        const match = lastTickets[0].ticket_number.match(/RAFFLE-[A-Z0-9]+-([0-9]+)$/);
        if (match) {
          sequence = parseInt(match[1], 10) + 1;
        }
      }

      // Generar tickets con números únicos
      const raffleShortId = raffleId.replace(/-/g, '').substring(0, 8).toUpperCase();
      for (let i = 0; i < quantity; i++) {
        const ticketNumber = `RAFFLE-${raffleShortId}-${String(sequence + i).padStart(6, '0')}`;
        
        ticketsToCreate.push({
          raffle_id: raffleId,
          user_id: userId,
          ticket_number: ticketNumber,
          ticket_type: 'manual',
          purchase_amount: ticketPrice,
        });
      }

      // Insertar tickets
      const { error: insertError } = await supabase
        .from('raffle_tickets')
        .insert(ticketsToCreate);

      if (insertError) {
        // Si hay error de duplicado, intentar con números diferentes
        if (insertError.code === '23505') {
        // Regenerar números con timestamp para evitar duplicados
        const retrySequence = Date.now();
        const retryTickets: Array<{
          raffle_id: string;
          user_id: string;
          ticket_number: string;
          ticket_type: string;
          purchase_amount: number;
        }> = [];
        const raffleShortId = raffleId.replace(/-/g, '').substring(0, 8).toUpperCase();
        for (let i = 0; i < quantity; i++) {
          const ticketNumber = `RAFFLE-${raffleShortId}-${String(retrySequence + i).padStart(6, '0')}`;
          retryTickets.push({
            raffle_id: raffleId,
            user_id: userId,
            ticket_number: ticketNumber,
            ticket_type: 'manual',
            purchase_amount: ticketPrice,
          });
        }
          
          const { error: retryError } = await supabase
            .from('raffle_tickets')
            .insert(retryTickets);

          if (retryError) throw retryError;
        } else {
          throw insertError;
        }
      }

      alert(`✅ Has comprado ${quantity} cupón${quantity > 1 ? 'es' : ''} exitosamente!`);
      setQuantity(1);
      
      if (onPurchaseComplete) {
        onPurchaseComplete();
      }
    } catch (err: any) {
      console.error('Error purchasing tickets:', err);
      alert(`Error: ${err.message || 'Error al comprar cupones'}`);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
      <h3 className="font-semibold text-purple-900 flex items-center gap-2">
        <Ticket className="w-5 h-5" />
        Comprar Cupones
      </h3>

      <div className="space-y-3">
        {/* Selector de cantidad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cantidad de cupones
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minus className="w-5 h-5" />
            </button>
            <input
              type="number"
              min="1"
              max={maxAllowed}
              value={quantity}
              onChange={(e) => {
                const val = Math.max(1, Math.min(maxAllowed, parseInt(e.target.value) || 1));
                setQuantity(val);
              }}
              className="w-20 text-center border border-gray-300 rounded-lg py-2 font-medium"
            />
            <button
              type="button"
              onClick={() => setQuantity(Math.min(maxAllowed, quantity + 1))}
              disabled={quantity >= maxAllowed}
              className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {maxTicketsPerUser && (
            <p className="text-xs text-gray-500 mt-1">
              Puedes comprar hasta {maxAllowed} cupón{maxAllowed !== 1 ? 'es' : ''} más
            </p>
          )}
        </div>

        {/* Precio */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Precio por cupón:</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(ticketPrice)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="font-medium text-gray-900">Total:</span>
            <span className="text-xl font-bold text-purple-600">
              {formatCurrency(totalPrice)}
            </span>
          </div>
        </div>

        {/* Botón de compra */}
        <button
          onClick={handlePurchase}
          disabled={loading || quantity <= 0 || quantity > maxAllowed}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <ShoppingCart className="w-5 h-5" />
          {loading ? 'Comprando...' : `Comprar ${quantity} cupón${quantity > 1 ? 'es' : ''}`}
        </button>
      </div>
    </div>
  );
}

