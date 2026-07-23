from __future__ import annotations

import re
from pathlib import Path
from typing import List

from app.publication.models import TemplateInspectResult

DOCCLASS_RE = re.compile(
    r"\\documentclass\s*(?:\[(?P<opts>[^\]]*)\])?\s*\{(?P<cls>[^}]+)\}"
)
USEPACKAGE_RE = re.compile(
    r"\\usepackage\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}"
)


def inspect_template_dir(root: Path) -> TemplateInspectResult:
    root = root.resolve()
    cls_files = [str(p.relative_to(root)) for p in root.rglob("*.cls")]
    sty_files = [str(p.relative_to(root)) for p in root.rglob("*.sty")]
    bst_files = [str(p.relative_to(root)) for p in root.rglob("*.bst")]
    tex_files = [str(p.relative_to(root)) for p in root.rglob("*.tex")]
    bib_files = [str(p.relative_to(root)) for p in root.rglob("*.bib")]

    document_class = None
    class_options: List[str] = []
    packages: List[str] = []
    notes: List[str] = []

    # Prefer .cls stem if present
    if cls_files:
        document_class = Path(cls_files[0]).stem
        notes.append(f"Classe detectada via arquivo: {cls_files[0]}")

    for rel in tex_files:
        text = (root / rel).read_text(encoding="utf-8", errors="ignore")
        m = DOCCLASS_RE.search(text)
        if m:
            document_class = m.group("cls").strip()
            opts = (m.group("opts") or "").strip()
            if opts:
                class_options = [o.strip() for o in opts.split(",") if o.strip()]
            notes.append(f"\\documentclass encontrado em {rel}")
            break

    for rel in tex_files[:20]:
        text = (root / rel).read_text(encoding="utf-8", errors="ignore")
        for pm in USEPACKAGE_RE.finditer(text):
            for pkg in pm.group(1).split(","):
                pkg = pkg.strip()
                if pkg and pkg not in packages:
                    packages.append(pkg)

    engine = "pdflatex"
    joined = " ".join(packages + ([document_class] if document_class else [])).lower()
    if any(x in joined for x in ("fontspec", "unicode-math", "polyglossia")):
        engine = "lualatex"
        notes.append("Pacotes Unicode detectados → engine sugerida lualatex/xelatex")

    return TemplateInspectResult(
        document_class=document_class,
        class_options=class_options,
        packages=packages,
        cls_files=cls_files,
        sty_files=sty_files,
        bst_files=bst_files,
        tex_files=tex_files,
        bib_files=bib_files,
        suggested_engine=engine,
        notes=notes,
    )
