#!/bin/bash

# ============================================
# SCRIPT DE PRUEBA - Endpoints de Cron
# ============================================
# Este script prueba los endpoints de cron manualmente
# Requiere: CRON_SECRET y NEXT_PUBLIC_APP_URL

echo "🧪 Testing Cron Endpoints..."
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables (modificar según necesidad)
CRON_SECRET="${CRON_SECRET:-}"
APP_URL="${APP_URL:-${NEXT_PUBLIC_APP_URL:-}}"

if [ -z "$CRON_SECRET" ]; then
    echo -e "${RED}❌ CRON_SECRET no está configurado${NC}"
    echo "   Configura: export CRON_SECRET='tu-secret-aqui'"
    exit 1
fi

if [ -z "$APP_URL" ]; then
    echo -e "${RED}❌ APP_URL no está configurado${NC}"
    echo "   Configura: export APP_URL='https://tu-dominio.vercel.app'"
    exit 1
fi

echo -e "${YELLOW}📍 Testing endpoints en: $APP_URL${NC}"
echo -e "${YELLOW}🔑 Usando CRON_SECRET: ${CRON_SECRET:0:10}...${NC}"
echo ""

# Función para probar endpoint
test_endpoint() {
    local name=$1
    local path=$2
    
    echo -e "${YELLOW}Testing: $name${NC}"
    response=$(curl -s -w "\n%{http_code}" -X GET "$APP_URL$path" \
        -H "Authorization: Bearer $CRON_SECRET" \
        -H "Content-Type: application/json")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ Success (HTTP $http_code)${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}❌ Error (HTTP $http_code)${NC}"
        echo "$body"
    fi
    echo ""
}

# Probar endpoints
test_endpoint "Nightly Audit" "/api/cron/nightly-audit"
test_endpoint "Cleanup Inactive" "/api/cron/cleanup-inactive"
test_endpoint "Backup Database" "/api/cron/backup-database"
test_endpoint "Backup Storage" "/api/cron/backup-storage"
test_endpoint "Cleanup Backups" "/api/cron/cleanup-backups"

echo -e "${GREEN}✅ Testing completo${NC}"

