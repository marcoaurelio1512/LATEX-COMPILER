from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional

from app.core.config import settings


def cache_dir() -> Path:
    d = settings.data_dir / "cache" / "templates"
    d.mkdir(parents=True, exist_ok=True)
    return d


def cache_path(template_id: str) -> Path:
    safe = "".join(c for c in template_id if c.isalnum() or c in "-_")
    return cache_dir() / f"{safe}.json"


def read_cache(template_id: str) -> Optional[Dict[str, Any]]:
    path = cache_path(template_id)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def write_cache(template_id: str, payload: Dict[str, Any]) -> Path:
    path = cache_path(template_id)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path
