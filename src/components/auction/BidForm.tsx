'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Zap, ShoppingCart, Gavel } from 'lucide-react';
import { placeBid, buyNow, calculateMinBidIncrement } from '@/lib/services/auctionService';
import { getSessionWithTimeout } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';

interface BidFormProps {
  productId: string;
  currentBid: number;
  minBidIncrement?: number;
  buyNowPrice?: number;
  sellerId: string;
  onBidPlaced?: () => void;
  onBuyNow?: () => void;
}

export default function BidForm({
  productId,
  currentBid,
  minBidIncrement,
  buyNowPrice,
  sellerId,
  onBidPlaced,
  onBuyNow,
}: BidFormProps) {
  const [bidAmount, setBidAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Calcular incremento mínimo sugerido
  const calculatedMinIncrement = minBidIncrement || calculateMinBidIncrement(currentBid);
  const suggestedBid = currentBid + calculatedMinIncrement;
  const minBid = suggestedBid;

  useEffect(() => {
    // Obtener usuario actual
    const loadUser = async () => {
      const { data: session } = await getSessionWithTimeout();
      if (session?.session?.user?.id) {
        setUserId(session.session.user.id);
      }
    };
    loadUser();
  }, []);

  // Verificar si el usuario es el vendedor
  const isSeller = userId === sellerId;

  const handleQuickBid = (amount: number) => {
    setBidAmount(amount.toString());
    setError(null);
  };

  const handlePlaceBid = async () => {
    if (!userId) {
      setError('Debes iniciar sesión para pujar');
      return;
    }

    if (isSeller) {
      setError('No puedes pujar en tus propias subastas');
      return;
    }

    const amount = parseFloat(bidAmount);
    
    if (isNaN(amount) || amount <= 0) {
      setError('Ingresa un monto válido');
      return;
    }

    if (amount < minBid) {
      setError(`El monto mínimo es ${formatCurrency(minBid)}`);
      return;
    }

    // Validar que la subasta siga activa (verificación en tiempo real)
    try {
      const { data: auctionCheck } = await supabase
        .from('products')
        .select('auction_status, auction_end_at')
        .eq('id', productId)
        .single();
      
      if (auctionCheck) {
        type AuctionCheckType = { auction_status: string; auction_end_at?: string };
        const auction = auctionCheck as AuctionCheckType;
        
        if (auction.auction_status !== 'active') {
          setError('Esta subasta ya no está activa');
          return;
        }
        
        // Verificar que no haya terminado
        if (auction.auction_end_at) {
          const endDate = new Date(auction.auction_end_at);
          if (endDate <= new Date()) {
            setError('Esta subasta ya ha finalizado');
            return;
          }
        }
      }
    } catch (checkErr) {
      console.warn('Error verificando estado de subasta:', checkErr);
      // Continuar de todos modos
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await placeBid(productId, userId, amount);
      
      if (result.success) {
        setSuccess(true);
        setBidAmount('');
        if (onBidPlaced) {
          onBidPlaced();
        }
        // Ocultar mensaje de éxito después de 3 segundos
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || 'Error al colocar la puja');
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado al colocar la puja');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (!userId) {
      setError('Debes iniciar sesión para comprar');
      return;
    }

    if (isSeller) {
      setError('No puedes comprar tus propias subastas');
      return;
    }

    if (!buyNowPrice) {
      setError('Esta subasta no tiene opción de compra inmediata');
      return;
    }

    if (!confirm(`¿Confirmas la compra inmediata por ${formatCurrency(buyNowPrice)}?`)) {
      return;
    }

    setBuyNowLoading(true);
    setError(null);

    try {
      const result = await buyNow(productId, userId);
      
      if (result.success) {
        if (onBuyNow) {
          onBuyNow();
        }
        // Redirigir o mostrar mensaje de éxito
        alert('¡Compra realizada con éxito!');
      } else {
        setError(result.error || 'Error al realizar la compra');
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
    } finally {
      setBuyNowLoading(false);
    }
  };

  if (isSeller) {
    return (
      <div className="rounded-lg border p-4 bg-muted/50">
        <p className="text-sm text-muted-foreground text-center">
          Esta es tu subasta. No puedes pujar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Precio actual y sugerencia */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Puja actual:</span>
          <span className="text-lg font-bold text-primary">
            {formatCurrency(currentBid)}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>Incremento mínimo:</span>
          <span>{formatCurrency(calculatedMinIncrement)}</span>
        </div>
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>Puja mínima sugerida:</span>
          <span className="font-semibold text-foreground">
            {formatCurrency(suggestedBid)}
          </span>
        </div>
      </div>

      {/* Formulario de puja */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="bid-amount">Monto de tu puja</Label>
          <Input
            id="bid-amount"
            type="number"
            placeholder={suggestedBid.toString()}
            value={bidAmount}
            onChange={(e) => {
              setBidAmount(e.target.value);
              setError(null);
            }}
            min={minBid}
            step={calculatedMinIncrement}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Puja mínima: {formatCurrency(minBid)}
          </p>
        </div>

        {/* Botones rápidos */}
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickBid(suggestedBid)}
            className="flex-1"
          >
            Puja mínima
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickBid(suggestedBid + calculatedMinIncrement)}
            className="flex-1"
          >
            +{formatCurrency(calculatedMinIncrement)}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickBid(suggestedBid + calculatedMinIncrement * 2)}
            className="flex-1"
          >
            +{formatCurrency(calculatedMinIncrement * 2)}
          </Button>
        </div>

        {/* Botones principales grandes - Estilo Copart/IAA */}
        <div className="space-y-3 pt-2">
          {/* Botón BID principal */}
          <Button
            onClick={handlePlaceBid}
            disabled={loading || !bidAmount || parseFloat(bidAmount) < minBid}
            title={loading ? 'Procesando puja...' : !bidAmount ? 'Ingresa un monto' : parseFloat(bidAmount) < minBid ? `Monto mínimo: ${formatCurrency(minBid)}` : ''}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg transform transition-all hover:scale-105"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Gavel className="mr-2 h-5 w-5" />
                BID
              </>
            )}
          </Button>

          {/* Botón MAX BID */}
          <Button
            type="button"
            variant="outline"
            onClick={() => handleQuickBid(suggestedBid + calculatedMinIncrement * 5)}
            className="w-full h-12 text-base font-semibold border-2 border-purple-600 text-purple-700 hover:bg-purple-50"
            size="lg"
          >
            <Zap className="mr-2 h-4 w-4" />
            MAX BID
          </Button>
        </div>

        {/* Botón Compra Ahora */}
        {buyNowPrice && (
          <Button
            onClick={handleBuyNow}
            disabled={buyNowLoading}
            variant="primary"
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            size="lg"
          >
            {buyNowLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Compra Ahora - {formatCurrency(buyNowPrice)}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Mensajes de error y éxito */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-emerald-500 bg-emerald-50">
          <AlertDescription className="text-emerald-800">
            ¡Puja colocada exitosamente!
          </AlertDescription>
        </Alert>
      )}

      {!userId && (
        <Alert>
          <AlertDescription>
            <a href="/auth/login" className="underline">
              Inicia sesión
            </a>{' '}
            para pujar en esta subasta.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

