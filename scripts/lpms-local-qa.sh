#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/docs/.artifacts"
TMP_LOG="$(mktemp /tmp/lpms-local-qa.XXXXXX.log)"
FINAL_LOG="$LOG_DIR/lpms-local-qa.log"
PREDEPLOY_LOG="$LOG_DIR/predeploy-check-local.txt"
SERVER_LOG="/tmp/lpms-local-server.log"

mkdir -p "$LOG_DIR"
rm -f "$PREDEPLOY_LOG" "$FINAL_LOG"

# Mirror stdout/err to temp log and console
exec > >(tee -a "$TMP_LOG")
exec 2>&1

echo "🧭 LPMS Local QA — Safe Test Mode"
echo "Repositorio: $ROOT_DIR"
echo "Log temporal: $TMP_LOG"

FAILED=0
APPLIED_STASH=0
SERVER_PID=""
FINISHED=0

restore_workspace() {
  if [[ $APPLIED_STASH -eq 1 ]]; then
    echo "🔄 Restaurando árbol de trabajo original..."
    git reset --hard HEAD >/dev/null 2>&1 || true
    git clean -fd >/dev/null 2>&1 || true
  fi
}

stop_server() {
  if [[ -n "$SERVER_PID" ]]; then
    if ps -p "$SERVER_PID" >/dev/null 2>&1; then
      kill "$SERVER_PID" >/dev/null 2>&1 || true
      wait "$SERVER_PID" >/dev/null 2>&1 || true
    fi
  fi
  pkill -f "next start" >/dev/null 2>&1 || true
}

finalize() {
  if [[ $FINISHED -eq 1 ]]; then
    return
  fi
  FINISHED=1

  stop_server
  restore_workspace

  mkdir -p "$LOG_DIR"
  cp "$TMP_LOG" "$FINAL_LOG"
  echo "🗂  Log completo: $FINAL_LOG"
  if [[ -f "$SERVER_LOG" ]]; then
    echo "🗂  Log del servidor: $SERVER_LOG"
  fi

  if [[ $FAILED -eq 0 ]]; then
    echo "✅ LPMS Local QA PASSED"
    exit 0
  else
    echo "⚠️ LPMS Local QA FAILED — revisar logs"
    exit 1
  fi
}

abort_run() {
  FAILED=1
  echo "⚠️ Abortando flujo por error."
  trap - INT TERM
  finalize
}

trap abort_run INT TERM

run_cmd() {
  local label="$1"
  local command="$2"
  echo ""
  echo "→ $label"
  echo "   $command"
  if eval "$command"; then
    echo "   ✅ $label"
    return 0
  else
    echo "   ❌ $label"
    return 1
  fi
}

cd "$ROOT_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "⚠️ El árbol de trabajo debe estar limpio antes de ejecutar este script."
  abort_run
fi

if [[ -z "$(git stash list)" ]]; then
  echo "⚠️ No hay stashes disponibles. Se esperaba encontrar cambios guardados."
  abort_run
fi

if ! run_cmd "Aplicar stash temporal (stash@{0})" "git stash apply stash@{0}"; then
  abort_run
fi
APPLIED_STASH=1

NVM_CANDIDATES=("$HOME/.nvm/nvm.sh" "/usr/local/opt/nvm/nvm.sh" "/opt/homebrew/opt/nvm/nvm.sh")
NVM_SH=""
for candidate in "${NVM_CANDIDATES[@]}"; do
  if [[ -s "$candidate" ]]; then
    NVM_SH="$candidate"
    break
  fi
done

if [[ -z "$NVM_SH" ]]; then
  echo "⚠️ No se encontró nvm.sh. Asegúrate de tener NVM instalado."
  abort_run
fi

if ! run_cmd "Activar Node 22" "source \"$NVM_SH\" && nvm use 22 >/dev/null"; then
  abort_run
fi

NODE_VERSION="$(node -v 2>/dev/null || true)"
echo "   Node activo: $NODE_VERSION"
if [[ "$NODE_VERSION" != v22* ]]; then
  echo "⚠️ Se requiere Node 22, se encontró $NODE_VERSION"
  abort_run
fi

if ! run_cmd "Instalar dependencias (npm ci)" "npm ci"; then
  abort_run
fi

if ! run_cmd "Build de producción" "npm run build"; then
  abort_run
fi

echo ""
echo "→ Iniciar servidor (background)"
echo "   npm run start > $SERVER_LOG 2>&1 &"
npm run start > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!
sleep 2
if ! ps -p "$SERVER_PID" >/dev/null 2>&1; then
  echo "   ❌ El servidor no se está ejecutando (PID $SERVER_PID)."
  FAILED=1
  abort_run
fi
echo "   Servidor PID: $SERVER_PID (logs: $SERVER_LOG)"

echo ""
echo "→ Esperando a que el servidor responda en http://localhost:3000"
READY=0
for _ in {1..60}; do
  if curl -sSf http://localhost:3000 >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done
if [[ $READY -ne 1 ]]; then
  echo "   ❌ El servidor no respondió a tiempo. Revisar $SERVER_LOG"
  FAILED=1
  abort_run
fi
echo "   ✅ Servidor listo."

if ! run_cmd "Lint" "npm run lint"; then
  abort_run
fi

if ! run_cmd "Tests" "npm test --silent"; then
  abort_run
fi

if ! run_cmd "Verificación de íconos" "npm run verify:icons"; then
  abort_run
fi

if ! run_cmd "Healthcheck /api/health" "curl -sSf -I http://localhost:3000/api/health"; then
  abort_run
fi

echo ""
echo "→ Verificar disponibilidad de npm run predeploy:check"
if npm run | grep -q "predeploy:check"; then
  echo "   Ejecutando predeploy:check (salida en $PREDEPLOY_LOG)"
  if npm run predeploy:check | tee "$PREDEPLOY_LOG"; then
    echo "   ✅ predeploy:check completado."
  else
    echo "   ❌ predeploy:check falló."
    FAILED=1
    abort_run
  fi
else
  echo "   ℹ️ predeploy:check no disponible, se omite."
fi

trap - INT TERM
finalize


