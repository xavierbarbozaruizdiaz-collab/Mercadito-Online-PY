# ============================================
# SCRIPT DE PRUEBA - Endpoints de Cron (PowerShell)
# ============================================
# Este script prueba los endpoints de cron manualmente

Write-Host "🧪 Testing Cron Endpoints..." -ForegroundColor Yellow
Write-Host ""

# Variables (modificar según necesidad)
$CRON_SECRET = $env:CRON_SECRET
$APP_URL = $env:APP_URL
if (!$APP_URL) { $APP_URL = $env:NEXT_PUBLIC_APP_URL }

if (!$CRON_SECRET) {
    Write-Host "❌ CRON_SECRET no está configurado" -ForegroundColor Red
    Write-Host "   Configura: `$env:CRON_SECRET='tu-secret-aqui'" -ForegroundColor Yellow
    exit 1
}

if (!$APP_URL) {
    Write-Host "❌ APP_URL no está configurado" -ForegroundColor Red
    Write-Host "   Configura: `$env:APP_URL='https://tu-dominio.vercel.app'" -ForegroundColor Yellow
    exit 1
}

Write-Host "📍 Testing endpoints en: $APP_URL" -ForegroundColor Yellow
Write-Host "🔑 Usando CRON_SECRET: $($CRON_SECRET.Substring(0, [Math]::Min(10, $CRON_SECRET.Length)))..." -ForegroundColor Yellow
Write-Host ""

# Función para probar endpoint
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Path
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $CRON_SECRET"
        "Content-Type" = "application/json"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$APP_URL$Path" -Method GET -Headers $headers -ErrorAction Stop
        Write-Host "✅ Success" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 5
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "❌ Error (HTTP $statusCode)" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
    Write-Host ""
}

# Probar endpoints
Test-Endpoint "Nightly Audit" "/api/cron/nightly-audit"
Test-Endpoint "Cleanup Inactive" "/api/cron/cleanup-inactive"
Test-Endpoint "Backup Database" "/api/cron/backup-database"
Test-Endpoint "Backup Storage" "/api/cron/backup-storage"
Test-Endpoint "Cleanup Backups" "/api/cron/cleanup-backups"

Write-Host "✅ Testing completo" -ForegroundColor Green

