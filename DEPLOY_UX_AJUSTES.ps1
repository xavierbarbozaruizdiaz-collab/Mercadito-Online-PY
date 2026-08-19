# Script PowerShell para deployar correcciones UX de subastas

Write-Host "🚀 Deploy de Correcciones UX Subastas" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Archivos principales a deployar
$files = @(
    "src/components/auction/BidForm.tsx",
    "src/app/auctions/[id]/page.tsx",
    "src/app/checkout/page.tsx"
)

# Archivos de documentación
$docs = @(
    "RESUMEN_FLUJO_PAGO_SUBASTAS.md",
    "RESUMEN_CORRECCIONES_UX_SUBASTAS.md",
    "CHECKLIST_DEPLOY_UX_SUBASTAS.md"
)

Write-Host "📋 Archivos a deployar:" -ForegroundColor Yellow
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file (no encontrado)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📄 Documentación:" -ForegroundColor Yellow
foreach ($doc in $docs) {
    if (Test-Path $doc) {
        Write-Host "  ✅ $doc" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $doc (no encontrado)" -ForegroundColor Red
    }
}

Write-Host ""
$confirm = Read-Host "¿Continuar con el commit y push? (y/n)"

if ($confirm -eq "y" -or $confirm -eq "Y") {
    Write-Host "📦 Agregando archivos..." -ForegroundColor Yellow
    git add $files
    git add $docs
    
    Write-Host "💾 Creando commit..." -ForegroundColor Yellow
    $commitMessage = @"
feat: Mejoras UX subastas - membresía, tiempo sincronizado, flujo de pago

- Agregada validación de membresía con mensaje claro cuando no puede pujar
- Corregido desfase de tiempo en subastas programadas usando getSyncedNow()
- Mejoradas validaciones en checkout para evitar 404
- Agregada documentación del flujo de pago

Archivos modificados:
- src/components/auction/BidForm.tsx
- src/app/auctions/[id]/page.tsx
- src/app/checkout/page.tsx
"@
    
    git commit -m $commitMessage
    
    Write-Host "🚀 Haciendo push..." -ForegroundColor Yellow
    git push origin main
    
    Write-Host ""
    Write-Host "✅ Deploy iniciado!" -ForegroundColor Green
    Write-Host "📊 Verifica el estado del deploy en tu plataforma (Vercel, etc.)" -ForegroundColor Cyan
} else {
    Write-Host "❌ Deploy cancelado" -ForegroundColor Red
}






