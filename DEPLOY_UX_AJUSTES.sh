#!/bin/bash
# Script para deployar correcciones UX de subastas

echo "🚀 Deploy de Correcciones UX Subastas"
echo "======================================"
echo ""

# Archivos principales a deployar
FILES=(
  "src/components/auction/BidForm.tsx"
  "src/app/auctions/[id]/page.tsx"
  "src/app/checkout/page.tsx"
)

# Archivos de documentación
DOCS=(
  "RESUMEN_FLUJO_PAGO_SUBASTAS.md"
  "RESUMEN_CORRECCIONES_UX_SUBASTAS.md"
  "CHECKLIST_DEPLOY_UX_SUBASTAS.md"
)

echo "📋 Archivos a deployar:"
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (no encontrado)"
  fi
done

echo ""
echo "📄 Documentación:"
for doc in "${DOCS[@]}"; do
  if [ -f "$doc" ]; then
    echo "  ✅ $doc"
  else
    echo "  ❌ $doc (no encontrado)"
  fi
done

echo ""
read -p "¿Continuar con el commit y push? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "📦 Agregando archivos..."
  git add "${FILES[@]}"
  git add "${DOCS[@]}"
  
  echo "💾 Creando commit..."
  git commit -m "feat: Mejoras UX subastas - membresía, tiempo sincronizado, flujo de pago

- Agregada validación de membresía con mensaje claro cuando no puede pujar
- Corregido desfase de tiempo en subastas programadas usando getSyncedNow()
- Mejoradas validaciones en checkout para evitar 404
- Agregada documentación del flujo de pago

Archivos modificados:
- src/components/auction/BidForm.tsx
- src/app/auctions/[id]/page.tsx
- src/app/checkout/page.tsx"
  
  echo "🚀 Haciendo push..."
  git push origin main
  
  echo ""
  echo "✅ Deploy iniciado!"
  echo "📊 Verifica el estado del deploy en tu plataforma (Vercel, etc.)"
else
  echo "❌ Deploy cancelado"
fi






