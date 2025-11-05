# Script de Deployment con Vercel CLI
# ===================================
# Este script automatiza el proceso de deployment a Vercel

Write-Host "🚀 Script de Deployment con Vercel CLI" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Verificar si Vercel CLI está instalado
Write-Host "📦 Verificando instalación de Vercel CLI..." -ForegroundColor Yellow
try {
    $vercelVersion = vercel --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Vercel CLI ya está instalado: $vercelVersion" -ForegroundColor Green
    } else {
        throw "Vercel CLI no encontrado"
    }
} catch {
    Write-Host "⚠️  Vercel CLI no está instalado. Instalando..." -ForegroundColor Yellow
    Write-Host "   Esto puede tardar unos minutos..." -ForegroundColor Gray
    
    # Instalar Vercel CLI globalmente
    npm install -g vercel
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Vercel CLI instalado correctamente" -ForegroundColor Green
    } else {
        Write-Host "❌ Error al instalar Vercel CLI" -ForegroundColor Red
        Write-Host "   Por favor, instala manualmente con: npm install -g vercel" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""

# Paso 2: Verificar si está autenticado
Write-Host "🔐 Verificando autenticación..." -ForegroundColor Yellow
try {
    $whoami = vercel whoami 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Autenticado como: $whoami" -ForegroundColor Green
    } else {
        throw "No autenticado"
    }
} catch {
    Write-Host "⚠️  No estás autenticado. Iniciando sesión..." -ForegroundColor Yellow
    Write-Host "   Se abrirá una ventana del navegador para autenticarte." -ForegroundColor Gray
    vercel login
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Autenticación exitosa" -ForegroundColor Green
    } else {
        Write-Host "❌ Error en la autenticación" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Paso 3: Verificar que estamos en el directorio correcto
$currentDir = Get-Location
Write-Host "📁 Directorio actual: $currentDir" -ForegroundColor Cyan

if (-not (Test-Path "package.json")) {
    Write-Host "❌ No se encontró package.json. Por favor, ejecuta este script desde la raíz del proyecto." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Proyecto encontrado" -ForegroundColor Green
Write-Host ""

# Paso 4: Verificar estado de Git
Write-Host "🔍 Verificando estado de Git..." -ForegroundColor Yellow
try {
    $gitStatus = git status --porcelain
    $gitBranch = git rev-parse --abbrev-ref HEAD
    $gitCommit = git rev-parse --short HEAD
    
    Write-Host "   Rama: $gitBranch" -ForegroundColor Gray
    Write-Host "   Commit: $gitCommit" -ForegroundColor Gray
    
    if ($gitStatus) {
        Write-Host "⚠️  Hay cambios sin commitear:" -ForegroundColor Yellow
        Write-Host $gitStatus -ForegroundColor Gray
        Write-Host ""
        $response = Read-Host "¿Deseas continuar con el deployment? (s/N)"
        if ($response -ne "s" -and $response -ne "S") {
            Write-Host "❌ Deployment cancelado" -ForegroundColor Red
            exit 0
        }
    } else {
        Write-Host "✅ Repositorio limpio" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  No se pudo verificar el estado de Git (continuando...)" -ForegroundColor Yellow
}

Write-Host ""

# Paso 5: Preguntar si quiere deployar a producción
Write-Host "🎯 ¿A dónde deseas deployar?" -ForegroundColor Cyan
Write-Host "   1. Preview (desarrollo)" -ForegroundColor Gray
Write-Host "   2. Producción (--prod)" -ForegroundColor Gray
Write-Host ""
$envChoice = Read-Host "Selecciona (1 o 2) [2]"

if ($envChoice -eq "" -or $envChoice -eq "2") {
    $isProd = $true
    $envName = "Producción"
    Write-Host "✅ Deployando a PRODUCCIÓN" -ForegroundColor Green
} else {
    $isProd = $false
    $envName = "Preview"
    Write-Host "✅ Deployando a PREVIEW" -ForegroundColor Yellow
}

Write-Host ""

# Paso 6: Confirmar deployment
Write-Host "📋 Resumen del deployment:" -ForegroundColor Cyan
Write-Host "   Entorno: $envName" -ForegroundColor Gray
Write-Host "   Commit: $gitCommit" -ForegroundColor Gray
Write-Host "   Rama: $gitBranch" -ForegroundColor Gray
Write-Host ""
$confirm = Read-Host "¿Confirmas el deployment? (s/N)"
if ($confirm -ne "s" -and $confirm -ne "S") {
    Write-Host "❌ Deployment cancelado" -ForegroundColor Red
    exit 0
}

Write-Host ""

# Paso 7: Ejecutar deployment
Write-Host "🚀 Iniciando deployment..." -ForegroundColor Cyan
Write-Host "   Esto puede tardar varios minutos..." -ForegroundColor Gray
Write-Host ""

if ($isProd) {
    # Deployment a producción con --force para evitar cache
    Write-Host "Ejecutando: vercel --prod --force" -ForegroundColor Gray
    vercel --prod --force
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ ¡Deployment a PRODUCCIÓN completado exitosamente!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Próximos pasos:" -ForegroundColor Cyan
        Write-Host "   1. Ve a https://vercel.com/dashboard para ver el deployment" -ForegroundColor Gray
        Write-Host "   2. Verifica los build logs" -ForegroundColor Gray
        Write-Host "   3. Verifica que el sitio funciona correctamente" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "❌ Error en el deployment" -ForegroundColor Red
        Write-Host "   Revisa los mensajes de error arriba" -ForegroundColor Yellow
        exit 1
    }
} else {
    # Deployment a preview
    Write-Host "Ejecutando: vercel --force" -ForegroundColor Gray
    vercel --force
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ ¡Deployment a PREVIEW completado exitosamente!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Próximos pasos:" -ForegroundColor Cyan
        Write-Host "   1. Revisa la URL de preview que se mostró arriba" -ForegroundColor Gray
        Write-Host "   2. Si todo está bien, puedes promover a producción desde Vercel Dashboard" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "❌ Error en el deployment" -ForegroundColor Red
        Write-Host "   Revisa los mensajes de error arriba" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "✨ Script completado" -ForegroundColor Cyan

