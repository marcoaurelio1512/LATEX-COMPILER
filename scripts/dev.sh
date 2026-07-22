#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

PIDS=()
cleanup() {
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

cd "$ROOT/backend"
# shellcheck disable=SC1091
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 &
PIDS+=($!)

cd "$ROOT/frontend"
npm run dev -- --hostname 127.0.0.1 --port 3000 &
PIDS+=($!)

echo "API  http://127.0.0.1:8000/docs"
echo "App  http://localhost:3000"
wait
