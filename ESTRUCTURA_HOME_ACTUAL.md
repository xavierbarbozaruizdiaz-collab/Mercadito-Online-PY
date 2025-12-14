# 📋 ESTRUCTURA COMPLETA DEL HOME - MERCADITO ONLINE PY

## 🎯 ARCHIVO PRINCIPAL DEL HOME

### `src/app/page.tsx`
**Archivo principal del Home** - Server Component que renderiza la página de inicio.

**Componentes que usa:**
- `HeroMountProbe` - Asigna slides a window
- `HeroSliderClient` - Wrapper cliente para el slider
- `ProductsListClient` - Lista de productos con filtros

**Configuraciones:**
- Render dinámico forzado (no estático)
- Feature flag `NEXT_PUBLIC_FEATURE_HERO` para activar/desactivar hero slider
- Carga slides desde `hero_slides` (Supabase)

---

## 🎨 COMPONENTES DEL HERO SLIDER

### 1. `src/components/hero/HeroSliderClient.tsx`
**Wrapper cliente** para `HeroSlider` (requerido por Next.js 16)
- Import dinámico sin SSR
- Recibe slides como props

### 2. `src/components/hero/HeroSlider.tsx`
**Componente principal del slider**
- Usa `embla-carousel-react` para el carrusel
- Autoplay cada 3 segundos
- Soporta slides con gradientes o imágenes
- CTAs primarios y secundarios
- Controles de navegación (prev/next)
- Indicadores de paginación

**Características:**
- Responsive (min-height adaptativo)
- Imágenes con Next.js Image
- Gradientes personalizables

### 3. `src/components/hero/HeroMountProbe.tsx`
**Componente auxiliar** que asigna slides a `window.__HERO_SLIDES__`
- Solo para debugging/compatibilidad

### 4. `src/components/hero/HeroCarousel.tsx`
**Componente alternativo** (no usado actualmente en el Home)

---

## 🛍️ COMPONENTE DE PRODUCTOS

### `src/components/ProductsListClient.tsx`
**Componente principal de productos** - Cliente Component completo

**Funcionalidades:**
- Búsqueda de productos (título, descripción, vendedor, tienda)
- Filtros avanzados:
  - Categoría
  - Precio (min/max)
  - Condición (nuevo, usado, usado como nuevo)
  - Tipo de venta (directa, subasta)
  - Filtros especiales para subastas (activas, finalizando pronto)
  - Campos específicos para vehículos/motos (marca, modelo, año, etc.)
- Ordenamiento:
  - Más recientes (por defecto, con randomización)
  - Más antiguos
  - Precio: menor a mayor / mayor a menor
  - Nombre A-Z
  - Subastas: Finalizan pronto / Más pujas
- Grid de productos (3 columnas móvil, 9 columnas desktop)
- Cards de productos con:
  - Imagen
  - Título
  - Descripción
  - Precio / Puja actual (subastas)
  - Timer para subastas activas
  - Información de vendedor/tienda
  - Botón "Ver detalles" / "Ver subasta"

**Componentes que usa:**
- `SearchBar` - Barra de búsqueda
- `AuctionTimer` - Timer para subastas
- `SourcingSearchModal` - Modal de búsqueda sourcing
- `ProductListSkeleton` - Skeleton loader

**Estados:**
- Loading
- Error (con timeout de 30s)
- Empty state
- Productos cargados

---

## 🔍 COMPONENTES DE BÚSQUEDA Y FILTROS

### `src/components/SearchBar.tsx`
**Barra de búsqueda reutilizable**
- Sincronización con URL params
- Botón de limpiar
- Placeholder personalizable
- Callback `onSearch` opcional

### `src/components/SourcingSearchModal.tsx`
**Modal para búsqueda sourcing**
- Permite crear órdenes de sourcing
- Solo visible para vendedores
- Integrado con `useSourcingOrder` hook

---

## ⏱️ COMPONENTE DE SUBASTAS

### `src/components/auction/AuctionTimer.tsx`
**Timer para subastas activas**
- Sincronizado con servidor
- Formato: días + horas:minutos o horas:minutos:segundos
- Estados visuales:
  - Normal (verde)
  - Advertencia (amarillo) - últimos 10 segundos
  - Crítico (rojo) - últimos 3 segundos
  - Finalizado
- Variantes: `full` (detalle) y `compact` (listado)
- Tamaños: `md` y `lg`
- Animaciones y sonidos para tiempo crítico
- Ring de progreso visual

---

## 🎴 COMPONENTE DE TARJETA DE PRODUCTO

### `src/components/ui/ProductCard.tsx`
**Tarjeta de producto reutilizable**
- Variantes: `grid` (por defecto) y `list`
- Muestra:
  - Imagen del producto
  - Título
  - Categoría (opcional)
  - Tienda/Vendedor (opcional)
  - Precio (con precio comparado si existe)
  - Descuento (badge)
  - Stock (badge)
  - Botones de acción:
    - Agregar al carrito
    - Agregar a favoritos
- Tracking de analytics (Facebook Pixel, Google Analytics)
- Validación de stock
- Prevención de agregar productos propios al carrito

---

## 🎨 LAYOUT PRINCIPAL

### `src/app/layout.tsx`
**Layout raíz de la aplicación**

**Estructura:**
- Header sticky con:
  - Logo
  - Menú móvil
  - Navegación (Subastas, Sorteos)
  - Carrito
  - Menú de usuario
- Main content (donde se renderiza el Home)
- Footer
- Providers:
  - `ThemeProvider` - Tema claro/oscuro
  - `AnalyticsProvider` - Tracking de page views
  - `ToastProvider` - Notificaciones toast
  - `ErrorBoundary` - Manejo de errores

**Scripts:**
- Google Tag Manager (GTM)
- Service Worker cleanup

---

## 🎭 PROVIDERS Y CONTEXTOS

### `src/contexts/ThemeContext.tsx`
**Provider de tema**
- Soporta light/dark mode
- Persiste en localStorage
- Respeta preferencia del sistema

### `src/components/AnalyticsProvider.tsx`
**Provider de analytics**
- Trackea page views vía GTM dataLayer
- GTM distribuye a GA4, Facebook Pixel, etc.

### `src/components/ui/ToastProvider.tsx`
**Provider de notificaciones**
- Usa `react-hot-toast`
- Estilos personalizados
- Posición: top-right

---

## ⚙️ CONFIGURACIONES

### `src/lib/config/site.ts`
**Configuración del sitio**
- `SITE_URL` - URL base del sitio
- Fallback a producción o localhost

### `src/app/globals.css`
**Estilos globales**
- Variables CSS para tema
- Colores personalizados (verde menta)
- Soporte dark mode
- Animaciones personalizadas:
  - `pulse-glow`
  - `shake`
  - `bounce-in`
  - `slide-in-right`

---

## 📊 ESTRUCTURA DE DATOS

### Hero Slides (desde `hero_slides` table)
```typescript
type HeroSlide = {
  id: string;
  title: string | null;
  subtitle: string | null;
  cta_primary_label: string | null;
  cta_primary_href: string | null;
  cta_secondary_label: string | null;
  cta_secondary_href: string | null;
  bg_type: 'gradient' | 'image';
  bg_gradient_from?: string | null;
  bg_gradient_to?: string | null;
  bg_image_url?: string | null;
  image_url?: string | null;
  storage_path?: string | null;
  public_url?: string | null;
  sort_order: number;
  created_at?: string | null;
  show_title?: boolean; // Para mostrar/ocultar título
  link_url?: string | null; // URL para hacer click en todo el slide
}
```

### Productos (desde `products` table)
```typescript
type Product = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  condition: string;
  sale_type: string;
  category_id: string;
  seller_id: string;
  store_id: string | null;
  created_at: string;
  // Subastas
  auction_status?: 'scheduled' | 'active' | 'ended' | 'cancelled';
  auction_start_at?: string;
  auction_end_at?: string;
  current_bid?: number;
  total_bids?: number;
  // Mayorista
  wholesale_enabled?: boolean;
  wholesale_min_quantity?: number | null;
  wholesale_discount_percent?: number | null;
  // Stock
  stock_quantity?: number | null;
  stock_management_enabled?: boolean;
  low_stock_threshold?: number | null;
  // Relaciones
  seller?: { id, first_name, last_name, display_name } | null;
  store?: { id, name, slug } | null;
}
```

---

## 🔄 FLUJO DE DATOS

1. **Home (`page.tsx`)** carga slides desde Supabase
2. **HeroSliderClient** recibe slides y renderiza `HeroSlider`
3. **ProductsListClient** carga productos desde Supabase con filtros
4. **ProductCard** renderiza cada producto en el grid
5. **AuctionTimer** muestra tiempo restante para subastas activas

---

## 📱 RESPONSIVE DESIGN

**Breakpoints:**
- Mobile: `< 640px` (sm)
- Tablet: `640px - 1024px` (md)
- Desktop: `> 1024px` (lg)

**Grid de productos:**
- Móvil: 3 columnas
- Desktop: 9 columnas

**Hero Slider:**
- Móvil: min-height 220px
- Tablet: min-height 340px
- Desktop: min-height 420px
- XL: min-height 520px

---

## 🎨 ESTILOS ACTUALES

**Colores principales:**
- Verde menta (`#22C55E`) - Primary
- Esmeralda (`#10B981`) - Secondary
- Fondo: `#F9FAFB` (light) / Verde oscuro (dark)

**Tipografía:**
- Geist Sans (principal)
- Geist Mono (monospace)

**Espaciado:**
- Padding: `px-4 sm:px-8`
- Gaps: `gap-2 sm:gap-3 lg:gap-4`

---

## 🔗 RUTAS RELACIONADAS

- `/` - Home (este archivo)
- `/products/[id]` - Detalle de producto
- `/auctions/[id]` - Detalle de subasta
- `/stores` - Lista de tiendas
- `/vitrina` - Vitrina de productos
- `/favorites/stores` - Tiendas favoritas

---

## 📦 DEPENDENCIAS PRINCIPALES

- `next` - Framework
- `react` - UI library
- `embla-carousel-react` - Carrusel del hero
- `lucide-react` - Iconos
- `@supabase/supabase-js` - Base de datos
- `react-hot-toast` - Notificaciones
- `tailwindcss` - Estilos

---

## 🎯 PUNTOS DE ENTRADA PARA REDISEÑO

1. **`src/app/page.tsx`** - Estructura principal del Home
2. **`src/components/ProductsListClient.tsx`** - Grid y filtros de productos
3. **`src/components/hero/HeroSlider.tsx`** - Hero slider
4. **`src/app/layout.tsx`** - Layout general (header/footer)
5. **`src/app/globals.css`** - Estilos globales y variables CSS

---

## 📝 NOTAS IMPORTANTES

- El Home usa **render dinámico** (no estático)
- Los productos se **mezclan aleatoriamente** si no hay filtros activos
- Las **subastas se excluyen por defecto** del Home (solo se muestran si se filtra explícitamente)
- El **hero slider** se puede desactivar con `NEXT_PUBLIC_FEATURE_HERO=false`
- Los **timeouts** están configurados para evitar cargas infinitas (30s para productos)






















