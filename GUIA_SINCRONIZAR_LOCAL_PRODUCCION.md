# 🔄 GUÍA: Sincronizar Localhost con Producción

## ❌ PROBLEMAS COMUNES

### 1. **Variables de Entorno Faltantes**

**Problema:** Las variables de entorno no están configuradas localmente.

**Solución:**
```bash
# 1. Copia env.example a .env.local
cp env.example .env.local

# 2. Edita .env.local y agrega tus valores de SUPABASE
NEXT_PUBLIC_SUPABASE_URL=https://hqdatzhliaordlsqtjea.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key_aqui

# 3. Feature flags que pueden estar en producción:
NEXT_PUBLIC_FEATURE_HERO=true
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### 2. **Base de Datos Vacía o Desincronizada**

**Problema:** Tu base de datos local no tiene los mismos datos que producción.

**Solución A - Conectar a la misma base de datos:**
```bash
# Usa las mismas credenciales de Supabase que producción
# En .env.local:
NEXT_PUBLIC_SUPABASE_URL=https://hqdatzhliaordlsqtjea.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key_de_produccion
```

**Solución B - Aplicar migraciones localmente:**
```bash
# Si tienes Supabase CLI instalado:
npx supabase db push

# O aplica las migraciones manualmente desde:
# supabase/migrations/
```

---

### 3. **Feature Flags No Configurados**

**Problema:** Features que están habilitadas en producción pero no en desarrollo.

**Archivo:** `src/app/page.tsx` línea 6:
```typescript
const FEATURE_HERO = process.env.NEXT_PUBLIC_FEATURE_HERO === 'true';
```

**Solución:** Agrega a `.env.local`:
```env
NEXT_PUBLIC_FEATURE_HERO=true
```

---

### 4. **Imágenes/Storage No Disponible**

**Problema:** Las imágenes están en Supabase Storage y no se ven localmente.

**Solución:**
- Usa la misma URL de Supabase que producción
- O configura acceso local al Storage

---

### 5. **Datos Faltantes (Productos, Tiendas, etc.)**

**Problema:** No hay datos en tu base de datos local.

**Soluciones:**

**A) Usar la misma base de datos de producción** (recomendado para desarrollo):
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://hqdatzhliaordlsqtjea.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key_de_produccion
```

**B) Crear datos de prueba localmente:**
- Crea productos desde `/dashboard/new-product`
- Crea tiendas desde `/dashboard/profile`
- O importa datos desde producción

---

## ✅ CHECKLIST DE SINCRONIZACIÓN

### Paso 1: Variables de Entorno
- [ ] Crear `.env.local` desde `env.example`
- [ ] Agregar `NEXT_PUBLIC_SUPABASE_URL` de producción
- [ ] Agregar `NEXT_PUBLIC_SUPABASE_ANON_KEY` de producción
- [ ] Agregar `NEXT_PUBLIC_FEATURE_HERO=true`
- [ ] Agregar `NEXT_PUBLIC_APP_ENV=production` (para verlo igual)

### Paso 2: Base de Datos
- [ ] Conectar a la misma base de Supabase que producción
- [ ] O aplicar todas las migraciones localmente
- [ ] Verificar que hay productos en la base de datos
- [ ] Verificar que hay tiendas creadas
- [ ] Verificar que hay categorías

### Paso 3: Cache y Limpieza
```bash
# Limpiar cache de Next.js
rm -rf .next

# Reinstalar dependencias
npm install

# Reiniciar servidor
npm run dev
```

### Paso 4: Navegador
- [ ] Limpiar cache del navegador (Ctrl+Shift+Delete)
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Abrir en modo incógnito para verificar

---

## 🚨 VERIFICACIÓN RÁPIDA

### ¿Qué deberías ver en localhost que sea igual a producción?

1. **Hero Slider/Carrusel** - Si `FEATURE_HERO=true`
2. **Productos** - Mismos productos que producción
3. **Tiendas** - Mismas tiendas
4. **Categorías** - Mismas categorías
5. **Barra lateral del dashboard** - La nueva que acabamos de crear
6. **Imágenes** - De Supabase Storage

---

## 🔍 DEBUGGING

### Verificar variables de entorno en runtime:
```typescript
// En cualquier componente o página:
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Feature Hero:', process.env.NEXT_PUBLIC_FEATURE_HERO);
console.log('App Env:', process.env.NEXT_PUBLIC_APP_ENV);
```

### Verificar conexión a Supabase:
```typescript
// En la consola del navegador o servidor:
import { supabase } from '@/lib/supabase/client';
const { data, error } = await supabase.from('products').select('count');
console.log('Productos:', data);
```

---

## 📝 NOTAS IMPORTANTES

1. **No uses Service Role Key en localhost** - Solo usa ANON_KEY
2. **Producción usa variables de Vercel** - No archivos .env
3. **Los datos pueden diferir** - Producción tiene datos reales, local puede estar vacío
4. **Feature flags** - Algunas features solo están en producción

---

## 🆘 SI AÚN NO SE VEN IGUALES

1. Compara las URLs de Supabase (deben ser iguales)
2. Verifica que las migraciones estén aplicadas
3. Revisa la consola del navegador por errores
4. Revisa los logs del servidor (terminal)
5. Compara qué features están habilitadas en producción vs local

