from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.core.database import get_session
from app.schemas.common import (
    CreateProjectRequest,
    OpenProjectRequest,
    ProjectConfig,
    ProjectDetail,
    ProjectSummary,
)
from app.services.folder_picker import FolderPickerError, pick_folder_native, pick_tex_file_native
from app.services.projects import (
    create_project,
    delete_project,
    get_project_detail,
    list_projects,
    open_project,
    update_project_from_config,
)
from app.services.watcher import watcher_service
from pathlib import Path

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectSummary])
def api_list_projects(session: Session = Depends(get_session)):
    return list_projects(session)


@router.post("/open", response_model=ProjectDetail)
def api_open_project(body: OpenProjectRequest, session: Session = Depends(get_session)):
    try:
        detail = open_project(
            session,
            path=body.path,
            use_native_picker=body.use_native_picker,
            pick_tex_file=body.pick_tex_file,
        )
    except FolderPickerError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    watcher_service.watch_project(detail.id, Path(detail.root_path))
    return detail


@router.post("/create", response_model=ProjectDetail)
def api_create_project(body: CreateProjectRequest, session: Session = Depends(get_session)):
    try:
        detail = create_project(
            session,
            name=body.name,
            parent_path=body.parent_path,
            template=body.template,
            use_native_picker=body.use_native_picker,
        )
    except (FolderPickerError, ValueError, FileExistsError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    watcher_service.watch_project(detail.id, Path(detail.root_path))
    return detail



@router.post("/pick-folder")
def api_pick_folder():
    """Abre o seletor nativo e devolve só o caminho (sem abrir o projeto ainda)."""
    try:
        selected = pick_folder_native("Selecione a pasta do projeto LaTeX")
    except FolderPickerError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not selected:
        raise HTTPException(status_code=400, detail="Seleção de pasta cancelada")
    return {"path": selected.rstrip("/")}


@router.post("/pick-tex")
def api_pick_tex():
    """Abre o seletor nativo de arquivo .tex."""
    try:
        selected = pick_tex_file_native("Selecione um arquivo .tex")
    except FolderPickerError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not selected:
        raise HTTPException(status_code=400, detail="Seleção de arquivo cancelada")
    return {"path": selected}


@router.get("/{project_id}", response_model=ProjectDetail)
def api_get_project(project_id: str, session: Session = Depends(get_session)):
    try:
        detail = get_project_detail(session, project_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    watcher_service.watch_project(detail.id, Path(detail.root_path))
    return detail


@router.delete("/{project_id}")
def api_delete_project(
    project_id: str,
    delete_files: bool = False,
    session: Session = Depends(get_session),
):
    try:
        delete_project(session, project_id, delete_files=delete_files)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    watcher_service.unwatch_project(project_id)
    return {"ok": True}


@router.get("/{project_id}/config", response_model=ProjectConfig)
def api_get_config(project_id: str, session: Session = Depends(get_session)):
    detail = get_project_detail(session, project_id)
    return detail.config


@router.put("/{project_id}/config", response_model=ProjectDetail)
def api_put_config(
    project_id: str,
    body: ProjectConfig,
    session: Session = Depends(get_session),
):
    try:
        return update_project_from_config(session, project_id, body)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
