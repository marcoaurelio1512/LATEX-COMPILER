from __future__ import annotations

import re
from pathlib import Path
from typing import List, Optional, Tuple

from app.core.config import settings
from app.core.paths import is_ignored_dir

DOCUMENTCLASS_RE = re.compile(r"\\documentclass\b")

PRIORITY_NAMES = [
    "main.tex",
    "book.tex",
    "article.tex",
    "manuscript.tex",
]


def find_documentclass_files(project_root: Path) -> List[str]:
    results: List[str] = []
    ignored = set(settings.ignored_dir_names)
    for path in sorted(project_root.rglob("*.tex")):
        try:
            rel_parts = path.relative_to(project_root).parts
        except ValueError:
            continue
        if any(is_ignored_dir(part, list(ignored)) for part in rel_parts[:-1]):
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        if DOCUMENTCLASS_RE.search(text):
            results.append(str(path.relative_to(project_root)).replace("\\", "/"))
    return results


def choose_main_file(
    candidates: List[str],
    configured: Optional[str] = None,
) -> Optional[str]:
    if configured and configured in candidates:
        return configured
    if configured and not candidates:
        return configured
    lower_map = {c.lower(): c for c in candidates}
    for name in PRIORITY_NAMES:
        if name in lower_map:
            return lower_map[name]
        for candidate in candidates:
            if Path(candidate).name.lower() == name:
                return candidate
    return candidates[0] if candidates else configured


def detect_main(project_root: Path, configured: Optional[str] = None) -> Tuple[Optional[str], List[str]]:
    candidates = find_documentclass_files(project_root)
    # Ignora principal configurado se o arquivo não existe mais no projeto
    if configured:
        cfg = project_root / configured
        if not cfg.is_file() or configured not in candidates:
            configured = None
    main = choose_main_file(candidates, configured)
    return main, candidates
