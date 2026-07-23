from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


ProjectType = Literal[
    "book",
    "paper",
    "thesis",
    "dissertation",
    "monograph",
    "report",
    "beamer",
    "custom",
]


class TemplateManifest(BaseModel):
    id: str
    name: str
    description: str = ""
    project_types: List[ProjectType] = Field(default_factory=list)
    document_class: str = "article"
    class_options: List[str] = Field(default_factory=list)
    engine: Literal["pdflatex", "xelatex", "lualatex"] = "pdflatex"
    bibliography: Literal["auto", "biber", "bibtex", "none"] = "auto"
    source: Literal["builtin", "imported"] = "builtin"
    version: str = "1.0.0"
    files: List[str] = Field(default_factory=list)
    packages: List[str] = Field(default_factory=list)
    validated: bool = True
    warnings: List[str] = Field(default_factory=list)
    path: Optional[str] = None  # filesystem path when imported


class TemplateInspectResult(BaseModel):
    document_class: Optional[str] = None
    class_options: List[str] = Field(default_factory=list)
    packages: List[str] = Field(default_factory=list)
    cls_files: List[str] = Field(default_factory=list)
    sty_files: List[str] = Field(default_factory=list)
    bst_files: List[str] = Field(default_factory=list)
    tex_files: List[str] = Field(default_factory=list)
    bib_files: List[str] = Field(default_factory=list)
    suggested_engine: str = "pdflatex"
    notes: List[str] = Field(default_factory=list)


class TemplateValidation(BaseModel):
    ok: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class ProjectMetadata(BaseModel):
    projectName: str
    projectType: ProjectType = "book"
    template: str = "book-default"
    documentClass: str = "book"
    compiler: str = "latexmk"
    engine: Literal["pdflatex", "xelatex", "lualatex"] = "lualatex"
    bibliography: Literal["auto", "biber", "bibtex", "none"] = "biber"
    language: str = "pt-BR"
    mainFile: str = "main.tex"
    contentRoot: str = "content"
    referencesFile: str = "references/references.bib"
    extra: Dict[str, Any] = Field(default_factory=dict)


class CreatePublicationProjectRequest(BaseModel):
    name: str
    project_type: ProjectType = "book"
    template_id: str = "book-default"
    parent_path: Optional[str] = None
    use_native_picker: bool = True


class InstallTemplateRequest(BaseModel):
    path: Optional[str] = None
    use_native_picker: bool = False
    name: Optional[str] = None
