// ============================================
// MERCADITO ONLINE PY - VALIDACIONES
// Esquemas de validación con Zod
// ============================================

import { z } from 'zod';

// ============================================
// VALIDACIONES BASE
// ============================================

export const emailSchema = z.string().email('Email inválido');
export const phoneSchema = z.string().min(10, 'Teléfono debe tener al menos 10 dígitos');
export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido');
export const urlSchema = z.string().url('URL inválida');

// ============================================
// VALIDACIONES DE USUARIO
// ============================================

export const profileSchema = z.object({
  first_name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').optional(),
  last_name: z.string().min(2, 'Apellido debe tener al menos 2 caracteres').optional(),
  phone: phoneSchema.optional(),
  bio: z.string().max(500, 'Biografía no puede exceder 500 caracteres').optional(),
  location: z.string().min(2, 'Ubicación debe tener al menos 2 caracteres').optional(),
});

export const updateProfileSchema = profileSchema.partial();

// ============================================
// VALIDACIONES DE TIENDA
// ============================================

export const storeSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').max(100, 'Nombre no puede exceder 100 caracteres'),
  slug: slugSchema,
  description: z.string().max(1000, 'Descripción no puede exceder 1000 caracteres').optional(),
  location: z.string().min(2, 'Ubicación debe tener al menos 2 caracteres').optional(),
  contact_email: emailSchema.optional(),
  contact_phone: phoneSchema.optional(),
  social_links: z.record(z.string(), urlSchema).optional(),
});

export const createStoreSchema = storeSchema.omit({ slug: true });
export const updateStoreSchema = storeSchema.partial();

// ============================================
// VALIDACIONES DE PRODUCTO
// ============================================

export const productVariantSchema = z.object({
  title: z.string().min(1, 'Título es requerido'),
  sku: z.string().optional(),
  price: z.number().min(0, 'Precio debe ser mayor o igual a 0').optional(),
  compare_price: z.number().min(0, 'Precio de comparación debe ser mayor o igual a 0').optional(),
  stock_quantity: z.number().int().min(0, 'Cantidad debe ser mayor o igual a 0'),
  attributes: z.record(z.string(), z.string()),
  image_url: urlSchema.optional(),
  is_default: z.boolean().default(false),
});

export const productSchema = z.object({
  title: z.string().min(2, 'Título debe tener al menos 2 caracteres').max(200, 'Título no puede exceder 200 caracteres'),
  description: z.string().max(5000, 'Descripción no puede exceder 5000 caracteres').optional(),
  price: z.number().min(0, 'Precio debe ser mayor o igual a 0'),
  compare_price: z.number().min(0, 'Precio de comparación debe ser mayor o igual a 0').optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category_id: z.string().uuid('ID de categoría inválido').optional(),
  condition: z.enum(['new', 'like_new', 'used', 'refurbished']),
  sale_type: z.enum(['fixed', 'auction', 'negotiable']),
  stock_quantity: z.number().int().min(0, 'Cantidad debe ser mayor o igual a 0'),
  weight: z.number().min(0, 'Peso debe ser mayor o igual a 0').optional(),
  dimensions: z.object({
    length: z.number().min(0).optional(),
    width: z.number().min(0).optional(),
    height: z.number().min(0).optional(),
  }).optional(),
  tags: z.array(z.string()).max(10, 'Máximo 10 etiquetas'),
  seo_title: z.string().max(60, 'Título SEO no puede exceder 60 caracteres').optional(),
  seo_description: z.string().max(160, 'Descripción SEO no puede exceder 160 caracteres').optional(),
  is_featured: z.boolean().default(false),
  variants: z.array(productVariantSchema).optional(),
});

export const createProductSchema = productSchema;
export const updateProductSchema = productSchema.partial();

// ============================================
// VALIDACIONES DE ÓRDENES
// ============================================

export const addressSchema = z.object({
  first_name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'Apellido debe tener al menos 2 caracteres'),
  company: z.string().optional(),
  address_line_1: z.string().min(5, 'Dirección debe tener al menos 5 caracteres'),
  address_line_2: z.string().optional(),
  city: z.string().min(2, 'Ciudad debe tener al menos 2 caracteres'),
  state: z.string().min(2, 'Estado debe tener al menos 2 caracteres'),
  postal_code: z.string().min(4, 'Código postal debe tener al menos 4 caracteres'),
  country: z.string().min(2, 'País debe tener al menos 2 caracteres'),
  phone: phoneSchema.optional(),
});

export const orderItemSchema = z.object({
  product_id: z.string().uuid('ID de producto inválido'),
  variant_id: z.string().uuid('ID de variante inválido').optional(),
  quantity: z.number().int().min(1, 'Cantidad debe ser al menos 1'),
});

export const orderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Debe incluir al menos un producto'),
  shipping_address: addressSchema,
  billing_address: addressSchema.optional(),
  notes: z.string().max(500, 'Notas no pueden exceder 500 caracteres').optional(),
});

export const createOrderSchema = orderSchema;

// ============================================
// VALIDACIONES DE PAGOS
// ============================================

export const paymentSchema = z.object({
  payment_method: z.string().min(1, 'Método de pago es requerido'),
  payment_provider: z.enum(['pagopar', 'gpay', 'stripe']),
  amount: z.number().min(0.01, 'Monto debe ser mayor a 0'),
  currency: z.string().default('PYG'),
});

export const createPaymentSchema = paymentSchema;

// ============================================
// VALIDACIONES DE BÚSQUEDA
// ============================================

export const searchFiltersSchema = z.object({
  query: z.string().optional(),
  category_id: z.string().uuid().optional(),
  min_price: z.number().min(0).optional(),
  max_price: z.number().min(0).optional(),
  condition: z.enum(['new', 'like_new', 'used', 'refurbished']).optional(),
  sale_type: z.enum(['fixed', 'auction', 'negotiable']).optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sort_by: z.enum(['price', 'created_at', 'title', 'popularity']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ============================================
// VALIDACIONES DE ARCHIVOS
// ============================================

export const fileSchema = z.object({
  name: z.string().min(1, 'Nombre de archivo es requerido'),
  size: z.number().max(5 * 1024 * 1024, 'Archivo no puede exceder 5MB'),
  type: z.string().refine(
    (type) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(type),
    'Tipo de archivo no válido'
  ),
});

export const imageUploadSchema = z.object({
  images: z.array(fileSchema).min(1, 'Debe subir al menos una imagen').max(10, 'Máximo 10 imágenes'),
});

// ============================================
// VALIDACIONES DE FORMULARIOS
// ============================================

export const contactFormSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: emailSchema,
  subject: z.string().min(5, 'Asunto debe tener al menos 5 caracteres'),
  message: z.string().min(10, 'Mensaje debe tener al menos 10 caracteres'),
});

export const newsletterSchema = z.object({
  email: emailSchema,
});

// ============================================
// VALIDACIONES DE CONFIGURACIÓN
// ============================================

export const appSettingsSchema = z.object({
  site_name: z.string().min(2, 'Nombre del sitio debe tener al menos 2 caracteres'),
  site_description: z.string().max(500, 'Descripción no puede exceder 500 caracteres'),
  currency: z.string().min(3, 'Moneda debe tener al menos 3 caracteres'),
  default_language: z.string().min(2, 'Idioma debe tener al menos 2 caracteres'),
  features: z.object({
    auctions_enabled: z.boolean(),
    marketplace_enabled: z.boolean(),
    payments_enabled: z.boolean(),
    shipping_enabled: z.boolean(),
    notifications_enabled: z.boolean(),
  }),
});

// ============================================
// TIPOS INFERIDOS
// ============================================

export type ProfileFormData = z.infer<typeof profileSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
export type StoreFormData = z.infer<typeof storeSchema>;
export type CreateStoreFormData = z.infer<typeof createStoreSchema>;
export type UpdateStoreFormData = z.infer<typeof updateStoreSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type CreateProductFormData = z.infer<typeof createProductSchema>;
export type UpdateProductFormData = z.infer<typeof updateProductSchema>;
export type ProductVariantFormData = z.infer<typeof productVariantSchema>;
export type OrderFormData = z.infer<typeof orderSchema>;
export type CreateOrderFormData = z.infer<typeof createOrderSchema>;
export type AddressFormData = z.infer<typeof addressSchema>;
export type OrderItemFormData = z.infer<typeof orderItemSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
export type CreatePaymentFormData = z.infer<typeof createPaymentSchema>;
export type SearchFiltersFormData = z.infer<typeof searchFiltersSchema>;
export type FileFormData = z.infer<typeof fileSchema>;
export type ImageUploadFormData = z.infer<typeof imageUploadSchema>;
export type ContactFormData = z.infer<typeof contactFormSchema>;
export type NewsletterFormData = z.infer<typeof newsletterSchema>;
export type AppSettingsFormData = z.infer<typeof appSettingsSchema>;
