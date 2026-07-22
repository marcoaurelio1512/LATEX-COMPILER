#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT/backend"
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 &

cd "$ROOT/frontend"
npm run start -- --port 3000
