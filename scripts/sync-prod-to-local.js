#!/usr/bin/env node

/**
 * Script para sincronizar datos de PRODUCCIÓN a LOCAL
 * 
 * Uso:
 *   node scripts/sync-prod-to-local.js
 * 
 * Requiere:
 *   - Variables de entorno de PRODUCCIÓN en .env.production
 *   - Variables de entorno de LOCAL en .env.local
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.production', override: false });

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Tablas a sincronizar (en orden de dependencias)
const TABLES_TO_SYNC = [
  'categories',
  'hero_slides',
  'products',
  'product_images',
  'orders',
  'order_items',
  'raffles',
  'raffle_tickets',
  'raffle_winner_photos',
];

async function syncTable(supabaseProd, supabaseLocal, tableName) {
  log(`\n📦 Sincronizando tabla: ${tableName}...`, 'cyan');
  
  try {
    // 1. Obtener datos de producción
    const { data: prodData, error: prodError } = await supabaseProd
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: true });
    
    if (prodError) {
      log(`  ❌ Error al obtener datos de producción: ${prodError.message}`, 'red');
      return { success: false, count: 0 };
    }
    
    if (!prodData || prodData.length === 0) {
      log(`  ⚠️  No hay datos en producción para ${tableName}`, 'yellow');
      return { success: true, count: 0 };
    }
    
    log(`  ✅ Encontrados ${prodData.length} registros en producción`, 'green');
    
    // 2. Limpiar datos locales (opcional - comentar si quieres mantener datos locales)
    const { error: deleteError } = await supabaseLocal
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition para eliminar todo
    
    if (deleteError) {
      log(`  ⚠️  No se pudieron eliminar datos locales (puede ser normal): ${deleteError.message}`, 'yellow');
    } else {
      log(`  🗑️  Datos locales eliminados`, 'yellow');
    }
    
    // 3. Insertar datos de producción en local
    // Insertar en lotes para evitar problemas de tamaño
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < prodData.length; i += batchSize) {
      const batch = prodData.slice(i, i + batchSize);
      
      const { error: insertError } = await supabaseLocal
        .from(tableName)
        .insert(batch);
      
      if (insertError) {
        log(`  ❌ Error al insertar lote ${Math.floor(i / batchSize) + 1}: ${insertError.message}`, 'red');
        // Intentar insertar uno por uno para identificar el problema
        for (const item of batch) {
          const { error: singleError } = await supabaseLocal
            .from(tableName)
            .insert(item);
          if (!singleError) inserted++;
        }
      } else {
        inserted += batch.length;
        log(`  ✅ Lote ${Math.floor(i / batchSize) + 1} insertado (${inserted}/${prodData.length})`, 'green');
      }
    }
    
    log(`  ✅ Tabla ${tableName} sincronizada: ${inserted} registros`, 'green');
    return { success: true, count: inserted };
    
  } catch (error) {
    log(`  ❌ Error inesperado: ${error.message}`, 'red');
    return { success: false, count: 0 };
  }
}

async function main() {
  log('🚀 Iniciando sincronización PRODUCCIÓN → LOCAL', 'blue');
  log('='.repeat(60), 'blue');
  
  // Verificar variables de entorno
  const prodUrl = process.env.PROD_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const prodKey = process.env.PROD_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const localKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!prodUrl || !prodKey) {
    log('❌ Error: Variables de entorno de PRODUCCIÓN no encontradas', 'red');
    log('   Crea .env.production con:', 'yellow');
    log('   PROD_SUPABASE_URL=tu_url_de_produccion', 'yellow');
    log('   PROD_SUPABASE_ANON_KEY=tu_key_de_produccion', 'yellow');
    process.exit(1);
  }
  
  if (!localUrl || !localKey) {
    log('❌ Error: Variables de entorno de LOCAL no encontradas', 'red');
    log('   Crea .env.local con:', 'yellow');
    log('   NEXT_PUBLIC_SUPABASE_URL=tu_url_local', 'yellow');
    log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key_local', 'yellow');
    process.exit(1);
  }
  
  log(`\n📡 Conectando a PRODUCCIÓN: ${prodUrl}`, 'cyan');
  log(`📡 Conectando a LOCAL: ${localUrl}`, 'cyan');
  
  // Crear clientes
  const supabaseProd = createClient(prodUrl, prodKey);
  const supabaseLocal = createClient(localUrl, localKey);
  
  // Verificar conexiones
  const { data: prodTest } = await supabaseProd.from('categories').select('count').limit(1);
  const { data: localTest } = await supabaseLocal.from('categories').select('count').limit(1);
  
  if (!prodTest && !prodTest !== null) {
    log('❌ No se puede conectar a PRODUCCIÓN', 'red');
    process.exit(1);
  }
  
  if (!localTest && !localTest !== null) {
    log('❌ No se puede conectar a LOCAL', 'red');
    process.exit(1);
  }
  
  log('✅ Conexiones verificadas\n', 'green');
  
  // Sincronizar tablas
  const results = {};
  let totalSynced = 0;
  
  for (const table of TABLES_TO_SYNC) {
    const result = await syncTable(supabaseProd, supabaseLocal, table);
    results[table] = result;
    if (result.success) totalSynced += result.count;
    
    // Pequeña pausa entre tablas
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Resumen
  log('\n' + '='.repeat(60), 'blue');
  log('📊 RESUMEN DE SINCRONIZACIÓN', 'blue');
  log('='.repeat(60), 'blue');
  
  for (const [table, result] of Object.entries(results)) {
    const status = result.success ? '✅' : '❌';
    log(`${status} ${table}: ${result.count} registros`, result.success ? 'green' : 'red');
  }
  
  log(`\n✅ Total sincronizado: ${totalSynced} registros`, 'green');
  log('🎉 Sincronización completada!', 'green');
}

main().catch(error => {
  log(`\n❌ Error fatal: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

