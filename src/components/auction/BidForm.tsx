'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Zap, ShoppingCart, Gavel, Crown, Lock } from 'lucide-react';
import { placeBid, buyNow, calculateMinBidIncrement } from '@/lib/services/auctionService';
import { getSessionWithTimeout } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { getSyncedNow } from '@/lib/utils/timeSync';
import { getUserBidLimit, type UserBidLimit } from '@/lib/services/membershipService';
import Link from 'next/link';

interface BidFormProps {
  productId: string;
  currentBid: number;
  minBidIncrement?: number;
  buyNowPrice?: number;
  sellerId: string;
  onBidPlaced?: () => void;
  onBuyNow?: () => void;
  auctionEndAt?: string; // Fecha de fin de subasta (ISO string)
  isAuctionEnded?: boolean; // Si la subasta ya terminó
}

export default function BidForm({
  productId,
  currentBid,
  minBidIncrement,
  buyNowPrice,
  sellerId,
  onBidPlaced,
  onBuyNow,
  auctionEndAt,
  isAuctionEnded = false,
}: BidFormProps) {
  const [bidAmount, setBidAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [bidLimit, setBidLimit] = useState<UserBidLimit | null>(null);
  const [checkingMembership, setCheckingMembership] = useState(true);

  // Calcular incremento mínimo sugerido
  const calculatedMinIncrement = minBidIncrement || calculateMinBidIncrement(currentBid);
  const suggestedBid = currentBid + calculatedMinIncrement;
  const minBid = suggestedBid;

  // Calcular tiempo restante usando tiempo sincronizado
  useEffect(() => {
    if (!auctionEndAt || isAuctionEnded) {
      setRemainingMs(0);
      return;
    }

    const updateRemaining = () => {
      const endAtMs = new Date(auctionEndAt).getTime();
      const syncedNow = getSyncedNow();
      const remaining = Math.max(0, endAtMs - syncedNow);
      setRemainingMs(remaining);
    };

    // Actualizar inmediatamente
    updateRemaining();

    // Actualizar cada segundo
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [auctionEndAt, isAuctionEnded]);

  // Determinar si la subasta terminó según tiempo sincronizado
  const isTimeExpired = remainingMs <= 0;
  const isDisabled = isAuctionEnded || isTimeExpired;

  useEffect(() => {
    // Obtener usuario actual y verificar membresía
    const loadUser = async () => {
      try {
        const { data: session } = await getSessionWithTimeout();
        if (session?.session?.user?.id) {
          setUserId(session.session.user.id);
          
          // Verificar límite de puja (membresía)
          try {
            const limit = await getUserBidLimit(session.session.user.id);
            setBidLimit(limit);
          } catch (err) {
            console.error('Error verificando membresía:', err);
            // Si falla, asumir que no puede pujar por seguridad
            setBidLimit({
              can_bid: false,
              membership_level: 'free',
              bid_limit: null,
              bid_limit_formatted: '0',
              membership_expires_at: null,
              message: 'Error al verificar membresía',
            });
          }
        } else {
          setBidLimit(null);
        }
      } catch (err) {
        console.error('Error cargando usuario:', err);
        setBidLimit(null);
      } finally {
        setCheckingMembership(false);
      }
    };
    loadUser();
  }, []);

  // Verificar si el usuario es el vendedor
  const isSeller = userId === sellerId;
  
  // Verificar si el usuario puede pujar (membresía)
  const canBid = bidLimit?.can_bid ?? false;
  const membershipMessage = bidLimit?.message;
  const membershipLevel = bidLimit?.membership_level;
  const requiresMembership = userId && !canBid && !isSeller;

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

    // Validar que la subasta siga activa usando tiempo sincronizado
    if (isTimeExpired) {
      setError('La subasta ya ha finalizado');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Generar idempotency key para prevenir pujas duplicadas en caso de retry
      const idempotencyKey = crypto.randomUUID();
      const result = await placeBid(productId, userId, amount, idempotencyKey);
      
      if (result.success) {
        setSuccess(true);
        setBidAmount('');
        
        // Si hay retry_after, mostrar mensaje informativo
        if (result.retry_after) {
          setTimeout(() => {
            setError(`Puedes intentar de nuevo en ${result.retry_after} segundos`);
          }, 2000);
        }
        
        if (onBidPlaced) {
          onBidPlaced();
        }
        // Ocultar mensaje de éxito después de 3 segundos
        setTimeout(() => setSuccess(false), 3000);
      } else {
        // Manejar diferentes tipos de errores
        let errorMessage = result.error || 'Error al colocar la puja';
        
        // Si es error AUCTION_ENDED, forzar refresh del estado
        if ((result as any).error_code === 'AUCTION_ENDED' || errorMessage.includes('finalizado')) {
          errorMessage = 'La subasta ya ha finalizado';
          // Forzar refresh del estado de la subasta
          if (onBidPlaced) {
            onBidPlaced(); // Esto debería recargar el estado
          }
        }
        
        // Si hay retry_after, agregar información
        if (result.retry_after) {
          errorMessage += ` (Intenta de nuevo en ${result.retry_after} segundos)`;
        }
        
        setError(errorMessage);
        
        // Si es error de rate limit, mantener el monto para que el usuario pueda intentar después
        if (result.error?.includes('límite') || result.error?.includes('rate limit')) {
          // No limpiar el monto
        } else {
          // Para otros errores, limpiar el monto
          setBidAmount('');
        }
      }
    } catch (err: any) {
      // Manejar errores de red o inesperados
      let errorMessage = err.message || 'Error inesperado al colocar la puja';
      
      // Si es error de conexión, dar mensaje más claro
      if (err.message?.includes('fetch') || err.message?.includes('network')) {
        errorMessage = 'Error de conexión. Verifica tu internet e intenta de nuevo.';
      }
      
      setError(errorMessage);
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

  // Mostrar mensaje de membresía si no puede pujar
  if (checkingMembership) {
    return (
      <div className="rounded-lg border p-4 bg-muted/50">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="text-sm text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (requiresMembership) {
    return (
      <div className="rounded-lg border-2 border-amber-300 p-6 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lock className="h-6 w-6 text-amber-600" />
            <h3 className="text-lg font-bold text-amber-900">
              Membresía Requerida
            </h3>
          </div>
          
          <Alert className="bg-white border-amber-200">
            <AlertDescription className="text-amber-800">
              {membershipMessage || 
                `Esta subasta está disponible solo para miembros con membresía activa.`}
              {membershipLevel && membershipLevel !== 'free' && (
                <span className="block mt-1 text-sm">
                  Tu membresía actual: <strong>{membershipLevel.toUpperCase()}</strong>
                  {bidLimit?.membership_expired && ' (Expirada)'}
                </span>
              )}
            </AlertDescription>
          </Alert>

          <div className="pt-2">
            <Link href="/memberships">
              <Button
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold shadow-lg"
                size="lg"
              >
                <Crown className="mr-2 h-5 w-5" />
                Ver Planes de Membresía
              </Button>
            </Link>
          </div>
          
          <p className="text-xs text-amber-700 mt-2">
            Suscribite para participar en este tipo de subastas y acceder a beneficios exclusivos.
          </p>
        </div>
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
            disabled={loading || isDisabled || !bidAmount || parseFloat(bidAmount) < minBid}
            title={
              loading 
                ? 'Procesando puja...' 
                : isDisabled 
                ? 'La subasta ya ha finalizado' 
                : !bidAmount 
                ? 'Ingresa un monto' 
                : parseFloat(bidAmount) < minBid 
                ? `Monto mínimo: ${formatCurrency(minBid)}` 
                : ''
            }
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg transform transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Procesando...
              </>
            ) : isDisabled ? (
              <>
                <Gavel className="mr-2 h-5 w-5" />
                SUBASTA FINALIZADA
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

        {/* Botón Compra Ahora - Solo mostrar cuando la subasta haya terminado */}
        {buyNowPrice && isAuctionEnded && (
          <>
            {/* Si el monto ganador es menor al buy_now_price, mostrar mensaje de aprobación */}
            {currentBid < buyNowPrice ? (
              <div className="w-full p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="h-5 w-5 text-amber-600" />
                  <h3 className="font-bold text-amber-900">Monto menor a la oferta esperada</h3>
                </div>
                <p className="text-sm text-amber-800 mb-2">
                  El monto ganador ({formatCurrency(currentBid)}) es menor al precio de compra inmediata ({formatCurrency(buyNowPrice)}).
                </p>
                <p className="text-sm font-semibold text-amber-900">
                  Se espera aprobación del vendedor para confirmar la compra.
                </p>
              </div>
            ) : (
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
          </>
        )}
      </div>

      {/* Mensaje de subasta finalizada */}
      {isDisabled && !loading && (
        <Alert variant="default" className="bg-amber-50 border-amber-200">
          <AlertDescription className="text-amber-800">
            Esta subasta ya ha finalizado. No se pueden realizar más pujas.
          </AlertDescription>
        </Alert>
      )}

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

