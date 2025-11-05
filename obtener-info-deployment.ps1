# Script para obtener información del último deployment
# ====================================================

Write-Host "🔍 Obteniendo información del último deployment..." -ForegroundColor Cyan
Write-Host ""

# Agregar Vercel CLI al PATH
$env:Path += ";C:\Users\PCera\AppData\Roaming\npm"

try {
    Write-Host "📋 Listando deployments recientes..." -ForegroundColor Yellow
    $deployments = vercel ls --json 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Información obtenida exitosamente" -ForegroundColor Green
        Write-Host ""
        Write-Host "Deployments recientes:" -ForegroundColor Cyan
        Write-Host $deployments
        Write-Host ""
        
        # Intentar obtener información del proyecto
        Write-Host "📊 Información del proyecto..." -ForegroundColor Yellow
        $projectInfo = vercel project ls --json 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host $projectInfo
        }
    } else {
        Write-Host "⚠️  No se pudo obtener la lista de deployments" -ForegroundColor Yellow
        Write-Host "   Intenta ejecutar manualmente: vercel ls" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error al obtener información" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
}

Write-Host ""
Write-Host "📝 Para ver más detalles, ve a:" -ForegroundColor Cyan
Write-Host "   https://vercel.com/dashboard" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 Guía completa en: DIAGNOSTICO_VERCEL_DASHBOARD.md" -ForegroundColor Cyan

