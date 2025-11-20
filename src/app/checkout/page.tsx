'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CouponInput from '@/components/CouponInput';
import { CouponValidationResult } from '@/lib/services/couponService';
import { getAuctionById, type AuctionProduct } from '@/lib/services/auctionService';
import { logger } from '@/lib/utils/logger';
import toast from 'react-hot-toast';
import { useFacebookPixel } from '@/lib/services/facebookPixelService';
import { useGoogleAnalytics } from '@/lib/services/googleAnalyticsService';
import { trackBeginCheckout } from '@/lib/analytics';

type CartItem = {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    price: number;
    image_url: string | null;
  };
};

type ShippingAddress = {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  department: string;
  zipCode: string;
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auctionProductId = searchParams.get('auction');
  const checkoutType = searchParams.get('type'); // 'membership' o null
  const planId = searchParams.get('plan_id');
  const subscriptionType = searchParams.get('subscription_type') as 'monthly' | 'yearly' | 'one_time' | null;
  const membershipAmount = searchParams.get('amount');
  const facebookPixel = useFacebookPixel();
  const googleAnalytics = useGoogleAnalytics();
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [auctionProduct, setAuctionProduct] = useState<AuctionProduct | null>(null);
  const [membershipPlan, setMembershipPlan] = useState<any>(null);
  const [auctionCommissions, setAuctionCommissions] = useState<{
    buyer_commission_percent: number;
    buyer_commission_amount: number;
    buyer_total_paid: number;
    seller_commission_percent: number;
    seller_commission_amount: number;
    seller_earnings: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [address, setAddress] = useState<ShippingAddress>({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    department: '',
    zipCode: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card' | 'pagopar'>('cash');
  const [notes, setNotes] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [pagoparLoading, setPagoparLoading] = useState(false);

  useEffect(() => {
    if (checkoutType === 'membership' && planId) {
      loadMembershipPlan();
    } else if (auctionProductId) {
      loadAuctionProduct();
    } else {
      loadCartItems();
    }
  }, [checkoutType, planId, auctionProductId]);

  async function loadMembershipPlan() {
    if (!planId) return;
    
    try {
      setLoading(true);
      const { data: plan, error } = await (supabase as any)
        .from('membership_plans')
        .select('*')
        .eq('id', planId)
        .single();
      
      if (error || !plan) {
        logger.error('Error cargando plan de membresía', error);
        toast.error('Plan de membresía no encontrado');
        router.push('/memberships');
        return;
      }
      
      setMembershipPlan(plan);
      setLoading(false);
    } catch (error) {
      logger.error('Error en loadMembershipPlan', error);
      toast.error('Error cargando plan de membresía');
      router.push('/memberships');
    }
  }

  async function loadAuctionProduct() {
    if (!auctionProductId) return;
    
    try {
      setLoading(true);
      const auction = await getAuctionById(auctionProductId);
      
      if (!auction) {
        logger.warn('Subasta no encontrada en checkout', { auctionProductId });
        toast.error('Subasta no encontrada o ya no está disponible');
        router.push('/auctions');
        return;
      }

      // Verificar que la subasta terminó y el usuario es el ganador
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        toast.error('Debes iniciar sesión para continuar');
        router.push('/auth/sign-in');
        return;
      }

      // Verificar que la subasta terminó
      if (auction.auction_status !== 'ended') {
        logger.warn('Intento de checkout de subasta no finalizada', { 
          auctionProductId, 
          status: auction.auction_status
        });
        toast.error('Esta subasta aún no ha finalizado. Solo puedes pagar subastas que ya terminaron.');
        router.push(`/auctions/${auctionProductId}`);
        return;
      }
      
      // Verificar que el usuario es el ganador
      if (auction.winner_id !== session.session.user.id) {
        logger.warn('Intento de checkout de subasta ganada por otro usuario', { 
          auctionProductId,
          winnerId: auction.winner_id,
          userId: session.session.user.id
        });
        toast.error('No eres el ganador de esta subasta.');
        router.push(`/auctions/${auctionProductId}`);
        return;
      }

      // Calcular comisiones de la subasta
      if (auction.current_bid && auction.seller_id) {
        try {
          const { calculateAuctionCommissions } = await import('@/lib/services/commissionService');
          
          // Validar que current_bid es válido
          const currentBid = Number(auction.current_bid) || 0;
          if (currentBid <= 0) {
            logger.warn('current_bid inválido o cero', { 
              auctionId: auction.id, 
              current_bid: auction.current_bid 
            });
            throw new Error('Precio de subasta inválido');
          }
          
          // Obtener store_id
          let storeId: string | null = null;
          try {
            const { data: storeData, error: storeError } = await (supabase as any)
              .from('stores')
              .select('id')
              .eq('seller_id', auction.seller_id)
              .maybeSingle();
            
            if (!storeError && storeData) {
              storeId = storeData.id;
            }
          } catch (storeErr) {
            logger.warn('Error obteniendo store_id, continuando sin store', { 
              sellerId: auction.seller_id,
              error: storeErr 
            });
            // Continuar sin store_id (no es crítico)
          }
          
          const calculated = await calculateAuctionCommissions(
            currentBid,
            auction.seller_id || '',
            storeId || undefined
          );
          
          // Validar que los cálculos son válidos
          if (!calculated || calculated.buyer_total_paid <= 0) {
            logger.error('Cálculo de comisiones retornó valores inválidos', {
              calculated,
              currentBid,
              auctionId: auction.id
            });
            throw new Error('Error en cálculo de comisiones');
          }
          
          setAuctionCommissions({
            buyer_commission_percent: currentBid > 0 ? (calculated.buyer_commission_amount / currentBid * 100) : 0,
            buyer_commission_amount: calculated.buyer_commission_amount,
            buyer_total_paid: calculated.buyer_total_paid,
            seller_commission_percent: currentBid > 0 ? (calculated.seller_commission_amount / currentBid * 100) : 0,
            seller_commission_amount: calculated.seller_commission_amount,
            seller_earnings: calculated.seller_earnings,
          });
          
          // Convertir la subasta ganada en un "cart item" temporal para el checkout
          // Precio mostrado = precio subasta + comisión comprador
          const auctionAsCartItem = [{
            id: `auction-${auction.id}`,
            product_id: auction.id,
            quantity: 1,
            product: {
              id: auction.id,
              title: auction.title,
              price: calculated.buyer_total_paid, // Precio con comisión incluida
              image_url: auction.image_url || null,
            }
          }];

          setAuctionProduct(auction);
          setCartItems(auctionAsCartItem as CartItem[]);
        } catch (commError: any) {
          logger.error('Error calculating auction commissions', commError, { 
            auctionId: auction.id,
            current_bid: auction.current_bid,
            seller_id: auction.seller_id,
            errorMessage: commError?.message,
            errorStack: commError?.stack
          });
          
          // Fallback: usar precio sin comisión pero mostrar advertencia
          const fallbackPrice = Number(auction.current_bid) || Number(auction.price) || 0;
          
          if (fallbackPrice <= 0) {
            logger.error('No se puede calcular precio: current_bid y price son inválidos', {
              auctionId: auction.id,
              current_bid: auction.current_bid,
              price: auction.price
            });
            toast.error('Error al calcular el precio. Por favor, recarga la página e intenta de nuevo.');
            setLoading(false);
            return;
          }
          
          // Usar precio sin comisión como último recurso
          const auctionAsCartItem = [{
            id: `auction-${auction.id}`,
            product_id: auction.id,
            quantity: 1,
            product: {
              id: auction.id,
              title: auction.title,
              price: fallbackPrice,
              image_url: auction.image_url || null,
            }
          }];
          
          setAuctionProduct(auction);
          setCartItems(auctionAsCartItem as CartItem[]);
          
          // Mostrar advertencia pero permitir continuar
          toast('No se pudieron calcular las comisiones. Se usará el precio base de la subasta.', {
            icon: '⚠️',
            duration: 5000,
            style: {
              borderLeft: '4px solid #f59e0b',
            },
          });
        }
      } else {
        // Sin precio, usar precio base
        const auctionAsCartItem = [{
          id: `auction-${auction.id}`,
          product_id: auction.id,
          quantity: 1,
          product: {
            id: auction.id,
            title: auction.title,
            price: auction.price,
            image_url: auction.image_url || null,
          }
        }];
        setAuctionProduct(auction);
        setCartItems(auctionAsCartItem as CartItem[]);
      }
    } catch (err) {
      logger.error('Error loading auction product', err, { auctionProductId });
      toast.error('Error al cargar la subasta. Por favor, intenta de nuevo.');
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  async function loadCartItems() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        router.push('/auth/sign-in');
        return;
      }

      // Primero obtener cart items básicos
      const { data: cartData, error } = await (supabase as any)
        .from('cart_items')
        .select('id, product_id, quantity')
        .eq('user_id', session.session.user.id);

      if (error) throw error;
      if (!cartData || cartData.length === 0) {
        router.push('/cart');
        return;
      }

      // Obtener productos en paralelo
      const productIds = (cartData as Array<{ product_id: string | null | undefined }>)
        .map((item) => item.product_id)
        .filter(Boolean) as string[];
      const { data: productsData } = await (supabase as any)
        .from('products')
        .select('id, title, price, image_url:cover_url')
        .in('id', productIds);

      // Combinar cart items con productos
      const productsMap = new Map();
      if (productsData) {
        (productsData as Array<any>).forEach((product: any) => productsMap.set(product.id, product));
      }

      const enrichedCartItems = (cartData as any[]).map((item: any) => ({
        ...item,
        product: productsMap.get(item.product_id) || { id: item.product_id, title: 'Producto no encontrado', price: 0, image_url: null },
      }));

      setCartItems(enrichedCartItems as CartItem[]);
    } catch (err) {
      logger.error('Error loading cart', err);
      toast.error('Error al cargar el carrito');
    } finally {
      setLoading(false);
    }
  }

  // Track initiate checkout cuando se cargan los items
  useEffect(() => {
    if (cartItems.length > 0 && !loading) {
      const total = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const products = cartItems.map(item => ({
        id: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
      }));

      facebookPixel.trackInitiateCheckout(products, total, 'PYG');
      googleAnalytics.trackBeginCheckout(
        cartItems.map(item => ({
          id: item.product.id,
          name: item.product.title,
          category: '',
          price: item.product.price,
          quantity: item.quantity,
        })),
        total,
        'PYG'
      );
    }
  }, [cartItems, loading, facebookPixel, googleAnalytics]);

  // Track begin_checkout con GTM cuando se cargan los items del carrito
  useEffect(() => {
    if (cartItems.length > 0 && !loading && !auctionProductId && checkoutType !== 'membership') {
      const total = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const items = cartItems.map(item => ({
        item_id: item.product.id,
        item_name: item.product.title,
        price: item.product.price,
        quantity: item.quantity,
      }));
      
      trackBeginCheckout(items, total);
    }
  }, [cartItems, loading, auctionProductId, checkoutType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);

    try {
      // Validar dirección
      if (!address.fullName.trim() || !address.phone.trim() || !address.address.trim()) {
        toast.error('Por favor completa todos los campos obligatorios');
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        router.push('/auth/sign-in');
        return;
      }
      
      const buyerId = session.session.user.id;

      // Procesar membresía si es checkout de membresía
      if (checkoutType === 'membership' && planId && subscriptionType) {
        try {
          const { activateMembershipSubscription } = await import('@/lib/services/membershipService');
          const paymentAmount = membershipAmount ? parseFloat(membershipAmount) : 0;
          
          // Activar membresía directamente
          const subscriptionId = await activateMembershipSubscription(
            buyerId,
            planId,
            subscriptionType,
            paymentAmount,
            paymentMethod,
            `checkout-${Date.now()}`
          );

          logger.info('Membresía activada exitosamente', {
            subscriptionId,
            userId: buyerId,
            planId,
            subscriptionType,
            amount: paymentAmount,
          });

          toast.success('¡Membresía activada exitosamente!');
          router.push(`/checkout/success?membership=${subscriptionId}`);
          return;
        } catch (membershipErr: any) {
          logger.error('Error activando membresía', membershipErr);
          toast.error('Error al activar membresía: ' + (membershipErr.message || 'Error desconocido'));
          throw membershipErr;
        }
      }

      // Validar stock final antes de crear orden (solo para productos fixed, no subastas)
      if (!auctionProductId && !checkoutType) {
        for (const item of cartItems) {
          if (item.product) {
            try {
              const { data: productData } = await (supabase as any)
                .from('products')
                .select('sale_type, stock_management_enabled, stock_quantity, title')
                .eq('id', item.product.id)
                .single();
              
              if (productData && (productData.sale_type === 'fixed') && productData.stock_management_enabled !== false) {
                const { checkStockAvailability } = await import('@/lib/services/inventoryService');
                const check = await checkStockAvailability(item.product.id, item.quantity);
                
                if (!check.available) {
                  toast.error(`Stock insuficiente para "${productData.title || 'producto'}". ${check.message}`);
                  return;
                }
              }
            } catch (stockErr: any) {
              logger.warn('Error checking stock in checkout', stockErr, { productId: item.product.id });
              // Continuar si falla la validación de stock (no bloquear checkout)
            }
          }
        }
      }

      logger.debug('Creando pedido', {
        buyer_id: buyerId,
        cartItems: cartItems.length,
        total: totalPrice
      });

      // Crear orden
      logger.debug('Datos del pedido a crear', {
        buyer_id: buyerId,
        buyer_email: session.session.user.email,
        cartItems_count: cartItems.length,
        total: totalPrice,
        address: address.fullName,
        payment_method: paymentMethod
      });

      // Obtener código de afiliado de localStorage si existe
      let affiliateCode: string | null = null;
      let affiliateId: string | null = null;
      if (typeof window !== 'undefined') {
        const storedCode = localStorage.getItem('affiliate_code');
        if (storedCode) {
          affiliateCode = storedCode;
          // Obtener affiliate_id desde el código
          try {
            const { getAffiliateByCode } = await import('@/lib/services/affiliateService');
            const affiliate = await getAffiliateByCode(storedCode);
            if (affiliate && affiliate.status === 'active') {
              affiliateId = affiliate.id;
            }
          } catch (err) {
            logger.warn('Error obteniendo afiliado por código', err);
          }
        }
      }

      let orderId: string | undefined;
      let error: any = null;

      // Si es orden de subasta, usar función especial
      if (auctionProductId && auctionProduct) {
        const { data: auctionOrderId, error: auctionOrderError } = await (supabase as any).rpc('create_auction_order', {
          p_buyer_id: buyerId,
          p_auction_id: auctionProductId,
          p_shipping_address: address,
          p_payment_method: paymentMethod,
          p_notes: notes.trim() || null,
          p_total_amount: totalPrice,
        });

        if (auctionOrderError) {
          error = auctionOrderError;
        } else {
          orderId = auctionOrderId;
        }
      } else {
        // Orden normal desde carrito
        const { data: cartOrderId, error: cartOrderError } = await (supabase as any).rpc('create_order_from_cart', {
          p_buyer_id: buyerId,
          p_shipping_address: address,
          p_payment_method: paymentMethod,
          p_notes: notes.trim() || null
        });

        if (cartOrderError) {
          error = cartOrderError;
        } else {
          orderId = cartOrderId;
        }
      }

      if (error || !orderId) {
        logger.error('Error creando pedido', error || 'No se obtuvo orderId', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          buyer_id: buyerId
        });
        
        // Mensajes de error más específicos para el usuario
        let userMessage = 'Error al procesar el pedido. Por favor, intenta de nuevo.';
        if (error.code === 'PGRST301' || error.message?.includes('cart is empty')) {
          userMessage = 'Tu carrito está vacío. Agrega productos antes de realizar el pedido.';
        } else if (error.code === '23505' || error.message?.includes('duplicate')) {
          userMessage = 'Ya existe un pedido con estos datos. Verifica tu historial de pedidos.';
        } else if (error.message?.includes('stock') || error.message?.includes('inventory')) {
          userMessage = 'Algunos productos no tienen suficiente stock. Por favor, revisa tu carrito.';
        } else if (error.message?.includes('price') || error.message?.includes('amount')) {
          userMessage = 'Error al calcular el precio. Por favor, recarga la página e intenta de nuevo.';
        }
        
        toast.error(userMessage);
        throw new Error(userMessage);
      }

      logger.info('Pedido creado exitosamente', {
        orderId,
        buyer_id: buyerId,
        timestamp: new Date().toISOString()
      });

      // Obtener código de influencer de localStorage si existe
      let influencerCode: string | null = null;
      let utmSource: string | null = null;
      let utmMedium: string | null = null;
      let utmCampaign: string | null = null;
      
      if (typeof window !== 'undefined') {
        influencerCode = localStorage.getItem('influencer_code');
        utmSource = localStorage.getItem('utm_source');
        utmMedium = localStorage.getItem('utm_medium');
        utmCampaign = localStorage.getItem('utm_campaign');
      }

      // Actualizar orden con código de afiliado si existe
      if (orderId && affiliateCode && affiliateId) {
        try {
          await (supabase as any)
            .from('orders')
            .update({
              affiliate_code: affiliateCode,
              referred_by: affiliateId,
            })
            .eq('id', orderId);
          
          logger.info('Orden actualizada con código de afiliado', {
            orderId,
            affiliateCode,
            affiliateId,
          });

          // Limpiar código de afiliado del localStorage después de usarlo
          if (typeof window !== 'undefined') {
            localStorage.removeItem('affiliate_code');
            localStorage.removeItem('affiliate_store_id');
          }
        } catch (affiliateError) {
          logger.warn('Error actualizando orden con código de afiliado', affiliateError);
          // No fallar el checkout si hay error con el afiliado
        }
      }

      // Actualizar orden con código de influencer si existe
      if (orderId && influencerCode) {
        try {
          const updateData: any = {
            influencer_code: influencerCode,
          };
          
          if (utmSource) updateData.utm_source = utmSource;
          if (utmMedium) updateData.utm_medium = utmMedium;
          if (utmCampaign) updateData.utm_campaign = utmCampaign;

          await (supabase as any)
            .from('orders')
            .update(updateData)
            .eq('id', orderId);
          
          logger.info('Orden actualizada con código de influencer', {
            orderId,
            influencerCode,
            utmSource,
            utmMedium,
            utmCampaign,
          });

          // Limpiar datos de influencer del localStorage después de usarlo
          if (typeof window !== 'undefined') {
            localStorage.removeItem('influencer_code');
            localStorage.removeItem('utm_source');
            localStorage.removeItem('utm_medium');
            localStorage.removeItem('utm_campaign');
          }

          // Trackear visita/evento del influencer (opcional, no bloquea el checkout)
          try {
            const { trackInfluencerVisit } = await import('@/lib/services/influencerService');
            await trackInfluencerVisit(influencerCode, 'visit');
          } catch (trackError) {
            logger.warn('Error tracking influencer visit', trackError);
          }
        } catch (influencerError) {
          logger.warn('Error actualizando orden con código de influencer', influencerError);
          // No fallar el checkout si hay error con el influencer
        }
      }

      // Verificar que el pedido se creó correctamente con el buyer_id correcto
      const { data: verifyOrder, error: verifyError } = await supabase
        .from('orders')
        .select('id, buyer_id, total_amount, status, created_at')
        .eq('id', orderId)
        .single();

      if (verifyError) {
        logger.warn('No se pudo verificar el pedido creado', verifyError, { orderId, buyerId });
      } else {
        type OrderVerify = { id: string; buyer_id: string; total_amount: number; status: string; created_at: string };
        const orderTyped = verifyOrder as OrderVerify | null;
        
        logger.debug('Verificación del pedido', {
          orderId: orderTyped?.id,
          buyer_id_in_db: orderTyped?.buyer_id,
          buyer_id_expected: buyerId,
          match: orderTyped?.buyer_id === buyerId,
          total: orderTyped?.total_amount,
          status: orderTyped?.status
        });

        if (orderTyped?.buyer_id !== buyerId) {
          logger.error('PROBLEMA CRÍTICO: El buyer_id en la BD no coincide con el usuario actual', undefined, {
            orderId,
            buyer_id_in_db: orderTyped?.buyer_id,
            buyer_id_expected: buyerId
          });
          toast.error('Se creó el pedido pero hay un problema con la asociación. Contacta al administrador.');
        }
      }

      // Obtener información del pedido para notificaciones
      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          order_items (
            product:products (
              title,
              seller_id
            ),
            seller_id
          )
        `)
        .eq('id', orderId)
        .single();

      logger.debug('Datos del pedido creado', { orderId, orderData });

      // Enviar email de confirmación (en segundo plano, no bloquea)
      const buyerEmail = session.session.user.email;
      if (buyerEmail && paymentMethod !== 'pagopar') {
        fetch('/api/email/order-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: buyerEmail,
            orderNumber: orderId,
            orderDetails: {
              items: cartItems.map(item => ({
                name: item.product.title,
                quantity: item.quantity,
                price: item.product.price * item.quantity,
              })),
              total: totalPrice,
              shippingAddress: address,
            },
          }),
        }).catch(err => logger.error('Error enviando email', err, { orderId, email: buyerEmail }));
      }

      // Enviar notificaciones de WhatsApp a los vendedores (en segundo plano, no bloquea)
      type OrderDataWithItems = { id: string; total_amount: number; order_items?: Array<{ seller_id: string; product?: { title: string; seller_id: string } }> };
      const orderTyped = orderData as OrderDataWithItems | null;
      
      if (orderTyped?.order_items && orderTyped.order_items.length > 0) {
        // Obtener sellers únicos del pedido
        const sellerIds = [...new Set(
          orderTyped.order_items
            .map((item) => item.seller_id)
            .filter(Boolean)
        )];

        logger.debug('Enviando notificaciones WhatsApp a vendedores', { sellerIds, orderId });

        // Enviar notificación a cada vendedor
        for (const sellerId of sellerIds) {
          fetch('/api/whatsapp/notify-seller', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sellerId,
              orderId,
              orderData: orderData,
              buyerPhone: address.phone,
              buyerName: address.fullName,
            }),
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              logger.debug('Notificación WhatsApp preparada para vendedor', { sellerId, whatsapp_url: data.whatsapp_url });
              // Opcional: En producción, puedes configurar una API de WhatsApp para envío automático
            } else {
              logger.warn('No se pudo enviar WhatsApp a vendedor', data.error, { sellerId, orderId });
            }
          })
          .catch(err => logger.error('Error enviando WhatsApp a vendedor', err, { sellerId, orderId }));
        }
      }

      // Si el método de pago es Pagopar, crear factura y redirigir
      if (paymentMethod === 'pagopar') {
        setPagoparLoading(true);
        try {
          // Obtener datos del comprador
          const buyerEmail = session.session.user.email || '';
          const buyerProfile = await (supabase as any)
            .from('profiles')
            .select('first_name, last_name, phone')
            .eq('id', buyerId)
            .single();

          const buyerFullName = buyerProfile?.data?.first_name && buyerProfile?.data?.last_name
            ? `${buyerProfile.data.first_name} ${buyerProfile.data.last_name}`
            : address.fullName;

          // Preparar items para Pagopar
          const pagoparItems = checkoutType === 'membership' && membershipPlan
            ? [{
                title: membershipPlan.name,
                quantity: 1,
                price: totalPrice,
              }]
            : auctionProductId && auctionProduct
            ? [{
                title: auctionProduct.title || 'Producto de subasta',
                quantity: 1,
                price: totalPrice,
              }]
            : cartItems.map(item => ({
                title: item.product.title,
                quantity: item.quantity,
                price: item.product.price * item.quantity,
              }));

          // Crear factura en Pagopar
          const pagoparResponse = await fetch('/api/payments/pagopar/create-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId,
              buyerData: {
                fullName: buyerFullName,
                email: buyerEmail,
                phone: address.phone,
                ruc: address.zipCode || undefined,
              },
              items: pagoparItems,
              totalAmount: totalPrice,
              paymentMethod: 'card', // Pagopar permite tarjeta
            }),
          });

          const pagoparData = await pagoparResponse.json();

          if (!pagoparResponse.ok) {
            throw new Error(pagoparData.error || 'Error al crear factura en Pagopar');
          }

          if (pagoparData.success && pagoparData.invoice?.link_pago) {
            // Guardar orderId en localStorage para cuando Pagopar redirija de vuelta
            if (typeof window !== 'undefined') {
              localStorage.setItem('pagopar_order_id', orderId);
            }
            
            // Redirigir al link de pago de Pagopar
            window.location.href = pagoparData.invoice.link_pago;
            return;
          } else {
            throw new Error(pagoparData.error || 'Error al crear factura en Pagopar');
          }
        } catch (pagoparError: any) {
          logger.error('Error procesando pago con Pagopar', pagoparError);
          toast.error('Error al procesar pago con Pagopar: ' + (pagoparError.message || 'Error desconocido'));
          setPagoparLoading(false);
          return;
        }
      }

      // Redirigir a página de éxito
      router.push(`/checkout/success?orderId=${orderId}`);

    } catch (err: any) {
      logger.error('Error al procesar el pedido', err, {
        cartItems_count: cartItems.length,
        error_message: err.message
      });
      
      // El mensaje de error ya fue mostrado arriba en la validación de error
      // Solo mostrar aquí si no se mostró antes
      if (!err.message?.includes('carrito') && !err.message?.includes('stock') && !err.message?.includes('precio')) {
        toast.error('Error al procesar el pedido: ' + (err.message || 'Error desconocido. Por favor, contacta al soporte.'));
      }
    } finally {
      setProcessing(false);
    }
  }

  // Calcular totales
  const totalItems = checkoutType === 'membership' ? 1 : cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = checkoutType === 'membership' 
    ? (membershipAmount ? parseFloat(membershipAmount) : 0)
    : cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const discountAmount = appliedCoupon?.valid ? appliedCoupon.discount_amount : 0;
  const totalPrice = Math.max(0, subtotal - discountAmount);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Finalizar Compra</h1>
          <Link href="/cart" className="underline text-sm">← Volver al carrito</Link>
        </div>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Formulario de dirección */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Información de envío</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={address.fullName}
                    onChange={(e) => setAddress(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Juan Pérez"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    required
                    value={address.phone}
                    onChange={(e) => setAddress(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="0981 123 456"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección *
                  </label>
                  <input
                    type="text"
                    required
                    value={address.address}
                    onChange={(e) => setAddress(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Av. Mariscal López 1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Asunción"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departamento
                  </label>
                  <select
                    value={address.department}
                    onChange={(e) => setAddress(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar</option>
                    <option value="Asunción">Asunción</option>
                    <option value="Central">Central</option>
                    <option value="Alto Paraná">Alto Paraná</option>
                    <option value="Itapúa">Itapúa</option>
                    <option value="Caaguazú">Caaguazú</option>
                    <option value="San Pedro">San Pedro</option>
                    <option value="Cordillera">Cordillera</option>
                    <option value="Guairá">Guairá</option>
                    <option value="Caazapá">Caazapá</option>
                    <option value="Paraguarí">Paraguarí</option>
                    <option value="Misiones">Misiones</option>
                    <option value="Ñeembucú">Ñeembucú</option>
                    <option value="Amambay">Amambay</option>
                    <option value="Canindeyú">Canindeyú</option>
                    <option value="Presidente Hayes">Presidente Hayes</option>
                    <option value="Boquerón">Boquerón</option>
                    <option value="Alto Paraguay">Alto Paraguay</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código postal
                  </label>
                  <input
                    type="text"
                    value={address.zipCode}
                    onChange={(e) => setAddress(prev => ({ ...prev, zipCode: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="1000"
                  />
                </div>
              </div>
            </div>

            {/* Método de pago */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4">Método de pago</h2>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="mr-3"
                  />
                  <span>Efectivo contra entrega</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="transfer"
                    checked={paymentMethod === 'transfer'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="mr-3"
                  />
                  <span>Transferencia bancaria</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="mr-3"
                  />
                  <span>Tarjeta de crédito/débito</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="pagopar"
                    checked={paymentMethod === 'pagopar'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="mr-3"
                  />
                  <span className="flex items-center gap-2">
                    <span>Pago con Pagopar</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Seguro</span>
                  </span>
                </label>
              </div>
              {paymentMethod === 'pagopar' && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <p className="font-medium mb-1">💳 Pagopar - Métodos de pago disponibles:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Tarjetas de crédito/débito</li>
                    <li>Transferencia bancaria</li>
                    <li>Billetera digital</li>
                  </ul>
                  <p className="mt-2 text-xs">Serás redirigido a la plataforma segura de Pagopar para completar el pago.</p>
                </div>
              )}
            </div>

            {/* Notas adicionales */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4">Notas adicionales</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Instrucciones especiales para la entrega..."
              />
            </div>
          </div>

          {/* Resumen del pedido */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-4">
              <h2 className="text-xl font-semibold mb-4">
                {checkoutType === 'membership' ? 'Resumen de Membresía' : 'Resumen del pedido'}
              </h2>
              <div className="space-y-3 mb-4">
                {/* Mostrar membresía si es checkout de membresía */}
                {checkoutType === 'membership' && membershipPlan && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-blue-900 mb-2">{membershipPlan.name}</h3>
                    <p className="text-sm text-blue-700 mb-2">{membershipPlan.description}</p>
                    <div className="text-sm text-blue-800">
                      <p><strong>Tipo:</strong> {
                        subscriptionType === 'monthly' ? 'Mensual' :
                        subscriptionType === 'yearly' ? 'Anual' :
                        subscriptionType === 'one_time' ? 'Pago Único' : subscriptionType
                      }</p>
                      <p><strong>Límite de puja:</strong> {membershipPlan.bid_limit_formatted || 'Ilimitado'}</p>
                    </div>
                    <ul className="mt-3 space-y-1 text-xs text-blue-700">
                      {membershipPlan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="mr-2">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.product.title} x{item.quantity}</span>
                    <span>{(item.product.price * item.quantity).toLocaleString('es-PY')} Gs.</span>
                  </div>
                ))}
                
                {/* Mostrar desglose de comisiones para subastas */}
                {auctionProductId && auctionCommissions && auctionProduct && (
                  <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2 text-sm">
                      🔨 Desglose de Subasta
                    </h3>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-yellow-800 dark:text-yellow-400">
                        <span>Precio de subasta:</span>
                        <span className="font-medium">{(auctionProduct.current_bid || auctionProduct.price || 0).toLocaleString('es-PY')} Gs.</span>
                      </div>
                      <div className="flex justify-between text-yellow-800 dark:text-yellow-400">
                        <span>Comisión comprador ({auctionCommissions.buyer_commission_percent.toFixed(2)}%):</span>
                        <span className="font-medium">+{auctionCommissions.buyer_commission_amount.toLocaleString('es-PY')} Gs.</span>
                      </div>
                      <div className="border-t border-yellow-300 dark:border-yellow-700 pt-1 mt-1 flex justify-between text-yellow-900 dark:text-yellow-300 font-semibold">
                        <span>Total a pagar:</span>
                        <span>{auctionCommissions.buyer_total_paid.toLocaleString('es-PY')} Gs.</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <hr />
                <div className="flex justify-between">
                  <span>Subtotal ({totalItems} {totalItems === 1 ? 'producto' : 'productos'})</span>
                  <span>{subtotal.toLocaleString('es-PY')} Gs.</span>
                </div>
                
                {/* Cupón de descuento */}
                <div className="space-y-2">
                  <CouponInput
                    orderAmount={subtotal}
                    onCouponApplied={setAppliedCoupon}
                    onCouponRemoved={() => setAppliedCoupon(null)}
                    appliedCoupon={appliedCoupon}
                  />
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuento</span>
                    <span>-{discountAmount.toLocaleString('es-PY')} Gs.</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Envío</span>
                  <span className="text-green-600">Gratis</span>
                </div>
                <hr />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{totalPrice.toLocaleString('es-PY')} Gs.</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={processing || pagoparLoading}
                className="w-full mt-6 bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pagoparLoading 
                  ? 'Redirigiendo a Pagopar...' 
                  : processing 
                  ? 'Procesando...' 
                  : paymentMethod === 'pagopar'
                  ? 'Pagar con Pagopar'
                  : 'Confirmar pedido'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando checkout...</p>
          </div>
        </div>
      </main>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
