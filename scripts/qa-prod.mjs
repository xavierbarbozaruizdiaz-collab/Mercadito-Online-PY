// scripts/qa-prod.mjs
// Node 22.x (ESM). Usa fetch global.
// Uso: node scripts/qa-prod.mjs --base=https://mercaditoonlinepy.com --out=docs/.artifacts/qa-prod.json [--products=true] [--timeout=8000]

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, ...rest] = a.replace(/^--/, '').split('=');
    return [k, rest.join('=') === '' ? true : rest.join('=')];
  })
);

const BASE = (args.base || 'https://mercaditoonlinepy.com').replace(/\/$/, '');
const OUT = args.out || 'docs/.artifacts/qa-prod.json';
const TIMEOUT = Number(args.timeout || 8000);
const CHECK_PRODUCTS = String(args.products || '').toLowerCase() === 'true';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function headOrGet(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    // GET directo para evitar bloqueos de HEAD en algunos hosts
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctl.signal });
    clearTimeout(t);
    return { status: res.status, ok: res.ok, headers: Object.fromEntries(res.headers.entries()), res };
  } catch (e) {
    clearTimeout(t);
    return { status: -1, ok: false, error: String(e) };
  }
}

async function text(url) {
  const { res, status, ok, error } = await headOrGet(url);
  if (!ok) return { status, ok, text: '', error };
  const body = await res.text();
  return { status, ok, text: body };
}

async function json(url) {
  const { res, status, ok, error } = await headOrGet(url);
  if (!ok) return { status, ok, json: null, error };
  try {
    const j = await res.json();
    return { status, ok, json: j };
  } catch (e) {
    return { status, ok: false, json: null, error: String(e) };
  }
}

function analyzeGTM(html) {
  if (!html) return { containsGtmScript: false, gtmOccurrences: 0, containsGtagJs: false };
  const gtmRegex = /googletagmanager\.com\/gtm\.js/gi;
  const gtagRegex = /googletagmanager\.com\/gtag\/js|gtag\(/gi;
  const gtmMatches = html.match(gtmRegex) || [];
  const containsGtagJs = !!html.match(gtagRegex);
  return {
    containsGtmScript: gtmMatches.length > 0,
    gtmOccurrences: gtmMatches.length,
    containsGtagJs
  };
}

async function run() {
  const startedAt = new Date().toISOString();

  // Root HTML
  const root = await text(`${BASE}/`);
  const gtm = analyzeGTM(root.text || '');

  // Manifest / icons
  const mani = await json(`${BASE}/manifest.json`);
  const icons = Array.isArray(mani.json?.icons) ? mani.json.icons : [];
  const hasIcons = icons.length > 0;

  // Otros assets comunes
  const robots = await headOrGet(`${BASE}/robots.txt`);
  const favicon = await headOrGet(`${BASE}/favicon.ico`);

  // /products (opcional, depende de flag/entorno)
  let productsStatus = null;
  if (CHECK_PRODUCTS) {
    const products = await headOrGet(`${BASE}/products`);
    productsStatus = products.status;
  }

  const result = {
    base: BASE,
    startedAt,
    rootStatus: root.status,
    manifestStatus: mani.status,
    robotsStatus: robots.status,
    faviconStatus: favicon.status,
    productsStatus,                 // puede ser null si no se chequea
    containsGtmScript: gtm.containsGtmScript,
    gtmOccurrences: gtm.gtmOccurrences,
    containsGtagJs: gtm.containsGtagJs,
    manifestHasIcons: hasIcons,
    iconCount: icons.length,
    endedAt: new Date().toISOString()
  };

  // Asegura carpeta y escribe JSON
  const dir = dirname(OUT);
  await mkdir(dir, { recursive: true });
  await writeFile(OUT, JSON.stringify(result, null, 2), 'utf8');

  // Mostrar en consola para el Job Summary
  console.log(JSON.stringify(result, null, 2));

  // Nunca romper el job: exit 0.
  process.exit(0);
}

run().catch(async (e) => {
  const dir = dirname(OUT);
  await mkdir(dir, { recursive: true }).catch(() => {});
  const fallback = {
    base: BASE,
    error: String(e),
    endedAt: new Date().toISOString()
  };
  await writeFile(OUT, JSON.stringify(fallback, null, 2), 'utf8').catch(() => {});
  console.log(JSON.stringify(fallback, null, 2));
  process.exit(0);
});
