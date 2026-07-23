#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME="$ROOT/.runtime"
PID_BACKEND="$RUNTIME/backend.pid"
PID_FRONTEND="$RUNTIME/frontend.pid"

echo "========================================"
echo "  LaTeX Studio Local — PARAR"
echo "========================================"
echo

kill_pid_file() {
  local label="$1"
  local pid_file="$2"
  if [[ ! -f "$pid_file" ]]; then
    echo "• $label: nenhum PID salvo."
    return
  fi
  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  if [[ -z "${pid:-}" ]]; then
    rm -f "$pid_file"
    echo "• $label: PID vazio (removido)."
    return
  fi
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    sleep 0.5
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
    pkill -P "$pid" 2>/dev/null || true
    echo "• $label: processo $pid encerrado."
  else
    echo "• $label: processo $pid já não estava ativo."
  fi
  rm -f "$pid_file"
}

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -z "${pids:-}" ]]; then
    echo "• Porta $port: livre."
    return
  fi
  echo "• Porta $port: encerrando PID(s) $pids"
  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true
  sleep 0.5
  pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -n "${pids:-}" ]]; then
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
  fi
}

kill_pid_file "Backend" "$PID_BACKEND"
kill_pid_file "Frontend" "$PID_FRONTEND"
kill_port 8000
kill_port 3000

# Limpa cache do Next.js para evitar 404 fantasma na próxima abertura
NEXT_CACHE="$ROOT/frontend/.next"
if [[ -d "$NEXT_CACHE" ]]; then
  rm -rf "$NEXT_CACHE"
  echo "• Cache do app (.next) limpo."
else
  echo "• Cache do app (.next): já estava limpo."
fi

echo
echo "✓ Servidores parados."
echo "========================================"
