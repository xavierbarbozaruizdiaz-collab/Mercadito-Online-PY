#!/usr/bin/env node
/**
 * Diagnóstico de Upstash Redis.
 * Lee .env.local y prueba SET / GET / DEL contra la REST API.
 *
 * Uso: npm run check:redis
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_PATH = resolve(process.cwd(), '.env.local');

function loadEnvLocal() {
  if (!existsSync(ENV_PATH)) {
    return {};
  }

  const env = {};
  const content = readFileSync(ENV_PATH, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

async function redisCommand(url, token, command) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

async function main() {
  console.log('Diagnóstico Redis / Upstash\n');

  const env = loadEnvLocal();
  const url = process.env.UPSTASH_REDIS_REST_URL || env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error('Redis no configurado. Faltan variables en .env.local:');
    console.error('  - UPSTASH_REDIS_REST_URL');
    console.error('  - UPSTASH_REDIS_REST_TOKEN');
    console.error('\nCreá una DB Regional en https://console.upstash.com');
    console.error('Region sugerida: sa-east-1 (São Paulo). Read Regions: vacío.');
    console.error('Después pegá REST URL y REST TOKEN en .env.local y volvé a correr:');
    console.error('  npm run check:redis');
    process.exit(1);
  }

  if (!url.startsWith('https://')) {
    console.error('UPSTASH_REDIS_REST_URL debe empezar con https://');
    process.exit(1);
  }

  const testKey = `lpms:check:${Date.now()}`;
  const testValue = `ok-${Date.now()}`;

  console.log('1. Variables presentes: sí');
  console.log(`   URL host: ${new URL(url).host}`);
  console.log(`   Token: ${token.slice(0, 4)}…${token.slice(-4)}\n`);

  const setResult = await redisCommand(url, token, ['SET', testKey, testValue, 'EX', '60']);
  console.log(`2. SET ${testKey}`);
  if (setResult.status !== 200 || setResult.body?.result !== 'OK') {
    console.error(`   Falló (${setResult.status}):`, setResult.body);
    process.exit(1);
  }
  console.log('   OK\n');

  const getResult = await redisCommand(url, token, ['GET', testKey]);
  console.log(`3. GET ${testKey}`);
  if (getResult.status !== 200 || getResult.body?.result !== testValue) {
    console.error(`   Falló (${getResult.status}):`, getResult.body);
    process.exit(1);
  }
  console.log('   Valor coincide\n');

  const delResult = await redisCommand(url, token, ['DEL', testKey]);
  console.log('4. DEL key de prueba');
  if (delResult.status !== 200) {
    console.error(`   Falló (${delResult.status}):`, delResult.body);
    process.exit(1);
  }
  console.log('   OK\n');

  console.log('Redis / Upstash responde correctamente (SET, GET, DEL).');
}

main().catch((error) => {
  console.error('Error de red o REST API:', error);
  process.exit(1);
});
