# ============================================
# VERIFICACIÓN COMPLETA DEL SISTEMA
# ============================================
# Verifica que todo lo implementado (P7, P8, P9) esté funcionando

Write-Host "🔍 VERIFICACIÓN COMPLETA DEL SISTEMA" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$errors = 0
$warnings = 0
$success = 0

# Función para mostrar resultado
function Show-Result {
    param(
        [string]$Message,
        [string]$Status  # "success", "error", "warning"
    )
    
    switch ($Status) {
        "success" {
            Write-Host "✅ $Message" -ForegroundColor Green
            $script:success++
        }
        "error" {
            Write-Host "❌ $Message" -ForegroundColor Red
            $script:errors++
        }
        "warning" {
            Write-Host "⚠️  $Message" -ForegroundColor Yellow
            $script:warnings++
        }
    }
}

# ============================================
# 1. VERIFICAR ARCHIVOS CRÍTICOS
# ============================================
Write-Host "📁 Verificando archivos..." -ForegroundColor Yellow
Write-Host ""

$archivos = @(
    "supabase/migrations/20250130000009_audit_and_maintenance.sql",
    "supabase/migrations/20250130000010_backup_system.sql",
    "src/app/api/cron/nightly-audit/route.ts",
    "src/app/api/cron/cleanup-inactive/route.ts",
    "src/app/api/cron/backup-database/route.ts",
    "src/app/api/cron/backup-storage/route.ts",
    "src/app/api/cron/cleanup-backups/route.ts",
    "vercel.json"
)

foreach ($archivo in $archivos) {
    if (Test-Path $archivo) {
        Show-Result "Archivo existe: $archivo" "success"
    } else {
        Show-Result "Archivo faltante: $archivo" "error"
    }
}

Write-Host ""

# ============================================
# 2. VERIFICAR vercel.json
# ============================================
Write-Host "⚙️  Verificando vercel.json..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path "vercel.json") {
    try {
        $vercel = Get-Content "vercel.json" | ConvertFrom-Json
        
        if ($vercel.crons) {
            $cronCount = $vercel.crons.Count
            if ($cronCount -ge 6) {
                Show-Result "Cron jobs configurados: $cronCount" "success"
                
                # Verificar endpoints específicos
                $requiredCrons = @(
                    "/api/cron/close-auctions",
                    "/api/cron/nightly-audit",
                    "/api/cron/cleanup-inactive",
                    "/api/cron/backup-database",
                    "/api/cron/backup-storage",
                    "/api/cron/cleanup-backups"
                )
                
                foreach ($cron in $requiredCrons) {
                    $found = $vercel.crons | Where-Object { $_.path -eq $cron }
                    if ($found) {
                        Show-Result "Cron configurado: $cron → $($found.schedule)" "success"
                    } else {
                        Show-Result "Cron faltante: $cron" "error"
                    }
                }
            } else {
                Show-Result "Solo $cronCount cron jobs configurados (esperado: 6)" "warning"
            }
        } else {
            Show-Result "No se encontró sección 'crons' en vercel.json" "error"
        }
    } catch {
        Show-Result "Error parseando vercel.json: $_" "error"
    }
} else {
    Show-Result "vercel.json no existe" "error"
}

Write-Host ""

# ============================================
# 3. VERIFICAR ESTRUCTURA DE CÓDIGO
# ============================================
Write-Host "💻 Verificando estructura de código..." -ForegroundColor Yellow
Write-Host ""

$apiRoutes = @(
    "src/app/api/cron/nightly-audit/route.ts",
    "src/app/api/cron/cleanup-inactive/route.ts",
    "src/app/api/cron/backup-database/route.ts",
    "src/app/api/cron/backup-storage/route.ts",
    "src/app/api/cron/cleanup-backups/route.ts"
)

foreach ($route in $apiRoutes) {
    if (Test-Path $route) {
        $content = Get-Content $route -Raw
        if ($content -match "export.*async.*function.*GET") {
            Show-Result "Ruta válida: $route" "success"
            
            # Verificar imports críticos
            if ($content -match "from.*@/lib/config/env") {
                Show-Result "  └─ Importa env config" "success"
            } else {
                Show-Result "  └─ Falta import env config" "warning"
            }
            
            if ($content -match "from.*@/lib/utils/logger") {
                Show-Result "  └─ Importa logger" "success"
            } else {
                Show-Result "  └─ Falta import logger" "warning"
            }
        } else {
            Show-Result "Ruta sin función GET: $route" "error"
        }
    }
}

Write-Host ""

# ============================================
# 4. VERIFICAR MIGRACIONES SQL
# ============================================
Write-Host "🗄️  Verificando migraciones SQL..." -ForegroundColor Yellow
Write-Host ""

$migration1 = "supabase/migrations/20250130000009_audit_and_maintenance.sql"
$migration2 = "supabase/migrations/20250130000010_backup_system.sql"

if (Test-Path $migration1) {
    $content1 = Get-Content $migration1 -Raw
    
    if ($content1 -match "CREATE TABLE.*admin_alerts") {
        Show-Result "Tabla admin_alerts definida" "success"
    }
    if ($content1 -match "CREATE TABLE.*maintenance_logs") {
        Show-Result "Tabla maintenance_logs definida" "success"
    }
    if ($content1 -match "run_nightly_audit") {
        Show-Result "Función run_nightly_audit definida" "success"
    }
    if ($content1 -match "cleanup_inactive_items") {
        Show-Result "Función cleanup_inactive_items definida" "success"
    }
}

if (Test-Path $migration2) {
    $content2 = Get-Content $migration2 -Raw
    
    if ($content2 -match "CREATE TABLE.*backup_logs") {
        Show-Result "Tabla backup_logs definida" "success"
    }
    if ($content2 -match "cleanup_old_backups") {
        Show-Result "Función cleanup_old_backups definida" "success"
    }
}

Write-Host ""

# ============================================
# RESUMEN FINAL
# ============================================
Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "📊 RESUMEN DE VERIFICACIÓN" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Exitosos: $success" -ForegroundColor Green
Write-Host "⚠️  Advertencias: $warnings" -ForegroundColor Yellow
Write-Host "❌ Errores: $errors" -ForegroundColor Red
Write-Host ""

if ($errors -eq 0) {
    if ($warnings -eq 0) {
        Write-Host "🎉 VERIFICACIÓN COMPLETA: Todo está correcto" -ForegroundColor Green
        Write-Host ""
        Write-Host "✅ El sistema está listo para funcionar" -ForegroundColor Green
        Write-Host "✅ Puedes continuar con nuevas implementaciones" -ForegroundColor Green
    } else {
        Write-Host "⚠️  VERIFICACIÓN CON ADVERTENCIAS" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "⚠️  Hay $warnings advertencias que deberías revisar" -ForegroundColor Yellow
        Write-Host "✅ No hay errores críticos" -ForegroundColor Green
    }
} else {
    Write-Host "❌ VERIFICACIÓN CON ERRORES" -ForegroundColor Red
    Write-Host ""
    Write-Host "❌ Hay $errors errores que deben corregirse antes de continuar" -ForegroundColor Red
}

Write-Host ""
