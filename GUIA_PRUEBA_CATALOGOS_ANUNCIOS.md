# 🧪 GUÍA DE PRUEBA: CATÁLOGOS DE ANUNCIOS

**Paso a paso para probar la FASE B - Sistema de Catálogos de Anuncios por Tienda**

---

## ✅ PASO 1: Verificar Migraciones Aplicadas

### 1.1 Verificar en Supabase Dashboard

1. Abre: https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea/sql/new
2. Ejecuta este SQL:

```sql
-- Verificar tablas creadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('store_ad_catalogs', 'store_ad_catalog_products');

-- Verificar campos en products
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products'
  AND column_name IN (
    'is_in_global_catalog',
    'catalog_valid_from',
    'catalog_valid_until',
    'catalog_priority',
    'exclude_from_store_catalog'
  );
```

**Resultado esperado:**
- ✅ Debe mostrar 2 tablas: `store_ad_catalogs` y `store_ad_catalog_products`
- ✅ Debe mostrar 5 columnas en `products`

---

## ✅ PASO 2: Verificar Código sin Errores

### 2.1 Verificar TypeScript

```bash
npm run typecheck
```

**Resultado esperado:** Sin errores de TypeScript

### 2.2 Verificar Linting

```bash
npm run lint
```

**Resultado esperado:** Sin errores de linting (o solo warnings menores)

---

## ✅ PASO 3: Iniciar Servidor de Desarrollo

### 3.1 Iniciar Next.js

```bash
npm run dev
```

**Resultado esperado:**
- Servidor iniciando en `http://localhost:3000`
- Sin errores en la consola

### 3.2 Verificar que el servidor está corriendo

Abre en el navegador: http://localhost:3000

---

## ✅ PASO 4: Acceder al Dashboard

### 4.1 Iniciar Sesión

1. Ve a: http://localhost:3000/auth/sign-in
2. Inicia sesión con una cuenta de **vendedor** (que tenga una tienda)
3. Si no tienes cuenta de vendedor, créala y asegúrate de tener una tienda asociada

### 4.2 Navegar a Marketing

1. Una vez logueado, ve a: http://localhost:3000/dashboard/marketing
2. Deberías ver la página de Marketing y Campañas

**Resultado esperado:**
- Ver el header con botones:
  - ✅ "Mis Catálogos" (nuevo)
  - ✅ "Catálogo Mercadito"
  - ✅ "Sincronizar Catálogo"
  - ✅ "Nueva Campaña"

---

## ✅ PASO 5: Probar Página de Catálogos de Anuncios

### 5.1 Acceder a la Página

1. Haz clic en el botón **"Mis Catálogos"** en la página de marketing
2. O ve directamente a: http://localhost:3000/dashboard/marketing/catalogos-anuncios

**Resultado esperado:**
- Ver la página "Mis Catálogos de Anuncios"
- Ver un mensaje informativo sobre qué son los catálogos
- Ver botón "Nuevo Catálogo"
- Si no hay catálogos, ver mensaje "No tienes catálogos aún"

---

## ✅ PASO 6: Crear un Catálogo

### 6.1 Abrir Modal de Creación

1. Haz clic en el botón **"Nuevo Catálogo"**
2. Se debe abrir un modal

**Resultado esperado:**
- Modal con campos:
  - ✅ Slug (identificador único)
  - ✅ Nombre del Catálogo
  - ✅ Tipo (General, Colección, Promocional)

### 6.2 Completar Formulario

1. **Slug:** Escribe `default` (o cualquier slug único, solo minúsculas y guiones)
2. **Nombre:** Escribe `Mi Catálogo General`
3. **Tipo:** Selecciona `General`
4. Haz clic en **"Crear Catálogo"**

**Resultado esperado:**
- ✅ Modal se cierra
- ✅ Aparece mensaje: "Catálogo creado exitosamente"
- ✅ El nuevo catálogo aparece en la lista
- ✅ Muestra: Nombre, Slug, Tipo, Estado (Activo), Productos (0)

---

## ✅ PASO 7: Ver Detalles del Catálogo

### 7.1 Abrir Modal de Detalles

1. En la tarjeta del catálogo creado, haz clic en el botón **"Ver"** (icono de ojo)

**Resultado esperado:**
- ✅ Se abre un modal grande con:
  - Nombre del catálogo
  - Slug y cantidad de productos
  - Botones: "Agregar Productos" y "Regenerar desde Filtros"
  - Sección de "Productos en el Catálogo" (vacía por ahora)

---

## ✅ PASO 8: Agregar Productos al Catálogo

### 8.1 Abrir Búsqueda de Productos

1. En el modal de detalles, haz clic en **"Agregar Productos"**
2. Debe aparecer una sección de búsqueda

**Resultado esperado:**
- ✅ Campo de búsqueda visible
- ✅ Lista de productos disponibles de tu tienda (que no estén ya en el catálogo)

### 8.2 Buscar y Agregar Productos

1. Si tienes muchos productos, usa el campo de búsqueda para filtrar
2. Haz clic en **"Agregar"** en uno o más productos

**Resultado esperado:**
- ✅ El producto desaparece de la lista de disponibles
- ✅ El producto aparece en "Productos en el Catálogo"
- ✅ El contador de productos se actualiza
- ✅ Al cerrar y volver a abrir el modal, los productos siguen ahí

### 8.3 Verificar Contador

1. Cierra el modal de detalles
2. Verifica que la tarjeta del catálogo muestra el número correcto de productos

**Resultado esperado:**
- ✅ El contador muestra la cantidad correcta de productos

---

## ✅ PASO 9: Editar Catálogo

### 9.1 Abrir Modal de Edición

1. En la tarjeta del catálogo, haz clic en el botón **"Editar"** (icono de lápiz)

**Resultado esperado:**
- ✅ Se abre un modal con:
  - Campo de Nombre (prellenado)
  - Selector de Tipo (prellenado)
  - Checkbox de "Catálogo activo" (prellenado)

### 9.2 Modificar y Guardar

1. Cambia el nombre a `Mi Catálogo Actualizado`
2. Cambia el tipo a `Promocional`
3. Desmarca "Catálogo activo" (para probar estado inactivo)
4. Haz clic en **"Guardar Cambios"**

**Resultado esperado:**
- ✅ Modal se cierra
- ✅ Aparece mensaje: "Catálogo actualizado exitosamente"
- ✅ La tarjeta muestra los cambios:
  - Nombre actualizado
  - Tipo actualizado
  - Estado cambia a "Inactivo" (fondo gris)

### 9.3 Reactivar Catálogo

1. Edita el catálogo nuevamente
2. Marca "Catálogo activo"
3. Guarda

**Resultado esperado:**
- ✅ El estado vuelve a "Activo" (fondo verde)

---

## ✅ PASO 10: Remover Productos del Catálogo

### 10.1 Abrir Detalles

1. Abre el modal de detalles del catálogo (botón "Ver")

### 10.2 Remover Producto

1. En la lista de "Productos en el Catálogo"
2. Haz clic en el botón **"X"** (rojo) de un producto

**Resultado esperado:**
- ✅ El producto desaparece de la lista
- ✅ El contador de productos se actualiza
- ✅ El producto vuelve a estar disponible para agregar

---

## ✅ PASO 11: Crear Segundo Catálogo

### 11.1 Crear Catálogo Adicional

1. Crea un segundo catálogo con:
   - **Slug:** `ofertas`
   - **Nombre:** `Catálogo de Ofertas`
   - **Tipo:** `Promocional`

**Resultado esperado:**
- ✅ Se crea exitosamente
- ✅ Aparece en la lista junto al primero
- ✅ Ambos catálogos son independientes

### 11.2 Agregar Productos al Segundo Catálogo

1. Agrega algunos productos al segundo catálogo
2. Pueden ser los mismos productos que el primero (los catálogos son independientes)

**Resultado esperado:**
- ✅ Los productos se agregan correctamente
- ✅ Cada catálogo mantiene su propia lista de productos

---

## ✅ PASO 12: Probar Regeneración desde Filtros

### 12.1 Configurar Filtros (Opcional - Futuro)

**Nota:** La regeneración desde filtros está implementada pero requiere configuración de filtros en el catálogo. Por ahora, puedes probar que el botón funciona.

1. Abre el modal de detalles de un catálogo
2. Haz clic en **"Regenerar desde Filtros"**

**Resultado esperado:**
- ✅ El botón muestra un spinner mientras procesa
- ✅ Aparece mensaje: "Catálogo regenerado exitosamente"
- ✅ La fecha de "Última regeneración" se actualiza en la tarjeta

---

## ✅ PASO 13: Eliminar Catálogo

### 13.1 Eliminar Catálogo

1. En la tarjeta de un catálogo, haz clic en el botón **"Eliminar"** (icono de basura)
2. Confirma la eliminación en el diálogo

**Resultado esperado:**
- ✅ Aparece diálogo de confirmación
- ✅ Al confirmar, aparece mensaje: "Catálogo eliminado exitosamente"
- ✅ El catálogo desaparece de la lista
- ✅ Los productos del catálogo NO se eliminan (solo la relación)

---

## ✅ PASO 14: Verificar Validaciones

### 14.1 Probar Slug Duplicado

1. Intenta crear un catálogo con un slug que ya existe

**Resultado esperado:**
- ✅ Aparece error: "Ya existe un catálogo con ese slug para tu tienda"

### 14.2 Probar Campos Vacíos

1. Intenta crear un catálogo sin completar los campos requeridos

**Resultado esperado:**
- ✅ El formulario no se envía
- ✅ Aparece mensaje: "Completa todos los campos requeridos"

---

## ✅ PASO 15: Verificar Permisos (RLS)

### 15.1 Probar desde Otra Cuenta

1. Cierra sesión
2. Inicia sesión con otra cuenta de vendedor (con otra tienda)
3. Intenta acceder a: http://localhost:3000/dashboard/marketing/catalogos-anuncios

**Resultado esperado:**
- ✅ Solo ves los catálogos de TU tienda
- ✅ No puedes ver ni modificar catálogos de otras tiendas
- ✅ Si intentas agregar un producto de otra tienda, aparece error de permisos

---

## ✅ PASO 16: Verificar Navegación

### 16.1 Navegar entre Páginas

1. Desde "Mis Catálogos", haz clic en "Catálogo Mercadito"
2. Desde "Catálogo Mercadito", haz clic en "Mis Catálogos"
3. Desde cualquier página, usa el botón "Volver" o navegación del dashboard

**Resultado esperado:**
- ✅ La navegación funciona correctamente
- ✅ No hay errores 404
- ✅ El estado se mantiene (si aplica)

---

## 🐛 PROBLEMAS COMUNES Y SOLUCIONES

### Error: "No tienes permiso para modificar este catálogo"

**Causa:** El catálogo no pertenece a tu tienda o hay un problema con RLS.

**Solución:**
1. Verifica que estás logueado con la cuenta correcta
2. Verifica que tu tienda está activa
3. Revisa las políticas RLS en Supabase

### Error: "Ya existe un catálogo con ese slug"

**Causa:** Intentaste crear un catálogo con un slug que ya existe para tu tienda.

**Solución:** Usa un slug diferente (ej: `ofertas`, `nuevos`, `destacados`)

### No aparecen productos disponibles

**Causa:** No tienes productos activos en tu tienda o todos ya están en el catálogo.

**Solución:**
1. Crea algunos productos en tu tienda
2. Asegúrate de que tengan `status = 'active'`
3. O remueve algunos productos del catálogo para que estén disponibles

### El contador de productos no se actualiza

**Causa:** Puede haber un problema con la actualización del contador.

**Solución:**
1. Cierra y vuelve a abrir el modal de detalles
2. Recarga la página
3. El contador debería actualizarse automáticamente

---

## 📊 CHECKLIST DE PRUEBA

Marca cada ítem cuando lo completes:

- [ ] Migraciones aplicadas correctamente
- [ ] Código sin errores de TypeScript
- [ ] Servidor inicia sin errores
- [ ] Puedo acceder a la página de catálogos
- [ ] Puedo crear un catálogo nuevo
- [ ] Puedo ver los detalles de un catálogo
- [ ] Puedo agregar productos a un catálogo
- [ ] Puedo remover productos de un catálogo
- [ ] Puedo editar un catálogo
- [ ] Puedo eliminar un catálogo
- [ ] Puedo crear múltiples catálogos
- [ ] Los catálogos son independientes entre sí
- [ ] Las validaciones funcionan correctamente
- [ ] Los permisos RLS funcionan correctamente
- [ ] La navegación funciona correctamente

---

## ✅ RESULTADO FINAL ESPERADO

Al completar todas las pruebas, deberías tener:

1. ✅ Sistema de catálogos de anuncios completamente funcional
2. ✅ Capacidad de crear, editar y eliminar catálogos
3. ✅ Capacidad de gestionar productos en catálogos
4. ✅ Validaciones y permisos funcionando
5. ✅ UI intuitiva y responsive

---

**¡Listo para probar!** 🚀

Si encuentras algún problema, revisa la consola del navegador (F12) y la terminal donde corre el servidor para ver los errores.


