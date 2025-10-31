'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getAuctionById, getAuctionStats, type AuctionProduct } from '@/lib/services/auctionService';
import AuctionTimer from '@/components/auction/AuctionTimer';
import BidForm from '@/components/auction/BidForm';
import BidHistory from '@/components/auction/BidHistory';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Badge from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Gavel, User, MapPin, Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import ProductImageGallery from '@/components/ProductImageGallery';

export default function AuctionDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  
  const [auction, setAuction] = useState<AuctionProduct | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastBidTime, setLastBidTime] = useState<number>(0);
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [newBidNotification, setNewBidNotification] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [relatedAuctions, setRelatedAuctions] = useState<Array<{id: string; title: string; cover_url: string | null}>>([]);
  const [serverTime, setServerTime] = useState<number>(Date.now());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [maxVersion, setMaxVersion] = useState<number>(0); // Para descartar mensajes viejos
  const [isConnected, setIsConnected] = useState<boolean>(true); // Estado de conexión WebSocket
  
  // Función para reproducir sonido (mover fuera de useEffect)
  const playBidSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn('No se pudo reproducir sonido:', error);
    }
  }, [soundEnabled]);
  
  // Función para confetti
  const triggerBidConfetti = useCallback(() => {
    const colors = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles: Array<{x: number; y: number; vx: number; vy: number; color: string}> = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    
    let animationFrame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((particle, i) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.2;
        
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        if (particle.y > canvas.height) {
          particles.splice(i, 1);
        }
      });
      
      if (particles.length > 0) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        if (document.body.contains(canvas)) {
          document.body.removeChild(canvas);
        }
      }
    };
    
    animate();
    setTimeout(() => {
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    }, 3000);
  }, []);

  useEffect(() => {
    if (productId) {
      loadAuction();
      
      // Verificar estado cada 10 segundos para activar/cerrar subastas automáticamente
      const statusCheckInterval = setInterval(() => {
        loadAuction();
      }, 10000);
      
      // Configurar suscripción en tiempo real para actualizar el timer cuando hay nuevas pujas
      const channel = supabase
        .channel(`auction-${productId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'products',
            filter: `id=eq.${productId}`,
          },
          (payload) => {
            // Recargar subasta cuando cambia
            if (payload.new) {
              const newAuction = payload.new as any;
              
              // Verificar versión para descartar mensajes viejos
              const messageVersion = newAuction.auction_version || 0;
              if (messageVersion < maxVersion) {
                console.warn('⚠️ Ignorando mensaje viejo (version:', messageVersion, '< max:', maxVersion, ')');
                return;
              }
              
              // Actualizar versión máxima vista
              if (messageVersion > maxVersion) {
                setMaxVersion(messageVersion);
              }
              
              if (newAuction.auction_end_at) {
                setLastBidTime(serverTime);
              }
              
              // Si cambió el estado, actualizar UI
              if (newAuction.auction_status) {
                console.log('🔄 Estado de subasta actualizado:', newAuction.auction_status, 'version:', messageVersion);
              }
            }
            
            loadAuction();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'auction_bids',
            filter: `product_id=eq.${productId}`,
          },
          (payload) => {
            // Nueva puja recibida - actualizar tiempo para anti-sniping
            setLastBidTime(serverTime);
            
            // Efectos de sonido y confetti
            playBidSound();
            triggerBidConfetti();
            
            // Feedback visual: mostrar notificación de nueva puja
            if (payload.new) {
              const newBid = payload.new as any;
              const bidAmount = formatCurrency(newBid.amount);
              console.log('💰 Nueva puja recibida:', bidAmount);
              setNewBidNotification(`¡Nueva puja: ${bidAmount}!`);
              // Ocultar notificación después de 5 segundos
              setTimeout(() => setNewBidNotification(null), 5000);
            }
            loadAuction();
          }
        )
        .subscribe((status) => {
          // Detectar estado de conexión
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            console.log('✅ Conectado a canal de subasta');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false);
            console.warn('⚠️ Desconectado del canal de subasta');
            // Forzar re-fetch al reconectar
            setTimeout(() => {
              loadAuction();
            }, 1000);
          }
        });
      
      // Sincronizar tiempo del servidor periódicamente
      const timeSyncInterval = setInterval(async () => {
        try {
          const { getServerTime } = await import('@/lib/utils/timeSync');
          const serverTimeNow = await getServerTime();
          setServerTime(serverTimeNow);
        } catch (err) {
          console.warn('Error sincronizando tiempo:', err);
        }
      }, 30000);

      return () => {
        clearInterval(statusCheckInterval);
        clearInterval(timeSyncInterval);
        supabase.removeChannel(channel);
      };
    }
  }, [productId, playBidSound, triggerBidConfetti]);

  const loadAuction = async () => {
    try {
      setError(null);
      
      // Obtener tiempo del servidor para sincronización
      try {
        const { getServerTime } = await import('@/lib/utils/timeSync');
        const serverTimeNow = await getServerTime();
        setServerTime(serverTimeNow);
      } catch (err) {
        console.warn('Error sincronizando tiempo del servidor:', err);
        setServerTime(Date.now());
      }
      
      const [auctionData, statsData] = await Promise.all([
        getAuctionById(productId),
        getAuctionStats(productId),
      ]);

      if (!auctionData) {
        setError('Subasta no encontrada');
        return;
      }

      // Cargar información del vendedor
      if (auctionData.seller_id) {
        try {
          console.log('🔍 Cargando información del vendedor:', auctionData.seller_id);
          const { data: seller, error: sellerError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('id', auctionData.seller_id)
            .single();
          
          if (sellerError) {
            console.error('Error al obtener perfil del vendedor:', sellerError);
            // Si el perfil no existe, crear un objeto fallback
            setSellerInfo({
              id: auctionData.seller_id,
              first_name: null,
              last_name: null,
              email: null,
            });
          } else if (seller) {
            console.log('✅ Información del vendedor cargada:', seller);
            setSellerInfo(seller);
          } else {
            // Fallback si no hay datos
            setSellerInfo({
              id: auctionData.seller_id,
              first_name: null,
              last_name: null,
              email: null,
            });
          }
        } catch (err: any) {
          console.error('Error loading seller info:', err);
          // Fallback en caso de error
          setSellerInfo({
            id: auctionData.seller_id,
            first_name: null,
            last_name: null,
            email: null,
          });
        }
      } else {
        console.warn('⚠️ Subasta sin seller_id');
        setError('Esta subasta no tiene vendedor asignado');
      }

      setAuction(auctionData);
      setStats(statsData);
      
      // Inicializar versión máxima cuando se carga la subasta
      if ((auctionData as any).auction_version !== undefined) {
        setMaxVersion((auctionData as any).auction_version);
      }
      
      // Cargar todas las imágenes del producto
      const { data: imagesData, error: imagesError } = await supabase
        .from('product_images')
        .select('url')
        .eq('product_id', productId)
        .order('idx', { ascending: true });
      
      if (!imagesError && imagesData && imagesData.length > 0) {
        const imageUrls = imagesData.map(img => img.url).filter(Boolean);
        setProductImages(imageUrls);
        console.log('📸 Imágenes cargadas:', imageUrls.length);
      } else {
        // Fallback a cover_url si no hay imágenes en product_images
        const fallbackImages = auctionData.cover_url ? [auctionData.cover_url] : [];
        setProductImages(fallbackImages);
        console.log('⚠️ Usando cover_url como fallback');
      }
      
      // Cargar subastas relacionadas (siguientes/anteriores) para navegación
      try {
        const { data: relatedData, error: relatedError } = await supabase
          .from('products')
          .select('id, title, cover_url')
          .eq('sale_type', 'auction')
          .not('seller_id', 'is', null)
          .or('status.is.null,status.eq.active,status.eq.paused')
          .neq('id', productId)
          .order('auction_end_at', { ascending: true, nullsFirst: false })
          .limit(10);
        
        if (!relatedError && relatedData) {
          setRelatedAuctions(relatedData.map((a: any) => ({
            id: a.id,
            title: a.title,
            cover_url: a.cover_url
          })));
          console.log('🔗 Subastas relacionadas cargadas:', relatedData.length);
        }
      } catch (relatedErr) {
        console.error('Error cargando subastas relacionadas:', relatedErr);
      }
      
    } catch (err: any) {
      console.error('Error loading auction:', err);
      setError(err.message || 'Error al cargar la subasta');
    } finally {
      setLoading(false);
    }
  };

  const handleBidPlaced = () => {
    // Recargar subasta y actualizar timer
    loadAuction();
    setLastBidTime(serverTime);
  };

  const handleBuyNow = () => {
    // Recargar para mostrar estado actualizado
    loadAuction();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando subasta...</p>
        </div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-lg font-semibold text-red-600 mb-2">
            {error || 'Subasta no encontrada'}
          </p>
          <Link href="/auctions" className="text-primary underline">
            ← Volver a subastas
          </Link>
        </div>
      </div>
    );
  }

  const isActive = auction.auction_status === 'active';
  const isScheduled = auction.auction_status === 'scheduled';
  const isEnded = auction.auction_status === 'ended' || auction.auction_status === 'cancelled';
  const currentBid = auction.current_bid || auction.price;
  
  // Calcular tiempo para el timer usando tiempo sincronizado del servidor
  let endAtMs = 0;
  let startAtMs = 0;
  const serverNowMs = serverTime;
  
  // Para subastas activas, mostrar tiempo hasta el fin
  if (auction.auction_end_at && !isEnded) {
    const endDate = new Date(auction.auction_end_at);
    endAtMs = endDate.getTime();
  }
  
  // Para subastas programadas, mostrar tiempo hasta el inicio
  // O también si no está activa pero tiene fecha de inicio
  if (auction.auction_start_at && (isScheduled || (!isActive && !isEnded))) {
    const startDate = new Date(auction.auction_start_at);
    startAtMs = startDate.getTime();
    // Solo mostrar si la fecha es en el futuro
    if (startAtMs <= serverNowMs) {
      startAtMs = 0; // Ya pasó, no mostrar
    }
  }
  
  // Debug: log de valores para verificar
  console.log('🕐 Timer Debug:', {
    status: auction.auction_status,
    isActive,
    isScheduled,
    isEnded,
    auction_start_at: auction.auction_start_at,
    auction_end_at: auction.auction_end_at,
    startAtMs,
    endAtMs,
    startAtDate: startAtMs > 0 ? new Date(startAtMs).toISOString() : null,
    endAtDate: endAtMs > 0 ? new Date(endAtMs).toISOString() : null,
  });

  // Encontrar índice de subasta actual en las relacionadas
  const currentAuctionIndex = relatedAuctions.findIndex(a => a.id === productId);
  const prevAuction = currentAuctionIndex > 0 ? relatedAuctions[currentAuctionIndex - 1] : null;
  const nextAuction = currentAuctionIndex >= 0 && currentAuctionIndex < relatedAuctions.length - 1 
    ? relatedAuctions[currentAuctionIndex + 1] 
    : relatedAuctions.length > 0 && currentAuctionIndex === -1 
      ? relatedAuctions[0] 
      : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notificación de nueva puja */}
      {newBidNotification && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
          <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 border-2 border-white">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <p className="font-bold">{newBidNotification}</p>
          </div>
        </div>
      )}

      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/auctions"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a subastas
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna izquierda: Imágenes y detalles del producto */}
          <div className="lg:col-span-2 space-y-6">
            {/* Título y estado del lote - Mejorado estéticamente */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-200 p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{auction.title}</h1>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant={isActive ? 'success' : isEnded ? 'secondary' : 'warning'} size="lg">
                      {isActive ? 'ACTIVA' : isEnded ? 'FINALIZADA' : 'PROGRAMADA'}
                    </Badge>
                    {auction.reserve_price && (
                      <Badge variant="warning" size="md">
                        Con Reserva
                      </Badge>
                    )}
                    {!auction.reserve_price && (
                      <Badge variant="secondary" size="md">
                        Sin Reserva
                      </Badge>
                    )}
                  </div>
                </div>
                {/* Número de lote simulado */}
                <div className="text-right">
                  <p className="text-sm text-gray-500">Lote</p>
                  <p className="text-xl font-bold text-gray-900">#{auction.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>

              {/* Información clave del lote */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Precio inicial</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(auction.attributes?.auction?.starting_price || auction.price)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Pujas</p>
                  <p className="font-semibold text-gray-900">{auction.total_bids || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Condición</p>
                  <p className="font-semibold text-gray-900 capitalize">
                    {auction.condition === 'nuevo' ? 'Nuevo' : 
                     auction.condition === 'usado_como_nuevo' ? 'Usado como nuevo' : 'Usado'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Categoría</p>
                  <p className="font-semibold text-gray-900">Producto</p>
                </div>
              </div>
            </div>

            {/* Galería de imágenes mejorada */}
            <Card className="overflow-hidden shadow-lg border-2 border-gray-200">
              <CardContent className="p-0 bg-white">
                {productImages.length > 0 ? (
                  <ProductImageGallery images={productImages} title={auction.title} />
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <div className="text-center">
                      <Gavel className="h-24 w-24 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">Sin imágenes disponibles</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Descripción y detalles - Mejorado */}
            <Card className="shadow-lg border-2 border-gray-200 hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
                <CardTitle className="text-xl text-gray-900">Descripción</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {auction.description ? (
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed text-base">
                      {auction.description}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-center py-4">Sin descripción disponible</p>
                )}
              </CardContent>
            </Card>

            {/* Información del vendedor - Mejorado */}
            <Card className="shadow-lg border-2 border-gray-200 hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b">
                <CardTitle className="text-xl flex items-center gap-2 text-gray-900">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <User className="h-5 w-5 text-purple-600" />
                  </div>
                  Información del Vendedor
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {sellerInfo ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                        <User className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {sellerInfo.first_name || sellerInfo.last_name
                            ? `${sellerInfo.first_name || ''} ${sellerInfo.last_name || ''}`.trim()
                            : sellerInfo.email 
                            ? sellerInfo.email.split('@')[0] 
                            : `Vendedor ${sellerInfo.id.slice(0, 8)}`}
                        </p>
                        {sellerInfo.email ? (
                          <p className="text-sm text-gray-500">{sellerInfo.email}</p>
                        ) : (
                          <p className="text-xs text-gray-400">ID: {sellerInfo.id.slice(0, 8)}...</p>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/seller/${sellerInfo.id}`}
                      className="inline-block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Ver perfil del vendedor →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-500">Cargando información del vendedor...</p>
                    <p className="text-xs text-gray-400">Si persiste, el vendedor puede no existir</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Columna derecha: Área de pujas destacada */}
          <div className="space-y-6">
            {/* Timer prominente - SIEMPRE visible - Mejorado estéticamente */}
            {(!isEnded && (endAtMs > 0 || startAtMs > 0)) && (
              <Card className="border-2 border-blue-500 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 opacity-10 animate-pulse"></div>
                <CardContent className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
                      <p className="text-sm font-bold text-blue-900 uppercase tracking-wide">
                        {isActive ? '⏱️ TIEMPO RESTANTE' : '⏰ INICIA EN'}
                      </p>
                      <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
                    </div>
                    {isActive && endAtMs > 0 ? (
                      <div className="relative">
                        <AuctionTimer
                          endAtMs={endAtMs}
                          serverNowMs={serverNowMs}
                          variant="full"
                          size="xl"
                          lastBidAtMs={lastBidTime}
                          onExpire={() => {
                            if (soundEnabled) {
                              // Sonido de finalización
                              try {
                                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                                const oscillator = audioContext.createOscillator();
                                const gainNode = audioContext.createGain();
                                oscillator.connect(gainNode);
                                gainNode.connect(audioContext.destination);
                                oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
                                oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3);
                                gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
                                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                                oscillator.start(audioContext.currentTime);
                                oscillator.stop(audioContext.currentTime + 0.3);
                              } catch (e) {}
                            }
                            loadAuction();
                          }}
                        />
                      </div>
                    ) : startAtMs > 0 ? (
                      <AuctionTimer
                        endAtMs={startAtMs}
                        serverNowMs={serverNowMs}
                        variant="full"
                        size="xl"
                        onExpire={() => {
                          loadAuction();
                        }}
                      />
                    ) : (
                      <div className="text-blue-900">
                        <p className="text-sm">Esperando fecha de inicio...</p>
                      </div>
                    )}
                    {/* Toggle de sonido */}
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className="mt-3 text-xs text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1 mx-auto"
                      title={soundEnabled ? 'Sonido activado' : 'Sonido desactivado'}
                    >
                      {soundEnabled ? '🔊' : '🔇'} {soundEnabled ? 'Sonido ON' : 'Sonido OFF'}
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Mostrar mensaje si no hay fechas configuradas */}
            {!isEnded && endAtMs === 0 && startAtMs === 0 && (
              <Card className="border-2 border-yellow-400 shadow-lg">
                <CardContent className="p-6 bg-yellow-50">
                  <div className="text-center">
                    <p className="text-sm font-medium text-yellow-900 mb-2">
                      ⚠️ Subasta Programada
                    </p>
                    <p className="text-xs text-yellow-700">
                      Las fechas de inicio aún no están configuradas
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Estado finalizado */}
            {isEnded && (
              <Card className="border-2 border-gray-300">
                <CardContent className="p-6 text-center bg-gray-50">
                  <Badge variant="secondary" size="lg" className="mb-4">
                    Subasta Finalizada
                  </Badge>
                  {auction.winner_id && (
                    <p className="text-sm text-gray-600">
                      Ganador asignado
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Área de pujas - Estilo tipo Copart/IAA */}
            {isActive && (
              <Card className="border-2 border-purple-500 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                  <CardTitle className="text-xl text-center">ZONA DE PUJAS</CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-white">
                  {/* Precio actual en círculo grande - Actualiza en tiempo real */}
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div 
                        className={`w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-xl border-4 border-white transition-all duration-300 ${
                          newBidNotification ? 'animate-pulse scale-110' : ''
                        }`}
                      >
                        <div className="text-center text-white">
                          <p className="text-xs font-medium opacity-90 mb-1">PUJA ACTUAL</p>
                          <p className="text-2xl font-bold transition-all">
                            {formatCurrency(currentBid).split(' ')[0]}
                          </p>
                          <p className="text-xs mt-1">Gs.</p>
                        </div>
                      </div>
                      {auction.total_bids > 0 && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold shadow-lg animate-bounce">
                          {auction.total_bids}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Incremento mínimo visible */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-900 font-medium">Incremento mínimo:</span>
                      <span className="text-blue-900 font-bold">
                        {formatCurrency(auction.min_bid_increment || 1000)}
                      </span>
                    </div>
                  </div>

                  {/* Indicador de conexión */}
                  {!isConnected && (
                    <Alert variant="warning" className="mb-4">
                      <AlertDescription className="flex items-center gap-2">
                        <Clock className="h-4 w-4 animate-pulse" />
                        Reconectando... Las pujas están deshabilitadas temporalmente.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Formulario de puja */}
                  <div className={isConnected ? '' : 'opacity-50 pointer-events-none'}>
                    <BidForm
                      productId={productId}
                      currentBid={currentBid}
                      minBidIncrement={auction.min_bid_increment}
                      buyNowPrice={auction.buy_now_price}
                      sellerId={auction.seller_id}
                      onBidPlaced={handleBidPlaced}
                      onBuyNow={handleBuyNow}
                    />
                  </div>

                  {/* Compra ahora destacada */}
                  {auction.buy_now_price && (
                    <div className="mt-6 pt-6 border-t">
                      <div className="text-center mb-4">
                        <p className="text-sm text-gray-600 mb-2">Compra Inmediata</p>
                        <p className="text-2xl font-bold text-emerald-600">
                          {formatCurrency(auction.buy_now_price)}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Historial de pujas */}
            <Card>
              <CardContent className="p-6">
                <BidHistory productId={productId} realtime={true} />
              </CardContent>
            </Card>

            {/* Información adicional del lote */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información del Lote</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Estado:</span>
                  <Badge variant={isActive ? 'success' : isEnded ? 'secondary' : 'warning'} size="sm">
                    {isActive ? 'Activa' : isEnded ? 'Finalizada' : 'Programada'}
                  </Badge>
                </div>
                {auction.auction_start_at && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Inicio:</span>
                    <span className="text-sm font-medium">
                      {new Date(auction.auction_start_at).toLocaleString('es-PY')}
                    </span>
                  </div>
                )}
                {auction.auction_end_at && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Finaliza:</span>
                    <span className="text-sm font-medium">
                      {new Date(auction.auction_end_at).toLocaleString('es-PY')}
                    </span>
                  </div>
                )}
                {auction.reserve_price && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Precio de reserva:</span>
                    <span className="text-sm font-semibold text-orange-600">
                      {formatCurrency(auction.reserve_price)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navegación entre subastas - Parte inferior */}
        {(prevAuction || nextAuction) && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between gap-4">
              {/* Subasta Anterior */}
              {prevAuction && (
                <Link
                  href={`/auctions/${prevAuction.id}`}
                  className="flex-1 group bg-white rounded-lg shadow-md hover:shadow-xl border-2 border-gray-200 hover:border-blue-500 transition-all overflow-hidden"
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      {prevAuction.cover_url ? (
                        <Image
                          src={prevAuction.cover_url}
                          alt={prevAuction.title}
                          width={96}
                          height={96}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <Gavel className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <ChevronLeft className="h-4 w-4" />
                        <span className="font-medium">Anterior</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {prevAuction.title}
                      </h3>
                    </div>
                  </div>
                </Link>
              )}
              
              {/* Spacer si solo hay una dirección */}
              {!prevAuction && <div className="flex-1" />}
              {!nextAuction && <div className="flex-1" />}

              {/* Subasta Siguiente */}
              {nextAuction && (
                <Link
                  href={`/auctions/${nextAuction.id}`}
                  className="flex-1 group bg-white rounded-lg shadow-md hover:shadow-xl border-2 border-gray-200 hover:border-blue-500 transition-all overflow-hidden"
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center justify-end gap-2 text-gray-500 text-sm mb-1">
                        <span className="font-medium">Siguiente</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {nextAuction.title}
                      </h3>
                    </div>
                    <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      {nextAuction.cover_url ? (
                        <Image
                          src={nextAuction.cover_url}
                          alt={nextAuction.title}
                          width={96}
                          height={96}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <Gavel className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Subastas Relacionadas - Grid */}
        {relatedAuctions.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Más Subastas</h2>
              <p className="text-gray-600">Explora otras subastas disponibles</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedAuctions.slice(0, 8).map((related) => (
                <Link
                  key={related.id}
                  href={`/auctions/${related.id}`}
                  className="group bg-white rounded-lg shadow-md hover:shadow-xl border-2 border-gray-200 hover:border-blue-500 transition-all overflow-hidden"
                >
                  <div className="aspect-square relative overflow-hidden bg-gray-100">
                    {related.cover_url ? (
                      <Image
                        src={related.cover_url}
                        alt={related.title}
                        width={300}
                        height={300}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <Gavel className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                      <Gavel className="h-3 w-3" />
                      SUBASTA
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {related.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

