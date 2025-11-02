# Script para probar el servidor
cd C:\Users\PCera\mercadito-online-py

Write-Host "=== DIAGNOSTICO DEL SERVIDOR ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Git Commit:" -ForegroundColor Yellow
git rev-parse --short HEAD
Write-Host ""

Write-Host "2. Node y npm:" -ForegroundColor Yellow
node -v
npm -v
Write-Host ""

Write-Host "3. Script de start en package.json:" -ForegroundColor Yellow
Get-Content package.json | Select-String '"start"'
Write-Host ""

Write-Host "4. Puerto 3000:" -ForegroundColor Yellow
$port = netstat -ano | findstr :3000
if ($port) {
    Write-Host "✓ Puerto 3000 en uso:" -ForegroundColor Green
    Write-Host $port
} else {
    Write-Host "✗ Puerto 3000 no está en uso" -ForegroundColor Red
}
Write-Host ""

Write-Host "5. Variables de entorno:" -ForegroundColor Yellow
if (Test-Path .env.local) {
    Write-Host "✓ .env.local existe" -ForegroundColor Green
    $hasSupabase = Get-Content .env.local | Select-String "NEXT_PUBLIC_SUPABASE"
    if ($hasSupabase) {
        Write-Host "✓ Variables de Supabase encontradas" -ForegroundColor Green
    } else {
        Write-Host "✗ No se encontraron variables de Supabase" -ForegroundColor Red
    }
} else {
    Write-Host "✗ .env.local NO existe" -ForegroundColor Red
}
Write-Host ""

Write-Host "6. Proceso Node:" -ForegroundColor Yellow
$nodeProcs = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcs) {
    $nodeProcs | Format-Table Id, ProcessName, @{Name='CPU';Expression={$_.CPU}}, @{Name='Memory(MB)';Expression={[math]::Round($_.WorkingSet64/1MB,2)}} -AutoSize
} else {
    Write-Host "✗ No hay procesos Node corriendo" -ForegroundColor Red
}
Write-Host ""

Write-Host "7. Prueba HTTP:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:3000" -Method HEAD -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    Write-Host "✓ Home: HTTP $($response.StatusCode)" -ForegroundColor Green
    
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:3000/stores" -Method HEAD -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    Write-Host "✓ Stores: HTTP $($response.StatusCode)" -ForegroundColor Green
    
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:3000/auth/sign-in" -Method HEAD -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    Write-Host "✓ Login: HTTP $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "✗ Error conectando: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  StatusCode: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== FIN DEL DIAGNOSTICO ===" -ForegroundColor Cyan


