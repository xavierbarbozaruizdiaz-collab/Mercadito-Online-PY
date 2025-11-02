# Script para verificar estado de workflows
# Ejecutar: .\scripts\verificar-workflows.ps1

Write-Host "🔍 Verificando estado de workflows..." -ForegroundColor Cyan
Write-Host ""

# Obtener último commit
$lastCommit = git log --oneline -1
Write-Host "📝 Último commit:" -ForegroundColor Yellow
Write-Host $lastCommit
Write-Host ""

# Verificar branch actual
$currentBranch = git branch --show-current
Write-Host "🌿 Branch actual: $currentBranch" -ForegroundColor Yellow
Write-Host ""

Write-Host "📋 Para verificar workflows manualmente:" -ForegroundColor Cyan
Write-Host "1. Ve a: https://github.com/xavierbarbozaruizdiaz-collab/Mercadito-Online-PY/actions" -ForegroundColor White
Write-Host "2. Busca el commit: $($lastCommit.Split(' ')[0])" -ForegroundColor White
Write-Host "3. Verifica que estos workflows estén ✅ VERDE:" -ForegroundColor White
Write-Host "   - CI/CD Pipeline" -ForegroundColor Green
Write-Host "   - Production Deployment" -ForegroundColor Green
Write-Host "   - CodeQL Security Scan" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  'Deploy to Production' puede fallar si no hay secrets, pero NO bloquea" -ForegroundColor Yellow
Write-Host ""

# Abrir GitHub Actions en el navegador (opcional)
$open = Read-Host "¿Abrir GitHub Actions en el navegador? (s/n)"
if ($open -eq "s" -or $open -eq "S") {
    Start-Process "https://github.com/xavierbarbozaruizdiaz-collab/Mercadito-Online-PY/actions"
}

