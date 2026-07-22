from __future__ import annotations

import os
import platform
from pathlib import Path
from typing import List, Optional


def candidate_tex_bin_dirs() -> List[Path]:
    dirs: List[Path] = []
    # MacTeX / TeX Live padrão
    dirs.append(Path("/Library/TeX/texbin"))
    # Instalação direta do TeX Live (quando o link /Library/TeX/texbin ainda não existe)
    live = Path("/usr/local/texlive")
    if live.is_dir():
        versions = sorted(
            [p for p in live.iterdir() if p.is_dir() and p.name.isdigit()],
            reverse=True,
        )
        for ver in versions:
            for arch in ("universal-darwin", "arm64-darwin", "x86_64-darwin"):
                dirs.append(ver / "bin" / arch)
    # Homebrew (basictex / rarer setups)
    dirs.append(Path("/opt/homebrew/bin"))
    dirs.append(Path("/usr/local/bin"))
    # Linux common
    dirs.append(Path("/usr/bin"))
    return dirs


def find_tex_binary(name: str) -> Optional[str]:
    """Resolve um binário TeX pelo PATH ou pastas conhecidas do MacTeX."""
    # 1) PATH atual
    path_env = os.environ.get("PATH", "")
    for chunk in path_env.split(os.pathsep):
        if not chunk:
            continue
        candidate = Path(chunk) / name
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return str(candidate)

    # 2) pastas conhecidas
    for directory in candidate_tex_bin_dirs():
        candidate = directory / name
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return str(candidate)
        # latexmk pode ser symlink para .pl
        if candidate.exists() and os.access(candidate, os.X_OK):
            return str(candidate)
    return None


def tex_path_prefix() -> str:
    """Retorna diretórios TeX existentes para prepender no PATH."""
    found: List[str] = []
    for directory in candidate_tex_bin_dirs():
        if directory.is_dir():
            # só inclui se tiver pelo menos latexmk ou lualatex
            if (directory / "latexmk").exists() or (directory / "lualatex").exists():
                found.append(str(directory))
    return os.pathsep.join(found)


def enrich_process_env(base: Optional[dict] = None) -> dict:
    env = dict(base or os.environ)
    prefix = tex_path_prefix()
    if prefix:
        env["PATH"] = prefix + os.pathsep + env.get("PATH", "")
    # MacTeX às vezes precisa disso
    if platform.system() == "Darwin":
        env.setdefault("LANG", "en_US.UTF-8")
    return env
