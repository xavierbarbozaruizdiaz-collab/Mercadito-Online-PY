#!/usr/bin/env node
// QA de preview: valida 200/OK de home, manifest e íconos con header de bypass.
// NO modifica la app.
import https from 'https';

const argBase = process.argv.find((arg) => arg.startsWith('--base='));
const argBypass = process.argv.find((arg) => arg.startsWith('--bypass='));

const BASE = process.env.QA_PREVIEW_BASE || (argBase ? argBase.split('=')[1] : undefined);
const BYPASS = process.env.VERCEL_PREVIEW_BYPASS || (argBypass ? argBypass.split('=')[1] : undefined);

if (!BASE) {
  console.error('Falta --base= o QA_PREVIEW_BASE');
  process.exit(2);
}

const targets = [
  '/',
  '/manifest.webmanifest',
  '/icons/favicon-16x16.png',
  '/icons/favicon-32x32.png',
  '/icons/icon-96x96.png',
];

function check(path) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE);
    const options = {
      method: 'GET',
      headers: BYPASS ? { 'x-vercel-protection-bypass': BYPASS } : {},
    };

    const req = https.request(url, options, (res) => {
      resolve({ path, status: res.statusCode ?? 0, ok: res.statusCode ? res.statusCode < 400 : false });
      res.resume();
    });

    req.on('error', () => resolve({ path, status: 0, ok: false }));
    req.end();
  });
}

const run = async () => {
  const results = await Promise.all(targets.map(check));
  const report = results.map((r) => `${r.path} -> ${r.status}${r.ok ? ' OK' : ' FAIL'}`).join('\n');
  console.log('QA_PREVIEW_RESULTS\n' + report);
  const allOk = results.every((r) => r.ok);
  process.exit(allOk ? 0 : 1);
};

run();
