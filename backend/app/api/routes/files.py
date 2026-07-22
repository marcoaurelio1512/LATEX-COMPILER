from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlmodel import Session

from app.api.deps import project_or_404
from app.core.database import get_session
from app.core.paths import PathSecurityError, resolve_safe_project_path
from app.models.db import Project
from app.schemas.common import (
    CreateFileRequest,
    DeleteFileRequest,
    FileContent,
    FileNode,
    MdToTexRequest,
    MdToTexResponse,
    TexToMdRequest,
    TexToMdResponse,
    MkdirRequest,
    RenameRequest,
    WriteFileRequest,
)
from app.services import files as file_service
from app.services.md_to_tex import convert_markdown_to_tex, default_output_path
from app.services.tex_to_md import convert_tex_to_markdown, default_md_output_path

router = APIRouter(prefix="/projects/{project_id}", tags=["files"])


def _root(project: Project) -> Path:
    return Path(project.root_path)


@router.get("/tree", response_model=FileNode)
def api_tree(project: Project = Depends(project_or_404)):
    return file_service.build_tree(_root(project))


@router.get("/files")
def api_search(
    q: str = Query(""),
    project: Project = Depends(project_or_404),
):
    return {"matches": file_service.search_files(_root(project), q)}


@router.get("/file", response_model=FileContent)
def api_read_file(
    path: str = Query(...),
    project: Project = Depends(project_or_404),
):
    try:
        return file_service.read_file(_root(project), path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PathSecurityError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/file", response_model=FileContent)
def api_write_file(
    body: WriteFileRequest,
    project: Project = Depends(project_or_404),
):
    try:
        return file_service.write_file(
            _root(project),
            body.path,
            body.content,
            expected_mtime=body.expected_mtime,
            force=body.force,
        )
    except file_service.FileConflictError as exc:
        raise HTTPException(
            status_code=409,
            detail={
                "message": str(exc),
                "disk_mtime": exc.disk_mtime,
                "disk_content": exc.disk_content,
            },
        ) from exc
    except PathSecurityError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/file", response_model=FileNode)
def api_create_file(
    body: CreateFileRequest,
    project: Project = Depends(project_or_404),
):
    try:
        return file_service.create_entry(
            _root(project),
            body.path,
            content=body.content,
            is_directory=body.is_directory,
        )
    except (PathSecurityError, FileExistsError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/file")
def api_delete_file(
    body: DeleteFileRequest,
    project: Project = Depends(project_or_404),
):
    try:
        file_service.delete_entry(_root(project), body.path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PathSecurityError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"ok": True}


@router.post("/rename", response_model=FileNode)
def api_rename(
    body: RenameRequest,
    project: Project = Depends(project_or_404),
):
    try:
        return file_service.rename_entry(_root(project), body.path, body.new_path)
    except (FileNotFoundError, FileExistsError, PathSecurityError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/mkdir", response_model=FileNode)
def api_mkdir(
    body: MkdirRequest,
    project: Project = Depends(project_or_404),
):
    try:
        return file_service.mkdir(_root(project), body.path)
    except (PathSecurityError, FileExistsError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/duplicate", response_model=FileNode)
def api_duplicate(
    path: str = Query(...),
    project: Project = Depends(project_or_404),
):
    try:
        return file_service.duplicate_entry(_root(project), path)
    except (FileNotFoundError, PathSecurityError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/upload", response_model=FileNode)
async def api_upload(
    path: str = Query(""),
    file: UploadFile = File(...),
    project: Project = Depends(project_or_404),
):
    data = await file.read()
    try:
        return file_service.save_upload(
            _root(project),
            path,
            file.filename or "upload.bin",
            data,
        )
    except PathSecurityError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/convert/md-to-tex", response_model=MdToTexResponse)
def api_md_to_tex(
    body: MdToTexRequest,
    project: Project = Depends(project_or_404),
):
    root = _root(project)
    try:
        source = resolve_safe_project_path(root, body.path)
        if body.output_path:
            output = resolve_safe_project_path(root, body.output_path)
        else:
            output = default_output_path(source)
            # keep output inside project
            output.relative_to(root.resolve())
        result = convert_markdown_to_tex(root, source, output)
        return MdToTexResponse(
            source_path=result.source_path,
            output_path=result.output_path,
            method=result.method,
            message=result.message,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (PathSecurityError, ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@router.post("/convert/tex-to-md", response_model=TexToMdResponse)
def api_tex_to_md(
    body: TexToMdRequest,
    project: Project = Depends(project_or_404),
):
    root = _root(project)
    try:
        source = resolve_safe_project_path(root, body.path)
        if body.output_path:
            output = resolve_safe_project_path(root, body.output_path)
        else:
            output = default_md_output_path(source)
            output.relative_to(root.resolve())
        result = convert_tex_to_markdown(root, source, output)
        return TexToMdResponse(
            source_path=result.source_path,
            output_path=result.output_path,
            method=result.method,
            message=result.message,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (PathSecurityError, ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
