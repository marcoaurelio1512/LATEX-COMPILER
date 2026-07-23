from __future__ import annotations

from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from app.api.deps import project_or_404
from app.core.database import get_session
from app.models.db import Project
from app.publication.generator import generate_publication_project, load_metadata, save_metadata, switch_project_template
from app.publication.installer import install_from_path
from app.publication.inspector import inspect_template_dir
from app.publication.manager import get_template, list_templates, remove_imported_template
from app.publication.models import (
    CreatePublicationProjectRequest,
    InstallTemplateRequest,
    ProjectMetadata,
    ProjectType,
    TemplateInspectResult,
    TemplateManifest,
    TemplateValidation,
)
from app.publication.validator import validate_imported_dir, validate_manifest
from app.services.folder_picker import FolderPickerError, pick_folder_native
from app.services.projects import _upsert_project
from app.services.watcher import watcher_service
from app.schemas.common import ProjectDetail
from app.services.projects import _to_detail

router = APIRouter(tags=["templates"])


@router.get("/templates", response_model=List[TemplateManifest])
def api_list_templates(project_type: Optional[ProjectType] = None):
    return list_templates(project_type)


@router.get("/templates/{template_id}", response_model=TemplateManifest)
def api_get_template(template_id: str):
    try:
        return get_template(template_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/templates/install", response_model=TemplateManifest)
def api_install_template(body: InstallTemplateRequest):
    try:
        path = body.path
        if body.use_native_picker or not path:
            selected = pick_folder_native("Selecione a pasta do template (ou pasta descompactada do ZIP)")
            if not selected:
                raise FolderPickerError("Seleção cancelada")
            path = selected
        return install_from_path(Path(path), name=body.name)
    except FolderPickerError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/templates/inspect", response_model=TemplateInspectResult)
def api_inspect_template(body: InstallTemplateRequest):
    try:
        path = body.path
        if body.use_native_picker or not path:
            selected = pick_folder_native("Selecione pasta/ZIP descompactado para inspecionar")
            if not selected:
                raise FolderPickerError("Seleção cancelada")
            path = selected
        root = Path(path)
        if not root.exists():
            raise FileNotFoundError(path)
        return inspect_template_dir(root)
    except FolderPickerError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/templates/{template_id}/validate", response_model=TemplateValidation)
def api_validate_template(template_id: str):
    try:
        manifest = get_template(template_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if manifest.path:
        return validate_imported_dir(Path(manifest.path))
    return validate_manifest(manifest)


@router.delete("/templates/{template_id}")
def api_delete_template(template_id: str):
    try:
        manifest = get_template(template_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if manifest.source != "imported":
        raise HTTPException(status_code=400, detail="Só é possível remover templates importados")
    remove_imported_template(template_id)
    return {"ok": True}


@router.post("/projects/create-publication", response_model=ProjectDetail)
def api_create_publication(body: CreatePublicationProjectRequest, session: Session = Depends(get_session)):
    from app.services.folder_picker import validate_project_root
    try:
        parent_path = body.parent_path
        if body.use_native_picker or not parent_path:
            selected = pick_folder_native("Selecione a pasta pai do novo projeto")
            if not selected:
                raise FolderPickerError(
                    "Seleção de pasta cancelada. Escolha a pasta pai no Finder (pode estar atrás do navegador) ou informe o caminho da pasta."
                )
            parent_path = selected
        parent = validate_project_root(parent_path)
        safe_name = "".join(c for c in body.name.strip() if c.isalnum() or c in " -_").strip()
        if not safe_name:
            raise ValueError("Nome de projeto inválido")
        root = parent / safe_name
        if root.exists():
            raise FileExistsError(f"Já existe: {root}")
        generate_publication_project(
            root,
            name=safe_name,
            project_type=body.project_type,
            template_id=body.template_id,
        )
        project = _upsert_project(session, root, name=safe_name)
        detail = _to_detail(project, root)
        watcher_service.watch_project(detail.id, root)
        return detail
    except (FolderPickerError, ValueError, FileExistsError, LookupError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/projects/{project_id}/metadata", response_model=ProjectMetadata)
def api_get_metadata(project: Project = Depends(project_or_404)):
    meta = load_metadata(Path(project.root_path))
    if not meta:
        raise HTTPException(status_code=404, detail="Projeto sem metadata.json")
    return meta


@router.put("/projects/{project_id}/metadata", response_model=ProjectMetadata)
def api_put_metadata(body: ProjectMetadata, project: Project = Depends(project_or_404)):
    save_metadata(Path(project.root_path), body)
    return body


@router.post("/projects/{project_id}/switch-template", response_model=ProjectMetadata)
def api_switch_template(project: Project = Depends(project_or_404), template_id: str = Query(...)):
    try:
        return switch_project_template(Path(project.root_path), template_id)
    except (FileNotFoundError, LookupError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
