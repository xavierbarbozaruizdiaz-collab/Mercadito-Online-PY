# Script para copiar una migración al portapapeles
# Uso: .\scripts\copiar-migracion.ps1 "20250130000001_auction_system.sql"

param(
    [Parameter(Mandatory=$true)]
    [string]$MigrationName
)

$migrationsPath = Join-Path $PSScriptRoot "..\supabase\migrations"
$migrationFile = Join-Path $migrationsPath $MigrationName

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Error: No se encontró la migración '$MigrationName'" -ForegroundColor Red
    Write-Host "`nMigraciones disponibles:" -ForegroundColor Yellow
    Get-ChildItem $migrationsPath -Filter "*.sql" | Select-Object -First 10 Name
    exit 1
}

$content = Get-Content $migrationFile -Raw
Set-Clipboard -Value $content

Write-Host "✅ Migración copiada al portapapeles: $MigrationName" -ForegroundColor Green
Write-Host "📋 Tamaño: $($content.Length) caracteres" -ForegroundColor Cyan
Write-Host "`n💡 Ahora puedes pegarla en Supabase Dashboard → SQL Editor" -ForegroundColor Yellow












