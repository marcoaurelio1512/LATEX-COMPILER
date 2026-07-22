#!/usr/bin/env bash
set -euo pipefail

# Helper for local docker compiles. Never enables shell-escape.
PROJECT_PATH="${1:?Informe o caminho do projeto}"
MAIN_FILE="${2:-main.tex}"
ENGINE="${3:-lualatex}"
IMAGE="${LATEX_LOCAL_IMAGE:-latex-local-compiler}"

ROOT="$(cd "$PROJECT_PATH" && pwd)"
case "$ROOT" in
  /|/Users|/home|/etc|/var|/tmp) echo "Caminho de projeto inseguro: $ROOT" >&2; exit 1 ;;
esac

FLAG="-lualatex"
case "$ENGINE" in
  lualatex) FLAG="-lualatex" ;;
  xelatex) FLAG="-xelatex" ;;
  pdflatex) FLAG="-pdf" ;;
  *) echo "Motor inválido" >&2; exit 1 ;;
esac

mkdir -p "$ROOT/.latex-local/build"

docker run --rm \
  --network none \
  --memory 1g \
  --cpus 2 \
  --pids-limit 256 \
  --security-opt no-new-privileges \
  --user 10001:10001 \
  -v "$ROOT:/workspace:rw" \
  -w /workspace \
  "$IMAGE" \
  "$FLAG" \
  -interaction=nonstopmode \
  -file-line-error \
  -synctex=1 \
  -outdir=/workspace/.latex-local/build \
  -auxdir=/workspace/.latex-local/build \
  -latexoption=-no-shell-escape \
  "$MAIN_FILE"
