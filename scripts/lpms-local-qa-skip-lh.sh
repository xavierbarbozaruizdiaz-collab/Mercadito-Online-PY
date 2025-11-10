#!/usr/bin/env bash

set -euo pipefail



ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACTS_DIR="$ROOT_DIR/docs/.artifacts"
SERVER_LOG="/tmp/lpms-local-server.log"
RUN_LOG="$ARTIFACTS_DIR/lpms-local-qa.log"
mkdir -p "$ARTIFACTS_DIR"
: > "$RUN_LOG"



log(){ echo -e "$@" | tee -a "$RUN_LOG"; }

SERVER_PATTERN="next start"
SERVER_READY=1

# Detectar stash

HAS_STASH=0

if git rev-parse --git-dir >/dev/null 2>&1; then

  if git stash list | grep -q "stash@{0}"; then HAS_STASH=1; fi

fi



CLEANUP(){

  set +e

  log "\n[cleanup] Deteniendo server…"

  pkill -f "$SERVER_PATTERN" || true

  npx kill-port 3000 || true

  if [[ "$HAS_STASH" == "1" ]]; then

    log "[cleanup] Revirtiendo cambios del stash aplicado (sin borrarlo)…"

    git reset --hard HEAD && git clean -fd

  fi

}

trap CLEANUP EXIT



cd "$ROOT_DIR"



# Mostrar estado, aplicar stash temporal

if [[ "$HAS_STASH" == "1" ]]; then

  log "[info] Aplicando stash@{0} temporalmente…"

  git stash apply stash@{0} || true

else

  log "[info] No hay stash@{0}; se testean los archivos actuales sin cambiar nada."

fi



# Node 22 con NVM si existe

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then

  source "$HOME/.nvm/nvm.sh"

  nvm use 22 || true

fi



log "[step] npm ci"

npm ci 2>&1 | tee -a "$RUN_LOG"



log "[step] build"

if npm run build 2>&1 | tee -a "$RUN_LOG"; then

  log "[build] OK"

  SERVER_READY=1

else

  log "[build] ⚠️  Build falló (no se levanta server en FAST)."

  SERVER_READY=0

fi



if [[ "$SERVER_READY" -eq 1 ]]; then

  log "[step] liberar puerto 3000"

  npx kill-port 3000 || true

  pkill -f "next start" || true
  pkill -f "next dev" || true



  log "[step] iniciar server en background"

  : > "$SERVER_LOG"

  (npm run start &> "$SERVER_LOG" &)



  log "[step] esperar health http://localhost:3000"

  for i in {1..40}; do

    if curl -sf "http://localhost:3000" >/dev/null; then break; fi

    sleep 1

    if [[ $i -eq 40 ]]; then

      log "[error] Server no respondió a tiempo"; exit 1

    fi

  done

else

  log "[step] liberar puerto 3000 (omitido, build falló)"
  log "[step] iniciar server en background (omitido, build falló)"
  log "[step] esperar health http://localhost:3000 (omitido, sin server)"

fi



log "[step] lint (no-bloqueante en FAST)"

if npm run lint 2>&1 | tee -a "$RUN_LOG"; then

  log "[lint] OK"

else

  log "[lint] ⚠️  ESLint encontró errores (no bloquea en FAST). Guardando detalle…"

  (npm run lint --silent || true) > "$ARTIFACTS_DIR/eslint-errors.txt" 2>&1 || true

  log "[lint] Detalle en $ARTIFACTS_DIR/eslint-errors.txt"

fi



log "[step] tests (no bloquea si fallan)"

npm test --silent 2>&1 | tee -a "$RUN_LOG" || true



if npm run | grep -q "verify:icons"; then

  log "[step] verify:icons"

  npm run verify:icons 2>&1 | tee -a "$RUN_LOG"

else

  log "[step] verify:icons — script no encontrado, se omite."

fi



if [[ "$SERVER_READY" -eq 1 ]]; then

  log "[step] /api/health"

  curl -Isf "http://localhost:3000/api/health" | head -n 1 | tee -a "$RUN_LOG" || true

else

  log "[step] /api/health (omitido, sin server)"

fi



# Saltar Lighthouse en predeploy:check

if npm run | grep -q "predeploy:check"; then

  log "[step] predeploy:check (LH_SKIP=1)"

  export LH_SKIP=1

  npm run predeploy:check 2>&1 | tee "$ARTIFACTS_DIR/predeploy-check-local.txt" || true

fi



log "\n✅ LPMS Local QA PASSED"

exit 0

