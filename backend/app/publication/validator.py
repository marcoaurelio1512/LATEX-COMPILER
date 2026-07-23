from __future__ import annotations

from pathlib import Path

from app.publication.inspector import inspect_template_dir
from app.publication.models import TemplateManifest, TemplateValidation


def validate_imported_dir(root: Path) -> TemplateValidation:
    root = Path(root)
    errors = []
    warnings = []
    if not root.exists() or not root.is_dir():
        return TemplateValidation(ok=False, errors=["Pasta de template inexistente"])

    info = inspect_template_dir(root)
    if not info.cls_files and not info.document_class:
        errors.append("Nenhuma classe (.cls) ou \\documentclass encontrada")
    if not info.tex_files:
        warnings.append("Nenhum .tex de exemplo encontrado no template")
    if not info.bst_files and not any("biblatex" in p for p in info.packages):
        warnings.append("Nenhum .bst nem biblatex detectado — bibliografia pode falhar")

    return TemplateValidation(ok=not errors, errors=errors, warnings=warnings)


def validate_manifest(manifest: TemplateManifest) -> TemplateValidation:
    errors = []
    warnings = list(manifest.warnings)
    if not manifest.id:
        errors.append("Template sem id")
    if not manifest.document_class:
        errors.append("Template sem document_class")
    if manifest.source == "imported" and not manifest.path:
        warnings.append("Template importado sem path no disco")
    return TemplateValidation(ok=not errors, errors=errors, warnings=warnings)
