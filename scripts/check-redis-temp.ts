// ============================================
// SCRIPT TEMPORAL - DIAGNÓSTICO REDIS
// Este archivo es solo para pruebas y se puede borrar después
// ============================================

import { getRedis, isRedisAvailable } from '../src/lib/redis/client';

async function checkRedis() {
  console.log('🔍 Iniciando diagnóstico de Redis/Upstash...\n');

  // 1. Verificar disponibilidad
  const available = isRedisAvailable();
  console.log(`1. Redis disponible: ${available ? '✅ SÍ' : '❌ NO'}`);

  // 2. Obtener cliente
  const redis = getRedis();
  console.log(`2. Cliente obtenido: ${redis ? '✅ Instancia válida' : '❌ null'}\n`);

  if (!redis) {
    console.error('❌ No se pudo obtener cliente Redis. Verifica las variables de entorno:');
    console.error('   - UPSTASH_REDIS_REST_URL');
    console.error('   - UPSTASH_REDIS_REST_TOKEN');
    process.exit(1);
  }

  // 3. Probar SET
  const testKey = 'lpms:check';
  const testValue = `test-${Date.now()}`;
  
  try {
    console.log(`3. Probando SET: ${testKey} = ${testValue}`);
    const setResult = await redis.set(testKey, testValue, { ex: 60 }); // TTL 60 segundos
    console.log(`   Resultado SET: ${setResult === 'OK' ? '✅ OK' : `⚠️ ${setResult}`}\n`);

    // 4. Probar GET
    console.log(`4. Probando GET: ${testKey}`);
    const getResult = await redis.get<string>(testKey);
    console.log(`   Resultado GET: ${getResult === testValue ? '✅ Coincide' : `⚠️ Diferente: ${getResult}`}`);
    console.log(`   Valor obtenido: ${getResult}\n`);

    // 5. Probar DELETE
    console.log(`5. Limpiando key de prueba...`);
    await redis.del(testKey);
    console.log(`   ✅ Key eliminada\n`);

    // 6. Verificar que se eliminó
    const verifyResult = await redis.get<string>(testKey);
    console.log(`6. Verificación post-delete: ${verifyResult === null ? '✅ Key eliminada correctamente' : `⚠️ Key aún existe: ${verifyResult}`}\n`);

    console.log('✅ DIAGNÓSTICO COMPLETO: Redis/Upstash está funcionando correctamente');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR durante las pruebas:');
    console.error(error);
    process.exit(1);
  }
}

checkRedis();











