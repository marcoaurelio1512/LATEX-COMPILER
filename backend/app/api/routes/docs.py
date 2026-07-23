from __future__ import annotations

import re
import unicodedata
from pathlib import Path
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(tags=["docs"])

PROJECT_ROOT = Path(__file__).resolve().parents[4]
# Botão "Como usar" da interface → guia COMO-USAR.md (conteúdo completo para leigos)
COMO_USAR_PATH = PROJECT_ROOT / "COMO-USAR.md"
MANUAL_PATH = PROJECT_ROOT / "MANUAL-USO.md"


class ManualTopic(BaseModel):
    id: str
    title: str
    level: int = 2


class ManualResponse(BaseModel):
    title: str
    path: str
    markdown: str
    topics: List[ManualTopic] = Field(default_factory=list)


def _slug(text: str) -> str:
    s = text.lower().strip()
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = re.sub(r"[^\w\s-]", "", s, flags=re.UNICODE)
    s = re.sub(r"[\s_]+", "-", s)
    return s.strip("-") or "secao"


def _parse_topics(markdown: str) -> List[ManualTopic]:
    topics: List[ManualTopic] = []
    seen: dict[str, int] = {}
    for line in markdown.splitlines():
        m = re.match(r"^(##)\s+(.+?)\s*$", line)
        if not m:
            continue
        level = len(m.group(1))
        title = m.group(2).strip()
        # ignore horizontal-rule-only noise
        if title.startswith("---"):
            continue
        base = _slug(title)
        n = seen.get(base, 0)
        seen[base] = n + 1
        tid = base if n == 0 else f"{base}-{n}"
        topics.append(ManualTopic(id=tid, title=title, level=level))
    return topics


@router.get("/docs/manual", response_model=ManualResponse)
def api_manual():
    """Serve o guia da interface (Como usar). Prefere COMO-USAR.md."""
    path = COMO_USAR_PATH if COMO_USAR_PATH.exists() else MANUAL_PATH
    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Manual não encontrado (tente {COMO_USAR_PATH.name} ou {MANUAL_PATH.name})",
        )
    text = path.read_text(encoding="utf-8")
    title = "Como usar"
    for line in text.splitlines():
        if line.startswith("# "):
            title = line[2:].strip()
            break
    return ManualResponse(
        title=title,
        path=str(path),
        markdown=text,
        topics=_parse_topics(text),
    )
