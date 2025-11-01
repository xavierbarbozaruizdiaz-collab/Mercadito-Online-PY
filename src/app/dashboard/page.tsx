'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
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
  TrendingDown
} from 'lucide-react';
import Image from 'next/image';
// import AdminRoleAssigner from '@/components/AdminRoleAssigner'; // Temporalmente comentado

type Product = {
  id: string;
  title: string;
  price: number;
  cover_url: string | null;
  created_at: string;
  sale_type: 'direct' | 'auction';
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
};

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]); // Todos los productos sin filtrar
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [role, setRole] = useState<'buyer' | 'seller' | 'admin' | null>(null);
  const [storeStatus, setStoreStatus] = useState<'none' | 'pending' | 'active'>('none');
  const [filterType, setFilterType] = useState<'all' | 'direct' | 'auction'>('all');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);

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
            .select('is_active, settings, slug')
            .eq('seller_id', session.session.user.id)
            .maybeSingle();
          if (s) {
            const pending = (s as any).settings?.verification_status === 'pending' || (s as any).is_active === false;
            setStoreStatus(pending ? 'pending' : 'active');
            // Obtener slug de la tienda para el enlace
            if ((s as any).slug) {
              setStoreSlug((s as any).slug);
            }
          } else {
            setStoreStatus('none');
          }

          // Cargar estadísticas del vendedor
          await loadSellerStats(session.session.user.id);
        }

        // Cargar productos SIN caché para asegurar datos actualizados
        const { data, error } = await supabase
          .from('products')
          .select('id, title, price, cover_url, created_at, sale_type')
          .eq('seller_id', session.session.user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error al cargar productos:', error);
          throw error;
        }
        
        const productsData = (data || []) as Product[];
        console.log('📦 Productos cargados desde BD:', {
          total: productsData.length,
          auctions: productsData.filter(p => p.sale_type === 'auction').length,
          direct: productsData.filter(p => p.sale_type === 'direct').length,
          productIds: productsData.map(p => p.id),
          products: productsData.map(p => ({ id: p.id, title: p.title, sale_type: p.sale_type }))
        });
        
        // Los productos ya están filtrados por seller_id, así que confiamos en la query
        // Si hay productos eliminados, no deberían aparecer por RLS
        setAllProducts(productsData);
        setProducts(productsData);
      } catch (err) {
        console.error('Error loading products:', err);
      } finally {
        setLoading(false);
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
      // Notificaciones de stock bajo (si existiera stock_quantity)
      // Por ahora solo órdenes

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
        notifications
      });
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    } finally {
      setStatsLoading(false);
    }
  }

  async function deleteProduct(productId: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.')) {
      return;
    }

    setDeletingId(productId);
    
    try {
      console.log('🗑️ Eliminando producto:', productId);
      
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
        console.error('❌ Producto no encontrado o error al verificar:', checkError);
        throw new Error('Producto no encontrado');
      }
      
      type ProductWithSeller = { id: string; seller_id: string; title: string };
      const product = productToDelete as ProductWithSeller;
      
      if (product.seller_id !== userId) {
        console.error('❌ El producto no pertenece al usuario actual');
        console.log('Producto seller_id:', product.seller_id);
        console.log('Usuario actual:', userId);
        throw new Error('No tienes permiso para eliminar este producto');
      }
      
      console.log('✅ Verificación: Producto pertenece al usuario. Eliminando...', {
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

      console.log('📸 Imágenes encontradas:', images?.length || 0);

      // 2. Verificar sesión antes de DELETE
      const { data: currentSession } = await supabase.auth.getSession();
      console.log('🔐 Sesión actual:', {
        hasSession: !!currentSession?.session,
        userId: currentSession?.session?.user?.id,
        email: currentSession?.session?.user?.email
      });
      
      if (!currentSession?.session) {
        throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
      }
      
      // 2. Eliminar producto - Usar solo ID, dejar que RLS verifique seller_id
      console.log('🔍 Intentando DELETE...');
      console.log('Verificando que auth.uid() coincide:', {
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
        
        console.log('📊 Resultado del DELETE:', {
          error: deleteError,
          count,
          countType: typeof count,
          hasError: !!deleteError,
          errorCode: deleteError?.code,
          errorMessage: deleteError?.message
        });
        
        // Si count es 0, intentar usar función SQL que evita problemas de RLS
        if ((count === 0 || count === null) && !deleteError) {
          console.warn('⚠️ DELETE retornó count: 0. Intentando con función SQL...');
          
          // Usar función SQL que tiene SECURITY DEFINER para evitar problemas de RLS
          const { data: rpcResult, error: rpcError } = await (supabase as any)
            .rpc('delete_user_product', { product_id_to_delete: productId });
          
          if (rpcError) {
            console.error('❌ Error al usar función SQL:', rpcError);
            // Continuar con el error original
          } else if (rpcResult === true) {
            console.log('✅ Producto eliminado usando función SQL');
            count = 1; // Marcar como exitoso
          } else {
            console.error('❌ Función SQL retornó false - el producto no se eliminó');
          }
        }
      } catch (err: any) {
        deleteError = err;
        console.error('❌ Error capturado en DELETE:', err);
      }

      if (deleteError) {
        console.error('❌ Error al eliminar producto:', deleteError);
        console.error('Detalles del error:', {
          code: deleteError.code,
          message: deleteError.message,
          details: deleteError.details,
          hint: deleteError.hint
        });
        throw deleteError;
      }

      console.log('🗑️ DELETE ejecutado. Resultado:', { count, type: typeof count });

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
          console.error('❌ CRÍTICO: DELETE no eliminó ningún registro');
          console.error('Posibles causas:');
          console.error('1. La política RLS está bloqueando el DELETE');
          console.error('2. El seller_id no coincide (aunque verificamos antes)');
          console.error('Producto que intentamos eliminar:', {
            productId,
            userId,
            productSellerId: product.seller_id,
            match: product.seller_id === userId
          });
          console.error('El producto todavía existe:', finalCheck);
          type FinalCheckProduct = { seller_id: string };
          throw new Error(`No se pudo eliminar el producto. Posible problema de permisos RLS. Producto ID: ${productId}, Seller ID: ${(finalCheck as FinalCheckProduct).seller_id}, Usuario: ${userId}`);
        } else {
          // El producto ya no existe - la función SQL funcionó, aunque count sea 0
          console.log('✅ El producto fue eliminado correctamente por la función SQL');
          count = 1; // Actualizar count para continuar con el flujo normal
        }
      }
      
      // Si llegamos aquí, la eliminación fue exitosa (count > 0)
      if (count > 0) {
        console.log('✅ Producto eliminado correctamente. Registros eliminados:', count);
      }

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
            console.warn('⚠️ Error eliminando imágenes del storage:', storageError);
          } else {
            console.log('✅ Imágenes eliminadas del storage');
          }
        }
      }

      // 5. Actualizar lista local
      setAllProducts(prev => prev.filter(p => p.id !== productId));
      setProducts(prev => prev.filter(p => p.id !== productId));

      // 6. Recargar productos desde la base de datos para asegurar sincronización
      console.log('🔄 Recargando productos desde la base de datos...');
      if (userId) {
        // Esperar un poco más para asegurar que la eliminación se complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: refreshedProducts, error: reloadError } = await supabase
          .from('products')
          .select('id, title, price, cover_url, created_at, sale_type')
          .eq('seller_id', userId)
          .order('created_at', { ascending: false });

        if (reloadError) {
          console.error('❌ Error al recargar productos:', reloadError);
        } else if (refreshedProducts) {
          // Verificar que el producto eliminado no esté en la lista
          type RefreshedProduct = { id: string };
          const deletedProductStillExists = (refreshedProducts as RefreshedProduct[]).some(p => p.id === productId);
          if (deletedProductStillExists) {
            console.error('⚠️ ADVERTENCIA: El producto eliminado todavía aparece en la lista recargada');
            console.log('Producto problemático ID:', productId);
            console.log('Total productos recargados:', refreshedProducts.length);
            // Continuar de todos modos, pero mostrar advertencia
          } else {
            console.log('✅ Producto confirmado como eliminado - no aparece en lista recargada');
          }
          
          console.log('✅ Productos recargados:', refreshedProducts.length);
          setAllProducts(refreshedProducts as Product[]);
          // Aplicar filtro actual
          if (filterType === 'direct') {
            setProducts(refreshedProducts.filter((p: any) => p.sale_type === 'direct') as Product[]);
          } else if (filterType === 'auction') {
            setProducts(refreshedProducts.filter((p: any) => p.sale_type === 'auction') as Product[]);
          } else {
            setProducts(refreshedProducts as Product[]);
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
        // El producto todavía existe - verificar si count indica éxito
        if (count && count > 0) {
          console.error('⚠️ El producto todavía existe después del DELETE');
          alert('⚠️ No se pudo confirmar la eliminación. Por favor, verifica en la base de datos o contacta al administrador.');
        } else {
          // Count es 0 pero el producto existe - hubo un error real
          throw new Error('No se pudo eliminar el producto. El producto todavía existe en la base de datos.');
        }
      } else {
        // El producto fue eliminado exitosamente (verificado en la base de datos)
        console.log('✅ Eliminación confirmada: el producto ya no existe en la base de datos');
        alert('✅ Producto eliminado correctamente');
      }

    } catch (err: any) {
      console.error('❌ Error completo al eliminar:', err);
      alert('Error al eliminar producto: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Panel del vendedor</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Link
            href="/orders"
            className="px-3 sm:px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors text-sm sm:text-base text-center"
          >
            📦 Mis pedidos
          </Link>
          {role === 'seller' && (
            <Link
              href="/dashboard/orders"
              className="px-3 sm:px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600 transition-colors text-sm sm:text-base text-center"
            >
              🛒 Mis ventas
            </Link>
          )}
          <button
            onClick={() => {
              setFilterType('all');
              console.log('📦 Mostrando todos los productos:', allProducts.length);
              setProducts(allProducts);
            }}
            className={`px-3 sm:px-4 py-2 rounded transition-colors text-sm sm:text-base text-center ${
              filterType === 'all'
                ? 'bg-gray-800 text-white hover:bg-gray-900' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-400'
            }`}
          >
            📦 Todos
          </button>
          <button
            onClick={() => {
              setFilterType('direct');
              const directProducts = allProducts.filter(p => p.sale_type === 'direct');
              console.log('💰 Filtrando precios fijos:', {
                total: allProducts.length,
                direct: directProducts.length,
                allProducts: allProducts.map(p => ({ id: p.id, title: p.title, sale_type: p.sale_type }))
              });
              setProducts(directProducts);
            }}
            className={`px-3 sm:px-4 py-2 rounded transition-colors text-sm sm:text-base text-center ${
              filterType === 'direct'
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300'
            }`}
          >
            💰 Precios fijos
          </button>
          <button
            onClick={() => {
              setFilterType('auction');
              const auctions = allProducts.filter(p => p.sale_type === 'auction');
              console.log('🔨 Filtrando subastas:', {
                total: allProducts.length,
                auctions: auctions.length,
                allProducts: allProducts.map(p => ({ id: p.id, title: p.title, sale_type: p.sale_type }))
              });
              setProducts(auctions);
            }}
            className={`px-3 sm:px-4 py-2 rounded transition-colors text-sm sm:text-base text-center ${
              filterType === 'auction'
                ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300'
            }`}
          >
            🔨 Mis subastas
          </button>
          <Link
            href="/dashboard/new-product"
            className="px-3 sm:px-4 py-2 rounded bg-black text-white hover:bg-gray-800 transition-colors text-sm sm:text-base text-center"
          >
            + Nuevo producto
          </Link>
        </div>
      </div>

      {/* Notificaciones Importantes */}
      {role === 'seller' && stats && stats.notifications.length > 0 && (
        <div className="mb-6 space-y-2">
          {stats.notifications.map((notif, idx) => (
            <Link
              key={idx}
              href={notif.link || '#'}
              className={`block p-4 rounded-lg border-l-4 transition-all hover:shadow-md ${
                notif.priority === 'high' 
                  ? 'bg-red-50 border-red-500' 
                  : notif.priority === 'medium'
                  ? 'bg-yellow-50 border-yellow-500'
                  : 'bg-blue-50 border-blue-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell className={`w-5 h-5 ${
                  notif.priority === 'high' ? 'text-red-600' :
                  notif.priority === 'medium' ? 'text-yellow-600' :
                  'text-blue-600'
                }`} />
                <p className={`flex-1 font-medium ${
                  notif.priority === 'high' ? 'text-red-800' :
                  notif.priority === 'medium' ? 'text-yellow-800' :
                  'text-blue-800'
                }`}>
                  {notif.message}
                </p>
                <ArrowUp className="w-4 h-4 text-gray-400 rotate-45" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Acciones Rápidas - Solo para vendedores */}
      {role === 'seller' && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/dashboard/new-product"
            className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4 shadow-md hover:shadow-lg transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">Nuevo Producto</p>
              <p className="text-xs text-blue-100">Crear publicación</p>
            </div>
          </Link>
          <Link
            href="/dashboard/orders"
            className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 shadow-md hover:shadow-lg transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">Mis Ventas</p>
              <p className="text-xs text-green-100">Gestionar órdenes</p>
            </div>
          </Link>
          <Link
            href="/dashboard/profile"
            className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-4 shadow-md hover:shadow-lg transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">Mi Perfil</p>
              <p className="text-xs text-purple-100">Editar información</p>
            </div>
          </Link>
          {storeSlug ? (
            <Link
              href={`/store/${storeSlug}`}
              className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-4 shadow-md hover:shadow-lg transition-all flex items-center gap-3 group"
            >
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">Ver Mi Tienda</p>
                <p className="text-xs text-orange-100">Vista pública</p>
              </div>
            </Link>
          ) : (
            <Link
              href="/dashboard/profile"
              className="bg-gradient-to-br from-gray-500 to-gray-600 text-white rounded-lg p-4 shadow-md hover:shadow-lg transition-all flex items-center gap-3 group"
            >
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">Configurar Tienda</p>
                <p className="text-xs text-gray-100">Crea tu tienda primero</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Estadísticas del Dashboard - Solo para vendedores */}
      {role === 'seller' && stats && (
        <div className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {/* Total de Productos */}
            <div className="bg-white rounded-lg border p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Productos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.activeProducts} activos</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Órdenes */}
            <div className="bg-white rounded-lg border p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Órdenes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                  {stats.pendingOrders > 0 && (
                    <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {stats.pendingOrders} pendientes
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Ingresos Mensuales */}
            <div className="bg-white rounded-lg border p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Este mes</p>
                  <p className="text-xl font-bold text-gray-900">
                    {stats.monthlyRevenue.toLocaleString('es-PY')} Gs.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Ingresos del mes</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Ingresos Totales */}
            <div className="bg-white rounded-lg border p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Ingresos Total</p>
                  <p className="text-xl font-bold text-green-600">
                    {stats.totalRevenue.toLocaleString('es-PY')} Gs.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{stats.totalCustomers} clientes</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Métricas de Rendimiento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-blue-700">Tasa de Conversión</p>
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-blue-900">
                  {stats.conversionRate.toFixed(1)}%
                </p>
                <div className="flex items-center gap-1 text-xs text-blue-700">
                  {stats.conversionRate > 10 ? (
                    <>
                      <ArrowUp className="w-3 h-3" />
                      <span>Excelente</span>
                    </>
                  ) : stats.conversionRate > 5 ? (
                    <>
                      <TrendingUp className="w-3 h-3" />
                      <span>Bueno</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-3 h-3" />
                      <span>Mejorar</span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {stats.totalOrders} ventas / {stats.activeProducts} productos activos
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-purple-700">Ticket Promedio</p>
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-900 mb-1">
                {stats.averageOrderValue.toLocaleString('es-PY')} Gs.
              </p>
              <p className="text-xs text-purple-600">
                Por orden realizada
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg border border-emerald-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-emerald-700">Crecimiento Mensual</p>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-900 mb-1">
                {stats.monthlyRevenue > 0 
                  ? ((stats.monthlyRevenue / Math.max(stats.totalRevenue - stats.monthlyRevenue, 1)) * 100).toFixed(0)
                  : '0'}%
              </p>
              <p className="text-xs text-emerald-600">
                {stats.monthlyRevenue.toLocaleString('es-PY')} Gs. este mes
              </p>
            </div>
          </div>

          {/* Gráfico de Tendencias de Ventas */}
          {stats.salesTrend.length > 0 && (
            <div className="bg-white rounded-lg border p-4 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                  Tendencia de Ventas (Últimos 30 días)
                </h3>
              </div>
              <div className="h-48 flex items-end justify-between gap-1">
                {stats.salesTrend.slice(-14).map((day, idx) => {
                  const maxRevenue = Math.max(...stats.salesTrend.map(d => d.revenue), 1);
                  const height = (day.revenue / maxRevenue) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div className="relative w-full flex flex-col items-center justify-end" style={{ height: '100%' }}>
                        <div
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all hover:from-blue-600 hover:to-blue-500 cursor-pointer"
                          style={{ height: `${Math.max(height, 5)}%` }}
                          title={`${new Date(day.date).toLocaleDateString('es-PY')}: ${day.revenue.toLocaleString('es-PY')} Gs.`}
                        />
                      </div>
                      <p className="text-xs text-gray-500 transform -rotate-45 origin-top-left whitespace-nowrap mt-2" style={{ writingMode: 'vertical-rl' }}>
                        {new Date(day.date).getDate()}/{new Date(day.date).getMonth() + 1}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Ingresos (Gs.)</span>
                  </div>
                </div>
                <p>Total: {stats.salesTrend.reduce((sum, day) => sum + day.revenue, 0).toLocaleString('es-PY')} Gs.</p>
              </div>
            </div>
          )}

          {/* Productos Más Vendidos */}
          {stats.topProducts.length > 0 && (
            <div className="bg-white rounded-lg border p-4 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Productos Más Vendidos
                </h3>
                <Link
                  href="/dashboard"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Ver todos →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {stats.topProducts.map((product, idx) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="group bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-all hover:shadow-md"
                  >
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-200 mb-2">
                      {product.cover_url ? (
                        <Image
                          src={product.cover_url}
                          alt={product.title}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        #{idx + 1}
                      </div>
                    </div>
                    <h4 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
                      {product.title}
                    </h4>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600">
                        <span className="font-semibold">{product.total_sold}</span> vendidos
                      </p>
                      <p className="text-xs font-semibold text-green-600">
                        {product.revenue.toLocaleString('es-PY')} Gs.
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Órdenes Recientes */}
          {stats.recentOrders.length > 0 && (
            <div className="bg-white rounded-lg border p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  Órdenes Recientes
                </h3>
                <Link
                  href="/dashboard/orders"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Ver todas →
                </Link>
              </div>
              <div className="space-y-2">
                {stats.recentOrders.slice(0, 3).map((order: any) => (
                  <Link
                    key={order.id}
                    href="/dashboard/orders"
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        order.status === 'pending' ? 'bg-yellow-500' :
                        order.status === 'confirmed' ? 'bg-blue-500' :
                        order.status === 'shipped' ? 'bg-purple-500' :
                        order.status === 'delivered' ? 'bg-green-500' :
                        'bg-gray-400'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Orden #{order.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('es-PY')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {order.total_amount.toLocaleString('es-PY')} Gs.
                      </p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
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
          )}
        </div>
      )}

      {/* Enlaces de configuración */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/dashboard/profile"
              className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-2xl">
                  👤
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Mi Perfil {storeStatus === 'active' ? '& Tienda' : ''}</h3>
                  <p className="text-sm text-gray-600">Foto de perfil, portada, información personal{storeStatus === 'active' ? ' y datos de tienda' : ''}</p>
                </div>
              </div>
            </Link>
            <Link
              href="/dashboard/my-bids"
              className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-2xl">
                  🔨
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Mis Pujas</h3>
                  <p className="text-sm text-gray-600">Historial de pujas, subastas ganadas y activas</p>
                </div>
              </div>
            </Link>
        {role !== 'seller' ? (
          <Link href="/dashboard/become-seller" className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">🏪</div>
              <div>
                <h3 className="font-semibold text-gray-900">Convertirme en Tienda</h3>
                <p className="text-sm text-gray-600">Suscripción y solicitud de verificación del local</p>
              </div>
            </div>
          </Link>
        ) : storeStatus === 'pending' ? (
          <Link href="/dashboard/profile" className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-2xl">⏳</div>
              <div>
                <h3 className="font-semibold text-gray-900">Verificación en proceso</h3>
                <p className="text-sm text-gray-600">Configura tu tienda mientras validamos el lugar</p>
              </div>
            </div>
          </Link>
        ) : (
          <Link href="/dashboard/profile" className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">🏪</div>
              <div>
                <h3 className="font-semibold text-gray-900">Información de Tienda</h3>
                <p className="text-sm text-gray-600">Logo, portada, contacto, ubicación, rubros</p>
              </div>
            </div>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-xl font-medium text-gray-600 mb-2">No tienes productos aún</h2>
          <p className="text-gray-500 mb-6">Comienza agregando tu primer producto</p>
          <Link
            href="/dashboard/new-product"
            className="px-6 py-3 rounded bg-black text-white hover:bg-gray-800 transition-colors"
          >
            Crear mi primer producto
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {filterType === 'all' 
                ? 'Mis productos' 
                : filterType === 'direct' 
                ? 'Precios fijos' 
                : 'Mis subastas'} ({products.length})
            </h2>
            {filterType === 'auction' && products.length > 0 && (
              <span className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
                🔨 {products.length} {products.length === 1 ? 'subasta activa' : 'subastas activas'}
              </span>
            )}
            {filterType === 'direct' && products.length > 0 && (
              <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                💰 {products.length} {products.length === 1 ? 'producto con precio fijo' : 'productos con precio fijo'}
              </span>
            )}
          </div>
          {filterType === 'auction' && products.length === 0 && (
            <div className="text-center py-12 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-6xl mb-4">🔨</div>
              <h2 className="text-xl font-medium text-gray-600 mb-2">No tienes subastas</h2>
              <p className="text-gray-500 mb-6">Crea una nueva subasta desde el formulario de producto</p>
              <Link
                href="/dashboard/new-product"
                className="px-6 py-3 rounded bg-black text-white hover:bg-gray-800 transition-colors inline-block"
              >
                Crear subasta
              </Link>
            </div>
          )}
          {filterType === 'direct' && products.length === 0 && (
            <div className="text-center py-12 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-6xl mb-4">💰</div>
              <h2 className="text-xl font-medium text-gray-600 mb-2">No tienes productos con precio fijo</h2>
              <p className="text-gray-500 mb-6">Crea un nuevo producto desde el formulario</p>
              <Link
                href="/dashboard/new-product"
                className="px-6 py-3 rounded bg-black text-white hover:bg-gray-800 transition-colors inline-block"
              >
                Crear producto
              </Link>
            </div>
          )}
          {products.length > 0 && (
            <>
              {/* Vista Rápida de Productos - Mini Grid */}
              {role === 'seller' && (
                <div className="mb-6 bg-white rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Package className="w-5 h-5 text-gray-600" />
                      Vista Rápida de Productos
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFilterType('all')}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          filterType === 'all'
                            ? 'bg-gray-800 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Todos ({allProducts.length})
                      </button>
                      <button
                        onClick={() => {
                          setFilterType('direct');
                          setProducts(allProducts.filter(p => p.sale_type === 'direct'));
                        }}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          filterType === 'direct'
                            ? 'bg-blue-500 text-white'
                            : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        }`}
                      >
                        Precio Fijo ({allProducts.filter(p => p.sale_type === 'direct').length})
                      </button>
                      <button
                        onClick={() => {
                          setFilterType('auction');
                          setProducts(allProducts.filter(p => p.sale_type === 'auction'));
                        }}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          filterType === 'auction'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        }`}
                      >
                        Subastas ({allProducts.filter(p => p.sale_type === 'auction').length})
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {allProducts.slice(0, 6).map((product) => (
                      <Link
                        key={product.id}
                        href={`/dashboard/edit-product/${product.id}`}
                        className="group relative"
                      >
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2 border-2 border-transparent group-hover:border-blue-500 transition-all">
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
                              <Package className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                          {product.sale_type === 'auction' && (
                            <div className="absolute top-1 right-1 bg-yellow-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                              🔨
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {product.title}
                        </p>
                        <p className="text-xs text-green-600 font-semibold mt-1">
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
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Ver todos los productos ({allProducts.length}) ↓
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div id="all-products" className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => {
                const isAuction = product.sale_type === 'auction';
                const isDirect = product.sale_type === 'direct';
                
                // Validación de filtro
                if (filterType === 'auction' && !isAuction) {
                  console.warn('⚠️ Producto sin sale_type="auction" en vista de subastas:', {
                    id: product.id,
                    title: product.title,
                    sale_type: product.sale_type
                  });
                }
                if (filterType === 'direct' && !isDirect) {
                  console.warn('⚠️ Producto sin sale_type="direct" en vista de precios fijos:', {
                    id: product.id,
                    title: product.title,
                    sale_type: product.sale_type
                  });
                }
                
                return (
                <div key={product.id} className="bg-white rounded-lg shadow-sm border overflow-hidden relative">
                  {isAuction && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded z-10">
                      🔨 SUBASTA
                    </div>
                  )}
                  {product.cover_url && (
                    <img
                      src={product.cover_url}
                      alt={product.title}
                      className="w-full h-40 sm:h-48 object-cover"
                    />
                  )}
                  <div className="p-3 sm:p-4">
                    <h3 className="font-medium text-base sm:text-lg mb-2 line-clamp-2">{product.title}</h3>
                    <p className="text-lg sm:text-2xl font-bold text-green-600 mb-3">
                      {product.price.toLocaleString()} Gs.
                      {isAuction && (
                        <span className="block text-xs text-yellow-600 font-normal mt-1">Precio base</span>
                      )}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Link
                        href={`/dashboard/edit-product/${product.id}`}
                        className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-center hover:bg-blue-600 transition-colors text-sm"
                      >
                        ✏️ Editar
                      </Link>
                      <Link
                        href={`/products/${product.id}`}
                        className="flex-1 px-3 py-2 bg-gray-500 text-white rounded text-center hover:bg-gray-600 transition-colors text-sm"
                      >
                        👁️ Ver
                      </Link>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        disabled={deletingId === product.id}
                        className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {deletingId === product.id ? '⏳' : '🗑️'}
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Admin Role Assigner - Temporalmente comentado para debug */}
      {/* <div className="mt-8">
        <AdminRoleAssigner />
      </div> */}
    </main>
  );
}
