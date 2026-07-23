#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME="$ROOT/.runtime"
LOG_DIR="$RUNTIME/logs"
PID_BACKEND="$RUNTIME/backend.pid"
PID_FRONTEND="$RUNTIME/frontend.pid"
APP_URL="http://localhost:3000"
API_URL="http://127.0.0.1:8000"

mkdir -p "$LOG_DIR"

# Evita 404 fantasma do Next.js (EMFILE: too many open files / watchers)
ulimit -n 10240 2>/dev/null || ulimit -n 4096 2>/dev/null || true
export WATCHPACK_POLLING="${WATCHPACK_POLLING:-true}"
export CHOKIDAR_USEPOLLING="${CHOKIDAR_USEPOLLING:-true}"

# Garante que o MacTeX/TeX Live seja encontrado mesmo sem /Library/TeX/texbin
for TEXDIR in \
  /Library/TeX/texbin \
  /usr/local/texlive/2026/bin/universal-darwin \
  /usr/local/texlive/2025/bin/universal-darwin \
  /usr/local/texlive/2024/bin/universal-darwin
do
  if [[ -x "$TEXDIR/latexmk" || -e "$TEXDIR/latexmk" ]]; then
    export PATH="$TEXDIR:$PATH"
    echo "• TeX encontrado em: $TEXDIR"
    break
  fi
done


is_running() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

port_in_use() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

http_ready() {
  local url="$1"
  curl -fsS --max-time 1 "$url" >/dev/null 2>&1
}

wait_for_app() {
  local tries="${1:-40}"
  local i=1
  echo "• Aguardando o app ficar pronto..."
  while (( i <= tries )); do
    if port_in_use 3000 && http_ready "$APP_URL"; then
      return 0
    fi
    sleep 0.5
    i=$((i + 1))
  done
  # Se a porta abriu mas o HTTP ainda falhou, ainda assim consideramos quase pronto
  if port_in_use 3000; then
    return 0
  fi
  return 1
}

open_browser() {
  local url="$1"
  echo "• Abrindo no navegador padrão (página inteira): $url ..."

  # Sempre o navegador padrão do sistema (não força Chrome)
  if command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  else
    echo "  (Não foi possível abrir o navegador automaticamente.)"
    return
  fi

  # macOS: maximiza / tela cheia a janela do Studio no navegador que abriu
  if [[ "$(uname -s)" == "Darwin" ]]; then
    sleep 1.4
    osascript >/dev/null 2>&1 <<'APPLESCRIPT' || true
set matched to false
tell application "System Events"
  set procs to every application process whose background only is false
  repeat with proc in procs
    try
      repeat with w in (windows of proc)
        try
          set wname to name of w as text
          if (wname contains "LaTeX Studio") or (wname contains "localhost:3000") or (wname contains "127.0.0.1:3000") then
            set frontmost of proc to true
            delay 0.2
            try
              set value of attribute "AXFullScreen" of w to true
              set matched to true
            on error
              try
                set value of attribute "AXZoomed" of w to true
                set matched to true
              end try
            end try
            exit repeat
          end if
        end try
      end repeat
    end try
    if matched then exit repeat
  end repeat
end tell
if matched is false then
  tell application "System Events"
    keystroke "f" using {control down, command down}
  end tell
end if
APPLESCRIPT
    echo "  (navegador padrão · página inteira)"
  fi
}

echo "========================================"
echo "  LaTeX Studio Local — INICIAR"
echo "========================================"
echo

if is_running "$PID_BACKEND" || port_in_use 8000; then
  echo "• Backend já parece estar em execução (porta 8000)."
else
  if [[ ! -f "$ROOT/backend/.venv/bin/uvicorn" ]]; then
    echo "Ambiente Python não encontrado."
    echo "Rode antes: ./scripts/setup-macos.sh"
    exit 1
  fi
  echo "• Iniciando API em $API_URL ..."
  (
    cd "$ROOT/backend"
    # shellcheck disable=SC1091
    source .venv/bin/activate
    exec uvicorn app.main:app --host 127.0.0.1 --port 8000
  ) >"$LOG_DIR/backend.log" 2>&1 &
  echo $! >"$PID_BACKEND"
  disown "$(cat "$PID_BACKEND")" 2>/dev/null || true
  echo "  PID $(cat "$PID_BACKEND") — log: .runtime/logs/backend.log"
fi

if is_running "$PID_FRONTEND" || port_in_use 3000; then
  echo "• Frontend já parece estar em execução (porta 3000)."
else
  if [[ ! -d "$ROOT/frontend/node_modules" ]]; then
    echo "Dependências do frontend não encontradas."
    echo "Rode antes: ./scripts/setup-macos.sh"
    exit 1
  fi
  echo "• Iniciando App em $APP_URL ..."
  (
    cd "$ROOT/frontend"
    exec npm run dev -- --hostname 127.0.0.1 --port 3000
  ) >"$LOG_DIR/frontend.log" 2>&1 &
  echo $! >"$PID_FRONTEND"
  disown "$(cat "$PID_FRONTEND")" 2>/dev/null || true
  echo "  PID $(cat "$PID_FRONTEND") — log: .runtime/logs/frontend.log"
fi

echo
if wait_for_app 40; then
  if port_in_use 8000; then
    echo "✓ API      $API_URL/docs"
  else
    echo "⚠ API ainda não respondeu na porta 8000. Veja .runtime/logs/backend.log"
  fi
  echo "✓ App      $APP_URL"
  open_browser "$APP_URL"
else
  echo "⚠ App ainda não respondeu na porta 3000. Veja .runtime/logs/frontend.log"
  echo "  Tente abrir manualmente: $APP_URL"
  if ! port_in_use 8000; then
    echo "⚠ API ainda não respondeu na porta 8000. Veja .runtime/logs/backend.log"
  fi
fi

echo
echo "Para parar:  ./PARAR.command   ou   ./scripts/parar.sh"
echo "========================================"
