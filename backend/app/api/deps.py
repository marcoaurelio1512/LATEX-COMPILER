from __future__ import annotations

from pathlib import Path

from fastapi import Depends, HTTPException
from sqlmodel import Session

from app.core.database import get_session
from app.models.db import Project
from app.services.projects import get_project


def project_or_404(
    project_id: str,
    session: Session = Depends(get_session),
) -> Project:
    try:
        return get_project(session, project_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


def project_root(project: Project = Depends(project_or_404)) -> Path:
    root = Path(project.root_path)
    if not root.exists():
        raise HTTPException(status_code=404, detail="Pasta do projeto não existe")
    return root
