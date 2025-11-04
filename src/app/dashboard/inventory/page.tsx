'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { increaseStock, decreaseStock, getStockMovements } from '@/lib/services/inventoryService';
import Link from 'next/link';
import Image from 'next/image';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  Edit,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';

type Product = {
  id: string;
  title: string;
  cover_url: string | null;
  stock_quantity: number | null;
  stock_management_enabled: boolean;
  low_stock_threshold: number | null;
  sale_type: string;
  status: string;
};

type StockMovement = {
  id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  notes: string | null;
  created_at: string;
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'low' | 'out' | 'enabled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [adjustingStock, setAdjustingStock] = useState<string | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'increase' | 'decrease' | 'set'>('increase');

  useEffect(() => {
    loadProducts();
  }, [filter]);

  async function loadProducts() {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from('products')
        .select('id, title, cover_url, stock_quantity, stock_management_enabled, low_stock_threshold, sale_type, status')
        .eq('seller_id', session.session.user.id)
        .eq('sale_type', 'direct'); // Solo productos directos

      // Aplicar filtros
      if (filter === 'low') {
        query = query
          .not('low_stock_threshold', 'is', null)
          .not('stock_quantity', 'is', null)
          .lte('stock_quantity', supabase.raw('low_stock_threshold'));
      } else if (filter === 'out') {
        query = query
          .not('stock_quantity', 'is', null)
          .eq('stock_quantity', 0);
      } else if (filter === 'enabled') {
        query = query.eq('stock_management_enabled', true);
      }

      // Buscar por término
      if (searchTerm.trim()) {
        query = query.ilike('title', `%${searchTerm.trim()}%`);
      }

      const { data, error } = await query.order('title', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      console.error('Error cargando productos:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMovements(productId: string) {
    try {
      setLoadingMovements(true);
      const movementsData = await getStockMovements(productId, 20);
      setMovements(movementsData);
    } catch (err: any) {
      console.error('Error cargando movimientos:', err);
    } finally {
      setLoadingMovements(false);
    }
  }

  async function handleAdjustStock(product: Product) {
    if (!adjustQuantity || isNaN(Number(adjustQuantity))) {
      alert('Ingresa una cantidad válida');
      return;
    }

    const quantity = parseInt(adjustQuantity);
    if (quantity <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    try {
      setAdjustingStock(product.id);

      if (adjustType === 'set') {
        // Establecer stock directamente
        const currentStock = product.stock_quantity || 0;
        const difference = quantity - currentStock;
        
        if (difference > 0) {
          await increaseStock(product.id, difference, 'adjustment', undefined, `Ajuste manual: establecer a ${quantity}`);
        } else if (difference < 0) {
          // Para disminuir, necesitamos usar decrease_stock pero con cantidad absoluta
          const { error } = await (supabase as any).rpc('decrease_stock', {
            p_product_id: product.id,
            p_quantity: Math.abs(difference),
            p_order_id: null,
            p_movement_notes: `Ajuste manual: establecer a ${quantity}`,
            p_created_by: null
          });
          if (error) throw error;
        }
      } else if (adjustType === 'increase') {
        await increaseStock(product.id, quantity, 'restock', undefined, `Reabastecimiento manual: +${quantity}`);
      } else if (adjustType === 'decrease') {
        // Para disminuir manualmente (no venta)
        const { error } = await (supabase as any).rpc('decrease_stock', {
          p_product_id: product.id,
          p_quantity: quantity,
          p_order_id: null,
          p_movement_notes: `Ajuste manual: -${quantity}`,
          p_created_by: null
        });
        if (error) throw error;
      }

      alert('Stock actualizado correctamente');
      setAdjustQuantity('');
      setAdjustType('increase');
      setSelectedProduct(null);
      await loadProducts();
    } catch (err: any) {
      console.error('Error ajustando stock:', err);
      alert('Error al ajustar stock: ' + (err.message || 'Error desconocido'));
    } finally {
      setAdjustingStock(null);
    }
  }

  const filteredProducts = products.filter(p => {
    if (!searchTerm.trim()) return true;
    return p.title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const lowStockProducts = filteredProducts.filter(p => 
    p.stock_management_enabled && 
    p.stock_quantity !== null && 
    p.low_stock_threshold !== null &&
    p.stock_quantity <= p.low_stock_threshold
  );

  const outOfStockProducts = filteredProducts.filter(p => 
    p.stock_management_enabled && 
    p.stock_quantity !== null &&
    p.stock_quantity <= 0
  );

  return (
    <div className="min-h-screen bg-[#1A1A1A] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-200 mb-2">📦 Gestión de Inventario</h1>
              <p className="text-gray-400">Administra el stock de tus productos</p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              ← Volver
            </Link>
          </div>

          {/* Alertas rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                <span className="text-sm font-medium text-orange-300">Stock Bajo</span>
              </div>
              <p className="text-2xl font-bold text-white">{lowStockProducts.length}</p>
              <p className="text-xs text-orange-400">Productos bajo el umbral</p>
            </div>

            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-red-400" />
                <span className="text-sm font-medium text-red-300">Sin Stock</span>
              </div>
              <p className="text-2xl font-bold text-white">{outOfStockProducts.length}</p>
              <p className="text-xs text-red-400">Productos agotados</p>
            </div>

            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">Con Gestión</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {filteredProducts.filter(p => p.stock_management_enabled).length}
              </p>
              <p className="text-xs text-blue-400">Productos con inventario</p>
            </div>
          </div>

          {/* Filtros y búsqueda */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#252525] text-gray-300 hover:bg-gray-700'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter('low')}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 ${
                  filter === 'low'
                    ? 'bg-orange-600 text-white'
                    : 'bg-[#252525] text-gray-300 hover:bg-gray-700'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                Stock Bajo
                {lowStockProducts.length > 0 && (
                  <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {lowStockProducts.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilter('out')}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 ${
                  filter === 'out'
                    ? 'bg-red-600 text-white'
                    : 'bg-[#252525] text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Package className="w-4 h-4" />
                Sin Stock
                {outOfStockProducts.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {outOfStockProducts.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilter('enabled')}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  filter === 'enabled'
                    ? 'bg-green-600 text-white'
                    : 'bg-[#252525] text-gray-300 hover:bg-gray-700'
                }`}
              >
                Con Gestión
              </button>
            </div>
          </div>
        </div>

        {/* Lista de productos */}
        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Cargando inventario...</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-[#252525] rounded-lg border border-gray-700">
            <Package className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-400 mb-2">
              {searchTerm ? 'No se encontraron productos' : 'No hay productos con gestión de inventario'}
            </h2>
            <p className="text-gray-500 mb-6">
              {searchTerm 
                ? 'Intenta con otro término de búsqueda'
                : 'Los productos de venta directa con gestión de inventario aparecerán aquí'}
            </p>
            {!searchTerm && (
              <Link
                href="/dashboard/new-product"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
              >
                Crear nuevo producto
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredProducts.map((product) => {
              const stock = product.stock_quantity ?? 0;
              const threshold = product.low_stock_threshold ?? 5;
              const isLow = product.stock_management_enabled && stock <= threshold && stock > 0;
              const isOut = product.stock_management_enabled && stock <= 0;

              return (
                <div
                  key={product.id}
                  className={`bg-[#252525] rounded-lg border ${
                    isOut ? 'border-red-700' : isLow ? 'border-orange-700' : 'border-gray-700'
                  } p-4`}
                >
                  <div className="flex items-start gap-4">
                    {/* Imagen */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-700">
                      {product.cover_url ? (
                        <Image
                          src={product.cover_url}
                          alt={product.title}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-500" />
                        </div>
                      )}
                    </div>

                    {/* Información */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/products/${product.id}`}
                            className="text-lg font-semibold text-gray-200 hover:text-blue-400 transition-colors line-clamp-2"
                          >
                            {product.title}
                          </Link>
                          <p className="text-sm text-gray-400 mt-1">
                            ID: {product.id.slice(0, 8)}...
                          </p>
                        </div>

                        {/* Stock info */}
                        <div className="text-right flex-shrink-0">
                          {product.stock_management_enabled ? (
                            <>
                              <div className={`text-2xl font-bold mb-1 ${
                                isOut ? 'text-red-400' : isLow ? 'text-orange-400' : 'text-green-400'
                              }`}>
                                {stock}
                              </div>
                              <p className="text-xs text-gray-500">
                                {isOut ? 'Sin stock' : isLow ? `Bajo (≤${threshold})` : 'Disponible'}
                              </p>
                              {threshold && (
                                <p className="text-xs text-gray-600 mt-1">
                                  Umbral: {threshold}
                                </p>
                              )}
                            </>
                          ) : (
                            <div className="text-gray-500">
                              <p className="text-sm">Ilimitado</p>
                              <p className="text-xs">Sin gestión</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Acciones */}
                      {product.stock_management_enabled && (
                        <div className="flex items-center gap-2 mt-4 flex-wrap">
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              loadMovements(product.id);
                            }}
                            className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors text-sm flex items-center gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Ver historial
                          </button>
                          
                          <Link
                            href={`/dashboard/edit-product/${product.id}`}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            Editar
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Panel de ajuste rápido */}
                  {selectedProduct?.id === product.id && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="grid sm:grid-cols-2 gap-4">
                        {/* Ajuste de stock */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-300 mb-3">Ajustar Stock</h4>
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <select
                                value={adjustType}
                                onChange={(e) => setAdjustType(e.target.value as any)}
                                className="px-3 py-2 bg-[#1A1A1A] border border-gray-700 rounded text-white text-sm"
                              >
                                <option value="increase">Aumentar (+)</option>
                                <option value="decrease">Disminuir (-)</option>
                                <option value="set">Establecer (=)</option>
                              </select>
                              <input
                                type="number"
                                min="1"
                                value={adjustQuantity}
                                onChange={(e) => setAdjustQuantity(e.target.value)}
                                placeholder="Cantidad"
                                className="flex-1 px-3 py-2 bg-[#1A1A1A] border border-gray-700 rounded text-white text-sm"
                              />
                              <button
                                onClick={() => handleAdjustStock(product)}
                                disabled={adjustingStock === product.id || !adjustQuantity}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {adjustingStock === product.id ? '⏳' : 'Aplicar'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Historial de movimientos */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-300 mb-3">Últimos Movimientos</h4>
                          {loadingMovements ? (
                            <p className="text-sm text-gray-500">Cargando...</p>
                          ) : movements.length === 0 ? (
                            <p className="text-sm text-gray-500">No hay movimientos registrados</p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {movements.map((mov) => (
                                <div
                                  key={mov.id}
                                  className="flex items-center justify-between text-xs bg-[#1A1A1A] p-2 rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    {mov.movement_type === 'sale' ? (
                                      <TrendingDown className="w-4 h-4 text-red-400" />
                                    ) : mov.movement_type === 'restock' ? (
                                      <TrendingUp className="w-4 h-4 text-green-400" />
                                    ) : (
                                      <RefreshCw className="w-4 h-4 text-blue-400" />
                                    )}
                                    <span className="text-gray-400">
                                      {mov.movement_type === 'sale' ? 'Venta' :
                                       mov.movement_type === 'restock' ? 'Reabastecimiento' :
                                       mov.movement_type === 'adjustment' ? 'Ajuste' :
                                       mov.movement_type === 'return' ? 'Devolución' :
                                       mov.movement_type === 'cancellation' ? 'Cancelación' :
                                       mov.movement_type}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className={`font-medium ${
                                      mov.quantity > 0 ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                      {mov.quantity > 0 ? '+' : ''}{mov.quantity}
                                    </span>
                                    <p className="text-gray-500">
                                      {mov.previous_stock} → {mov.new_stock}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

