"""Perfis de escrita BibTeX / BibLaTeX / ABNT-friendly."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Literal, Optional, Tuple

BibProfile = Literal["biblatex", "bibtex", "abnt"]

PROFILES: Dict[BibProfile, Dict[str, str]] = {
    "biblatex": {
        "id": "biblatex",
        "label": "BibLaTeX (padrão)",
        "hint": "Campos journaltitle/date; ideal com biber",
    },
    "bibtex": {
        "id": "bibtex",
        "label": "BibTeX clássico",
        "hint": "Campos journal/year; \\bibliographystyle + bibtex",
    },
    "abnt": {
        "id": "abnt",
        "label": "ABNT (campos)",
        "hint": "Campos amigáveis a abnTeX2 / estilo ABNT",
    },
}

ENTRY_RE = re.compile(
    r"@(?P<type>\w+)\s*\{\s*(?P<key>[^,{\s]+)\s*,",
    re.IGNORECASE,
)
# field = {value} or "value" — value may nest braces lightly
FIELD_RE = re.compile(
    r"(?P<field>[a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*"
    r"(?:\{(?P<braced>(?:[^{}]|\{[^{}]*\})*)\}|\"(?P<quoted>[^\"]*)\"|(?P<bare>[^,]+))\s*,?",
    re.IGNORECASE | re.DOTALL,
)


@dataclass
class BibEntry:
    key: str
    entry_type: str = "misc"
    fields: Dict[str, str] = field(default_factory=dict)


def list_profiles() -> List[dict]:
    return [
        {"id": k, "label": v["label"], "hint": v["hint"]}
        for k, v in PROFILES.items()
    ]


def normalize_profile(value: Optional[str]) -> BibProfile:
    v = (value or "biblatex").strip().lower()
    if v in ("biblatex", "bibtex", "abnt"):
        return v  # type: ignore[return-value]
    raise ValueError(
        f"Perfil inválido: {value!r}. Use: biblatex | bibtex | abnt"
    )


def strip_braces(value: str) -> str:
    value = (value or "").strip()
    if value.startswith("{") and value.endswith("}"):
        value = value[1:-1]
    if value.startswith('"') and value.endswith('"'):
        value = value[1:-1]
    return value.strip()


def brace(value: str) -> str:
    value = strip_braces(value).replace("{", "").replace("}", "").strip()
    return "{" + value + "}"


def parse_bib_text(text: str) -> List[BibEntry]:
    entries: List[BibEntry] = []
    seen: set[str] = set()
    for m in ENTRY_RE.finditer(text):
        key = m.group("key").strip()
        if not key or key in seen:
            continue
        seen.add(key)
        rest = text[m.end() :]
        next_at = re.search(r"\n\s*@", rest)
        chunk = rest[: next_at.start()] if next_at else rest
        # cortar no } final da entrada
        depth = 1
        end_idx = len(chunk)
        for i, ch in enumerate(chunk):
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end_idx = i
                    break
        chunk = chunk[:end_idx]
        fields: Dict[str, str] = {}
        for fm in FIELD_RE.finditer(chunk):
            name = fm.group("field").lower()
            raw = fm.group("braced") or fm.group("quoted") or fm.group("bare") or ""
            if name not in fields:
                fields[name] = strip_braces(raw)
        entries.append(
            BibEntry(key=key, entry_type=m.group("type").lower(), fields=fields)
        )
    return entries


def transform_entry(entry: BibEntry, profile: BibProfile) -> BibEntry:
    f = dict(entry.fields)
    etype = entry.entry_type.lower()

    if profile == "biblatex":
        if "journal" in f and "journaltitle" not in f:
            f["journaltitle"] = f.pop("journal")
        elif "journal" in f and "journaltitle" in f:
            f.pop("journal", None)
        if "address" in f and "location" not in f:
            f["location"] = f.pop("address")
        if "year" in f and "date" not in f:
            y = re.sub(r"\D", "", f["year"])
            if len(y) == 4:
                f["date"] = y
        if f.get("url") and etype in {"misc", "unpublished"}:
            etype = "online"
        # tipicamente biblatex prefere date; mantém year se já existir

    elif profile == "bibtex":
        if "journaltitle" in f and "journal" not in f:
            f["journal"] = f.pop("journaltitle")
        elif "journaltitle" in f:
            f.pop("journaltitle", None)
        if "location" in f and "address" not in f:
            f["address"] = f.pop("location")
        elif "location" in f:
            f.pop("location", None)
        if "date" in f and "year" not in f:
            y = re.sub(r"\D", "", f["date"])
            if y:
                f["year"] = y[:4]
        # remove campos tipicamente biblatex
        for k in ("date", "journaltitle", "location", "urldate", "pubstate"):
            if k == "date" and "year" in f:
                f.pop("date", None)
            elif k in ("journaltitle", "location", "urldate", "pubstate"):
                f.pop(k, None)
        if etype == "online":
            etype = "misc"
        if etype == "thesis":
            # clássico: phdthesis / mastersthesis
            t = (f.get("type") or "").lower()
            if "master" in t:
                etype = "mastersthesis"
            else:
                etype = "phdthesis"

    elif profile == "abnt":
        # ABNT / abnTeX2 costuma aceitar BibTeX com address, org-year
        if "journaltitle" in f and "journal" not in f:
            f["journal"] = f.pop("journaltitle")
        if "location" in f and "address" not in f:
            f["address"] = f.pop("location")
        if "date" in f and "year" not in f:
            y = re.sub(r"\D", "", f["date"])
            if y:
                f["year"] = y[:4]
        # organiza campos úteis
        if f.get("url") and "howpublished" not in f:
            f["howpublished"] = f"Disponível em: {f['url']}"
        if etype == "online":
            etype = "misc"
        note = f.get("note", "")
        if "ABNT" not in note:
            extra = "Formato ABNT-friendly (revise norma da instituição)."
            f["note"] = f"{note}. {extra}".strip(". ")

    # limpa vazios
    f = {k: v for k, v in f.items() if str(v).strip()}
    return BibEntry(key=entry.key, entry_type=etype, fields=f)


def format_entry(entry: BibEntry, profile: BibProfile) -> str:
    e = transform_entry(entry, profile)
    # ordem preferencial de campos
    order = [
        "author",
        "editor",
        "title",
        "booktitle",
        "journal",
        "journaltitle",
        "year",
        "date",
        "volume",
        "number",
        "pages",
        "publisher",
        "address",
        "location",
        "organization",
        "school",
        "institution",
        "type",
        "edition",
        "series",
        "doi",
        "isbn",
        "issn",
        "url",
        "urldate",
        "howpublished",
        "note",
    ]
    keys = [k for k in order if k in e.fields] + [
        k for k in sorted(e.fields) if k not in order
    ]
    lines = [f"@{e.entry_type}{{{e.key},"]
    for k in keys:
        lines.append(f"  {k} = {brace(e.fields[k])},")
    lines.append("}")
    return "\n".join(lines)


def format_bibliography(
    entries: List[BibEntry],
    profile: BibProfile,
    *,
    header: Optional[str] = None,
) -> str:
    meta = PROFILES[profile]
    default_header = (
        f"% LaTeX Studio Local — perfil: {meta['label']}\n"
        f"% {meta['hint']}\n"
        "% Revise as entradas antes de publicar.\n\n"
    )
    blocks = [
        format_entry(e, profile)
        for e in sorted(entries, key=lambda x: x.key.lower())
    ]
    return (header if header is not None else default_header) + "\n\n".join(blocks) + "\n"


def convert_bib_file(
    project_root: Path,
    *,
    source: Path,
    output: Path,
    profile: BibProfile,
) -> Tuple[str, int, List[str]]:
    text = source.read_text(encoding="utf-8", errors="replace")
    entries = parse_bib_text(text)
    if not entries:
        raise ValueError("Nenhuma entrada BibTeX encontrada no arquivo de origem.")
    body = format_bibliography(entries, profile)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(body, encoding="utf-8")
    rel = str(output.resolve().relative_to(project_root.resolve())).replace("\\", "/")
    keys = [e.key for e in entries]
    return rel, len(entries), keys


def default_converted_bib_path(source: Path, profile: BibProfile) -> Path:
    stem = source.stem
    return source.with_name(f"{stem}-{profile}.bib")
