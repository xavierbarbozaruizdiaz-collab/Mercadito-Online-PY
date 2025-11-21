#!/bin/bash
# ============================================
# SCRIPT DE DEPLOY A PRODUCCIÓN - VERCEL CLI
# Mercadito Online PY
# ============================================
#
# Uso:
#   1. nvm use 22
#   2. ./scripts/deploy-prod.sh
#
# Requisitos:
#   - Node.js 22.x instalado (usar nvm)
#   - Vercel CLI instalado (npm i -g vercel o usar npx)
#   - Proyecto vinculado a Vercel (npx vercel link)
#   - Variables de entorno configuradas en Vercel Dashboard
#
# ============================================

set -e  # Salir si cualquier comando falla

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_step() {
    echo -e "${BLUE}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

# Banner
echo ""
echo "=========================================="
echo "  🚀 DEPLOY A PRODUCCIÓN - VERCEL CLI"
echo "  Mercadito Online PY"
echo "=========================================="
echo ""

# ============================================
# PASO 1: Verificar Node.js
# ============================================
print_step "Verificando versión de Node.js..."

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
REQUIRED_NODE="22"

if [ "$NODE_VERSION" != "$REQUIRED_NODE" ]; then
    print_error "Node.js versión incorrecta. Requerida: $REQUIRED_NODE.x, Actual: $NODE_VERSION.x"
    print_warning "Ejecuta: nvm use $REQUIRED_NODE"
    exit 1
fi

print_success "Node.js $NODE_VERSION.x detectado"

# ============================================
# PASO 2: Verificar que estamos en la rama correcta
# ============================================
print_step "Verificando rama actual..."

CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "production" ]; then
    print_warning "Estás en la rama '$CURRENT_BRANCH', no en 'main' o 'production'"
    read -p "¿Continuar de todas formas? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

print_success "Rama: $CURRENT_BRANCH"

# ============================================
# PASO 3: Verificar que no hay cambios sin commitear
# ============================================
print_step "Verificando estado de Git..."

if ! git diff-index --quiet HEAD --; then
    print_warning "Hay cambios sin commitear en el working directory"
    git status --short
    read -p "¿Continuar de todas formas? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

print_success "Working directory limpio"

# ============================================
# PASO 4: Instalar dependencias
# ============================================
print_step "Instalando dependencias..."

if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    npm ci
    print_success "Dependencias instaladas"
else
    print_success "Dependencias ya instaladas (usando cache)"
fi

# ============================================
# PASO 5: QA Local (Lint + Build)
# ============================================
print_step "Ejecutando QA local (lint + build)..."

# Lint (no bloqueante, solo advertencia)
print_step "Ejecutando ESLint..."
if npm run lint 2>&1 | tee /tmp/lint-output.log; then
    print_success "ESLint: Sin errores"
else
    LINT_ERRORS=$(grep -c "error" /tmp/lint-output.log || echo "0")
    if [ "$LINT_ERRORS" -gt 0 ]; then
        print_warning "ESLint encontró errores (revisa /tmp/lint-output.log)"
        print_warning "Continuando con el build..."
    else
        print_success "ESLint: Solo advertencias"
    fi
fi

# Build (BLOQUEANTE - si falla, no deployar)
print_step "Ejecutando build de producción..."
if npm run build; then
    print_success "Build completado exitosamente"
else
    print_error "Build falló. Revisa los errores arriba."
    exit 1
fi

# ============================================
# PASO 6: Verificar que Vercel CLI está disponible
# ============================================
print_step "Verificando Vercel CLI..."

if command -v vercel &> /dev/null; then
    VERCEL_CMD="vercel"
    print_success "Vercel CLI encontrado (global)"
else
    VERCEL_CMD="npx vercel"
    print_warning "Vercel CLI no encontrado globalmente, usando npx"
fi

# ============================================
# PASO 7: Verificar que el proyecto está vinculado
# ============================================
print_step "Verificando vinculación con Vercel..."

if [ ! -f ".vercel/project.json" ]; then
    print_error "Proyecto no vinculado a Vercel"
    print_warning "Ejecuta primero: npx vercel link"
    exit 1
fi

print_success "Proyecto vinculado a Vercel"

# ============================================
# PASO 8: Deploy a producción
# ============================================
print_step "Desplegando a producción con Vercel CLI..."

echo ""
print_warning "⚠️  IMPORTANTE:"
echo "   - Este deploy irá a PRODUCCIÓN"
echo "   - Asegúrate de que todas las variables de entorno estén configuradas en Vercel Dashboard"
echo "   - Verifica que el build local funcionó correctamente"
echo ""

read -p "¿Continuar con el deploy a producción? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deploy cancelado por el usuario"
    exit 0
fi

# Ejecutar deploy
if $VERCEL_CMD --prod --yes; then
    echo ""
    print_success "🎉 Deploy a producción completado exitosamente!"
    echo ""
    print_step "Próximos pasos:"
    echo "   1. Verifica el deploy en Vercel Dashboard"
    echo "   2. Prueba la aplicación en producción"
    echo "   3. Revisa los logs si hay errores"
    echo ""
else
    print_error "Deploy falló. Revisa los errores arriba."
    print_step "Para ver más detalles:"
    echo "   - Revisa los logs en Vercel Dashboard"
    echo "   - Verifica las variables de entorno en Vercel"
    echo "   - Ejecuta 'npm run build' localmente para ver errores"
    exit 1
fi

