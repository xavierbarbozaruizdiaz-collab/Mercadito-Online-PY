# ============================================
# SCRIPT DE DEPLOY A PRODUCCIÓN - VERCEL CLI
# Mercadito Online PY (Windows PowerShell)
# ============================================
#
# Uso:
#   1. nvm use 22
#   2. .\scripts\deploy-prod.ps1
#
# Requisitos:
#   - Node.js 22.x instalado (usar nvm)
#   - Vercel CLI instalado (npm i -g vercel o usar npx)
#   - Proyecto vinculado a Vercel (npx vercel link)
#   - Variables de entorno configuradas en Vercel Dashboard
#
# ============================================

$ErrorActionPreference = "Stop"

# Colores para output
function Write-Step {
    param([string]$Message)
    Write-Host "▶ $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

# Banner
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  🚀 DEPLOY A PRODUCCIÓN - VERCEL CLI" -ForegroundColor Cyan
Write-Host "  Mercadito Online PY" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# PASO 1: Verificar Node.js
# ============================================
Write-Step "Verificando versión de Node.js..."

$nodeVersion = (node -v) -replace 'v', '' -split '\.' | Select-Object -First 1
$requiredNode = "22"

if ($nodeVersion -ne $requiredNode) {
    Write-Error "Node.js versión incorrecta. Requerida: $requiredNode.x, Actual: $nodeVersion.x"
    Write-Warning "Ejecuta: nvm use $requiredNode"
    exit 1
}

Write-Success "Node.js $nodeVersion.x detectado"

# ============================================
# PASO 2: Verificar que estamos en la rama correcta
# ============================================
Write-Step "Verificando rama actual..."

$currentBranch = git branch --show-current

if ($currentBranch -ne "main" -and $currentBranch -ne "production") {
    Write-Warning "Estás en la rama '$currentBranch', no en 'main' o 'production'"
    $confirm = Read-Host "¿Continuar de todas formas? (y/n)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        exit 1
    }
}

Write-Success "Rama: $currentBranch"

# ============================================
# PASO 3: Verificar que no hay cambios sin commitear
# ============================================
Write-Step "Verificando estado de Git..."

$gitStatus = git status --short
if ($gitStatus) {
    Write-Warning "Hay cambios sin commitear en el working directory"
    git status --short
    $confirm = Read-Host "¿Continuar de todas formas? (y/n)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        exit 1
    }
}

Write-Success "Working directory limpio"

# ============================================
# PASO 4: Instalar dependencias
# ============================================
Write-Step "Instalando dependencias..."

if (-not (Test-Path "node_modules") -or (Get-Item "package.json").LastWriteTime -gt (Get-Item "node_modules").LastWriteTime) {
    npm ci
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error instalando dependencias"
        exit 1
    }
    Write-Success "Dependencias instaladas"
} else {
    Write-Success "Dependencias ya instaladas (usando cache)"
}

# ============================================
# PASO 5: QA Local (Lint + Build)
# ============================================
Write-Step "Ejecutando QA local (lint + build)..."

# Lint (no bloqueante, solo advertencia)
Write-Step "Ejecutando ESLint..."
$lintOutput = npm run lint 2>&1 | Out-String
if ($LASTEXITCODE -eq 0) {
    Write-Success "ESLint: Sin errores"
} else {
    $lintErrors = ($lintOutput | Select-String -Pattern "error" -AllMatches).Matches.Count
    if ($lintErrors -gt 0) {
        Write-Warning "ESLint encontró errores"
        Write-Warning "Continuando con el build..."
    } else {
        Write-Success "ESLint: Solo advertencias"
    }
}

# Build (BLOQUEANTE - si falla, no deployar)
Write-Step "Ejecutando build de producción..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build falló. Revisa los errores arriba."
    exit 1
}
Write-Success "Build completado exitosamente"

# ============================================
# PASO 6: Verificar que Vercel CLI está disponible
# ============================================
Write-Step "Verificando Vercel CLI..."

$vercelCmd = "npx vercel"
if (Get-Command vercel -ErrorAction SilentlyContinue) {
    $vercelCmd = "vercel"
    Write-Success "Vercel CLI encontrado (global)"
} else {
    Write-Warning "Vercel CLI no encontrado globalmente, usando npx"
}

# ============================================
# PASO 7: Verificar que el proyecto está vinculado
# ============================================
Write-Step "Verificando vinculación con Vercel..."

if (-not (Test-Path ".vercel/project.json")) {
    Write-Error "Proyecto no vinculado a Vercel"
    Write-Warning "Ejecuta primero: npx vercel link"
    exit 1
}

Write-Success "Proyecto vinculado a Vercel"

# ============================================
# PASO 8: Deploy a producción
# ============================================
Write-Step "Desplegando a producción con Vercel CLI..."

Write-Host ""
Write-Warning "⚠️  IMPORTANTE:"
Write-Host "   - Este deploy irá a PRODUCCIÓN"
Write-Host "   - Asegúrate de que todas las variables de entorno estén configuradas en Vercel Dashboard"
Write-Host "   - Verifica que el build local funcionó correctamente"
Write-Host ""

$confirm = Read-Host "¿Continuar con el deploy a producción? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Warning "Deploy cancelado por el usuario"
    exit 0
}

# Ejecutar deploy
& $vercelCmd --prod --yes
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Success "🎉 Deploy a producción completado exitosamente!"
    Write-Host ""
    Write-Step "Próximos pasos:"
    Write-Host "   1. Verifica el deploy en Vercel Dashboard"
    Write-Host "   2. Prueba la aplicación en producción"
    Write-Host "   3. Revisa los logs si hay errores"
    Write-Host ""
} else {
    Write-Error "Deploy falló. Revisa los errores arriba."
    Write-Step "Para ver más detalles:"
    Write-Host "   - Revisa los logs en Vercel Dashboard"
    Write-Host "   - Verifica las variables de entorno en Vercel"
    Write-Host "   - Ejecuta 'npm run build' localmente para ver errores"
    exit 1
}

