from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set

from app.services.bib_profiles import (
    BibEntry as ProfileBibEntry,
    BibProfile,
    format_bibliography,
    normalize_profile,
)


CITE_PATTERNS = [
    re.compile(r"\[@([A-Za-z0-9_:\-]+)(?:[^\]]*)\]"),  # [@key] pandoc
    re.compile(r"\[REF:([A-Za-z0-9_:\-]+)(?:\|[^\]]*)?\]", re.IGNORECASE),
    re.compile(r"\\cite[pt]?\{([^}]+)\}"),
    re.compile(r"\\textcite\{([^}]+)\}"),
    re.compile(r"\\parencite\{([^}]+)\}"),
    re.compile(r"\(@([A-Za-z0-9_:\-]+)\)"),
]

REF_HEADING = re.compile(
    r"^#{1,3}\s+(refer[eê]ncias|bibliografia|references|bibliography)\b",
    re.IGNORECASE,
)

# Silva, Maria (2020). Título do livro. Editora.
LINE_REF = re.compile(
    r"^\s*(?:[-*]|\d+[.)])?\s*"
    r"(?:\[@(?P<key1>[A-Za-z0-9_:\-]+)\]|\[REF:(?P<key2>[A-Za-z0-9_:\-]+)\]|(?P<key3>[A-Za-z0-9_:\-]+)\s*[—–\-:]\s*)?"
    r"(?P<author>.+?)\s*"
    r"\((?P<year>19\d{2}|20\d{2}|n\.?\s*d\.?)\)\.?\s*"
    r"(?P<title>[^.]+)\.?\s*"
    r"(?P<rest>.*)?$",
    re.IGNORECASE,
)

KEY_SAFE = re.compile(r"[^A-Za-z0-9_:\-]+")


@dataclass
class BibEntry:
    key: str
    entry_type: str = "misc"
    fields: Dict[str, str] = field(default_factory=dict)


@dataclass
class MdToBibResult:
    source_path: Optional[str]
    output_path: str
    entries_count: int
    keys: List[str]
    message: str
    profile: str = "biblatex"


def default_bib_output_path(source: Optional[Path], project_root: Path) -> Path:
    if source is not None:
        return source.with_name("referencias.bib")
    return project_root / "referencias.bib"


def convert_markdown_to_bib(
    project_root: Path,
    *,
    markdown: str,
    source: Optional[Path] = None,
    output: Path,
    append: bool = True,
    profile: str = "biblatex",
) -> MdToBibResult:
    markdown = markdown or ""
    if not markdown.strip():
        raise ValueError("Markdown vazio — nada para converter em .bib")

    cited = _extract_citation_keys(markdown)
    parsed = _parse_reference_section(markdown)

    # Merge: parsed entries first; stubs for cited-only keys
    by_key: Dict[str, BibEntry] = {}
    for entry in parsed:
        by_key[entry.key] = entry
    for key in cited:
        if key not in by_key:
            by_key[key] = BibEntry(
                key=key,
                entry_type="misc",
                fields={
                    "title": "{TODO: completar referência}",
                    "note": "{Chave citada no Markdown; preencha author/title/year.}",
                },
            )

    if not by_key:
        raise ValueError(
            "Não encontrei citações nem seção de Referências no Markdown. "
            "Use [@chave], [REF:chave] ou uma seção ## Referências."
        )

    bib_profile: BibProfile = normalize_profile(profile)

    existing = ""
    if append and output.exists():
        existing = output.read_text(encoding="utf-8", errors="replace")

    existing_keys = set(re.findall(r"@\w+\s*\{\s*([^,\s}]+)", existing))
    new_entries = [e for e in by_key.values() if e.key not in existing_keys]
    skipped = len(by_key) - len(new_entries)

    profile_entries = [
        ProfileBibEntry(key=e.key, entry_type=e.entry_type, fields={
            k: (v[1:-1] if isinstance(v, str) and v.startswith("{") and v.endswith("}") else v)
            for k, v in e.fields.items()
        })
        for e in new_entries
    ]

    if existing.strip():
        if profile_entries:
            # append only new blocks in chosen profile (no full header again)
            from app.services.bib_profiles import format_entry
            blocks = [format_entry(e, bib_profile) for e in sorted(profile_entries, key=lambda x: x.key.lower())]
            body = existing.rstrip() + "\n\n" + "\n\n".join(blocks) + "\n"
        else:
            body = existing if existing.endswith("\n") else existing + "\n"
    else:
        body = format_bibliography(profile_entries, bib_profile)

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(body, encoding="utf-8")

    rel = str(output.resolve().relative_to(project_root.resolve())).replace("\\", "/")
    src_rel = None
    if source is not None:
        src_rel = str(source.resolve().relative_to(project_root.resolve())).replace("\\", "/")

    msg_parts = [f"Geradas {len(new_entries)} entrada(s) em {rel} (perfil {bib_profile})."]
    if skipped:
        msg_parts.append(f"{skipped} chave(s) já existiam e foram mantidas.")
    if any("TODO" in (e.fields.get("title") or "") for e in new_entries):
        msg_parts.append("Algumas entradas são esboços — complete os campos.")
    return MdToBibResult(
        source_path=src_rel,
        output_path=rel,
        entries_count=len(new_entries),
        keys=[e.key for e in new_entries],
        message=" ".join(msg_parts),
        profile=bib_profile,
    )


def _extract_citation_keys(markdown: str) -> List[str]:
    keys: List[str] = []
    seen: Set[str] = set()
    for pattern in CITE_PATTERNS:
        for match in pattern.finditer(markdown):
            raw = match.group(1)
            for part in re.split(r"\s*,\s*", raw):
                key = _normalize_key(part.strip().lstrip("@"))
                if key and key not in seen:
                    seen.add(key)
                    keys.append(key)
    return keys


def _parse_reference_section(markdown: str) -> List[BibEntry]:
    lines = markdown.replace("\r\n", "\n").split("\n")
    in_refs = False
    section_lines: List[str] = []
    for line in lines:
        if REF_HEADING.match(line.strip()):
            in_refs = True
            continue
        if in_refs:
            if re.match(r"^#{1,3}\s+\S", line.strip()) and not REF_HEADING.match(line.strip()):
                break
            section_lines.append(line)

    # Also scan whole doc for well-formed bibliographic lines
    candidates = section_lines if section_lines else lines
    entries: List[BibEntry] = []
    seen: Set[str] = set()
    for raw in candidates:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        entry = _parse_ref_line(line)
        if entry and entry.key not in seen:
            seen.add(entry.key)
            entries.append(entry)
    return entries


def _parse_ref_line(line: str) -> Optional[BibEntry]:
    m = LINE_REF.match(line)
    if not m:
        return None
    author = (m.group("author") or "").strip(" -—–*")
    year = (m.group("year") or "").strip()
    title = (m.group("title") or "").strip().strip("*_")
    rest = (m.group("rest") or "").strip().strip(".")
    key = m.group("key1") or m.group("key2") or m.group("key3")
    if not key:
        key = _guess_key(author, year)
    key = _normalize_key(key)
    if not key or not author or not title:
        return None

    fields = {
        "author": _brace(_to_bib_author(author)),
        "title": _brace(title),
        "year": _brace(year.replace(" ", "")),
    }
    if rest:
        # heurística: se parece URL
        if rest.lower().startswith("http"):
            fields["url"] = _brace(rest.split()[0])
        else:
            fields["publisher"] = _brace(rest)
    fields["note"] = _brace("Importado do Markdown; revise se necessário.")
    entry_type = "book" if rest and "http" not in rest.lower() else "misc"
    if "http" in rest.lower() or "doi" in rest.lower():
        entry_type = "misc"
    return BibEntry(key=key, entry_type=entry_type, fields=fields)


def _guess_key(author: str, year: str) -> str:
    last = re.split(r"[,]| e | and | & ", author, maxsplit=1)[0]
    last = last.strip().split()[-1] if last.strip() else "ref"
    last = KEY_SAFE.sub("", last)
    y = re.sub(r"\D", "", year) or "nd"
    return f"{last.lower()}{y}"


def _normalize_key(key: str) -> str:
    key = (key or "").strip().lstrip("@")
    key = KEY_SAFE.sub("", key)
    return key


def _to_bib_author(author: str) -> str:
    # "Maria Silva" -> "Silva, Maria" when simple two tokens
    author = author.replace(" e ", " and ").replace(" & ", " and ")
    parts = [p.strip() for p in author.split(" and ")]
    out = []
    for part in parts:
        if "," in part:
            out.append(part)
            continue
        tokens = part.split()
        if len(tokens) >= 2:
            out.append(f"{tokens[-1]}, {' '.join(tokens[:-1])}")
        else:
            out.append(part)
    return " and ".join(out)


def _brace(value: str) -> str:
    value = value.replace("{", "").replace("}", "").strip()
    return "{" + value + "}"


def _format_entry(entry: BibEntry) -> str:
    lines = [f"@{entry.entry_type}{{{entry.key},"]
    for k, v in entry.fields.items():
        lines.append(f"  {k} = {v},")
    lines.append("}")
    return "\n".join(lines)
