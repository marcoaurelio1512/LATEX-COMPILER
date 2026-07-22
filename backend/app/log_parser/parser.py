from __future__ import annotations

import re
from typing import List, Optional, Tuple

from app.schemas.common import Diagnostic
from app.services.assistant import SUGGESTIONS

# file:line: error style from -file-line-error
FILE_LINE_ERROR = re.compile(
    r"^(?P<file>.+?):(?P<line>\d+):\s*(?:(?P<prefix>LaTeX Error|Package\s+\S+\s+Error|!)?\s*)?(?P<msg>.+)$"
)
BANG_ERROR = re.compile(r"^!\s*(?P<msg>.+)$")
LINE_ONLY = re.compile(r"^l\.(?P<line>\d+)\s*(?P<ctx>.*)$")
WARNING = re.compile(
    r"^(?:LaTeX|Package\s+(?P<pkg>\S+)|Class\s+\S+)\s+Warning:\s*(?P<msg>.+)$"
)
OVERFULL = re.compile(r"^(?P<kind>Overfull|Underfull)\s*\.?\\?hbox\b(?P<msg>.*)$", re.IGNORECASE)
UNDEFINED_CITE = re.compile(
    r"Citation\s+[`'](?P<key>[^`']+)[`']\s+on page\s+\d+\s+undefined",
    re.IGNORECASE,
)
UNDEFINED_REF = re.compile(
    r"Reference\s+[`'](?P<key>[^`']+)[`']\s+on page\s+\d+\s+undefined",
    re.IGNORECASE,
)
THERE_WERE_UNDEF = re.compile(r"There were undefined references", re.IGNORECASE)
FILE_NOT_FOUND = re.compile(
    r"(?:File|I can't find file)\s*[`']?(?P<file>[^`'\s]+)`?\s*(?:not found|!)",
    re.IGNORECASE,
)
MISSING_PACKAGE = re.compile(
    r"File [`'](?P<pkg>[^`']+\.(?:sty|cls))[`'] not found",
    re.IGNORECASE,
)
FONT_MISSING = re.compile(r"Font .* not found|fontspec error", re.IGNORECASE)
BIBER_ERROR = re.compile(r"^ERROR\s+-\s*(?P<msg>.+)$", re.IGNORECASE)
BIBTEX_ERROR = re.compile(r"^I found no.*|^A style file.*error", re.IGNORECASE)
EMERGENCY = re.compile(r"Emergency stop", re.IGNORECASE)
RUNAWAY = re.compile(r"Runaway argument", re.IGNORECASE)
MISSING_BRACE = re.compile(r"Missing \{\} inserted|Missing \} inserted", re.IGNORECASE)
EXTRA_BRACE = re.compile(r"Extra \}, or forgotten", re.IGNORECASE)
ENV_UNDEF = re.compile(r"Environment\s+(?P<env>\S+)\s+undefined", re.IGNORECASE)
UNDEF_CS = re.compile(r"Undefined control sequence", re.IGNORECASE)


def _code_for_message(msg: str) -> str:
    if UNDEF_CS.search(msg):
        return "UNDEFINED_CONTROL_SEQUENCE"
    if FILE_NOT_FOUND.search(msg) or MISSING_PACKAGE.search(msg):
        return "FILE_NOT_FOUND"
    if "Package" in msg and "Error" in msg:
        return "PACKAGE_ERROR"
    if EMERGENCY.search(msg):
        return "EMERGENCY_STOP"
    if RUNAWAY.search(msg):
        return "RUNAWAY_ARGUMENT"
    if MISSING_BRACE.search(msg):
        return "MISSING_BRACE"
    if EXTRA_BRACE.search(msg):
        return "EXTRA_BRACE"
    if ENV_UNDEF.search(msg):
        return "ENVIRONMENT_UNDEFINED"
    if UNDEFINED_CITE.search(msg):
        return "CITATION_UNDEFINED"
    if UNDEFINED_REF.search(msg) or THERE_WERE_UNDEF.search(msg):
        return "REFERENCE_UNDEFINED"
    if FONT_MISSING.search(msg):
        return "FONT_MISSING"
    if BIBER_ERROR.search(msg):
        return "BIBER_ERROR"
    if BIBTEX_ERROR.search(msg):
        return "BIBTEX_ERROR"
    if msg.lower().startswith("latex error"):
        return "LATEX_ERROR"
    return "COMPILE_ERROR"


def _suggestion(code: str) -> Optional[str]:
    return SUGGESTIONS.get(code)


def parse_latex_log(log_text: str) -> List[Diagnostic]:
    diagnostics: List[Diagnostic] = []
    lines = log_text.splitlines()
    i = 0
    pending_file: Optional[str] = None
    pending_line: Optional[int] = None
    pending_msg: Optional[str] = None
    pending_raw: Optional[str] = None

    def flush(context: Optional[str] = None) -> None:
        nonlocal pending_file, pending_line, pending_msg, pending_raw
        if not pending_msg:
            return
        code = _code_for_message(pending_msg)
        diagnostics.append(
            Diagnostic(
                severity="error",
                code=code,
                file=_normalize_file(pending_file),
                line=pending_line,
                column=None,
                message=pending_msg.strip(),
                raw_message=(pending_raw or pending_msg).strip(),
                context=context,
                suggestion=_suggestion(code),
            )
        )
        pending_file = pending_line = pending_msg = pending_raw = None

    while i < len(lines):
        line = lines[i]
        stripped = line.rstrip()

        # Ruído do latexmk / flags TeX — não são erros do documento
        if (
            stripped.startswith("Running '")
            or stripped.startswith("Latexmk:")
            or "-file-line-error" in stripped and stripped.startswith("Running")
        ):
            i += 1
            continue

        m = FILE_LINE_ERROR.match(stripped)
        if m and (":" in stripped) and m.group("line"):
            # avoid matching Windows drive false positives lightly
            file_part = m.group("file")
            if len(file_part) > 1 or not file_part.endswith(":"):
                flush()
                pending_file = file_part
                pending_line = int(m.group("line"))
                pending_msg = m.group("msg")
                pending_raw = stripped
                # look ahead for context
                ctx = None
                if i + 1 < len(lines):
                    lm = LINE_ONLY.match(lines[i + 1].strip())
                    if lm:
                        ctx = lm.group("ctx")
                        pending_line = int(lm.group("line")) or pending_line
                flush(ctx)
                i += 1
                continue

        if stripped.startswith("!"):
            flush()
            bm = BANG_ERROR.match(stripped)
            pending_msg = bm.group("msg") if bm else stripped.lstrip("! ").strip()
            pending_raw = stripped
            # next lines may have l.N
            if i + 1 < len(lines):
                lm = LINE_ONLY.match(lines[i + 1].strip())
                if lm:
                    pending_line = int(lm.group("line"))
                    flush(lm.group("ctx"))
                    i += 2
                    continue
            flush()
            i += 1
            continue

        wm = WARNING.match(stripped)
        if wm:
            msg = wm.group("msg")
            code = "LATEX_WARNING"
            if UNDEFINED_CITE.search(msg):
                code = "CITATION_UNDEFINED"
            elif UNDEFINED_REF.search(msg) or THERE_WERE_UNDEF.search(msg):
                code = "REFERENCE_UNDEFINED"
            diagnostics.append(
                Diagnostic(
                    severity="warning",
                    code=code,
                    file=None,
                    line=None,
                    message=msg.strip(),
                    raw_message=stripped,
                    suggestion=_suggestion(code),
                )
            )
            i += 1
            continue

        om = OVERFULL.match(stripped)
        if om:
            diagnostics.append(
                Diagnostic(
                    severity="warning",
                    code="OVERFULL_HBOX" if om.group("kind") == "Overfull" else "UNDERFULL_HBOX",
                    file=None,
                    line=None,
                    message=stripped,
                    raw_message=stripped,
                    suggestion="Ajuste quebras de linha, larguras ou use \\sloppy se apropriado.",
                )
            )
            i += 1
            continue

        if BIBER_ERROR.search(stripped) and "ERROR" in stripped.upper():
            diagnostics.append(
                Diagnostic(
                    severity="error",
                    code="BIBER_ERROR",
                    file=None,
                    line=None,
                    message=stripped,
                    raw_message=stripped,
                    suggestion=_suggestion("BIBER_ERROR")
                    or "Verifique o arquivo .bib e a configuração do Biber.",
                )
            )

        if THERE_WERE_UNDEF.search(stripped):
            diagnostics.append(
                Diagnostic(
                    severity="warning",
                    code="REFERENCE_UNDEFINED",
                    file=None,
                    line=None,
                    message="There were undefined references",
                    raw_message=stripped,
                    suggestion=_suggestion("REFERENCE_UNDEFINED"),
                )
            )

        i += 1

    flush()
    return _dedupe(diagnostics)


def _normalize_file(path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    p = path.replace("\\", "/")
    # strip ./
    if p.startswith("./"):
        p = p[2:]
    return p


def _dedupe(items: List[Diagnostic]) -> List[Diagnostic]:
    seen = set()
    out: List[Diagnostic] = []
    for d in items:
        key = (d.severity, d.code, d.file, d.line, d.message)
        if key in seen:
            continue
        seen.add(key)
        out.append(d)
    return out


def parse_with_meta(
    log_text: str,
    *,
    status: Optional[str] = None,
) -> Tuple[List[Diagnostic], int, int]:
    diagnostics = parse_latex_log(log_text)
    if status == "timeout":
        diagnostics.append(
            Diagnostic(
                severity="error",
                code="TIMEOUT",
                file=None,
                line=None,
                message="Tempo limite de compilação excedido",
                raw_message="timeout",
                suggestion=_suggestion("TIMEOUT"),
            )
        )
    elif status == "cancelled":
        diagnostics.append(
            Diagnostic(
                severity="info",
                code="CANCELLED",
                file=None,
                line=None,
                message="Compilação cancelada",
                raw_message="cancelled",
                suggestion=_suggestion("CANCELLED"),
            )
        )
    errors = sum(1 for d in diagnostics if d.severity == "error")
    warnings = sum(1 for d in diagnostics if d.severity == "warning")
    return diagnostics, errors, warnings
