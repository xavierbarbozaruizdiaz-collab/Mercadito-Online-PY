#!/usr/bin/env node

// Predeploy check mínimo (sin LH). No bloquea.
// Usa fetch nativo de Node 22.
import fs from "fs";
import path from "path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = path.resolve("docs/.artifacts/predeploy-check-local.txt");
const routes = ["/", "/api/health"];

const lines = [];
const pad = (s) => (s + " ".repeat(12)).slice(0, 12);

function resolveUrl(base, route) {
  const baseObj = new URL(base);
  const final = new URL(route, baseObj);
  return final.toString();
}

async function check(url) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    lines.push(`${pad(String(r.status))} ${url}`);
    return r.status;
  } catch (e) {
    lines.push(`ERROR       ${url}  -> ${e.message}`);
    return 0;
  }
}

(async () => {
  lines.push(`[predeploy] BASE=${BASE}`);
  for (const route of routes) {
    const url = resolveUrl(BASE, route);
    await check(url);
  }
  fs.writeFileSync(OUT, `${lines.join("\n")}\n`, "utf8");
  console.log(`[predeploy] Reporte en ${OUT}`);
  process.exit(0);
})();
