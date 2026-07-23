from __future__ import annotations

import re
from pathlib import Path
from typing import List, Optional, Sequence, Tuple

from app.core.config import settings
from app.core.paths import is_ignored_dir, relative_to_project
from app.schemas.ai import ChatMessage, TranslateFileResult, TranslateProjectResponse
from app.services.ai_chat import AiChatError, chat_completion
from app.services.ai_settings import load_ai_settings

TRANSLATE_SYSTEM_PROMPT = """You are a professional academic translator.
Translate Brazilian Portuguese text into clear, natural academic English.

CRITICAL RULES:
1. Return ONLY the translated file content. No preface, no markdown fences, no commentary.
2. Preserve ALL markup exactly: LaTeX commands, environments, math, labels, refs, cites, bib keys, URLs, file paths, YAML/JSON structure.
3. Do NOT translate citation keys, label names, command names, package names, or filenames.
4. Translate human-readable text: titles, captions, abstracts, paragraphs, notes, string values in .bib (title, journal, booktitle, etc.). Keep author surnames as written unless they are clearly Portuguese particles that should stay.
5. If the file uses babel with brazilian/brazil/portuguese, change it to english (e.g. \\usepackage[english]{babel}).
6. Keep the same structure, blank lines, and indentation as much as possible.
7. If a passage is already English, leave it unchanged.
"""

DEFAULT_EXTENSIONS = (".tex", ".md", ".bib", ".txt")
CHUNK_CHARS = 7500


def _normalize_exts(extensions: Optional[Sequence[str]]) -> Tuple[str, ...]:
    if not extensions:
        return DEFAULT_EXTENSIONS
    out: List[str] = []
    for e in extensions:
        e = (e or "").strip().lower()
        if not e:
            continue
        if not e.startswith("."):
            e = "." + e
        if e not in out:
            out.append(e)
    return tuple(out) or DEFAULT_EXTENSIONS


def list_translatable_files(
    project_root: Path,
    extensions: Optional[Sequence[str]] = None,
) -> List[Path]:
    root = project_root.resolve()
    exts = set(_normalize_exts(extensions))
    ignored = settings.ignored_dir_names
    found: List[Path] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        try:
            rel_parts = path.relative_to(root).parts
        except ValueError:
            continue
        if any(is_ignored_dir(part, ignored) for part in rel_parts[:-1]):
            continue
        if any(part.startswith(".") for part in rel_parts[:-1]):
            continue
        if path.suffix.lower() not in exts:
            continue
        if path.stat().st_size > settings.max_file_size_bytes:
            continue
        found.append(path)
    found.sort(key=lambda p: str(p).lower())
    return found


def split_for_translation(text: str, max_chars: int = CHUNK_CHARS) -> List[str]:
    if len(text) <= max_chars:
        return [text]

    # Prefer structural LaTeX / Markdown breaks
    parts = re.split(r"(?=\n\\(?:chapter|section|subsection|subsubsection)\b)", text)
    if len(parts) == 1:
        parts = re.split(r"(?=\n#{1,3}\s)", text)
    if len(parts) == 1:
        parts = re.split(r"\n\n+", text)
        glue = "\n\n"
    else:
        glue = ""

    chunks: List[str] = []
    buf = ""
    for part in parts:
        if not part:
            continue
        candidate = part if not buf else (buf + glue + part if glue else buf + part)
        if len(candidate) <= max_chars:
            buf = candidate
            continue
        if buf:
            chunks.append(buf)
        if len(part) <= max_chars:
            buf = part
        else:
            # hard wrap oversized block
            for i in range(0, len(part), max_chars):
                piece = part[i : i + max_chars]
                if i + max_chars < len(part):
                    chunks.append(piece)
                else:
                    buf = piece
            if not buf and part:
                buf = ""
    if buf:
        chunks.append(buf)
    return chunks or [text]


def _backup_path(root: Path, rel: str) -> Path:
    dest = root / ".latex-local" / "translate-backup" / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    return dest


async def _translate_text(path_label: str, text: str) -> str:
    chunks = split_for_translation(text)
    out_parts: List[str] = []
    total = len(chunks)
    for i, chunk in enumerate(chunks, start=1):
        user = (
            f"Translate the following file content from Portuguese to English.\n"
            f"File: {path_label}\n"
            f"Part {i} of {total}.\n\n"
            f"{chunk}"
        )
        translated, _, _ = await chat_completion(
            [ChatMessage(role="user", content=user)],
            system_prompt_override=TRANSLATE_SYSTEM_PROMPT,
            max_tokens_override=max(4096, min(16000, int(len(chunk) * 1.6) + 512)),
            temperature_override=0.2,
            timeout=180.0,
        )
        out_parts.append(translated.rstrip() + ("\n" if chunk.endswith("\n") else ""))
    return "".join(out_parts).rstrip() + "\n"


async def translate_project(
    project_root: Path,
    *,
    extensions: Optional[Sequence[str]] = None,
    dry_run: bool = False,
    create_backup: bool = True,
) -> TranslateProjectResponse:
    cfg = load_ai_settings()
    if not cfg.api_key.strip():
        raise AiChatError(
            "Cadastre a chave da API nas configurações do Assistente IA.",
            status_code=400,
        )
    if not cfg.enabled:
        raise AiChatError(
            "O assistente de IA está desativado. Ative-o nas configurações.",
            status_code=400,
        )

    root = project_root.resolve()
    files = list_translatable_files(root, extensions)
    results: List[TranslateFileResult] = []

    if dry_run:
        for path in files:
            rel = relative_to_project(root, path)
            try:
                raw = path.read_text(encoding="utf-8", errors="replace")
            except OSError as exc:
                results.append(
                    TranslateFileResult(
                        path=rel,
                        status="error",
                        message=str(exc),
                    )
                )
                continue
            results.append(
                TranslateFileResult(
                    path=rel,
                    status="planned",
                    message="Será traduzido PT → EN",
                    chars_in=len(raw),
                )
            )
        return TranslateProjectResponse(
            files=results,
            message=(
                f"{len(results)} arquivo(s) serão traduzidos para inglês. "
                "Confirme para sobrescrever o conteúdo (com backup opcional)."
            ),
            planned=sum(1 for r in results if r.status == "planned"),
            failed=sum(1 for r in results if r.status == "error"),
        )

    translated = failed = skipped = 0
    for path in files:
        rel = relative_to_project(root, path)
        try:
            raw = path.read_text(encoding="utf-8", errors="replace")
        except OSError as exc:
            failed += 1
            results.append(
                TranslateFileResult(
                    path=rel, status="error", message=f"Falha ao ler: {exc}"
                )
            )
            continue

        if not raw.strip():
            skipped += 1
            results.append(
                TranslateFileResult(
                    path=rel,
                    status="skipped",
                    message="Arquivo vazio",
                    chars_in=0,
                )
            )
            continue

        try:
            if create_backup:
                backup = _backup_path(root, rel)
                backup.write_text(raw, encoding="utf-8")
            new_text = await _translate_text(rel, raw)
            path.write_text(new_text, encoding="utf-8")
            translated += 1
            results.append(
                TranslateFileResult(
                    path=rel,
                    status="ok",
                    message="Traduzido PT → EN",
                    chars_in=len(raw),
                    chars_out=len(new_text),
                )
            )
        except AiChatError as exc:
            failed += 1
            results.append(
                TranslateFileResult(
                    path=rel,
                    status="error",
                    message=str(exc),
                    chars_in=len(raw),
                )
            )
        except OSError as exc:
            failed += 1
            results.append(
                TranslateFileResult(
                    path=rel,
                    status="error",
                    message=f"Falha ao gravar: {exc}",
                    chars_in=len(raw),
                )
            )

    msg = (
        f"Tradução concluída: {translated} ok, {failed} falha(s), {skipped} ignorado(s)."
    )
    if create_backup and translated:
        msg += " Backup em .latex-local/translate-backup/."
    return TranslateProjectResponse(
        files=results,
        message=msg,
        translated=translated,
        failed=failed,
        skipped=skipped,
    )
