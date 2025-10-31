# 🚀 GUÍA DE ACCESO - Mercadito Online PY

## 📋 ÍNDICE DE RUTAS Y FUNCIONALIDADES

### 🏠 **PÁGINAS PÚBLICAS** (Sin autenticación)

#### 1. **Página Principal**
- **URL**: `/`
- **Descripción**: Landing page con hero section y listado de productos
- **Acceso**: Abre directamente en el navegador

#### 2. **Búsqueda de Productos**
- **URL**: `/search?q=termino`
- **Descripción**: Página de búsqueda avanzada con filtros
- **Acceso**: Desde el header (barra de búsqueda) o navegando a `/search`

#### 3. **Detalle de Producto**
- **URL**: `/products/[id]`
- **Descripción**: Página individual de cada producto con:
  - Imágenes optimizadas
  - Descripción completa
  - Botón "Agregar al carrito"
  - Botón "Iniciar conversación"
  - Alertas de precio
  - Historial de precios
  - Preguntas y respuestas
  - Reseñas del producto
- **Acceso**: Clic en cualquier producto de la lista

#### 4. **Tiendas**
- **URL**: `/stores`
- **Descripción**: Listado de todas las tiendas disponibles
- **Acceso**: Botón "Ver Todas las Tiendas" en la página principal

#### 5. **Tienda Individual**
- **URL**: `/store/[slug]`
- **Descripción**: Página de una tienda específica con sus productos
- **Acceso**: Desde el listado de tiendas o desde productos

#### 6. **Vendedor Individual**
- **URL**: `/seller/[id]`
- **Descripción**: Perfil del vendedor y sus productos
- **Acceso**: Clic en información del vendedor en productos

---

### 🔐 **PÁGINAS DE AUTENTICACIÓN**

#### 7. **Inicio de Sesión / Registro**
- **URL**: `/auth/sign-in`
- **Descripción**: Formulario de login y registro
- **Acceso**: Desde el header (menú de usuario si no estás logueado)

---

### 🛒 **PÁGINAS DE COMPRAS** (Requiere autenticación como comprador)

#### 8. **Carrito de Compras**
- **URL**: `/cart`
- **Descripción**: Ver y gestionar items del carrito
- **Acceso**: Botón del carrito en el header (ícono 🛒)
- **Requisito**: Usuario autenticado

#### 9. **Checkout**
- **URL**: `/checkout`
- **Descripción**: Finalizar compra con:
  - Formulario de dirección de envío
  - Selección de método de pago
  - Aplicación de cupones de descuento
  - Resumen del pedido
- **Acceso**: Desde el carrito, botón "Proceder al Checkout"
- **Requisito**: Usuario autenticado + carrito con items

#### 10. **Confirmación de Orden**
- **URL**: `/checkout/success`
- **Descripción**: Página de confirmación después de completar una orden
- **Acceso**: Automático después de completar checkout

#### 11. **Mis Órdenes**
- **URL**: `/orders`
- **Descripción**: Historial de compras del usuario
- **Acceso**: Botón "📦 Mis pedidos" en el dashboard o desde el menú
- **Requisito**: Usuario autenticado

---

### 📊 **PÁGINAS DE VENDEDOR** (Requiere autenticación como vendedor/seller)

#### 12. **Dashboard del Vendedor**
- **URL**: `/dashboard`
- **Descripción**: Panel principal del vendedor con:
  - Listado de productos propios
  - Acciones: Editar, Ver, Eliminar productos
  - Estadísticas básicas
  - Herramienta de asignación de roles admin (solo para admin)
- **Acceso**: 
  - Menú de usuario → "Panel del vendedor"
  - Botón "Vender productos" en homepage
- **Requisito**: Usuario autenticado con rol `seller` o `admin`

#### 13. **Nuevo Producto**
- **URL**: `/dashboard/new-product`
- **Descripción**: Formulario para crear un nuevo producto con:
  - Información básica (título, descripción, precio)
  - Selección de categoría
  - Subida de múltiples imágenes (hasta 10)
  - Drag & drop para reordenar imágenes
  - Validación en tiempo real
- **Acceso**: Botón "+ Nuevo producto" en el dashboard
- **Requisito**: Usuario autenticado con rol `seller` o `admin`

#### 14. **Editar Producto**
- **URL**: `/dashboard/edit-product/[id]`
- **Descripción**: Formulario para editar un producto existente
- **Acceso**: Botón "✏️ Editar" en cualquier producto del dashboard
- **Requisito**: Usuario autenticado + ser dueño del producto

---

### 👑 **PÁGINAS DE ADMINISTRACIÓN** (Requiere rol `admin`)

#### 15. **Panel de Administración**
- **URL**: `/admin`
- **Descripción**: Dashboard completo con:
  - Métricas principales (productos totales, órdenes, revenue)
  - Órdenes recientes
  - Productos más vendidos
  - Enlaces rápidos a:
    - Gestión de categorías
    - Gestión de productos
    - Ver todas las órdenes
    - Ir a la tienda pública
- **Acceso**: 
  - URL directa: `/admin`
  - Menú de usuario (si eres admin)
- **Requisito**: Usuario autenticado con rol `admin`

#### 16. **Gestión de Categorías**
- **URL**: `/admin/categories`
- **Descripción**: CRUD completo de categorías
- **Acceso**: Desde panel admin, tarjeta "Categorías"
- **Requisito**: Usuario autenticado con rol `admin`

#### 17. **Seguridad**
- **URL**: `/admin/security`
- **Descripción**: Panel de configuración de seguridad
- **Acceso**: Desde navegación admin
- **Requisito**: Usuario autenticado con rol `admin`

#### 18. **Backups**
- **URL**: `/admin/backups`
- **Descripción**: Gestión de respaldos del sistema
- **Acceso**: Desde navegación admin
- **Requisito**: Usuario autenticado con rol `admin`

---

### 💬 **FUNCIONALIDADES AVANZADAS**

#### 19. **Chat / Mensajería**
- **URL**: `/chat`
- **Descripción**: Sistema de mensajería entre usuarios
- **Acceso**: Desde productos (botón "Iniciar conversación") o menú
- **Requisito**: Usuario autenticado

#### 20. **Wishlist / Favoritos**
- **URL**: `/dashboard/wishlist`
- **Descripción**: Lista de productos guardados como favoritos
- **Acceso**: Desde menú de usuario
- **Requisito**: Usuario autenticado

#### 21. **Configuración de Notificaciones**
- **URL**: `/settings/notifications`
- **Descripción**: Gestionar preferencias de notificaciones
- **Acceso**: Desde menú de usuario → Configuración
- **Requisito**: Usuario autenticado

#### 22. **Página Offline**
- **URL**: `/offline`
- **Descripción**: Página mostrada cuando no hay conexión
- **Acceso**: Automático cuando detecta falta de conexión

---

## 🔑 **CÓMO OBTENER ACCESO A ADMIN**

### Opción 1: Desde el Dashboard (Herramienta de Asignación)
1. Inicia sesión con cualquier cuenta
2. Ve a `/dashboard`
3. En la parte inferior verás el componente `AdminRoleAssigner`
4. Ingresa el email de la cuenta que quieres convertir en admin
5. Click en "Asignar rol admin"
6. Ese usuario ahora tendrá acceso a `/admin`

### Opción 2: Manualmente en Supabase
1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **Table Editor** → `profiles`
3. Encuentra el usuario por email
4. Cambia el campo `role` de `'buyer'` o `'seller'` a `'admin'`
5. Guarda los cambios

### Opción 3: SQL Directo
```sql
-- Reemplaza 'email@example.com' con el email del usuario
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'email@example.com';
```

---

## 🛠️ **ESTRUCTURA DE ROLES**

El sistema tiene 3 roles:

1. **`buyer`** (Comprador - Por defecto)
   - Puede ver productos
   - Puede agregar al carrito
   - Puede realizar compras
   - Puede ver sus órdenes

2. **`seller`** (Vendedor)
   - Todas las capacidades de `buyer`
   - Puede crear productos
   - Puede editar/eliminar sus productos
   - Puede ver dashboard de vendedor
   - Puede ver órdenes de sus productos

3. **`admin`** (Administrador)
   - Todas las capacidades de `seller`
   - Acceso al panel de administración (`/admin`)
   - Puede gestionar categorías
   - Puede ver analytics completos
   - Puede asignar roles a otros usuarios
   - Puede gestionar seguridad del sistema

---

## 📱 **COMPONENTES DEL HEADER**

El header incluye:
- **🔍 Barra de búsqueda**: Búsqueda global de productos
- **🔔 Panel de notificaciones**: Notificaciones del usuario
- **🛒 Botón de carrito**: Acceso rápido al carrito (con contador)
- **👤 Menú de usuario**: 
  - Si no estás logueado: "Iniciar sesión"
  - Si estás logueado: Menú desplegable con opciones

---

## 🔍 **BÚSQUEDA Y FILTROS**

### Búsqueda Global (Header)
- Busca en tiempo real mientras escribes
- Busca en títulos y descripciones
- Actualiza la URL con parámetro `?q=termino`

### Filtros Avanzados (Página Principal)
- **Categoría**: Filtrar por categoría específica
- **Rango de precio**: Precio mínimo y máximo
- **Condición**: Nuevo, Usado, Usado como nuevo
- **Tipo de venta**: Venta directa, Subasta
- **Ordenamiento**: Por fecha, precio, nombre

---

## ⚡ **ACCESO RÁPIDO**

### Para probar el sistema completo:

1. **Como visitante**:
   ```
   http://localhost:3000/
   ```

2. **Crear cuenta / Login**:
   ```
   http://localhost:3000/auth/sign-in
   ```

3. **Panel de vendedor** (después de login):
   ```
   http://localhost:3000/dashboard
   ```

4. **Panel de admin** (después de asignar rol admin):
   ```
   http://localhost:3000/admin
   ```

5. **Ver carrito** (después de agregar productos):
   ```
   http://localhost:3000/cart
   ```

---

## 🚨 **SOLUCIÓN DE PROBLEMAS**

### No puedo acceder a `/admin`
- Verifica que tu usuario tenga `role = 'admin'` en la tabla `profiles`
- Cierra sesión y vuelve a iniciar sesión
- Verifica que no haya errores en la consola del navegador

### No veo mis productos en el dashboard
- Verifica que los productos tengan `seller_id` (o `created_by`) igual a tu `user.id`
- Verifica que estés logueado con la cuenta correcta

### No puedo crear productos
- Verifica que tengas rol `seller` o `admin`
- Verifica que estés en `/dashboard/new-product`

---

## 📝 **NOTAS IMPORTANTES**

- El sistema usa **Row Level Security (RLS)** en Supabase
- Los permisos se validan tanto en frontend como en backend
- Algunas funcionalidades requieren múltiples verificaciones
- El rol se asigna automáticamente como `buyer` al registrarse
- Para convertir un usuario en `seller`, actualiza su `role` en Supabase

---

**¿Necesitas ayuda con alguna ruta específica?** Pregúntame y te guío paso a paso.




