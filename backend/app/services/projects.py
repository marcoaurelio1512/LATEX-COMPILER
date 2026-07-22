from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from sqlmodel import Session, select

from app.core.config import settings
from app.models.db import Project, utcnow
from app.schemas.common import ProjectConfig, ProjectDetail, ProjectSummary
from app.services.folder_picker import (
    FolderPickerError,
    pick_folder_native,
    pick_tex_file_native,
    resolve_open_target,
    validate_project_root,
)
from app.services.main_detection import detect_main
from app.services.project_config import load_project_config, save_project_config


ARTICLE_TEMPLATE = r"""\documentclass[11pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[brazilian]{babel}
\usepackage{hyperref}

\title{Artigo de exemplo}
\author{LaTeX Studio Local}
\date{\today}

\begin{document}
\maketitle

\section{Introdução}
Este é um artigo de exemplo gerado localmente.

\section{Conclusão}
Compilação bem-sucedida.

\end{document}
"""

BOOK_TEMPLATE = r"""\documentclass[11pt,a4paper]{book}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[brazilian]{babel}

\title{Livro de exemplo}
\author{LaTeX Studio Local}
\date{\today}

\begin{document}
\frontmatter
\maketitle
\tableofcontents

\mainmatter
\chapter{Introdução}
Conteúdo do capítulo.

\chapter{Conclusão}
Fim do livro.

\end{document}
"""


def _to_summary(project: Project) -> ProjectSummary:
    return ProjectSummary(
        id=project.id,
        name=project.name,
        root_path=project.root_path,
        main_file=project.main_file,
        engine=project.engine,  # type: ignore[arg-type]
        compiler_mode=project.compiler_mode,  # type: ignore[arg-type]
        auto_compile=project.auto_compile,
        last_opened_at=project.last_opened_at,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


def _to_detail(
    project: Project,
    root: Path,
    initial_file: Optional[str] = None,
) -> ProjectDetail:
    config = load_project_config(root)
    main, candidates = detect_main(root, config.main_file or project.main_file)
    if main and main != config.main_file:
        config.main_file = main
        save_project_config(root, config)
    return ProjectDetail(
        **_to_summary(project).model_dump(),
        config=config,
        main_candidates=candidates,
        initial_file=initial_file,
    )


def list_projects(session: Session) -> List[ProjectSummary]:
    rows = session.exec(select(Project).order_by(Project.last_opened_at.desc())).all()
    return [_to_summary(p) for p in rows]


def get_project(session: Session, project_id: str) -> Project:
    project = session.get(Project, project_id)
    if not project:
        raise LookupError("Projeto não encontrado")
    return project


def get_project_detail(session: Session, project_id: str) -> ProjectDetail:
    project = get_project(session, project_id)
    root = Path(project.root_path)
    if not root.exists():
        raise FileNotFoundError("Pasta do projeto não existe mais")
    project.last_opened_at = utcnow()
    project.updated_at = utcnow()
    session.add(project)
    session.commit()
    session.refresh(project)
    return _to_detail(project, root)


def _upsert_project(session: Session, root: Path, name: Optional[str] = None) -> Project:
    existing = session.exec(
        select(Project).where(Project.root_path == str(root))
    ).first()
    config = load_project_config(root)
    main, _ = detect_main(root, config.main_file)
    if main:
        config.main_file = main
        save_project_config(root, config)

    if existing:
        existing.name = name or existing.name or root.name
        existing.main_file = config.main_file
        existing.engine = config.engine
        existing.compiler_mode = config.compiler_mode
        existing.auto_compile = config.auto_compile
        existing.last_opened_at = utcnow()
        existing.updated_at = utcnow()
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    project = Project(
        name=name or root.name,
        root_path=str(root),
        main_file=config.main_file,
        engine=config.engine,
        compiler_mode=config.compiler_mode,
        auto_compile=config.auto_compile,
    )
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


def open_project(
    session: Session,
    path: Optional[str] = None,
    use_native_picker: bool = False,
    pick_tex_file: bool = False,
) -> ProjectDetail:
    if pick_tex_file:
        selected = pick_tex_file_native()
        if not selected:
            raise FolderPickerError("Seleção de arquivo cancelada")
        path = selected
    elif use_native_picker:
        selected = pick_folder_native()
        if not selected:
            raise FolderPickerError("Seleção de pasta cancelada")
        path = selected
    if not path:
        raise FolderPickerError(
            "Informe o caminho da pasta/arquivo .tex ou use o seletor nativo"
        )
    target = resolve_open_target(path)
    project = _upsert_project(session, target.project_root)
    # Se abriu um .tex, preferir como main se tiver \documentclass
    if target.initial_file and target.initial_file.endswith(".tex"):
        try:
            content = (target.project_root / target.initial_file).read_text(
                encoding="utf-8", errors="ignore"
            )
            if "\documentclass" in content:
                from app.services.project_config import load_project_config, save_project_config
                cfg = load_project_config(target.project_root)
                cfg.main_file = target.initial_file
                save_project_config(target.project_root, cfg)
                project.main_file = target.initial_file
                session.add(project)
                session.commit()
                session.refresh(project)
        except OSError:
            pass
    return _to_detail(project, target.project_root, initial_file=target.initial_file)


def create_project(
    session: Session,
    name: str,
    parent_path: Optional[str] = None,
    template: str = "article",
    use_native_picker: bool = False,
) -> ProjectDetail:
    if use_native_picker or not parent_path:
        selected = pick_folder_native("Selecione a pasta pai do novo projeto")
        if not selected:
            raise FolderPickerError("Seleção de pasta cancelada")
        parent_path = selected
    parent = validate_project_root(parent_path)
    safe_name = "".join(c for c in name.strip() if c.isalnum() or c in " -_").strip()
    if not safe_name:
        raise ValueError("Nome de projeto inválido")
    root = parent / safe_name
    if root.exists():
        raise FileExistsError(f"Já existe: {root}")
    root.mkdir(parents=True, exist_ok=False)

    if template == "article":
        (root / "main.tex").write_text(ARTICLE_TEMPLATE, encoding="utf-8")
    elif template == "book":
        (root / "main.tex").write_text(BOOK_TEMPLATE, encoding="utf-8")
        (root / "capitulos").mkdir()
    else:
        (root / "main.tex").write_text(
            "\\documentclass{article}\n\\begin{document}\nOlá\\end{document}\n",
            encoding="utf-8",
        )

    config = ProjectConfig(
        main_file="main.tex",
        engine=settings.default_engine,  # type: ignore[arg-type]
        compiler_mode=settings.default_compiler_mode,  # type: ignore[arg-type]
        auto_compile=settings.default_auto_compile,
    )
    save_project_config(root, config)
    project = _upsert_project(session, root, name=safe_name)
    return _to_detail(project, root)


def delete_project(session: Session, project_id: str, delete_files: bool = False) -> None:
    project = get_project(session, project_id)
    root = Path(project.root_path)
    session.delete(project)
    session.commit()
    if delete_files and root.exists():
        shutil.rmtree(root)


def update_project_from_config(session: Session, project_id: str, config: ProjectConfig) -> ProjectDetail:
    project = get_project(session, project_id)
    root = Path(project.root_path)
    save_project_config(root, config)
    project.main_file = config.main_file
    project.engine = config.engine
    project.compiler_mode = config.compiler_mode
    project.auto_compile = config.auto_compile
    project.updated_at = utcnow()
    session.add(project)
    session.commit()
    session.refresh(project)
    return _to_detail(project, root)
