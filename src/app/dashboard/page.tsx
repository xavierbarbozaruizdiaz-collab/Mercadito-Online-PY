'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';
import { 
  Package, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Zap,
  Star,
  Bell,
  Eye,
  Plus,
  Edit,
  Target,
  Percent,
  TrendingDown,
  User,
  Store,
} from 'lucide-react';
import Image from 'next/image';
import DashboardSidebar from '@/components/DashboardSidebar';
import StatsPanel from '@/components/StatsPanel';
import SellerHomeHeader from '@/components/dashboard/SellerHomeHeader';
import { useToast } from '@/lib/hooks/useToast';
// import AdminRoleAssigner from '@/components/AdminRoleAssigner'; // Temporalmente comentado

type Product = {
  id: string;
  title: string;
  price: number;
  cover_url: string | null;
  created_at: string;
  sale_type: 'direct' | 'auction';
  auction_status?: 'scheduled' | 'active' | 'ended' | 'cancelled';
  auction_end_at?: string;
  status?: string | null; // 'active', 'paused', 'deleted', etc.
  in_showcase?: boolean;
  showcase_position?: number | null;
};

type DashboardStats = {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalCustomers: number;
  recentOrders: Array<{
    id: string;
    status: string;
    total_amount: number;
    created_at: string;
  }>;
  conversionRate: number;
  averageOrderValue: number;
  salesTrend: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  topProducts: Array<{
    id: string;
    title: string;
    cover_url: string | null;
    total_sold: number;
    revenue: number;
  }>;
  notifications: Array<{
    type: 'order' | 'stock' | 'review';
    message: string;
    priority: 'high' | 'medium' | 'low';
    link?: string;
  }>;
  // Balances del vendedor
  pendingBalance: number;
  availableBalance: number;
  totalEarnings: number;
  totalCommissionsPaid: number;
};

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]); // Todos los productos sin filtrar (excluyendo subastas finalizadas)
  const [finishedAuctions, setFinishedAuctions] = useState<Product[]>([]); // Subastas finalizadas
  const [pausedProducts, setPausedProducts] = useState<Product[]>([]); // Productos pausados
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [role, setRole] = useState<'buyer' | 'seller' | 'admin' | null>(null);
  const [storeStatus, setStoreStatus] = useState<'none' | 'pending' | 'active'>('none');
  const [filterType, setFilterType] = useState<'all' | 'direct' | 'auction' | 'finished_auctions' | 'paused'>('all');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [showcaseProducts, setShowcaseProducts] = useState<Product[]>([]);
  const [updatingShowcase, setUpdatingShowcase] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [statsPanelOpen, setStatsPanelOpen] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user?.id) {
          setLoading(false);
          setStatsLoading(false);
          return;
        }

        // Cargar rol del perfil y estado de tienda
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.session.user.id)
          .single();
        const userRole = (profile as any)?.role || 'buyer';
        setRole(userRole);

        if (userRole === 'seller') {
          const { data: s } = await supabase
            .from('stores')
            .select('id, is_active, settings, slug')
            .eq('seller_id', session.session.user.id)
            .maybeSingle();
          if (s) {
            const pending = (s as any).settings?.verification_status === 'pending' || (s as any).is_active === false;
            setStoreStatus(pending ? 'pending' : 'active');
            // Obtener slug de la tienda para el enlace
            if ((s as any).slug) {
              setStoreSlug((s as any).slug);
            }
            // Guardar store_id para el panel de estadísticas
            if ((s as any).id) {
              setStoreId((s as any).id);
            }
          } else {
            setStoreStatus('none');
          }

          // Cargar estadísticas del vendedor
          await loadSellerStats(session.session.user.id);
        }

        // Cargar productos (incluyendo status para detectar pausados y vitrina)
        // Intentar primero con campos de vitrina, si falla intentar sin ellos
        const query = supabase
          .from('products')
          .select('id, title, price, image_url:cover_url, created_at, sale_type, auction_status, auction_end_at, status')
          .eq('seller_id', session.session.user.id)
          .order('created_at', { ascending: false });

        let { data, error } = await query;

        // Si hay error de columna inexistente, intentar agregar campos de vitrina
        if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
          logger.warn('Campos de vitrina no disponibles, intentando sin ellos', error);
          // Ya intentamos sin in_showcase, así que usamos la query simple
        } else if (!error) {
          // Si no hay error, intentar agregar campos de vitrina en una segunda query opcional
          try {
            const { data: showcaseData } = await supabase
              .from('products')
              .select('id, in_showcase, showcase_position')
              .eq('seller_id', session.session.user.id);
            
            // Combinar datos si existen
            if (showcaseData && data) {
              const showcaseMap = new Map(showcaseData.map((p: any) => [p.id, { in_showcase: p.in_showcase, showcase_position: p.showcase_position }]));
              data = data.map((p: any) => ({
                ...p,
                ...(showcaseMap.get(p.id) || {})
              }));
            }
          } catch (showcaseError) {
            // Si falla, continuar sin campos de vitrina
            logger.warn('No se pudieron cargar campos de vitrina', showcaseError);
          }
        }

        if (error) {
          logger.error('Error al cargar productos', error);
          // No lanzar error, mostrar dashboard vacío
          setProducts([]);
          setAllProducts([]);
          setLoading(false);
          return;
        }
        
        const allProductsData = (data || []) as Product[];
        
        // [FALLBACK] Si algún producto no tiene cover_url, obtenerlo desde product_images
        const productsWithoutCover = allProductsData.filter(p => !p.cover_url || p.cover_url === '');
        if (productsWithoutCover.length > 0) {
          try {
            const productIds = productsWithoutCover.map(p => p.id);
            const { data: imagesData } = await supabase
              .from('product_images')
              .select('product_id, url, thumbnail_url, is_cover, sort_order, created_at')
              .in('product_id', productIds)
              .order('is_cover', { ascending: false })
              .order('sort_order', { ascending: true })
              .order('created_at', { ascending: true });

            if (imagesData && imagesData.length > 0) {
              // Agrupar imágenes por product_id y tomar la primera (cover o primera por orden)
              const imagesByProduct = new Map<string, any>();
              imagesData.forEach((img: any) => {
                if (!imagesByProduct.has(img.product_id)) {
                  imagesByProduct.set(img.product_id, img);
                }
              });

              // Actualizar cover_url en los productos
              allProductsData.forEach(product => {
                if (!product.cover_url && imagesByProduct.has(product.id)) {
                  const img = imagesByProduct.get(product.id);
                  product.cover_url = img.url || null;
                  // También actualizar en BD (fire and forget para no bloquear)
                  supabase
                    .from('products')
                    .update({ cover_url: img.url, thumbnail_url: img.thumbnail_url || img.url })
                    .eq('id', product.id)
                    .then(({ error }) => {
                      if (error) {
                        logger.warn('Error actualizando cover_url desde fallback', error, { productId: product.id });
                      }
                    });
                }
              });
            }
          } catch (fallbackError) {
            logger.warn('Error en fallback de cover_url', fallbackError);
            // Continuar sin fallback
          }
        }
        
        // Primero, actualizar estados de subastas que deberían estar finalizadas
        const now = new Date();
        const auctionsToUpdate: { id: string; title: string }[] = [];
        
        for (const product of allProductsData) {
          if (product.sale_type === 'auction' && 
              product.auction_status === 'active' && 
              product.auction_end_at) {
            const endDate = new Date(product.auction_end_at);
            if (endDate <= now) {
              // Esta subasta debería estar finalizada pero no lo está
              auctionsToUpdate.push({ id: product.id, title: product.title });
              try {
                await (supabase as any)
                  .from('products')
                  .update({ 
                    auction_status: 'ended',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', product.id);
                logger.debug('Actualizado estado de subasta a ENDED', { productId: product.id, title: product.title });
              } catch (updateError) {
                logger.error('Error al actualizar subasta', updateError, { productId: product.id });
              }
            }
          }
        }
        
        if (auctionsToUpdate.length > 0) {
          logger.info('Actualizadas subastas que debían estar finalizadas', { count: auctionsToUpdate.length });
          // Recargar datos después de actualizar
          const { data: refreshedData } = await supabase
            .from('products')
            .select('id, title, price, cover_url, created_at, sale_type, auction_status, auction_end_at')
            .eq('seller_id', session.session.user.id)
            .order('created_at', { ascending: false });
          
          if (refreshedData) {
            // Reemplazar los datos con los actualizados
            allProductsData.length = 0;
            allProductsData.push(...(refreshedData as Product[]));
          }
        }
        
        // Separar subastas finalizadas, productos pausados y productos activos
        const activeProducts: Product[] = [];
        const endedAuctions: Product[] = [];
        const paused: Product[] = [];
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 días atrás
        const auctionsToDelete: string[] = [];
        
        allProductsData.forEach(product => {
          // Primero verificar si está pausado
          if (product.status === 'paused') {
            paused.push(product);
            return;
          }
          
          if (product.sale_type === 'auction') {
            // Verificar si la subasta está finalizada
            const isEnded = product.auction_status === 'ended' || 
                           product.auction_status === 'cancelled' ||
                           (product.auction_end_at && new Date(product.auction_end_at) <= now);
            
            if (isEnded) {
              // Verificar si tiene más de 30 días desde que finalizó
              if (product.auction_end_at) {
                const endDate = new Date(product.auction_end_at);
                if (endDate <= thirtyDaysAgo) {
                  // Esta subasta tiene más de 30 días, marcarla para eliminación
                  auctionsToDelete.push(product.id);
                } else {
                  // Aún está dentro de los 30 días, mostrarla
                  endedAuctions.push(product);
                }
              } else {
                // Si no tiene fecha de fin pero está finalizada, mantenerla por seguridad
                endedAuctions.push(product);
              }
            } else {
              activeProducts.push(product);
            }
          } else {
            // Productos con precio fijo siempre van a activos (si no están pausados)
            activeProducts.push(product);
          }
        });
        
        // Eliminar subastas que tienen más de 30 días
        if (auctionsToDelete.length > 0) {
          logger.info('Eliminando subastas finalizadas con más de 30 días', { count: auctionsToDelete.length });
          for (const auctionId of auctionsToDelete) {
            try {
              // Obtener imágenes antes de eliminar
              const { data: images } = await supabase
                .from('product_images')
                .select('url')
                .eq('product_id', auctionId);
              
              // Eliminar producto
              await supabase
                .from('products')
                .delete()
                .eq('id', auctionId);
              
              // Eliminar imágenes del storage
              if (images && images.length > 0) {
                const fileNames = images.map((img: { url: string }) => {
                  const url = img.url;
                  const match = url.match(/products\/([^\/]+)\/(.+)$/);
                  return match ? `${match[1]}/${match[2]}` : null;
                }).filter(Boolean);
                
                if (fileNames.length > 0) {
                  await supabase.storage
                    .from('product-images')
                    .remove(fileNames.filter((name): name is string => name !== null));
                }
              }
              
              logger.info('Subasta eliminada automáticamente (más de 30 días)', { auctionId });
            } catch (deleteError) {
              logger.error('Error al eliminar subasta', deleteError, { auctionId });
            }
          }
          
          // Recargar productos después de las eliminaciones
          const { data: cleanedData } = await supabase
            .from('products')
            .select('id, title, price, cover_url, created_at, sale_type, auction_status, auction_end_at')
            .eq('seller_id', session.session.user.id)
            .order('created_at', { ascending: false });
          
          if (cleanedData) {
            // Recalcular después de eliminar
            const cleanedProducts = cleanedData as Product[];
            const cleanedActive: Product[] = [];
            const cleanedEnded: Product[] = [];
            
            cleanedProducts.forEach(product => {
              if (product.sale_type === 'auction') {
                const isEnded = product.auction_status === 'ended' || 
                               product.auction_status === 'cancelled' ||
                               (product.auction_end_at && new Date(product.auction_end_at) <= now);
                if (isEnded) {
                  if (product.auction_end_at) {
                    const endDate = new Date(product.auction_end_at);
                    if (endDate > thirtyDaysAgo) {
                      cleanedEnded.push(product);
                    }
                  } else {
                    cleanedEnded.push(product);
                  }
                } else {
                  cleanedActive.push(product);
                }
              } else {
                cleanedActive.push(product);
              }
            });
            
            setFinishedAuctions(cleanedEnded);
            setAllProducts(cleanedActive);
            setProducts(cleanedActive);
            return; // Salir temprano ya que actualizamos todo
          }
        }
        
        logger.debug('Productos cargados desde BD', {
          total: allProductsData.length,
          active: activeProducts.length,
          finishedAuctions: endedAuctions.length,
          auctions: activeProducts.filter(p => p.sale_type === 'auction').length,
          direct: activeProducts.filter(p => p.sale_type === 'direct').length,
        });
        
        // Cargar subastas finalizadas por separado
        setFinishedAuctions(endedAuctions);
        
        // Cargar productos pausados por separado
        setPausedProducts(paused);
        
        // Los productos activos (sin subastas finalizadas ni pausados)
        setAllProducts(activeProducts);
        setProducts(activeProducts);
        
        // Cargar productos en vitrina
        if (userRole === 'seller') {
          const showcaseItems = allProductsData.filter(p => p.in_showcase === true && p.status === 'active');
          setShowcaseProducts(showcaseItems.sort((a, b) => (a.showcase_position || 0) - (b.showcase_position || 0)));
        }
      } catch (err: any) {
        logger.error('Error loading products', err);
        // Asegurar que siempre se desactive el loading y se muestre algo
        setProducts([]);
        setAllProducts([]);
        setFinishedAuctions([]);
        setPausedProducts([]);
        setShowcaseProducts([]);
      } finally {
        setLoading(false);
        setStatsLoading(false);
      }
    })();
  }, []);

  async function loadSellerStats(sellerId: string) {
    try {
      setStatsLoading(true);

      // Obtener productos
      const { data: productsData } = await supabase
        .from('products')
        .select('id, title, status, cover_url')
        .eq('seller_id', sellerId);

      // Obtener órdenes del vendedor (a través de order_items)
      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          order_id, 
          total_price, 
          quantity,
          product_id,
          order:orders(status, total_amount, created_at, buyer_id),
          product:products(id, title, cover_url)
        `)
        .eq('seller_id', sellerId)
        .limit(200); // Aumentar límite para mejor análisis

      // Procesar datos
      const products = productsData || [];
      type ProductItem = { status?: string };
      const activeProducts = products.filter((p: ProductItem) => !p.status || p.status === 'active').length;

      // Agrupar order_items por order_id para obtener órdenes únicas
      type OrderData = { id: string; status: string; total_amount: number; created_at: string; buyer_id?: string };
      const orderMap = new Map<string, OrderData>();
      const customerSet = new Set<string>();
      let totalRevenue = 0;
      let monthlyRevenue = 0;
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Mapa para productos más vendidos
      const productSalesMap = new Map<string, { sold: number; revenue: number; title: string; cover_url: string | null }>();

      // Mapa para tendencia de ventas (últimos 30 días)
      const salesByDate = new Map<string, { revenue: number; orders: Set<string> }>();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (orderItems) {
        orderItems.forEach((item: any) => {
          if (item.order) {
            const orderId = item.order.id || item.order_id;
            if (!orderMap.has(orderId)) {
              orderMap.set(orderId, {
                id: orderId,
                status: item.order.status,
                total_amount: 0,
                created_at: item.order.created_at,
                buyer_id: item.order.buyer_id
              });
            }
            const order = orderMap.get(orderId)!;
            if (order) {
              order.total_amount += item.total_price;
            }
            totalRevenue += item.total_price;
            
            if (item.order.buyer_id) {
              customerSet.add(item.order.buyer_id);
            }

            // Calcular ingresos mensuales
            if (item.order.created_at) {
              const orderDate = new Date(item.order.created_at);
              if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
                monthlyRevenue += item.total_price;
              }

              // Tendencias de ventas (últimos 30 días)
              if (orderDate >= thirtyDaysAgo) {
                const dateKey = orderDate.toISOString().split('T')[0];
                if (!salesByDate.has(dateKey)) {
                  salesByDate.set(dateKey, { revenue: 0, orders: new Set() });
                }
                const dayData = salesByDate.get(dateKey)!;
                dayData.revenue += item.total_price;
                dayData.orders.add(orderId);
              }
            }

            // Productos más vendidos
            if (item.product_id && item.product) {
              const productId = item.product_id;
              if (!productSalesMap.has(productId)) {
                productSalesMap.set(productId, {
                  sold: 0,
                  revenue: 0,
                  title: item.product.title || 'Producto',
                  cover_url: item.product.cover_url || null
                });
              }
              const productData = productSalesMap.get(productId)!;
              productData.sold += item.quantity;
              productData.revenue += item.total_price;
            }
          }
        });
      }

      const orders: OrderData[] = Array.from(orderMap.values());
      const pendingOrders = orders.filter((o) => o.status === 'pending');

      // Obtener órdenes recientes
      const recentOrders = orders
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      // Top 5 productos más vendidos
      const topProducts = Array.from(productSalesMap.entries())
        .map(([id, data]) => ({ id, title: data.title || '', cover_url: data.cover_url || null, total_sold: data.sold, revenue: data.revenue }))
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, 5);

      // Tendencias de ventas (ordenadas por fecha)
      const salesTrend = Array.from(salesByDate.entries())
        .map(([date, data]) => ({
          date,
          revenue: data.revenue,
          orders: data.orders.size
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calcular métricas de rendimiento
      const conversionRate = activeProducts > 0 ? (orders.length / activeProducts) * 100 : 0;
      const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

      // Generar notificaciones
      type NotificationItem = { type: 'order' | 'review' | 'stock'; message: string; priority: 'low' | 'medium' | 'high'; link?: string };
      const notifications: NotificationItem[] = [];
      if (pendingOrders.length > 0) {
        notifications.push({
          type: 'order' as const,
          message: `${pendingOrders.length} orden${pendingOrders.length > 1 ? 'es' : ''} pendiente${pendingOrders.length > 1 ? 's' : ''} de confirmar`,
          priority: 'high' as const,
          link: '/dashboard/orders'
        });
      }
      // Cargar alertas de stock bajo
      try {
        const { data: stockAlerts } = await (supabase as any)
          .from('stock_alerts')
          .select('id, product_id, current_stock, threshold, product:products(id, title, stock_quantity, stock_management_enabled, low_stock_threshold)')
          .eq('seller_id', sellerId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(10);

        // Agregar notificaciones de stock bajo (con verificación en tiempo real)
        if (stockAlerts && stockAlerts.length > 0) {
          stockAlerts.forEach((alert: any) => {
            const product = alert.product;
            if (product && product.id) {
              // [FALLBACK] Verificar stock real desde products (puede estar desincronizado)
              const realStock = product.stock_quantity || 0;
              const threshold = product.low_stock_threshold || alert.threshold || 5;
              
              // Solo mostrar alerta si realmente está bajo el umbral
              if (product.stock_management_enabled && realStock <= threshold) {
                notifications.push({
                  type: 'stock' as const,
                  message: `⚠️ Stock bajo: "${product.title}" tiene ${realStock} unidades (umbral: ${threshold})`,
                  priority: realStock === 0 ? 'high' as const : 'medium' as const,
                  link: `/dashboard/edit-product/${product.id}`,
                });
              } else {
                // Si el stock real ya no está bajo, desactivar la alerta (fallback)
                (supabase as any)
                  .from('stock_alerts')
                  .update({ is_active: false, current_stock: realStock })
                  .eq('id', alert.id)
                  .then(({ error }: any) => {
                    if (error) {
                      logger.warn('Error desactivando alerta desincronizada', error, { alertId: alert.id });
                    }
                  });
              }
            }
          });
        }
      } catch (stockAlertError) {
        logger.warn('Error loading stock alerts', stockAlertError);
        // Continuar sin alertas de stock si hay error
      }

      // Obtener balance del vendedor
      const { data: balanceData } = await (supabase as any)
        .from('seller_balance')
        .select('pending_balance, available_balance, total_earnings, total_commissions_paid')
        .eq('seller_id', sellerId)
        .maybeSingle();

      const balance = balanceData || {
        pending_balance: 0,
        available_balance: 0,
        total_earnings: 0,
        total_commissions_paid: 0,
      };

      setStats({
        totalProducts: products.length,
        activeProducts: activeProducts,
        totalOrders: orders.length,
        pendingOrders: pendingOrders.length,
        totalRevenue,
        monthlyRevenue,
        totalCustomers: customerSet.size,
        recentOrders,
        conversionRate,
        averageOrderValue,
        salesTrend,
        topProducts,
        notifications,
        // Balances
        pendingBalance: balance.pending_balance || 0,
        availableBalance: balance.available_balance || 0,
        totalEarnings: balance.total_earnings || 0,
        totalCommissionsPaid: balance.total_commissions_paid || 0,
      });
    } catch (err) {
      logger.error('Error cargando estadísticas', err);
    } finally {
      setStatsLoading(false);
    }
  }

  async function reactivateProduct(productId: string) {
    setReactivatingId(productId);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        throw new Error('No hay sesión activa');
      }

      const userId = session.session.user.id;

      // Verificar que el producto existe y pertenece al usuario
      const { data: productToReactivate, error: checkError } = await supabase
        .from('products')
        .select('id, seller_id, title, status')
        .eq('id', productId)
        .single();

      if (checkError || !productToReactivate) {
        throw new Error('Producto no encontrado');
      }

      if ((productToReactivate as any).seller_id !== userId) {
        throw new Error('No tienes permiso para reactivar este producto');
      }

      if ((productToReactivate as any).status !== 'paused') {
        throw new Error('Este producto no está pausado');
      }

      // Verificar límites de publicación antes de reactivar
      const { checkCanPublishProduct } = await import('@/lib/services/membershipService');
      const canPublish = await checkCanPublishProduct(userId, (productToReactivate as any).price || 0);

      if (!canPublish.can_publish || !canPublish.can_publish_more_products) {
        throw new Error(
          canPublish.reason || 
          'No puedes reactivar este producto. Has alcanzado el límite de productos de tu plan. Actualiza tu membresía para reactivar más productos.'
        );
      }

      // Reactivar producto
      const { error: updateError } = await (supabase as any)
        .from('products')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (updateError) throw updateError;

      alert('✅ Producto reactivado correctamente');
      
      // Recargar productos
      const { data: refreshedData } = await supabase
        .from('products')
        .select('id, title, price, cover_url, created_at, sale_type, auction_status, auction_end_at, status')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false });

      if (refreshedData) {
        const allProductsData = refreshedData as Product[];
        const activeProducts: Product[] = [];
        const paused: Product[] = [];
        const endedAuctions: Product[] = [];
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        allProductsData.forEach(product => {
          if (product.status === 'paused') {
            paused.push(product);
            return;
          }

          if (product.sale_type === 'auction') {
            const isEnded = product.auction_status === 'ended' || 
                           product.auction_status === 'cancelled' ||
                           (product.auction_end_at && new Date(product.auction_end_at) <= now);
            if (isEnded) {
              if (product.auction_end_at) {
                const endDate = new Date(product.auction_end_at);
                if (endDate > thirtyDaysAgo) {
                  endedAuctions.push(product);
                }
              } else {
                endedAuctions.push(product);
              }
            } else {
              activeProducts.push(product);
            }
          } else {
            activeProducts.push(product);
          }
        });

        setFinishedAuctions(endedAuctions);
        setPausedProducts(paused);
        setAllProducts(activeProducts);

        // Aplicar filtro actual
        if (filterType === 'paused') {
          setProducts(paused);
        } else if (filterType === 'direct') {
          setProducts(activeProducts.filter(p => p.sale_type === 'direct'));
        } else if (filterType === 'auction') {
          setProducts(activeProducts.filter(p => p.sale_type === 'auction'));
        } else {
          setProducts(activeProducts);
        }
      }
    } catch (err: any) {
      logger.error('Error reactivando producto', err, { productId });
      alert('Error al reactivar producto: ' + err.message);
    } finally {
      setReactivatingId(null);
    }
  }

  async function toggleShowcase(productId: string, currentStatus: boolean) {
    // Validar límite antes de agregar
    if (!currentStatus && showcaseProducts.length >= 2) {
      toast.error('Ya tienes 2 productos en la vitrina. Quita uno primero para agregar otro.');
      return;
    }

    // Validar que el vendedor tenga tienda activa (requerido por la vitrina)
    if (!storeId || storeStatus !== 'active') {
      toast.error('Necesitas tener una tienda activa para usar la vitrina.');
      return;
    }

    // Validar que el producto esté activo
    const product = allProducts.find(p => p.id === productId);
    if (!currentStatus && product && product.status !== 'active') {
      toast.error('Solo puedes agregar productos activos a la vitrina.');
      return;
    }

    setUpdatingShowcase(productId);
    
    try {
      const newStatus = !currentStatus;
      const newPosition = newStatus ? (showcaseProducts.length + 1) : null;

      const { error } = await supabase
        .from('products')
        .update({
          in_showcase: newStatus,
          showcase_position: newStatus ? newPosition : null,
        })
        .eq('id', productId);

      if (error) throw error;

      // Actualizar estado local sin reload
      setAllProducts(prev => prev.map(p => 
        p.id === productId 
          ? { ...p, in_showcase: newStatus, showcase_position: newPosition }
          : p
      ));

      setProducts(prev => prev.map(p => 
        p.id === productId 
          ? { ...p, in_showcase: newStatus, showcase_position: newPosition }
          : p
      ));

      // Actualizar showcaseProducts
      if (newStatus) {
        // Agregar a vitrina
        if (product) {
          setShowcaseProducts(prev => [...prev, { ...product, in_showcase: true, showcase_position: newPosition }]);
        }
      } else {
        // Quitar de vitrina y reordenar posiciones de los productos restantes
        setShowcaseProducts(prev => {
          const filtered = prev.filter(p => p.id !== productId);
          // Actualizar posiciones en la base de datos para los productos restantes
          filtered.forEach((p, idx) => {
            const newPos = idx + 1;
            if (p.showcase_position !== newPos) {
              // Actualizar posición en BD (sin await, fire and forget)
              supabase
                .from('products')
                .update({ showcase_position: newPos })
                .eq('id', p.id)
                .then(({ error }) => {
                  if (error) {
                    logger.warn('Error actualizando posición en vitrina', error, { productId: p.id });
                  }
                });
            }
          });
          return filtered.map((p, idx) => ({ ...p, showcase_position: idx + 1 }));
        });
      }

      toast.success(newStatus ? 'Producto agregado a la vitrina' : 'Producto quitado de la vitrina');
    } catch (err: any) {
      logger.error('Error al actualizar vitrina', err);
      toast.error('Error: ' + (err.message || 'No se pudo actualizar la vitrina'));
    } finally {
      setUpdatingShowcase(null);
    }
  }

  async function reactivateAllPausedProducts() {
    if (!confirm('¿Deseas reactivar todos los productos pausados? Se reactivarán solo los que tu plan actual permita.')) {
      return;
    }

    try {
      const { reactivatePausedProductsOnRenewal } = await import('@/lib/services/productExpirationService');
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        throw new Error('No hay sesión activa');
      }

      const result = await reactivatePausedProductsOnRenewal(session.session.user.id);
      
      if (result.products_reactivated > 0) {
        alert(`✅ Se reactivaron ${result.products_reactivated} producto(s). ${result.message}`);
      } else {
        alert(`ℹ️ ${result.message}`);
      }

      // Recargar productos
      window.location.reload();
    } catch (err: any) {
      logger.error('Error reactivando productos pausados', err);
      alert('Error al reactivar productos: ' + err.message);
    }
  }

  async function deleteProduct(productId: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.')) {
      return;
    }

    setDeletingId(productId);
    
    try {
      // Intentar vía API interna con service role (bypasa RLS) y abortar el flujo anterior
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const resp = await fetch('/api/products/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: 'include', // Importante: enviar cookies de sesión
        body: JSON.stringify({ productId })
      });

      const result = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        const errorMsg = result?.error || 'No se pudo eliminar el producto';
        logger.error('[delete-product] Error del endpoint', { 
          status: resp.status, 
          error: errorMsg, 
          productId 
        });
        alert(`Error al eliminar producto: ${errorMsg}`);
        setDeletingId(null);
        return;
      }

      if (!result.success) {
        logger.error('[delete-product] Endpoint retornó success=false', { result, productId });
        alert(`Error al eliminar producto: ${result.error || 'Error desconocido'}`);
        setDeletingId(null);
        return;
      }

      logger.info('[delete-product] ✅ Producto eliminado correctamente', { productId, deleted: result.deleted });
      alert('Producto eliminado exitosamente');
      window.location.reload();
      return;
    } catch (apiErr: any) {
      logger.error('[delete-product] Error en llamada API', apiErr, { productId });
      alert(`Error al eliminar producto: ${apiErr?.message || 'Error desconocido'}`);
      setDeletingId(null);
      return;
    }

    try {
      logger.debug('Eliminando producto', { productId });
      
      // 0. Verificar que el producto existe y que el usuario es el dueño
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        throw new Error('No hay sesión activa');
      }
      
      const userId = session.session.user.id;
      
      // Verificar que el producto existe y pertenece al usuario
      const { data: productToDelete, error: checkError } = await supabase
        .from('products')
        .select('id, seller_id, title')
        .eq('id', productId)
        .single();
      
      if (checkError || !productToDelete) {
        logger.error('Producto no encontrado o error al verificar', checkError, { productId });
        throw new Error('Producto no encontrado');
      }
      
      type ProductWithSeller = { id: string; seller_id: string; title: string };
      const product = productToDelete as ProductWithSeller;
      
      if (product.seller_id !== userId) {
        logger.warn('El producto no pertenece al usuario actual', { 
          productId, 
          productSellerId: product.seller_id, 
          currentUserId: userId 
        });
        throw new Error('No tienes permiso para eliminar este producto');
      }
      
      logger.debug('Verificación: Producto pertenece al usuario. Eliminando...', {
        productId,
        title: product.title,
        sellerId: product.seller_id,
        currentUserId: userId
      });
      
      // 1. Obtener imágenes del producto para eliminarlas del storage
      const { data: images } = await supabase
        .from('product_images')
        .select('url')
        .eq('product_id', productId);

      logger.debug('Imágenes encontradas', { count: images?.length || 0, productId });

      // 2. Verificar sesión antes de DELETE
      const { data: currentSession } = await supabase.auth.getSession();
      logger.debug('Sesión actual', {
        hasSession: !!currentSession?.session,
        userId: currentSession?.session?.user?.id,
        email: currentSession?.session?.user?.email
      });
      
      if (!currentSession?.session) {
        throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
      }
      
      // 2. Eliminar producto - Usar solo ID, dejar que RLS verifique seller_id
      logger.debug('Intentando DELETE', {
        productId,
        productSellerId: product.seller_id,
        currentUserId: currentSession.session.user.id,
        match: product.seller_id === currentSession.session.user.id
      });
      
      // IMPORTANTE: No usar .eq('seller_id') en el DELETE
      // La política RLS ya verifica que auth.uid() = seller_id
      // Si agregamos .eq('seller_id'), puede causar conflictos con RLS
      let deleteError: any = null;
      let count: number | null = null;
      
      try {
        // Intentar DELETE simple
        const deleteResult = await supabase
          .from('products')
          .delete({ count: 'exact' })
          .eq('id', productId); // Solo filtrar por ID, RLS manejará el seller_id
        
        deleteError = deleteResult.error;
        count = deleteResult.count;
        
        logger.debug('Resultado del DELETE', {
          error: deleteError,
          count,
          countType: typeof count,
          hasError: !!deleteError,
          errorCode: deleteError?.code,
          errorMessage: deleteError?.message,
          productId
        });
        
        // Si count es 0, intentar usar función SQL que evita problemas de RLS
        if ((count === 0 || count === null) && !deleteError) {
          logger.warn('DELETE retornó count: 0. Intentando con función SQL', { productId });
          
          // Usar función SQL que tiene SECURITY DEFINER para evitar problemas de RLS
          const { data: rpcResult, error: rpcError } = await (supabase as any)
            .rpc('delete_user_product', { product_id_to_delete: productId });
          
          if (rpcError) {
            logger.error('Error al usar función SQL', rpcError, { productId });
            // Continuar con el error original
          } else if (rpcResult === true) {
            logger.info('Producto eliminado usando función SQL', { productId });
            count = 1; // Marcar como exitoso
          } else {
            logger.error('Función SQL retornó false - el producto no se eliminó', undefined, { productId });
          }
        }
      } catch (err: any) {
        deleteError = err;
        logger.error('Error capturado en DELETE', err, { productId });
      }

      if (deleteError) {
        logger.error('Error al eliminar producto', deleteError, {
          productId,
          code: deleteError.code,
          message: deleteError.message,
          details: deleteError.details,
          hint: deleteError.hint
        });
        throw deleteError;
      }

      logger.debug('DELETE ejecutado', { count, type: typeof count, productId });

      // Si count es 0 o null, verificar si la función SQL ya lo resolvió
      if (count === 0 || count === null) {
        // Verificar si el producto todavía existe (por si la función SQL no funcionó)
        const { data: finalCheck } = await supabase
          .from('products')
          .select('id, seller_id, title')
          .eq('id', productId)
          .single();
        
        if (finalCheck) {
          // El producto todavía existe - esto significa que ni el DELETE ni la función SQL funcionaron
          logger.error('CRÍTICO: DELETE no eliminó ningún registro', undefined, {
            productId,
            count,
            posiblesCausas: [
              'La política RLS está bloqueando el DELETE',
              'El seller_id no coincide (aunque verificamos antes)'
            ]
          });
          logger.error('Producto que intentamos eliminar todavía existe', undefined, {
            productId,
            userId,
            productSellerId: product.seller_id,
            match: product.seller_id === userId,
            productoFinal: finalCheck
          });
          type FinalCheckProduct = { seller_id: string };
          throw new Error(`No se pudo eliminar el producto. Posible problema de permisos RLS. Producto ID: ${productId}, Seller ID: ${(finalCheck as FinalCheckProduct).seller_id}, Usuario: ${userId}`);
        } else {
          // El producto ya no existe - la función SQL funcionó, aunque count sea 0
          logger.info('El producto fue eliminado correctamente por la función SQL', { productId });
          count = 1; // Actualizar count para continuar con el flujo normal
        }
      }
      
      // Si llegamos aquí, la eliminación fue exitosa
      logger.info('Producto eliminado correctamente', { productId, count });

      // Esperar un momento para que la transacción se complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // 4. Eliminar imágenes del storage
      if (images && images.length > 0) {
        const fileNames = images.map((img: { url: string }) => {
          const url = img.url;
          const match = url.match(/products\/([^\/]+)\/(.+)$/);
          return match ? `${match[1]}/${match[2]}` : null;
        }).filter(Boolean);

        if (fileNames.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('product-images')
            .remove(fileNames.filter((name): name is string => name !== null));

          if (storageError) {
            logger.warn('Error eliminando imágenes del storage', storageError, { productId });
          } else {
            logger.debug('Imágenes eliminadas del storage', { productId, imageCount: images?.length || 0 });
          }
        }
      }

      // 5. Actualizar lista local
      setAllProducts(prev => prev.filter(p => p.id !== productId));
      setProducts(prev => prev.filter(p => p.id !== productId));
      setFinishedAuctions(prev => prev.filter(p => p.id !== productId));

      // 6. Recargar productos desde la base de datos para asegurar sincronización
      logger.debug('Recargando productos desde la base de datos', { productId });
      if (userId) {
        // Esperar un poco más para asegurar que la eliminación se complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: refreshedProducts, error: reloadError } = await supabase
          .from('products')
          .select('id, title, price, cover_url, created_at, sale_type, auction_status, auction_end_at')
          .eq('seller_id', userId)
          .order('created_at', { ascending: false });

        if (reloadError) {
          logger.error('Error al recargar productos', reloadError, { productId });
        } else if (refreshedProducts) {
          // Verificar que el producto eliminado no esté en la lista
          type RefreshedProduct = { id: string };
          const deletedProductStillExists = (refreshedProducts as RefreshedProduct[]).some(p => p.id === productId);
          if (deletedProductStillExists) {
            logger.warn('ADVERTENCIA: El producto eliminado todavía aparece en la lista recargada', undefined, {
              productId,
              totalProductosRecargados: refreshedProducts.length
            });
            // Continuar de todos modos, pero mostrar advertencia
          } else {
            logger.debug('Producto confirmado como eliminado - no aparece en lista recargada', { productId });
          }
          
          const allRefreshed = refreshedProducts as Product[];
          
          // Primero, actualizar estados de subastas que deberían estar finalizadas
          const now = new Date();
          for (const product of allRefreshed) {
            if (product.sale_type === 'auction' && 
                product.auction_status === 'active' && 
                product.auction_end_at) {
              const endDate = new Date(product.auction_end_at as string);
              if (endDate <= now) {
                try {
                  await (supabase as any)
                    .from('products')
                    .update({ 
                      auction_status: 'ended',
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', product.id);
                } catch (updateError) {
                  logger.error('Error al actualizar subasta', updateError, { productId: product.id });
                }
              }
            }
          }
          
          // Recargar nuevamente después de las actualizaciones
          const { data: finalRefreshed } = await supabase
            .from('products')
            .select('id, title, price, cover_url, created_at, sale_type, auction_status, auction_end_at')
            .eq('seller_id', userId)
            .order('created_at', { ascending: false });
          
          const finalProducts = (finalRefreshed || allRefreshed) as Product[];
          
          // Separar subastas finalizadas de productos activos
          const activeRefreshed: Product[] = [];
          const endedRefreshed: Product[] = [];
          
          finalProducts.forEach(product => {
            if (product.sale_type === 'auction') {
              const isEnded = product.auction_status === 'ended' || 
                             product.auction_status === 'cancelled' ||
                             (product.auction_end_at && new Date(product.auction_end_at) <= now);
              if (isEnded) {
                endedRefreshed.push(product);
              } else {
                activeRefreshed.push(product);
              }
            } else {
              activeRefreshed.push(product);
            }
          });
          
          logger.debug('Productos recargados', {
            total: allRefreshed.length,
            active: activeRefreshed.length,
            finished: endedRefreshed.length
          });
          
          setFinishedAuctions(endedRefreshed);
          setAllProducts(activeRefreshed);
          
          // Aplicar filtro actual
          if (filterType === 'direct') {
            setProducts(activeRefreshed.filter((p: any) => p.sale_type === 'direct') as Product[]);
          } else if (filterType === 'auction') {
            setProducts(activeRefreshed.filter((p: any) => p.sale_type === 'auction') as Product[]);
          } else {
            setProducts(activeRefreshed);
          }
        }
      }

      // Verificar una vez más antes de mostrar éxito
      const { data: finalVerify } = await supabase
        .from('products')
        .select('id')
        .eq('id', productId)
        .single();
      
      if (finalVerify) {
        // El producto todavía existe - hubo un error real
        logger.error('El producto todavía existe después del DELETE', undefined, { productId, count });
        throw new Error('No se pudo eliminar el producto. El producto todavía existe en la base de datos.');
      } else {
        // El producto fue eliminado exitosamente (verificado en la base de datos)
        logger.info('Eliminación confirmada: el producto ya no existe en la base de datos', { productId });
        toast.success('✅ Producto eliminado correctamente');
      }

    } catch (err: any) {
      logger.error('Error completo al eliminar producto', err, { productId });
      toast.error('Error al eliminar producto: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex">
      <DashboardSidebar 
        onCollapseChange={setSidebarCollapsed}
        onStatsClick={() => setStatsPanelOpen(true)}
      />
      
      <StatsPanel
        isOpen={statsPanelOpen}
        onClose={() => setStatsPanelOpen(false)}
        stats={stats}
        sellerId={role === 'seller' ? (storeId || '') : ''}
        storeId={storeId}
      />
      
      <div className={`flex-1 min-w-0 p-4 sm:p-6 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-64'}`}>
      {(role === 'seller' || (role === null && loading)) && (
        <SellerHomeHeader
          stats={stats}
          statsLoading={statsLoading}
          isSeller={role === 'seller' || (role === null && loading)}
          filterType={filterType}
          allProductsCount={allProducts.length}
          finishedAuctionsCount={finishedAuctions.length}
          showcaseProducts={showcaseProducts}
          storeSlug={storeSlug}
          hasProducts={allProducts.length > 0}
          updatingShowcase={updatingShowcase}
          onFilterChange={(type) => {
            setFilterType(type);
            if (type === 'all') setProducts(allProducts);
            else if (type === 'direct') setProducts(allProducts.filter((p) => p.sale_type === 'direct'));
            else if (type === 'auction') setProducts(allProducts.filter((p) => p.sale_type === 'auction'));
            else if (type === 'finished_auctions') setProducts(finishedAuctions);
            else if (type === 'paused') setProducts(pausedProducts);
          }}
          onRemoveFromShowcase={(productId) => toggleShowcase(productId, true)}
        />
      )}

      {role !== 'seller' && role !== null && !loading && (
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Mi cuenta</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Pedidos, pujas y sorteos en un solo lugar
          </p>
        </div>
      )}

      {/* Órdenes Recientes */}
      {(role === 'seller' || (role === null && loading)) && stats && stats.recentOrders && stats.recentOrders.length > 0 && (
        <div className="mb-6">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                Pedidos recientes
              </h3>
              <Link
                href="/dashboard/orders"
                className="text-sm text-[hsl(var(--primary))] hover:underline font-medium"
              >
                Ver todos
              </Link>
            </div>
            <div className="space-y-2">
              {stats.recentOrders.slice(0, 3).map((order: any) => (
                <Link
                  key={order.id}
                  href="/dashboard/orders"
                  className="flex items-center justify-between p-3 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      order.status === 'pending' ? 'bg-amber-500' :
                      order.status === 'confirmed' ? 'bg-blue-500' :
                      order.status === 'shipped' ? 'bg-violet-500' :
                      order.status === 'delivered' ? 'bg-[hsl(var(--primary))]' :
                      'bg-gray-400'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                        Orden #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {new Date(order.created_at).toLocaleDateString('es-PY')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                      {order.total_amount.toLocaleString('es-PY')} Gs.
                    </p>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {order.status === 'pending' ? 'Pendiente' :
                       order.status === 'confirmed' ? 'Confirmado' :
                       order.status === 'shipped' ? 'Enviado' :
                       order.status === 'delivered' ? 'Entregado' :
                       order.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {(role !== 'seller' || storeStatus !== 'active') && (
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ocultar "Mi Perfil & Tienda" cuando la tienda está activa */}
            {storeStatus !== 'active' && (
              <Link
                href="/dashboard/profile"
                className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center">
                    <User className="w-6 h-6 text-[hsl(var(--primary))]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[hsl(var(--foreground))]">Mi perfil</h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Foto, portada e información personal</p>
                  </div>
                </div>
              </Link>
            )}
            {role !== 'seller' && (
            <Link
              href="/dashboard/my-bids"
              className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center">
                  <Target className="w-6 h-6 text-[hsl(var(--primary))]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))]">Mis pujas</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Subastas activas y ganadas</p>
                </div>
              </div>
            </Link>
            )}
        {role !== 'seller' ? (
          <Link href="/dashboard/become-seller" className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center">
                <Store className="w-6 h-6 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <h3 className="font-semibold text-[hsl(var(--foreground))]">Vender en Mercadito</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Solicitar verificación de tienda</p>
              </div>
            </div>
          </Link>
        ) : storeStatus === 'pending' ? (
          <Link href="/dashboard/profile" className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="font-semibold text-[hsl(var(--foreground))]">Verificación en proceso</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Completá los datos de tu tienda mientras revisamos</p>
              </div>
            </div>
          </Link>
        ) : storeStatus !== 'active' ? (
          <Link href="/dashboard/profile" className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center">
                <Store className="w-6 h-6 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <h3 className="font-semibold text-[hsl(var(--foreground))]">Configurar tienda</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Logo, contacto y ubicación</p>
              </div>
            </div>
          </Link>
        ) : null}
      </div>
      )}

      {role === 'seller' && (loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-[hsl(var(--primary))] border-t-transparent mx-auto mb-4"></div>
            <p className="text-[hsl(var(--muted-foreground))]">Cargando…</p>
          </div>
        </div>
      ) : (filterType === 'finished_auctions' ? finishedAuctions.length === 0 : 
           filterType === 'paused' ? pausedProducts.length === 0 :
           products.length === 0) ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-[hsl(var(--border))] bg-white">
          <Package className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
          <h2 className="text-xl font-medium text-[hsl(var(--foreground))] mb-2">
            {filterType === 'finished_auctions' 
              ? 'No tenés subastas finalizadas' 
              : filterType === 'paused'
              ? 'No tenés productos pausados'
              : role === 'seller'
              ? 'Todavía no publicaste productos'
              : 'Sin productos para mostrar'}
          </h2>
          <p className="text-[hsl(var(--muted-foreground))] mb-6 max-w-md mx-auto px-4">
            {filterType === 'finished_auctions'
              ? 'Las subastas finalizadas se guardan acá hasta 30 días.'
              : filterType === 'paused'
              ? 'Todos tus productos están activos.'
              : 'Publicá tu primer producto para empezar a vender.'}
          </p>
          {filterType !== 'finished_auctions' && filterType !== 'paused' && role === 'seller' && (
            <Link
              href="/dashboard/new-product"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[hsl(var(--primary))] text-white hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Crear producto
            </Link>
          )}
          {filterType === 'paused' && (
            <button
              onClick={() => {
                setFilterType('all');
                setProducts(allProducts);
              }}
              className="px-6 py-3 rounded bg-gray-700 text-white hover:bg-gray-600 transition-colors"
            >
              Ver todos los productos
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {role === 'seller' && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              {filterType === 'all' 
                ? 'Listado de productos' 
                : filterType === 'direct' 
                ? 'Precio fijo' 
                : filterType === 'auction'
                ? 'Subastas'
                : filterType === 'paused'
                ? 'Pausados'
                : 'Finalizadas'} ({
                filterType === 'finished_auctions' ? finishedAuctions.length :
                filterType === 'paused' ? pausedProducts.length :
                products.length
              })
            </h2>
          </div>
          )}
          {filterType === 'auction' && products.length === 0 && (
            <div className="text-center py-12 bg-yellow-900/20 border border-yellow-700 rounded-lg">
              <div className="text-6xl mb-4">🔨</div>
              <h2 className="text-xl font-medium text-gray-400 mb-2">No tienes subastas</h2>
              <p className="text-gray-500 mb-6">Crea una nueva subasta desde el formulario de producto</p>
              <Link
                href="/dashboard/new-product"
                className="px-6 py-3 rounded bg-gray-700 text-white hover:bg-gray-600 transition-colors inline-block"
              >
                Crear subasta
              </Link>
            </div>
          )}
          {filterType === 'direct' && products.length === 0 && (
            <div className="text-center py-12 bg-blue-900/20 border border-blue-700 rounded-lg">
              <div className="text-6xl mb-4">💰</div>
              <h2 className="text-xl font-medium text-gray-400 mb-2">No tienes productos con precio fijo</h2>
              <p className="text-gray-500 mb-6">Crea un nuevo producto desde el formulario</p>
              <Link
                href="/dashboard/new-product"
                className="px-6 py-3 rounded bg-gray-700 text-white hover:bg-gray-600 transition-colors inline-block"
              >
                Crear producto
              </Link>
            </div>
          )}
          {/* Banner de productos pausados */}
          {pausedProducts.length > 0 && filterType !== 'paused' && (
            <div className="mb-6 bg-orange-900/30 border border-orange-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-orange-400 text-xl">⏸️</div>
                <div className="flex-1">
                  <p className="text-sm text-orange-300 font-medium mb-1">
                    Tienes {pausedProducts.length} producto(s) pausado(s)
                  </p>
                  <p className="text-xs text-orange-400 mb-3">
                    Estos productos fueron pausados automáticamente porque tu membresía expiró o porque excediste los límites de tu plan.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setFilterType('paused');
                        setProducts(pausedProducts);
                      }}
                      className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-sm font-medium"
                    >
                      Ver productos pausados
                    </button>
                    <button
                      onClick={reactivateAllPausedProducts}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      🔄 Reactivar todos
                    </button>
                    <Link
                      href="/memberships"
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      💎 Actualizar membresía
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Vista para productos pausados */}
          {filterType === 'paused' && (
            <>
              <div className="mb-6 bg-orange-900/30 border border-orange-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-orange-300 mb-2">
                      ⏸️ Productos Pausados ({pausedProducts.length})
                    </h3>
                    <p className="text-sm text-orange-400">
                      Estos productos fueron pausados automáticamente. Reactívalos individualmente o actualiza tu membresía para reactivarlos todos.
                    </p>
                  </div>
                  <button
                    onClick={reactivateAllPausedProducts}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    🔄 Reactivar todos
                  </button>
                </div>
              </div>
              {pausedProducts.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✅</div>
                  <h2 className="text-xl font-medium text-gray-400 mb-2">
                    No tienes productos pausados
                  </h2>
                  <p className="text-gray-500 mb-6">
                    Todos tus productos están activos
                  </p>
                </div>
              )}
            </>
          )}

          {(filterType === 'finished_auctions' ? finishedAuctions.length > 0 : 
            filterType === 'paused' ? pausedProducts.length > 0 :
            products.length > 0) && (
            <>
              {/* Vista Rápida de Productos - Mini Grid */}
              {role === 'seller' && filterType !== 'finished_auctions' && filterType !== 'paused' && (
                <div className="mb-6 bg-[#252525] rounded-lg border border-gray-700 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-200 flex items-center gap-2">
                      <Package className="w-5 h-5 text-gray-400" />
                      Vista Rápida de Productos
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {allProducts.slice(0, 6).map((product) => (
                      <Link
                        key={product.id}
                        href={`/dashboard/edit-product/${product.id}`}
                        className="group relative"
                      >
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-700 mb-2 border-2 border-transparent group-hover:border-blue-500 transition-all">
                          {product.cover_url ? (
                            <Image
                              src={product.cover_url}
                              alt={product.title}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform"
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-8 h-8 text-gray-500" />
                            </div>
                          )}
                          {product.sale_type === 'auction' && (
                            <div className="absolute top-1 right-1 bg-yellow-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                              🔨
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-medium text-gray-200 line-clamp-2 group-hover:text-blue-400 transition-colors">
                          {product.title}
                        </p>
                        <p className="text-xs text-emerald-400 font-semibold mt-1">
                          {product.price.toLocaleString('es-PY')} Gs.
                        </p>
                      </Link>
                    ))}
                  </div>
                  {allProducts.length > 6 && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => {
                          const element = document.getElementById('all-products');
                          element?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Ver todos los productos ({allProducts.length}) ↓
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Mensaje informativo para subastas finalizadas */}
              {filterType === 'finished_auctions' && finishedAuctions.length > 0 && (
                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="text-blue-400 text-xl">ℹ️</div>
                    <div className="flex-1">
                      <p className="text-sm text-blue-300 font-medium mb-1">
                        Información importante
                      </p>
                      <p className="text-xs text-blue-400">
                        Las subastas finalizadas se eliminan automáticamente después de 30 días desde su fecha de finalización para optimizar el almacenamiento. 
                        Si necesitas conservar la información, descárgala antes del plazo.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div id="all-products" className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {(filterType === 'finished_auctions' ? finishedAuctions : 
                  filterType === 'paused' ? pausedProducts : 
                  products).map((product) => {
                const isAuction = product.sale_type === 'auction';
                const isDirect = product.sale_type === 'direct';
                const isFinishedAuction = filterType === 'finished_auctions';
                const isPaused = filterType === 'paused' || product.status === 'paused';
                
                // Validación de filtro
                if (filterType === 'auction' && !isAuction) {
                  console.warn('⚠️ Producto sin sale_type="auction" en vista de subastas:', {
                    id: product.id,
                    title: product.title,
                    sale_type: product.sale_type
                  });
                }
                if (filterType === 'direct' && !isDirect) {
                  logger.warn('Producto sin sale_type="direct" en vista de precios fijos', undefined, {
                    id: product.id,
                    title: product.title,
                    sale_type: product.sale_type
                  });
                }
                
                return (
                <div key={product.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden relative ${
                  isFinishedAuction ? 'opacity-75 border-[hsl(var(--border))]' :
                  isPaused ? 'border-amber-300 border-2' :
                  product.in_showcase ? 'border-[hsl(var(--primary))] border-2' :
                  'border-[hsl(var(--border))]'
                }`}>
                  {product.in_showcase && !isPaused && !isFinishedAuction && (
                    <div className="absolute top-2 left-2 bg-[hsl(var(--primary))] text-white text-xs font-bold px-2 py-1 rounded-lg z-10 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      Vitrina {product.showcase_position || ''}
                    </div>
                  )}
                  {isPaused && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-lg z-10">
                      Pausado
                    </div>
                  )}
                  {isFinishedAuction && !isPaused && (
                    <div className="absolute top-2 right-2 bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded-lg z-10">
                      Finalizada
                    </div>
                  )}
                  {isAuction && !isFinishedAuction && !isPaused && !product.in_showcase && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-lg z-10">
                      Subasta
                    </div>
                  )}
                  {product.cover_url && (
                    <img
                      src={product.cover_url}
                      alt={product.title}
                      className={`w-full h-40 sm:h-48 object-cover ${
                        isFinishedAuction || isPaused ? 'grayscale opacity-60' : ''
                      }`}
                    />
                  )}
                  {!product.cover_url && (isFinishedAuction || isPaused) && (
                    <div className="w-full h-40 sm:h-48 bg-[hsl(var(--muted))] flex items-center justify-center">
                      <Package className="w-12 h-12 text-[hsl(var(--muted-foreground))]" />
                    </div>
                  )}
                  <div className="p-3 sm:p-4">
                    <h3 className={`font-medium text-base sm:text-lg mb-2 line-clamp-2 ${isFinishedAuction ? 'text-[hsl(var(--muted-foreground))]' : 'text-[hsl(var(--foreground))]'}`}>{product.title}</h3>
                    <p className={`text-lg sm:text-2xl font-bold mb-3 ${isFinishedAuction ? 'text-[hsl(var(--muted-foreground))]' : 'text-[hsl(var(--primary))]'}`}>
                      {product.price.toLocaleString()} Gs.
                      {isFinishedAuction && (
                        <span className="block text-xs text-gray-500 font-normal mt-1">Precio base final</span>
                      )}
                      {isAuction && !isFinishedAuction && (
                        <span className="block text-xs text-yellow-400 font-normal mt-1">Precio base</span>
                      )}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {isPaused ? (
                        <>
                          <button
                            onClick={() => reactivateProduct(product.id)}
                            disabled={reactivatingId === product.id}
                            className="flex-1 px-3 py-2 rounded-lg text-center transition-colors text-sm bg-[hsl(var(--primary))] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {reactivatingId === product.id ? 'Reactivando…' : 'Reactivar'}
                          </button>
                          <Link
                            href={`/dashboard/edit-product/${product.id}`}
                            className="flex-1 px-3 py-2 rounded-lg text-center transition-colors text-sm border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                          >
                            Ver detalles
                          </Link>
                          <Link
                            href="/memberships"
                            className="px-3 py-2 rounded-lg text-center transition-colors text-sm border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))]"
                          >
                            Membresía
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            href={`/dashboard/edit-product/${product.id}`}
                            className={`flex-1 px-3 py-2 rounded-lg text-center transition-colors text-sm ${
                              isFinishedAuction 
                                ? 'border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]' 
                                : 'bg-[hsl(var(--primary))] text-white hover:opacity-90'
                            }`}
                          >
                            {isFinishedAuction ? 'Ver detalles' : 'Editar'}
                          </Link>
                          <Link
                            href={`/products/${product.id}`}
                            className="flex-1 px-3 py-2 rounded-lg text-center transition-colors text-sm border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                          >
                            Ver público
                          </Link>
                          {!isFinishedAuction && product.status === 'active' && (
                            <button
                              onClick={() => toggleShowcase(product.id, product.in_showcase || false)}
                              disabled={updatingShowcase === product.id || (!product.in_showcase && showcaseProducts.length >= 2)}
                              className={`px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm border ${
                                product.in_showcase
                                  ? 'border-[hsl(var(--primary))] bg-[hsl(var(--muted))] text-[hsl(var(--primary))]'
                                  : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                              }`}
                              title={product.in_showcase ? 'Quitar de vitrina' : (showcaseProducts.length >= 2 ? 'Límite alcanzado (2 productos)' : 'Agregar a vitrina')}
                            >
                              {updatingShowcase === product.id ? '…' : (product.in_showcase ? 'En vitrina' : 'Vitrina')}
                            </button>
                          )}
                          {!isFinishedAuction && (
                            <button
                              onClick={() => deleteProduct(product.id)}
                              disabled={deletingId === product.id}
                              className="px-3 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              {deletingId === product.id ? '…' : 'Eliminar'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {isFinishedAuction && product.auction_end_at && (
                      <p className="text-xs text-gray-500 mt-2">
                        Finalizada: {new Date(product.auction_end_at).toLocaleDateString('es-PY')}
                      </p>
                    )}
                  </div>
                </div>
                );
              })}
              </div>
            </>
          )}

        </div>
      ))}

      {/* Admin Role Assigner - Temporalmente comentado para debug */}
      {/* <div className="mt-8">
      </div> */}
      </div>
    </div>
  );
}
