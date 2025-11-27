# ⚡ Comandos Rápidos para Deploy

## Opción 1: Usar Script Automático (Windows PowerShell)

```powershell
.\DEPLOY_UX_AJUSTES.ps1
```

## Opción 2: Comandos Manuales

### 1. Agregar archivos modificados
```bash
git add src/components/auction/BidForm.tsx
git add "src/app/auctions/[id]/page.tsx"
git add src/app/checkout/page.tsx
git add RESUMEN_FLUJO_PAGO_SUBASTAS.md
git add RESUMEN_CORRECCIONES_UX_SUBASTAS.md
git add CHECKLIST_DEPLOY_UX_SUBASTAS.md
```

### 2. Crear commit
```bash
git commit -m "feat: Mejoras UX subastas - membresía, tiempo sincronizado, flujo de pago

- Agregada validación de membresía con mensaje claro cuando no puede pujar
- Corregido desfase de tiempo en subastas programadas usando getSyncedNow()
- Mejoradas validaciones en checkout para evitar 404
- Agregada documentación del flujo de pago"
```

### 3. Push a producción
```bash
git push origin main
```

## Opción 3: Todo en un solo comando

```bash
git add src/components/auction/BidForm.tsx "src/app/auctions/[id]/page.tsx" src/app/checkout/page.tsx RESUMEN_FLUJO_PAGO_SUBASTAS.md RESUMEN_CORRECCIONES_UX_SUBASTAS.md CHECKLIST_DEPLOY_UX_SUBASTAS.md && git commit -m "feat: Mejoras UX subastas" && git push origin main
```

---

## ✅ Verificación Post-Deploy

Después del push, verifica:

1. **En Vercel/Dashboard**:
   - Build completado ✅
   - Deploy exitoso ✅
   - Sin errores en logs ✅

2. **Testing rápido**:
   - Abrir subasta sin membresía → Ver mensaje
   - Abrir subasta programada → Ver tiempo sincronizado
   - Ganar subasta → Verificar checkout

---

**Nota**: Si usas otra rama (ej: `production`), reemplaza `main` por el nombre de tu rama.






