// ============================================
// MERCADITO ONLINE PY - DATABASE TYPES
// Tipos de base de datos para Supabase
// ============================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: 'buyer' | 'seller' | 'admin';
          first_name?: string;
          last_name?: string;
          phone?: string;
          avatar_url?: string;
          cover_url?: string;
          bio?: string;
          location?: string;
          verified: boolean;
          membership_level: 'free' | 'bronze' | 'silver' | 'gold';
          membership_expires_at?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: 'buyer' | 'seller' | 'admin';
          first_name?: string;
          last_name?: string;
          phone?: string;
          avatar_url?: string;
          cover_url?: string;
          bio?: string;
          location?: string;
          verified?: boolean;
          membership_level?: 'free' | 'bronze' | 'silver' | 'gold';
          membership_expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'buyer' | 'seller' | 'admin';
          first_name?: string;
          last_name?: string;
          phone?: string;
          avatar_url?: string;
          cover_url?: string;
          bio?: string;
          location?: string;
          verified?: boolean;
          membership_level?: 'free' | 'bronze' | 'silver' | 'gold';
          membership_expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      stores: {
        Row: {
          id: string;
          seller_id: string;
          name: string;
          slug: string;
          description?: string;
          cover_image_url?: string;
          logo_url?: string;
          location?: string;
          contact_email?: string;
          contact_phone?: string;
          social_links: Record<string, string>;
          settings: Record<string, any>;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          name: string;
          slug: string;
          description?: string;
          cover_image_url?: string;
          logo_url?: string;
          location?: string;
          contact_email?: string;
          contact_phone?: string;
          social_links?: Record<string, string>;
          settings?: Record<string, any>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          name?: string;
          slug?: string;
          description?: string;
          cover_image_url?: string;
          logo_url?: string;
          location?: string;
          contact_email?: string;
          contact_phone?: string;
          social_links?: Record<string, string>;
          settings?: Record<string, any>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description?: string;
          parent_id?: string;
          image_url?: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string;
          parent_id?: string;
          image_url?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string;
          parent_id?: string;
          image_url?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          store_id: string;
          title: string;
          description?: string;
          price: number;
          compare_price?: number;
          sku?: string;
          barcode?: string;
          category_id?: string;
          condition: 'new' | 'like_new' | 'used' | 'refurbished';
          sale_type: 'fixed' | 'auction' | 'negotiable';
          status: 'active' | 'paused' | 'archived' | 'sold';
          stock_quantity: number;
          weight?: number;
          dimensions?: Record<string, number>;
          tags: string[];
          seo_title?: string;
          seo_description?: string;
          is_featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          title: string;
          description?: string;
          price: number;
          compare_price?: number;
          sku?: string;
          barcode?: string;
          category_id?: string;
          condition?: 'new' | 'like_new' | 'used' | 'refurbished';
          sale_type?: 'fixed' | 'auction' | 'negotiable';
          status?: 'active' | 'paused' | 'archived' | 'sold';
          stock_quantity?: number;
          weight?: number;
          dimensions?: Record<string, number>;
          tags?: string[];
          seo_title?: string;
          seo_description?: string;
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          title?: string;
          description?: string;
          price?: number;
          compare_price?: number;
          sku?: string;
          barcode?: string;
          category_id?: string;
          condition?: 'new' | 'like_new' | 'used' | 'refurbished';
          sale_type?: 'fixed' | 'auction' | 'negotiable';
          status?: 'active' | 'paused' | 'archived' | 'sold';
          stock_quantity?: number;
          weight?: number;
          dimensions?: Record<string, number>;
          tags?: string[];
          seo_title?: string;
          seo_description?: string;
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          title: string;
          sku?: string;
          price?: number;
          compare_price?: number;
          stock_quantity: number;
          attributes: Record<string, string>;
          image_url?: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          title: string;
          sku?: string;
          price?: number;
          compare_price?: number;
          stock_quantity?: number;
          attributes: Record<string, string>;
          image_url?: string;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          title?: string;
          sku?: string;
          price?: number;
          compare_price?: number;
          stock_quantity?: number;
          attributes?: Record<string, string>;
          image_url?: string;
          is_default?: boolean;
          created_at?: string;
        };
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          variant_id?: string;
          url: string;
          alt_text?: string;
          sort_order: number;
          is_cover: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          variant_id?: string;
          url: string;
          alt_text?: string;
          sort_order?: number;
          is_cover?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          variant_id?: string;
          url?: string;
          alt_text?: string;
          sort_order?: number;
          is_cover?: boolean;
          created_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          buyer_id: string;
          seller_id: string;
          order_number: string;
          status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
          subtotal: number;
          shipping_cost: number;
          tax_amount: number;
          total_amount: number;
          payment_method?: string;
          payment_status: string;
          shipping_address: Record<string, any>;
          billing_address?: Record<string, any>;
          notes?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          seller_id: string;
          order_number: string;
          status?: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
          subtotal: number;
          shipping_cost?: number;
          tax_amount?: number;
          total_amount: number;
          payment_method?: string;
          payment_status?: string;
          shipping_address: Record<string, any>;
          billing_address?: Record<string, any>;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          seller_id?: string;
          order_number?: string;
          status?: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
          subtotal?: number;
          shipping_cost?: number;
          tax_amount?: number;
          total_amount?: number;
          payment_method?: string;
          payment_status?: string;
          shipping_address?: Record<string, any>;
          billing_address?: Record<string, any>;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          variant_id?: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          variant_id?: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          variant_id?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          created_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          payment_method: string;
          payment_provider: string;
          amount: number;
          currency: string;
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
          provider_transaction_id?: string;
          provider_response?: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          payment_method: string;
          payment_provider: string;
          amount: number;
          currency?: string;
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
          provider_transaction_id?: string;
          provider_response?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          payment_method?: string;
          payment_provider?: string;
          amount?: number;
          currency?: string;
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
          provider_transaction_id?: string;
          provider_response?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
      shipments: {
        Row: {
          id: string;
          order_id: string;
          tracking_number?: string;
          carrier?: string;
          service_type?: string;
          status: 'pending' | 'shipped' | 'in_transit' | 'delivered' | 'failed';
          estimated_delivery?: string;
          actual_delivery?: string;
          shipping_address: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          tracking_number?: string;
          carrier?: string;
          service_type?: string;
          status?: 'pending' | 'shipped' | 'in_transit' | 'delivered' | 'failed';
          estimated_delivery?: string;
          actual_delivery?: string;
          shipping_address: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          tracking_number?: string;
          carrier?: string;
          service_type?: string;
          status?: 'pending' | 'shipped' | 'in_transit' | 'delivered' | 'failed';
          estimated_delivery?: string;
          actual_delivery?: string;
          shipping_address?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data?: Record<string, any>;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data?: Record<string, any>;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          data?: Record<string, any>;
          is_read?: boolean;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          order_id?: string;
          subject?: string;
          content: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          recipient_id: string;
          order_id?: string;
          subject?: string;
          content: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          recipient_id?: string;
          order_id?: string;
          subject?: string;
          content?: string;
          is_read?: boolean;
          created_at?: string;
        };
      };
      analytics_events: {
        Row: {
          id: string;
          user_id?: string;
          event_type: string;
          event_data?: Record<string, any>;
          page_url?: string;
          user_agent?: string;
          ip_address?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          event_type: string;
          event_data?: Record<string, any>;
          page_url?: string;
          user_agent?: string;
          ip_address?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_type?: string;
          event_data?: Record<string, any>;
          page_url?: string;
          user_agent?: string;
          ip_address?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
