from __future__ import annotations

import json
from pathlib import Path
from typing import List, Optional

from app.core.config import settings
from app.publication.models import ProjectType, TemplateManifest
from app.publication.validator import validate_manifest


def builtin_dir() -> Path:
    return Path(__file__).resolve().parent / "builtin"


def imported_dir() -> Path:
    d = settings.data_dir / "templates" / "imported"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _load_json_manifest(path: Path) -> TemplateManifest:
    data = json.loads(path.read_text(encoding="utf-8"))
    return TemplateManifest.model_validate(data)


def list_templates(project_type: Optional[ProjectType] = None) -> List[TemplateManifest]:
    items: List[TemplateManifest] = []
    for path in sorted(builtin_dir().glob("*.json")):
        try:
            items.append(_load_json_manifest(path))
        except Exception:
            continue
    for path in sorted(imported_dir().glob("*/manifest.json")):
        try:
            m = _load_json_manifest(path)
            m.source = "imported"
            m.path = str(path.parent)
            items.append(m)
        except Exception:
            continue
    if project_type:
        items = [m for m in items if project_type in m.project_types or "custom" in m.project_types]
    return items


def get_template(template_id: str) -> TemplateManifest:
    builtin = builtin_dir() / f"{template_id}.json"
    if builtin.exists():
        return _load_json_manifest(builtin)
    imported = imported_dir() / template_id / "manifest.json"
    if imported.exists():
        m = _load_json_manifest(imported)
        m.source = "imported"
        m.path = str(imported.parent)
        return m
    raise LookupError(f"Template não encontrado: {template_id}")


def remove_imported_template(template_id: str) -> bool:
    root = imported_dir() / template_id
    if not root.exists():
        return False
    import shutil
    shutil.rmtree(root)
    return True


def save_imported_manifest(manifest: TemplateManifest, template_root: Path) -> Path:
    template_root.mkdir(parents=True, exist_ok=True)
    validation = validate_manifest(manifest)
    manifest.validated = validation.ok
    manifest.warnings = validation.warnings + validation.errors
    manifest.path = str(template_root)
    manifest.source = "imported"
    path = template_root / "manifest.json"
    path.write_text(manifest.model_dump_json(indent=2) + "\n", encoding="utf-8")
    return path
