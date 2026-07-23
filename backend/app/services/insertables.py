from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List

from app.core.config import settings
from app.core.paths import is_ignored_dir, relative_to_project

FIGURE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".pdf", ".eps", ".webp"}
PREFERRED_DIRS = (
    "content/figures",
    "content/figuras",
    "figuras",
    "figures",
    "images",
    "content/images",
    "img",
)

ENTRY_RE = re.compile(
    r"@(?P<type>\w+)\s*\{\s*(?P<key>[^,{\s]+)\s*,",
    re.IGNORECASE,
)
FIELD_RE = re.compile(
    r"(?P<field>author|title|year)\s*=\s*[{\"'](?P<value>.*?)[\"'}]\s*,?",
    re.IGNORECASE | re.DOTALL,
)


def list_figures(project_root: Path) -> List[dict]:
    root = project_root.resolve()
    ignored = settings.ignored_dir_names
    items: List[dict] = []
    seen: set[str] = set()

    # Prefer known folders first, then any image in project
    candidates: List[Path] = []
    for pref in PREFERRED_DIRS:
        d = root / pref
        if d.is_dir():
            candidates.extend(p for p in d.rglob("*") if p.is_file())

    if not candidates:
        for p in root.rglob("*"):
            if p.is_file():
                candidates.append(p)

    for path in candidates:
        try:
            rel_parts = path.relative_to(root).parts
        except ValueError:
            continue
        if any(is_ignored_dir(part, ignored) for part in rel_parts[:-1]):
            continue
        if any(part.startswith(".") for part in rel_parts[:-1]):
            continue
        if path.suffix.lower() not in FIGURE_EXTS:
            continue
        rel = relative_to_project(root, path)
        if rel in seen:
            continue
        seen.add(rel)
        # include path relative to preferred folder when possible (for graphicspath)
        insert_name = path.name
        for pref in PREFERRED_DIRS:
            pref_path = root / pref
            try:
                insert_name = str(path.relative_to(pref_path)).replace("\\", "/")
                break
            except ValueError:
                continue
        items.append(
            {
                "path": rel,
                "name": path.name,
                "insert_name": insert_name,
                "folder": str(Path(rel).parent).replace("\\", "/"),
            }
        )

    items.sort(key=lambda x: x["path"].lower())
    return items


def list_bib_entries(project_root: Path) -> List[dict]:
    root = project_root.resolve()
    ignored = settings.ignored_dir_names
    entries: List[dict] = []
    seen_keys: set[str] = set()

    bib_files = sorted(root.rglob("*.bib"))
    for bib in bib_files:
        try:
            rel_parts = bib.relative_to(root).parts
        except ValueError:
            continue
        if any(is_ignored_dir(part, ignored) for part in rel_parts[:-1]):
            continue
        if any(part.startswith(".") for part in rel_parts[:-1]):
            continue
        try:
            if bib.stat().st_size > settings.max_file_size_bytes:
                continue
            text = bib.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue

        bib_rel = relative_to_project(root, bib)
        for m in ENTRY_RE.finditer(text):
            key = m.group("key").strip()
            if not key or key in seen_keys:
                continue
            seen_keys.add(key)
            # só até a próxima entrada @...{ — evita misturar campos
            rest = text[m.end() :]
            next_at = re.search(r"\n\s*@", rest)
            chunk = rest[: next_at.start()] if next_at else rest[:1200]
            fields: Dict[str, str] = {}
            for fm in FIELD_RE.finditer(chunk):
                key_f = fm.group("field").lower()
                if key_f in fields:
                    continue
                fields[key_f] = re.sub(
                    r"\s+", " ", fm.group("value").lstrip("{").rstrip("}")
                ).strip()[:120]
            entries.append(
                {
                    "key": key,
                    "entry_type": m.group("type").lower(),
                    "author": fields.get("author", ""),
                    "title": fields.get("title", ""),
                    "year": fields.get("year", ""),
                    "bib_file": bib_rel,
                }
            )

    entries.sort(key=lambda x: x["key"].lower())
    return entries
