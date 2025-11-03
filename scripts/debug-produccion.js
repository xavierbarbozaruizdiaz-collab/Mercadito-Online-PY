#!/usr/bin/env node

/**
 * ============================================
 * DEBUG DE PRODUCCIÓN
 * Genera código para debug en producción
 * ============================================
 */

const fs = require('fs');
const path = require('path');

console.log('🐛 GENERANDO CÓDIGO DE DEBUG PARA PRODUCCIÓN\n');
console.log('='.repeat(60));
console.log('');

// Leer page.tsx
const pageTsx = path.join(process.cwd(), 'src', 'app', 'page.tsx');
let content = fs.readFileSync(pageTsx, 'utf8');

// Agregar logs de debug más agresivos
const debugCode = `
  // ============================================
  // DEBUG AGRESIVO PARA PRODUCCIÓN
  // ============================================
  console.log('[DEBUG] FEATURE_HERO:', FEATURE_HERO);
  console.log('[DEBUG] NEXT_PUBLIC_FEATURE_HERO:', process.env.NEXT_PUBLIC_FEATURE_HERO);
  console.log('[DEBUG] NODE_ENV:', process.env.NODE_ENV);
  console.log('[DEBUG] slides.length:', slides?.length);
  console.log('[DEBUG] slides array:', JSON.stringify(slides, null, 2));
  
  if (!FEATURE_HERO) {
    console.error('[ERROR] FEATURE_HERO está deshabilitado');
  }
  
  if (slides.length === 0) {
    console.warn('[WARN] No hay slides activos en la base de datos');
  }
`;

// Buscar donde agregar el debug
if (content.includes('if (FEATURE_HERO)')) {
  const insertPoint = content.indexOf('if (FEATURE_HERO)');
  const nextLine = content.indexOf('\n', insertPoint);
  
  if (!content.includes('[DEBUG] FEATURE_HERO')) {
    content = content.slice(0, nextLine + 1) + debugCode + content.slice(nextLine + 1);
    fs.writeFileSync(pageTsx, content, 'utf8');
    console.log('✅ Código de debug agregado a page.tsx');
  } else {
    console.log('⚠️  Código de debug ya existe');
  }
}

// Leer dashboard layout
const dashboardLayout = path.join(process.cwd(), 'src', 'app', '(dashboard)', 'layout.tsx');
let layoutContent = fs.readFileSync(dashboardLayout, 'utf8');

const debugLayoutCode = `
    // ============================================
    // DEBUG AGRESIVO PARA DASHBOARD
    // ============================================
    console.log('[DEBUG/DASHBOARD] Verificando permisos...');
    console.log('[DEBUG/DASHBOARD] pathname:', pathname);
    console.log('[DEBUG/DASHBOARD] session:', session ? 'existe' : 'no existe');
    console.log('[DEBUG/DASHBOARD] profile:', profile ? JSON.stringify(profile, null, 2) : 'no existe');
    console.log('[DEBUG/DASHBOARD] role:', role);
    console.log('[DEBUG/DASHBOARD] hasAccess:', hasAccess);
    
    if (!session) {
      console.error('[ERROR/DASHBOARD] No hay sesión');
    }
    
    if (!profile) {
      console.error('[ERROR/DASHBOARD] No hay perfil');
    }
    
    if (!hasAccess) {
      console.error('[ERROR/DASHBOARD] No tiene acceso a:', pathname);
    }
`;

// Buscar donde agregar el debug en layout
if (layoutContent.includes('setAllowed(hasAccess)')) {
  const insertPoint = layoutContent.indexOf('setAllowed(hasAccess)');
  const beforePoint = layoutContent.lastIndexOf('\n', insertPoint);
  
  if (!layoutContent.includes('[DEBUG/DASHBOARD]')) {
    layoutContent = layoutContent.slice(0, beforePoint + 1) + debugLayoutCode + layoutContent.slice(beforePoint + 1);
    fs.writeFileSync(dashboardLayout, layoutContent, 'utf8');
    console.log('✅ Código de debug agregado a dashboard layout');
  } else {
    console.log('⚠️  Código de debug ya existe en layout');
  }
}

console.log('\n💡 Este código ayudará a identificar problemas en producción.');
console.log('   Revisa la consola del navegador en producción para ver los logs.');

