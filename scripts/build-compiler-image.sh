#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="${LATEX_LOCAL_IMAGE:-latex-local-compiler}"
docker build -t "$IMAGE" "$ROOT/compiler"
echo "Imagem pronta: $IMAGE"
