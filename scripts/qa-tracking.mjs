#!/usr/bin/env node
import { argv, exit } from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';

function parseArgs() {
  const baseArg = argv.find((arg) => arg.startsWith('--base='));
  if (!baseArg) {
    console.error('Usage: node scripts/qa-tracking.mjs --base=<URL_PREVIEW>');
    exit(1);
  }
  const base = baseArg.split('=')[1];
  if (!base) {
    console.error('Preview URL required.');
    exit(1);
  }
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

async function fetchWithFallback(url, method = 'HEAD') {
  const res = await fetch(url, { method });
  if (res.ok || method === 'GET') return res;
  if (res.status === 405 || res.status === 403) {
    await sleep(100);
    return fetch(url, { method: 'GET' });
  }
  return res;
}

function formatPhoneForWhatsApp(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, '');
  if (digits.startsWith('595')) {
    const local = digits.slice(3);
    return local.length >= 9 ? `https://wa.me/${digits}` : null;
  }
  if (digits.startsWith('0')) {
    const local = digits.slice(1);
    return local.length >= 9 ? `https://wa.me/595${local}` : null;
  }
  return digits.length >= 9 ? `https://wa.me/595${digits}` : null;
}

async function main() {
  const base = parseArgs();
  const results = { base };

  const rootRes = await fetch(`${base}/`);
  results.rootStatus = rootRes.status;
  const rootHtml = await rootRes.text();
  results.containsGtmScript = rootHtml.includes('id="gtm-src"');
  results.containsGtmIframe = rootHtml.includes('googletagmanager.com/ns.html');
  results.containsGtmId = rootHtml.includes('GTM-PQ8Q6JGW');
  results.containsGtagJs = rootHtml.includes('gtag.js');

  async function checkPath(path) {
    const url = `${base}${path}`;
    const res = await fetchWithFallback(url);
    return { path, status: res.status, ok: res.ok };
  }

  results.icons = await Promise.all([
    checkPath('/icons/favicon-16x16.png'),
    checkPath('/icons/favicon-32x32.png'),
    checkPath('/icons/icon-96x96.png'),
  ]);

  const manifestRes = await fetchWithFallback(`${base}/manifest.webmanifest`, 'GET');
  results.manifestStatus = manifestRes.status;
  if (manifestRes.ok) {
    const manifestJson = await manifestRes.json();
    results.manifestIcons = manifestJson.icons?.map((icon) => icon.src) ?? [];
  } else {
    results.manifestIcons = null;
  }

  const waTests = ['0981988714', '981988714', '+595981988714', '098198871'];
  results.whatsApp = waTests.map((input) => ({ input, output: formatPhoneForWhatsApp(input) }));

  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  exit(1);
});
