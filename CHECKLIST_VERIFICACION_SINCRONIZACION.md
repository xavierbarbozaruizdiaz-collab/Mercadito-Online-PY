# ✅ Checklist de Verificación: Localhost vs Producción

Después de sincronizar variables de entorno y migraciones, verifica estos puntos:

## 🔍 1. VERIFICAR RUTAS DE DASHBOARD

### En Localhost (`http://localhost:3000`):
- [ ] `/dashboard` - Dashboard principal
- [ ] `/dashboard/seller` - Dashboard vendedor
- [ ] `/dashboard/admin` - Dashboard admin
- [ ] `/dashboard/buyer` - Dashboard comprador (si existe)
- [ ] `/dashboard/affiliate` - Dashboard afiliado

### En Producción (`https://mercadito-online-py.vercel.app`):
- [ ] `/dashboard` - Dashboard principal
- [ ] `/dashboard/seller` - Dashboard vendedor
- [ ] `/dashboard/admin` - Dashboard admin
- [ ] `/dashboard/buyer` - Dashboard comprador (si existe)
- [ ] `/dashboard/affiliate` - Dashboard afiliado

**Resultado esperado:** Todas las rutas deben cargar sin errores 404 en ambos entornos.

---

## 🔐 2. VERIFICAR AUTENTICACIÓN Y ROLES

### En Localhost:
1. Inicia sesión con diferentes roles:
   - [ ] Usuario normal (buyer)
   - [ ] Vendedor (seller)
   - [ ] Admin
   - [ ] Afiliado (si tienes uno)

2. Verifica que cada rol vea su dashboard correcto:
   - [ ] Buyer ve `/dashboard` o `/dashboard/buyer`
   - [ ] Seller ve `/dashboard/seller`
   - [ ] Admin puede acceder a `/dashboard/admin` y `/admin`
   - [ ] Afiliado puede acceder a `/dashboard/affiliate`

### En Producción:
Repite las mismas pruebas con los mismos usuarios.

**Resultado esperado:** Los usuarios deben ver los mismos dashboards en ambos entornos según su rol.

---

## 📱 3. VERIFICAR FUNCIONALIDADES ESPECÍFICAS

### Dashboard Seller (`/dashboard/seller`):
En ambos entornos, verifica:
- [ ] Se cargan estadísticas (productos, órdenes, ingresos)
- [ ] Se muestran productos recientes
- [ ] Se muestran órdenes recientes
- [ ] Se muestran subastas (si aplica)
- [ ] Los botones de navegación funcionan

### Dashboard Admin (`/dashboard/admin` o `/admin`):
En ambos entornos, verifica:
- [ ] Se carga el panel de administración
- [ ] Se muestran métricas/estadísticas
- [ ] Los enlaces a subsecciones funcionan (tiendas, usuarios, productos, etc.)

### Dashboard Afiliado (`/dashboard/affiliate`):
En ambos entornos, verifica:
- [ ] Se muestra el panel del afiliado
- [ ] Se muestran comisiones y estadísticas
- [ ] Se puede copiar el link de referido

---

## 🗄️ 4. VERIFICAR DATOS DE BASE DE DATOS

### Verifica que estos datos se vean igual en ambos entornos:
- [ ] Productos en la página principal
- [ ] Categorías disponibles
- [ ] Tiendas/Stores
- [ ] Hero slides (banners)

### Prueba operaciones que requieren DB:
- [ ] Crear un producto (si eres seller)
- [ ] Buscar productos
- [ ] Ver detalles de producto
- [ ] Ver perfil de tienda

**Resultado esperado:** Los mismos datos deben aparecer en ambos entornos (o datos similares si usan bases diferentes).

---

## 🎨 5. VERIFICAR INTERFAZ VISUAL

### Compara visualmente:
- [ ] El hero slider/carousel se ve igual
- [ ] Los colores y estilos son consistentes
- [ ] Los componentes se renderizan correctamente
- [ ] No hay errores de consola en el navegador

### Abre la consola del navegador (F12) y verifica:
- [ ] No hay errores en rojo
- [ ] No hay warnings importantes
- [ ] Las llamadas a la API se completan exitosamente

---

## 🔧 6. VERIFICAR VARIABLES DE ENTORNO ESPECÍFICAS

### Hero Slider:
- [ ] En localhost: ¿Se muestra el hero? (debe mostrar según `NEXT_PUBLIC_FEATURE_HERO`)
- [ ] En producción: ¿Se muestra el hero? (debe mostrar según `NEXT_PUBLIC_FEATURE_HERO`)
- [ ] Ambos deben mostrar lo mismo

### URLs y redirecciones:
- [ ] Los enlaces internos funcionan en ambos
- [ ] Las redirecciones funcionan igual
- [ ] Las URLs de imágenes/assets funcionan

---

## 🐛 7. VERIFICAR ERRORES ESPECÍFICOS QUE SE REPORTARON

Si antes había problemas con:
- [ ] **Dashboard Admin:** Verifica que `/dashboard/admin` ahora funciona
- [ ] **Dashboard Seller:** Verifica que `/dashboard/seller` se carga completamente
- [ ] **Dashboard Afiliado:** Verifica que se ve el contenido completo

---

## 📊 8. VERIFICAR EN LOGS

### En Vercel (Producción):
1. Ve a Vercel Dashboard → Tu Proyecto → Deployments
2. Abre el último deployment
3. Ve a "Functions" o "Runtime Logs"
4. Verifica:
   - [ ] No hay errores 500
   - [ ] No hay errores de base de datos
   - [ ] No hay errores de autenticación

### En Localhost:
1. Abre la terminal donde corre `npm run dev`
2. Verifica:
   - [ ] No hay errores en rojo
   - [ ] No hay errores de conexión a Supabase
   - [ ] No hay errores de importación

---

## ✅ 9. CHECKLIST FINAL

Si todos los puntos anteriores pasan:
- [ ] ✅ Variables de entorno sincronizadas
- [ ] ✅ Migraciones de base de datos aplicadas
- [ ] ✅ Rutas de dashboard funcionando en ambos entornos
- [ ] ✅ Autenticación y roles funcionando igual
- [ ] ✅ Datos se ven consistentes
- [ ] ✅ No hay errores críticos

**Si todo está correcto:** 🎉 **Localhost y Producción están sincronizados**

---

## 🚨 SI HAY PROBLEMAS

### Si alguna ruta da 404:
1. Verifica que el archivo existe en `src/app/`
2. Verifica que la ruta esté correctamente estructurada
3. Revisa los logs de build en Vercel

### Si hay diferencias visuales:
1. Verifica que `NEXT_PUBLIC_FEATURE_HERO` sea igual en ambos
2. Verifica que las variables de Supabase sean iguales
3. Limpia caché del navegador (Ctrl+Shift+R)

### Si hay errores de base de datos:
1. Verifica que las migraciones estén aplicadas
2. Compara la estructura de tablas entre local y producción
3. Verifica políticas RLS (Row Level Security)

---

## 📝 NOTAS

- **Localhost:** `http://localhost:3000`
- **Producción:** `https://mercadito-online-py.vercel.app`
- Si usas bases de datos diferentes (local vs producción), algunos datos pueden diferir, pero la **estructura** debe ser igual

