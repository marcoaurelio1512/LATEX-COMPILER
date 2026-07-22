#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Backend (Python venv)"
cd "$ROOT/backend"
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Frontend (npm)"
cd "$ROOT/frontend"
npm install

echo "==> Pronto. Opcional: MacTeX e Docker"
echo "    brew install --cask mactex-no-gui"
echo "    # ou brew install --cask mactex"
echo "    # Docker Desktop: https://www.docker.com/products/docker-desktop/"
echo
echo "Inicie com: make dev   ou   ./scripts/dev.sh"
