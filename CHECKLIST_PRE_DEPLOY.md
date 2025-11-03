# ✅ CHECKLIST PRE-DEPLOY

## 📋 Antes de cada deploy a producción

### 1. **Build Local**
- [ ] `npm run build` ejecuta sin errores
- [ ] CSS generado (tamaño razonable ~95KB)
- [ ] Sin errores de TypeScript
- [ ] Sin errores de ESLint críticos

### 2. **Rutas y Navegación**
- [ ] No hay rutas duplicadas
- [ ] `/dashboard/admin` accesible
- [ ] `/dashboard/seller` accesible
- [ ] `/dashboard/affiliate` accesible
- [ ] Sidebar muestra links correctos según rol

### 3. **Tailwind CSS**
- [ ] `tailwind-safelist.ts` actualizado
- [ ] `src/styles` en `content` de `tailwind.config.js`
- [ ] `optimizeCss` deshabilitado (temporalmente)
- [ ] Clases dinámicas presentes en CSS

### 4. **Variables de Entorno**
- [ ] `.env.local` tiene todas las variables críticas
- [ ] `NEXT_PUBLIC_SUPABASE_URL` definida
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` definida
- [ ] `SUPABASE_SERVICE_ROLE_KEY` definida
- [ ] Variables en Vercel coinciden con `.env.local`

### 5. **Configuración**
- [ ] `vercel.json` configurado correctamente
- [ ] Build command correcto
- [ ] Variables de entorno en `vercel.json`
- [ ] `next.config.js` sin errores

### 6. **Base de Datos**
- [ ] Migraciones aplicadas
- [ ] RLS policies funcionando
- [ ] Sin errores de conexión

### 7. **Funcionalidad**
- [ ] Autenticación funciona
- [ ] Dashboard carga correctamente
- [ ] Productos se muestran
- [ ] Navegación funciona

---

## 🚀 Comandos de Verificación

```bash
# Verificación completa
npm run verificar:produccion

# Verificar CSS
npm run verificar:build-css

# Verificar variables de entorno
npm run verify:env

# Build local
npm run build

# Type check
npm run typecheck
```

---

## ⚠️ Problemas Comunes

1. **Clases no aparecen en producción**
   - Verificar `tailwind-safelist.ts`
   - Verificar `optimizeCss` está deshabilitado
   - Rebuild completo

2. **Rutas no funcionan**
   - Verificar no hay rutas duplicadas
   - Verificar layout correcto
   - Verificar autenticación

3. **Variables de entorno diferentes**
   - Comparar `.env.local` vs Vercel
   - Verificar `vercel.json`

---

**Última actualización:** $(date)

