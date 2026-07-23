from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
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
    MdToBibRequest,
    MdToBibResponse,
    BibConvertRequest,
    BibConvertResponse,
    MdToTexRequest,
    MdToTexResponse,
    TexToMdRequest,
    TexToMdResponse,
    ContentSearchResponse,
    InsertablesResponse,
    MkdirRequest,
    RenameRequest,
    WriteFileRequest,
)
from app.services import files as file_service
from app.services import insertables as insertables_service
from app.services.md_to_tex import convert_markdown_to_tex, default_output_path
from app.services.md_to_bib import convert_markdown_to_bib, default_bib_output_path
from app.services.bib_profiles import (
    convert_bib_file,
    default_converted_bib_path,
    list_profiles,
    normalize_profile,
)
from app.services.tex_to_md import convert_tex_to_markdown, default_md_output_path

router = APIRouter(prefix="/projects/{project_id}", tags=["files"])

_IMAGE_MEDIA_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
}


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


@router.get("/search-content", response_model=ContentSearchResponse)
def api_search_content(
    q: str = Query(""),
    case_sensitive: bool = Query(False),
    project: Project = Depends(project_or_404),
):
    data = file_service.search_content(
        _root(project), q, case_sensitive=case_sensitive
    )
    return ContentSearchResponse.model_validate(data)


@router.get("/insertables", response_model=InsertablesResponse)
def api_insertables(project: Project = Depends(project_or_404)):
    root = _root(project)
    return InsertablesResponse(
        figures=insertables_service.list_figures(root),
        bib_entries=insertables_service.list_bib_entries(root),
    )


@router.get("/asset")
def api_asset(
    path: str = Query(...),
    project: Project = Depends(project_or_404),
):
    """Serve imagem do projeto para preview na UI (png/jpg/gif/svg/webp)."""
    try:
        file_path = resolve_safe_project_path(_root(project), path)
    except PathSecurityError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    ext = file_path.suffix.lower()
    media = _IMAGE_MEDIA_TYPES.get(ext)
    if not media:
        raise HTTPException(
            status_code=400,
            detail="Preview só para imagens (png, jpg, gif, svg, webp)",
        )
    return FileResponse(
        path=str(file_path),
        media_type=media,
        filename=file_path.name,
        content_disposition_type="inline",
        headers={"Cache-Control": "private, max-age=60"},
    )


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


@router.post("/convert/md-to-bib", response_model=MdToBibResponse)
def api_md_to_bib(
    body: MdToBibRequest,
    project: Project = Depends(project_or_404),
):
    root = _root(project)
    try:
        source = None
        markdown = body.content
        if body.path:
            source = resolve_safe_project_path(root, body.path)
            if not source.is_file():
                raise FileNotFoundError(str(source))
            if markdown is None:
                markdown = source.read_text(encoding="utf-8", errors="replace")
        if markdown is None:
            raise ValueError("Informe path ou content do Markdown")

        if body.output_path:
            output = resolve_safe_project_path(root, body.output_path)
        else:
            output = default_bib_output_path(source, root)
            output.relative_to(root.resolve())

        result = convert_markdown_to_bib(
            root,
            markdown=markdown,
            source=source,
            output=output,
            append=body.append,
            profile=body.profile,
        )
        return MdToBibResponse(
            source_path=result.source_path,
            output_path=result.output_path,
            entries_count=result.entries_count,
            keys=result.keys,
            message=result.message,
            profile=result.profile,  # type: ignore[arg-type]
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (PathSecurityError, ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/bib-profiles")
def api_bib_profiles(project: Project = Depends(project_or_404)):
    return {"profiles": list_profiles()}


@router.post("/convert/bib", response_model=BibConvertResponse)
def api_convert_bib(
    body: BibConvertRequest,
    project: Project = Depends(project_or_404),
):
    root = _root(project)
    try:
        profile = normalize_profile(body.profile)
        source = resolve_safe_project_path(root, body.path)
        if not source.is_file():
            raise FileNotFoundError(str(source))
        if source.suffix.lower() != ".bib":
            raise ValueError("O arquivo de origem precisa ser .bib")
        if body.output_path:
            output = resolve_safe_project_path(root, body.output_path)
        else:
            output = default_converted_bib_path(source, profile)
            output.relative_to(root.resolve())
        if output.resolve() == source.resolve():
            raise ValueError(
                "Escolha outro caminho de saída — não sobrescreva o .bib original."
            )
        rel, count, keys = convert_bib_file(
            root, source=source, output=output, profile=profile
        )
        src_rel = str(source.resolve().relative_to(root.resolve())).replace('\\', '/')
        return BibConvertResponse(
            source_path=src_rel,
            output_path=rel,
            entries_count=count,
            keys=keys,
            message=f"Convertidas {count} entrada(s) para o perfil {profile} em {rel}.",
            profile=profile,  # type: ignore[arg-type]
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (PathSecurityError, ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
