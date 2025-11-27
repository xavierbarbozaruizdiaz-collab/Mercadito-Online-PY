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
      sourcing_orders: {
        Row: {
          id: string;
          user_id: string;
          assigned_store_id: string;
          raw_query: string;
          normalized: Record<string, any>;
          status: string;
          source: string;
          channel: string | null;
          language: string;
          agent_source: string | null;
          agent_session_id: string | null;
          agent_metadata: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          assigned_store_id: string;
          raw_query: string;
          normalized?: Record<string, any>;
          status?: string;
          source?: string;
          channel?: string | null;
          language?: string;
          agent_source?: string | null;
          agent_session_id?: string | null;
          agent_metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          assigned_store_id?: string;
          raw_query?: string;
          normalized?: Record<string, any>;
          status?: string;
          source?: string;
          channel?: string | null;
          language?: string;
          agent_source?: string | null;
          agent_session_id?: string | null;
          agent_metadata?: Record<string, any>;
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
          social_links: Record<string, string> | null;
          settings: Record<string, any>;
          is_active: boolean;
          is_fallback_store: boolean;
          fb_pixel_id?: string | null;
          ga_measurement_id?: string | null;
          gtm_id?: string | null;
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
          social_links?: Record<string, string> | null;
          settings?: Record<string, any>;
          is_active?: boolean;
          is_fallback_store?: boolean;
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
          social_links?: Record<string, string> | null;
          settings?: Record<string, any>;
          is_active?: boolean;
          is_fallback_store?: boolean;
          fb_pixel_id?: string | null;
          ga_measurement_id?: string | null;
          gtm_id?: string | null;
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
          status:
            | 'pending'
            | 'pending_payment'
            | 'cod_pending'
            | 'confirmed'
            | 'paid'
            | 'failed'
            | 'shipped'
            | 'delivered'
            | 'cancelled'
            | 'canceled'
            | 'refunded';
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
          status?:
            | 'pending'
            | 'pending_payment'
            | 'cod_pending'
            | 'confirmed'
            | 'paid'
            | 'failed'
            | 'shipped'
            | 'delivered'
            | 'cancelled'
            | 'canceled'
            | 'refunded';
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
          status?:
            | 'pending'
            | 'pending_payment'
            | 'cod_pending'
            | 'confirmed'
            | 'paid'
            | 'failed'
            | 'shipped'
            | 'delivered'
            | 'cancelled'
            | 'canceled'
            | 'refunded';
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
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          report_type: 'product' | 'user' | 'store' | 'order' | 'review';
          target_id: string;
          reason: string;
          description: string | null;
          status: 'pending' | 'under_review' | 'resolved' | 'rejected' | 'dismissed';
          resolved_by: string | null;
          resolved_at: string | null;
          resolution_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          report_type: 'product' | 'user' | 'store' | 'order' | 'review';
          target_id: string;
          reason: string;
          description?: string | null;
          status?: 'pending' | 'under_review' | 'resolved' | 'rejected' | 'dismissed';
          resolved_by?: string | null;
          resolved_at?: string | null;
          resolution_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          report_type?: 'product' | 'user' | 'store' | 'order' | 'review';
          target_id?: string;
          reason?: string;
          description?: string | null;
          status?: 'pending' | 'under_review' | 'resolved' | 'rejected' | 'dismissed';
          resolved_by?: string | null;
          resolved_at?: string | null;
          resolution_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      membership_plans: {
        Row: {
          id: string;
          level: 'bronze' | 'silver' | 'gold';
          name: string;
          description: string | null;
          price_monthly: number;
          price_yearly: number | null;
          price_one_time: number | null;
          duration_days: number;
          bid_limit: number | null;
          bid_limit_formatted: string | null;
          features: Record<string, any>;
          is_active: boolean;
          is_popular: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          level: 'bronze' | 'silver' | 'gold';
          name: string;
          description?: string | null;
          price_monthly: number;
          price_yearly?: number | null;
          price_one_time?: number | null;
          duration_days?: number;
          bid_limit?: number | null;
          bid_limit_formatted?: string | null;
          features?: Record<string, any>;
          is_active?: boolean;
          is_popular?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          level?: 'bronze' | 'silver' | 'gold';
          name?: string;
          description?: string | null;
          price_monthly?: number;
          price_yearly?: number | null;
          price_one_time?: number | null;
          duration_days?: number;
          bid_limit?: number | null;
          bid_limit_formatted?: string | null;
          features?: Record<string, any>;
          is_active?: boolean;
          is_popular?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      membership_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          status: 'pending' | 'active' | 'expired' | 'cancelled' | 'failed';
          subscription_type: 'monthly' | 'yearly' | 'one_time';
          starts_at: string;
          expires_at: string;
          cancelled_at: string | null;
          cancelled_by: string | null;
          cancellation_reason: string | null;
          auto_renew: boolean;
          next_billing_date: string | null;
          amount_paid: number;
          payment_method: string | null;
          payment_provider: string | null;
          payment_reference: string | null;
          payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
          paid_at: string | null;
          metadata: Record<string, any>;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id: string;
          status?: 'pending' | 'active' | 'expired' | 'cancelled' | 'failed';
          subscription_type: 'monthly' | 'yearly' | 'one_time';
          starts_at: string;
          expires_at: string;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
          auto_renew?: boolean;
          next_billing_date?: string | null;
          amount_paid: number;
          payment_method?: string | null;
          payment_provider?: string | null;
          payment_reference?: string | null;
          payment_status?: 'pending' | 'completed' | 'failed' | 'refunded';
          paid_at?: string | null;
          metadata?: Record<string, any>;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_id?: string;
          status?: 'pending' | 'active' | 'expired' | 'cancelled' | 'failed';
          subscription_type?: 'monthly' | 'yearly' | 'one_time';
          starts_at?: string;
          expires_at?: string;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
          auto_renew?: boolean;
          next_billing_date?: string | null;
          amount_paid?: number;
          payment_method?: string | null;
          payment_provider?: string | null;
          payment_reference?: string | null;
          payment_status?: 'pending' | 'completed' | 'failed' | 'refunded';
          paid_at?: string | null;
          metadata?: Record<string, any>;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
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
