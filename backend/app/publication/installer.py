from __future__ import annotations

import re
import shutil
import zipfile
from pathlib import Path
from typing import Optional

from app.publication.cache import write_cache
from app.publication.inspector import inspect_template_dir
from app.publication.manager import imported_dir, save_imported_manifest
from app.publication.models import TemplateManifest
from app.publication.validator import validate_imported_dir


def _slug(name: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9_-]+", "-", name.strip()).strip("-").lower()
    return slug or "template-custom"


def install_from_path(source: Path, name: Optional[str] = None) -> TemplateManifest:
    source = Path(source).expanduser().resolve()
    if not source.exists():
        raise FileNotFoundError(str(source))

    staging_parent = imported_dir()
    temp_extract = staging_parent / "_extract_tmp"
    if temp_extract.exists():
        shutil.rmtree(temp_extract)
    temp_extract.mkdir(parents=True)

    try:
        if source.is_file() and source.suffix.lower() == ".zip":
            with zipfile.ZipFile(source, "r") as zf:
                zf.extractall(temp_extract)
            # if single top folder, descend
            kids = [p for p in temp_extract.iterdir() if not p.name.startswith(".")]
            root = kids[0] if len(kids) == 1 and kids[0].is_dir() else temp_extract
        elif source.is_dir():
            root = temp_extract / "copy"
            shutil.copytree(source, root, dirs_exist_ok=True)
        else:
            raise ValueError("Informe um ZIP ou uma pasta de template")

        info = inspect_template_dir(root)
        validation = validate_imported_dir(root)
        template_id = _slug(name or info.document_class or source.stem)
        dest = staging_parent / template_id
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(root, dest)

        manifest = TemplateManifest(
            id=template_id,
            name=name or info.document_class or template_id,
            description=f"Template importado de {source.name}",
            project_types=["custom", "paper", "book", "thesis", "dissertation", "monograph", "report", "beamer"],
            document_class=info.document_class or "article",
            class_options=info.class_options,
            engine=info.suggested_engine if info.suggested_engine in {"pdflatex", "xelatex", "lualatex"} else "pdflatex",  # type: ignore[arg-type]
            bibliography="bibtex" if info.bst_files else "auto",
            source="imported",
            files=info.cls_files + info.sty_files + info.bst_files,
            packages=info.packages,
            validated=validation.ok,
            warnings=validation.warnings + validation.errors,
            path=str(dest),
        )
        save_imported_manifest(manifest, dest)
        write_cache(template_id, {
            "manifest": manifest.model_dump(),
            "inspect": info.model_dump(),
            "validation": validation.model_dump(),
        })
        return manifest
    finally:
        if temp_extract.exists():
            shutil.rmtree(temp_extract, ignore_errors=True)
