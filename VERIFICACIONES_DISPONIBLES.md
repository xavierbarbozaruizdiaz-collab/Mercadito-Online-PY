# 🔍 VERIFICACIONES DISPONIBLES

## Scripts de Verificación

### 1. **Verificación Completa de Producción**
```bash
npm run verificar:produccion
```
Verifica:
- ✅ Build existe y CSS generado
- ✅ Rutas no duplicadas
- ✅ Tailwind configurado
- ✅ optimizeCss deshabilitado
- ✅ Variables de entorno
- ✅ Vercel config

### 2. **Verificación de CSS**
```bash
npm run verificar:build-css
```
Verifica:
- ✅ CSS generado
- ✅ Clases críticas presentes
- ✅ Tamaño del CSS
- ✅ Safelist configurado

### 3. **Verificación de Variables de Entorno**
```bash
npm run verify:env
```
Compara variables locales vs producción

### 4. **Comparar Migraciones**
```bash
npm run compare:migrations
```
Compara migraciones locales vs producción

---

## Verificaciones Manuales

### Build y Compilación
```bash
npm run build          # Build completo
npm run typecheck      # Verificar tipos
npm run lint           # Verificar código
```

### Tamaño del Bundle
```bash
# Después de build, verificar:
.next/static/chunks/   # Chunks de JavaScript
.next/static/css/      # CSS generado
```

### Rutas
```bash
# Verificar rutas duplicadas:
find src/app -name "page.tsx" | sort
```

---

## Verificaciones Post-Deploy

### En Producción (Vercel)

1. **Verificar CSS cargado**
   - DevTools → Network → CSS
   - Tamaño similar a local (~95KB)

2. **Verificar clases aplicadas**
   - DevTools → Elements → Inspeccionar elementos
   - Verificar que clases Tailwind están aplicadas

3. **Verificar errores**
   - DevTools → Console
   - Sin errores críticos

4. **Verificar funcionalidad**
   - Login funciona
   - Dashboard carga
   - Navegación funciona
   - Productos se muestran

---

## Comparación Local vs Producción

### Diferencias Comunes

1. **CSS no se aplica**
   - Verificar `optimizeCss` deshabilitado
   - Verificar safelist
   - Verificar build

2. **Rutas no funcionan**
   - Verificar rutas duplicadas
   - Verificar layout
   - Verificar autenticación

3. **Variables diferentes**
   - Comparar `.env.local` vs Vercel
   - Verificar `vercel.json`

4. **Funcionalidad diferente**
   - Verificar migraciones aplicadas
   - Verificar RLS policies
   - Verificar datos de prueba

---

## Checklist Rápido

- [ ] Build funciona
- [ ] CSS generado
- [ ] Sin rutas duplicadas
- [ ] Tailwind configurado
- [ ] Variables de entorno correctas
- [ ] optimizeCss deshabilitado
- [ ] Deploy en Vercel
- [ ] Verificar en producción

---

**Última actualización:** $(date)

