from __future__ import annotations

import os
import re
from pathlib import Path, PurePosixPath
from typing import List, Optional

from fastapi import HTTPException

SAFE_NAME_RE = re.compile(r"^[\w.\- ]+$", re.UNICODE)


class PathSecurityError(ValueError):
    """Raised when a path escapes the project root or is otherwise unsafe."""


def sanitize_filename(name: str) -> str:
    name = name.strip().replace("\\", "/").split("/")[-1]
    if not name or name in {".", ".."}:
        raise PathSecurityError("Nome de arquivo inválido")
    if not SAFE_NAME_RE.match(name):
        raise PathSecurityError("Nome de arquivo contém caracteres não permitidos")
    return name


def normalize_relative_path(relative_path: str) -> str:
    if relative_path is None:
        raise PathSecurityError("Caminho relativo ausente")
    raw = relative_path.replace("\\", "/").strip()
    if not raw or raw == ".":
        return ""
    if raw.startswith("/") or re.match(r"^[A-Za-z]:/", raw):
        raise PathSecurityError("Caminhos absolutos não são permitidos")
    parts = PurePosixPath(raw).parts
    if ".." in parts:
        raise PathSecurityError("Segmento '..' não é permitido")
    if any(p in {"", "."} for p in parts):
        raise PathSecurityError("Caminho relativo inválido")
    return str(PurePosixPath(*parts))


def resolve_safe_project_path(project_root: Path, relative_path: str) -> Path:
    """Resolve a path that must remain inside project_root."""
    root = project_root.resolve()
    if not root.exists() or not root.is_dir():
        raise PathSecurityError("Raiz do projeto inválida")

    rel = normalize_relative_path(relative_path)
    if not rel:
        return root

    candidate = root / rel
    current = root
    for part in PurePosixPath(rel).parts:
        current = current / part
        if current.exists() or current.is_symlink():
            real = current.resolve()
            try:
                real.relative_to(root)
            except ValueError as exc:
                raise PathSecurityError(
                    "Symlink ou caminho aponta para fora do projeto"
                ) from exc

    resolved = candidate.resolve(strict=False)
    try:
        resolved.relative_to(root)
    except ValueError as exc:
        raise PathSecurityError("Caminho fora do projeto") from exc

    if candidate.exists() or candidate.is_symlink():
        real = Path(os.path.realpath(candidate))
        try:
            real.relative_to(Path(os.path.realpath(root)))
        except ValueError as exc:
            raise PathSecurityError("Caminho real fora do projeto") from exc
        return real

    return resolved


def relative_to_project(project_root: Path, absolute_path: Path) -> str:
    root = project_root.resolve()
    abs_path = absolute_path.resolve()
    try:
        return str(abs_path.relative_to(root)).replace("\\", "/")
    except ValueError as exc:
        raise PathSecurityError("Caminho fora do projeto") from exc


def http_safe_path(project_root: Path, relative_path: str) -> Path:
    try:
        return resolve_safe_project_path(project_root, relative_path)
    except PathSecurityError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def is_ignored_dir(name: str, ignored: Optional[List[str]] = None) -> bool:
    ignored = ignored or []
    return name in ignored or (name.startswith(".") and name != ".latex-local.json")


def project_build_dir(project_root: Path) -> Path:
    build = project_root / ".latex-local" / "build"
    build.mkdir(parents=True, exist_ok=True)
    return build


def project_config_path(project_root: Path) -> Path:
    return project_root / ".latex-local.json"
