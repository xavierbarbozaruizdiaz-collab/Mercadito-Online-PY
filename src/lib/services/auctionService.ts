// ============================================
// MERCADITO ONLINE PY - AUCTION SERVICE
// Servicio para gestionar subastas y pujas
// ============================================

import { supabase } from '@/lib/supabaseClient';

// ============================================
// TIPOS
// ============================================

export interface AuctionBid {
  id: string;
  product_id: string;
  bidder_id: string;
  amount: number;
  bid_time: string;
  is_auto_bid: boolean;
  is_retracted: boolean;
  created_at: string;
  bidder?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

export interface AuctionProduct {
  id: string;
  title: string;
  description?: string;
  price: number;
  cover_url?: string;
  condition: string;
  sale_type: 'auction';
  auction_status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  auction_start_at?: string;
  auction_end_at?: string;
  current_bid?: number;
  min_bid_increment?: number;
  buy_now_price?: number;
  reserve_price?: number;
  winner_id?: string;
  total_bids: number;
  seller_id: string;
  attributes?: {
    auction?: {
      starting_price: number;
      buy_now_price?: number;
      start_date: string;
    };
  };
}

export interface AuctionStats {
  total_bids: number;
  current_bid: number;
  starting_price: number;
  min_increment: number;
  time_remaining_ms: number;
  is_active: boolean;
  winner_id?: string;
}

// ============================================
// FUNCIONES DEL SERVICIO
// ============================================

/**
 * Obtiene todas las subastas activas
 */
export async function getActiveAuctions(filters?: {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}): Promise<AuctionProduct[]> {
  try {
    let query = supabase
      .from('products')
      .select('*')
      .eq('sale_type', 'auction')
      .eq('auction_status', 'active')
      .order('auction_end_at', { ascending: true });

    if (filters?.category) {
      query = query.eq('category_id', filters.category);
    }

    if (filters?.minPrice) {
      query = query.gte('current_bid', filters.minPrice);
    }

    if (filters?.maxPrice) {
      query = query.lte('current_bid', filters.maxPrice);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []) as AuctionProduct[];
  } catch (error) {
    console.error('Error fetching active auctions:', error);
    throw error;
  }
}

/**
 * Obtiene una subasta por ID con todos los detalles
 */
export async function getAuctionById(productId: string): Promise<AuctionProduct | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('sale_type', 'auction')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as AuctionProduct;
  } catch (error) {
    console.error('Error fetching auction:', error);
    throw error;
  }
}

/**
 * Obtiene las pujas de una subasta
 */
export async function getBidsForAuction(
  productId: string,
  limit: number = 20
): Promise<AuctionBid[]> {
  try {
    const { data, error } = await supabase
      .from('auction_bids')
      .select(`
        *,
        bidder:profiles(id, first_name, last_name, email)
      `)
      .eq('product_id', productId)
      .eq('is_retracted', false)
      .order('amount', { ascending: false })
      .order('bid_time', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []) as AuctionBid[];
  } catch (error) {
    console.error('Error fetching bids:', error);
    throw error;
  }
}

/**
 * Coloca una puja en una subasta
 */
export async function placeBid(
  productId: string,
  bidderId: string,
  amount: number
): Promise<{ bid_id: string; success: boolean; error?: string }> {
  try {
    const { data, error } = await (supabase as any).rpc('place_bid', {
      p_product_id: productId,
      p_bidder_id: bidderId,
      p_amount: amount,
    });

    if (error) {
      console.error('Error placing bid:', error);
      return {
        bid_id: '',
        success: false,
        error: error.message || 'Error al colocar la puja',
      };
    }

    return {
      bid_id: data,
      success: true,
    };
  } catch (error: any) {
    console.error('Error placing bid:', error);
    return {
      bid_id: '',
      success: false,
      error: error.message || 'Error inesperado al colocar la puja',
    };
  }
}

/**
 * Compra ahora (Buy Now)
 */
export async function buyNow(
  productId: string,
  buyerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await (supabase as any).rpc('buy_now_auction', {
      p_product_id: productId,
      p_buyer_id: buyerId,
    });

    if (error) {
      console.error('Error in buy now:', error);
      return {
        success: false,
        error: error.message || 'Error al realizar compra ahora',
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error in buy now:', error);
    return {
      success: false,
      error: error.message || 'Error inesperado',
    };
  }
}

/**
 * Obtiene las pujas de un usuario
 */
export async function getUserBids(userId: string): Promise<Array<AuctionBid & { product: AuctionProduct }>> {
  try {
    const { data: bidsData, error: bidsError } = await supabase
      .from('auction_bids')
      .select('*')
      .eq('bidder_id', userId)
      .eq('is_retracted', false)
      .order('created_at', { ascending: false });

    if (bidsError) throw bidsError;

    if (!bidsData || bidsData.length === 0) {
      return [];
    }

    // Obtener productos para cada puja
    const productIds = [...new Set(bidsData.map((b: any) => b.product_id))];
    
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('sale_type', 'auction');

    if (productsError) throw productsError;

    const productsMap = new Map(
      (productsData || []).map((p: any) => [p.id, p as AuctionProduct])
    );

    // Combinar pujas con productos
    return (bidsData || []).map((bid: any) => ({
      ...bid,
      product: productsMap.get(bid.product_id),
    })) as Array<AuctionBid & { product: AuctionProduct }>;
  } catch (error) {
    console.error('Error fetching user bids:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de una subasta
 */
export async function getAuctionStats(productId: string): Promise<AuctionStats | null> {
  try {
    const auction = await getAuctionById(productId);
    if (!auction) return null;

    const startingPrice = auction.attributes?.auction?.starting_price || auction.price;
    const currentBid = auction.current_bid || startingPrice;
    const minIncrement = auction.min_bid_increment || 1000;

    // Calcular tiempo restante
    let timeRemainingMs = 0;
    if (auction.auction_end_at) {
      const endAt = new Date(auction.auction_end_at).getTime();
      const now = Date.now();
      timeRemainingMs = Math.max(0, endAt - now);
    }

    return {
      total_bids: auction.total_bids || 0,
      current_bid: currentBid,
      starting_price: startingPrice,
      min_increment: minIncrement,
      time_remaining_ms: timeRemainingMs,
      is_active: auction.auction_status === 'active',
      winner_id: auction.winner_id,
    };
  } catch (error) {
    console.error('Error getting auction stats:', error);
    return null;
  }
}

/**
 * Calcula el incremento mínimo sugerido para una puja
 */
export function calculateMinBidIncrement(currentBid: number): number {
  if (currentBid < 10000) return 1000;
  if (currentBid < 50000) return 5000;
  if (currentBid < 100000) return 10000;
  return Math.round(currentBid * 0.10); // 10%
}

/**
 * Obtiene las subastas de un vendedor
 */
export async function getSellerAuctions(sellerId: string): Promise<AuctionProduct[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('sale_type', 'auction')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []) as AuctionProduct[];
  } catch (error) {
    console.error('Error fetching seller auctions:', error);
    throw error;
  }
}

