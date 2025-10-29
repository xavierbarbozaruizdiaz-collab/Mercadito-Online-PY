// ============================================
// MERCADITO ONLINE PY - TYPES DEFINITIONS
// Definiciones de tipos TypeScript para el e-commerce
// ============================================

// ============================================
// TIPOS BASE
// ============================================

export type UserRole = 'buyer' | 'seller' | 'admin';
export type MembershipLevel = 'free' | 'bronze' | 'silver' | 'gold';
export type ProductCondition = 'new' | 'like_new' | 'used' | 'refurbished';
export type SaleType = 'fixed' | 'auction' | 'negotiable';
export type ProductStatus = 'active' | 'paused' | 'archived' | 'sold';
export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type ShipmentStatus = 'pending' | 'shipped' | 'in_transit' | 'delivered' | 'failed';
export type PaymentProvider = 'pagopar' | 'gpay' | 'stripe';

// ============================================
// USUARIOS Y AUTENTICACIÓN
// ============================================

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  cover_url?: string;
  bio?: string;
  location?: string;
  verified: boolean;
  membership_level: MembershipLevel;
  membership_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Store {
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
}

export interface StoreWithProfile extends Store {
  seller: Profile;
}

// ============================================
// PRODUCTOS Y CATEGORÍAS
// ============================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  image_url?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface ProductVariant {
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
}

export interface ProductImage {
  id: string;
  product_id: string;
  variant_id?: string;
  url: string;
  alt_text?: string;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  title: string;
  description?: string;
  price: number;
  compare_price?: number;
  sku?: string;
  barcode?: string;
  category_id?: string;
  condition: ProductCondition;
  sale_type: SaleType;
  status: ProductStatus;
  stock_quantity: number;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  tags: string[];
  seo_title?: string;
  seo_description?: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductWithDetails extends Product {
  store: Store;
  category?: Category;
  variants: ProductVariant[];
  images: ProductImage[];
}

// ============================================
// ÓRDENES Y PAGOS
// ============================================

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface OrderItemWithProduct extends OrderItem {
  product: Product;
  variant?: ProductVariant;
}

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  total_amount: number;
  payment_method?: string;
  payment_status: string;
  shipping_address: Address;
  billing_address?: Address;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderWithDetails extends Order {
  buyer: Profile;
  seller: Profile;
  items: OrderItemWithProduct[];
  payments: Payment[];
  shipments: Shipment[];
}

export interface Address {
  first_name: string;
  last_name: string;
  company?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
}

export interface Payment {
  id: string;
  order_id: string;
  payment_method: string;
  payment_provider: PaymentProvider;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider_transaction_id?: string;
  provider_response?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================
// ENVÍOS Y LOGÍSTICA
// ============================================

export interface Shipment {
  id: string;
  order_id: string;
  tracking_number?: string;
  carrier?: string;
  service_type?: string;
  status: ShipmentStatus;
  estimated_delivery?: string;
  actual_delivery?: string;
  shipping_address: Address;
  created_at: string;
  updated_at: string;
}

// ============================================
// NOTIFICACIONES Y COMUNICACIÓN
// ============================================

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  order_id?: string;
  subject?: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface MessageWithUsers extends Message {
  sender: Profile;
  recipient: Profile;
}

// ============================================
// ANALYTICS Y REPORTES
// ============================================

export interface AnalyticsEvent {
  id: string;
  user_id?: string;
  event_type: string;
  event_data?: Record<string, any>;
  page_url?: string;
  user_agent?: string;
  ip_address?: string;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  type: string;
  data: Record<string, any>;
  filters?: Record<string, any>;
  generated_at: string;
}

// ============================================
// FORMULARIOS Y VALIDACIÓN
// ============================================

export interface CreateProductForm {
  title: string;
  description?: string;
  price: number;
  compare_price?: number;
  sku?: string;
  barcode?: string;
  category_id?: string;
  condition: ProductCondition;
  sale_type: SaleType;
  stock_quantity: number;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  tags: string[];
  seo_title?: string;
  seo_description?: string;
  is_featured: boolean;
  images: File[];
  variants: {
    title: string;
    sku?: string;
    price?: number;
    compare_price?: number;
    stock_quantity: number;
    attributes: Record<string, string>;
    image_url?: string;
    is_default: boolean;
  }[];
}

export interface UpdateProductForm extends Partial<CreateProductForm> {
  id: string;
}

export interface CreateStoreForm {
  name: string;
  description?: string;
  location?: string;
  contact_email?: string;
  contact_phone?: string;
  social_links: Record<string, string>;
  cover_image?: File;
  logo?: File;
}

export interface UpdateStoreForm extends Partial<CreateStoreForm> {
  id: string;
}

export interface CreateOrderForm {
  items: {
    product_id: string;
    variant_id?: string;
    quantity: number;
  }[];
  shipping_address: Address;
  billing_address?: Address;
  notes?: string;
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface SearchFilters {
  query?: string;
  category_id?: string;
  min_price?: number;
  max_price?: number;
  condition?: ProductCondition;
  sale_type?: SaleType;
  location?: string;
  tags?: string[];
  sort_by?: 'price' | 'created_at' | 'title' | 'popularity';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ============================================
// DASHBOARD Y ANALYTICS
// ============================================

export interface DashboardStats {
  total_products: number;
  active_products: number;
  total_orders: number;
  pending_orders: number;
  total_revenue: number;
  monthly_revenue: number;
  total_customers: number;
  conversion_rate: number;
}

export interface ProductAnalytics {
  product_id: string;
  views: number;
  clicks: number;
  orders: number;
  revenue: number;
  conversion_rate: number;
}

export interface StoreAnalytics {
  store_id: string;
  total_products: number;
  total_orders: number;
  total_revenue: number;
  average_rating: number;
  total_reviews: number;
}

// ============================================
// CONFIGURACIÓN Y SETTINGS
// ============================================

export interface AppSettings {
  site_name: string;
  site_description: string;
  currency: string;
  default_language: string;
  features: {
    auctions_enabled: boolean;
    marketplace_enabled: boolean;
    payments_enabled: boolean;
    shipping_enabled: boolean;
    notifications_enabled: boolean;
  };
  payment_providers: PaymentProvider[];
  shipping_providers: string[];
}

export interface StoreSettings {
  allow_negotiation: boolean;
  auto_accept_orders: boolean;
  require_approval: boolean;
  notification_preferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  business_hours: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
}

// ============================================
// UTILIDADES Y HELPERS
// ============================================

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'file' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: SelectOption[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// ============================================
// EXPORTACIONES PRINCIPALES
// ============================================

export type {
  // Re-exportar tipos principales para fácil acceso
  Profile,
  Store,
  StoreWithProfile,
  Category,
  Product,
  ProductWithDetails,
  ProductVariant,
  ProductImage,
  Order,
  OrderWithDetails,
  OrderItem,
  OrderItemWithProduct,
  Payment,
  Shipment,
  Notification,
  Message,
  MessageWithUsers,
  AnalyticsEvent,
  Report,
  Address,
  DashboardStats,
  ProductAnalytics,
  StoreAnalytics,
  AppSettings,
  StoreSettings,
  SearchFilters,
  ApiResponse,
  PaginatedResponse,
  CreateProductForm,
  UpdateProductForm,
  CreateStoreForm,
  UpdateStoreForm,
  CreateOrderForm,
  SelectOption,
  TableColumn,
  FormField,
};
