# 🚀 Checklist: Deploy de Correcciones UX Subastas a Producción

## 📋 Cambios a Deployar

### 1. UX de Membresía / Permisos
- ✅ Validación de membresía en `BidForm.tsx`
- ✅ Mensaje cuando no puede pujar
- ✅ Botón CTA a membresías

### 2. Desfase de Tiempo en Subastas Programadas
- ✅ Uso de `getSyncedNow()` en lugar de `serverNowMs` estático
- ✅ Estado de subasta calculado correctamente
- ✅ Horarios en formato consistente

### 3. Flujo de Pago de Subasta
- ✅ Validaciones mejoradas en checkout
- ✅ Verificación de ganador
- ✅ Manejo de errores mejorado

---

## ✅ Pre-Deploy Checklist

### Código
- [x] Todos los archivos modificados están en el repositorio
- [x] No hay errores de linting
- [x] No hay errores de TypeScript
- [x] Funcionalidades críticas no fueron modificadas (Redis, locks, bonus time)

### Archivos a Deployar
- [x] `src/components/auction/BidForm.tsx`
- [x] `src/app/auctions/[id]/page.tsx`
- [x] `src/app/checkout/page.tsx`

### Dependencias
- [x] No se agregaron nuevas dependencias
- [x] `getUserBidLimit` ya existe en `membershipService.ts`
- [x] `getSyncedNow` ya existe en `timeSync.ts`

---

## 🔄 Pasos para Deploy

### 1. Verificar Cambios Locales
```bash
# Ver qué archivos fueron modificados
git status

# Ver los cambios
git diff src/components/auction/BidForm.tsx
git diff src/app/auctions/[id]/page.tsx
git diff src/app/checkout/page.tsx
```

### 2. Commit y Push
```bash
# Agregar archivos modificados
git add src/components/auction/BidForm.tsx
git add src/app/auctions/\[id\]/page.tsx
git add src/app/checkout/page.tsx
git add RESUMEN_FLUJO_PAGO_SUBASTAS.md
git add RESUMEN_CORRECCIONES_UX_SUBASTAS.md
git add CHECKLIST_DEPLOY_UX_SUBASTAS.md

# Commit
git commit -m "feat: Mejoras UX subastas - membresía, tiempo sincronizado, flujo de pago

- Agregada validación de membresía con mensaje claro cuando no puede pujar
- Corregido desfase de tiempo en subastas programadas usando getSyncedNow()
- Mejoradas validaciones en checkout para evitar 404
- Agregada documentación del flujo de pago"

# Push a producción
git push origin main
# o
git push origin production
```

### 3. Deploy en Plataforma

#### Si usas Vercel:
- El deploy se ejecuta automáticamente al hacer push
- Verificar en dashboard de Vercel que el deploy se completó
- Revisar logs del build

#### Si usas otra plataforma:
- Ejecutar proceso de deploy según tu configuración
- Verificar que el build fue exitoso

---

## ✅ Post-Deploy Verification

### 1. Verificar que el Deploy fue Exitoso
- [ ] Build completado sin errores
- [ ] Aplicación desplegada correctamente
- [ ] No hay errores en logs de producción

### 2. Testing en Producción

#### UX de Membresía
- [ ] Abrir una subasta con cuenta sin membresía
- [ ] Verificar que aparece mensaje de membresía requerida
- [ ] Verificar que el botón "Ver Planes de Membresía" funciona
- [ ] Abrir con cuenta con membresía válida
- [ ] Verificar que aparece botón de pujar normal

#### Desfase de Tiempo
- [ ] Abrir una subasta programada en 2 navegadores diferentes
- [ ] Verificar que ambos muestran el mismo tiempo "INICIA EN"
- [ ] Verificar que el estado en "Información del Lote" es correcto
- [ ] Verificar que los horarios están en formato correcto (Paraguay)

#### Flujo de Pago
- [ ] Ganar una subasta (o simular)
- [ ] Hacer clic en "Pagar Ahora"
- [ ] Verificar que carga el checkout correctamente
- [ ] Verificar que muestra precio con comisiones
- [ ] Intentar pagar con Pagopar
- [ ] Verificar que no hay 404

### 3. Verificar Logs
- [ ] Revisar logs de errores en producción
- [ ] Verificar que no hay errores nuevos relacionados con:
  - `getUserBidLimit`
  - `getSyncedNow`
  - Checkout de subastas

---

## 🐛 Rollback Plan (si es necesario)

Si algo sale mal, revertir el commit:

```bash
# Ver el último commit
git log --oneline -1

# Revertir el commit (crea un nuevo commit que deshace los cambios)
git revert HEAD

# Push del revert
git push origin main
```

O volver a un commit anterior:

```bash
# Ver commits recientes
git log --oneline -5

# Resetear a un commit anterior (CUIDADO: esto elimina commits)
git reset --hard <commit-hash>

# Force push (solo si es necesario y tienes permiso)
git push origin main --force
```

---

## 📊 Monitoreo Post-Deploy

### Primeras 24 horas:
- [ ] Monitorear errores en logs
- [ ] Verificar métricas de uso:
  - Clicks en "Ver Planes de Membresía"
  - Conversiones de checkout
  - Errores 404 en checkout
- [ ] Revisar feedback de usuarios

### Métricas a Observar:
- Tasa de error en checkout de subastas
- Tiempo de carga de página de subasta
- Errores relacionados con membresía
- Quejas sobre tiempos desincronizados

---

## ✅ Checklist Final

- [ ] Código commiteado y pusheado
- [ ] Deploy completado exitosamente
- [ ] Testing básico realizado
- [ ] No hay errores críticos en logs
- [ ] Documentación actualizada

---

## 📝 Notas

- **No se requieren migraciones SQL**: Todos los cambios son de código frontend/backend
- **No se requieren cambios en Redis**: La lógica de locks y rate limiting no fue modificada
- **No se requieren cambios en Supabase**: Las funciones SQL no fueron modificadas
- **Backward compatible**: Los cambios son compatibles con la versión anterior

---

**Fecha de deploy**: _______________  
**Deployado por**: _______________  
**Estado**: ⏳ Pendiente / ✅ Completado






