#!/usr/bin/env bash
set -euo pipefail

check() {
  local bin="$1"
  if command -v "$bin" >/dev/null 2>&1; then
    echo "OK  $bin -> $(command -v "$bin")"
    "$bin" --version 2>/dev/null | head -n 1 || true
  else
    echo "MISS $bin"
  fi
}

echo "=== Dependências LaTeX Studio Local ==="
for b in latexmk lualatex xelatex pdflatex biber bibtex docker node npm python3; do
  check "$b"
  echo
done

if [[ "$(uname -s)" == "Darwin" ]]; then
  echo "macOS: se o TeX estiver ausente, instale com:"
  echo "  brew install --cask mactex-no-gui"
fi
