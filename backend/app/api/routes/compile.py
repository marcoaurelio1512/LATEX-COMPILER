from __future__ import annotations

from typing import Optional

from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from app.compiler.service import compilation_service
from app.core import database as db_module
from app.models.db import Project
from app.schemas.common import CompilationJobOut, CompileRequest
from sqlmodel import Session

router = APIRouter(tags=["compilation"])


@router.post("/projects/{project_id}/compile", response_model=CompilationJobOut)
async def api_compile(project_id: str, body: Optional[CompileRequest] = None):
    try:
        return await compilation_service.enqueue(project_id, body or CompileRequest())
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/projects/{project_id}/compile/clean", response_model=CompilationJobOut)
async def api_compile_clean(project_id: str, body: Optional[CompileRequest] = None):
    req = body or CompileRequest()
    req.clean = True
    try:
        return await compilation_service.enqueue(project_id, req, clean=True)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/compilations/{job_id}/cancel")
async def api_cancel(job_id: str):
    ok = await compilation_service.cancel(job_id)
    return {"ok": ok, "job_id": job_id}


@router.get("/compilations/{job_id}", response_model=CompilationJobOut)
def api_get_job(job_id: str):
    job = compilation_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    return job


@router.get("/compilations/{job_id}/logs")
def api_get_logs(job_id: str):
    job = compilation_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    return {
        "job_id": job_id,
        "log": compilation_service.get_cached_log(job_id),
        "diagnostics": compilation_service.get_cached_diagnostics(job_id),
    }


@router.get("/projects/{project_id}/pdf")
def api_pdf(
    project_id: str,
    version: Optional[str] = Query(None),
):
    pdf = compilation_service.latest_pdf(project_id)
    if not pdf or not pdf.exists():
        raise HTTPException(status_code=404, detail="PDF ainda não disponível")

    # Ensure PDF is inside the project
    with Session(db_module.engine) as session:
        project = session.get(Project, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")
        root = Path(project.root_path).resolve()
        try:
            pdf.resolve().relative_to(root)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="PDF fora do projeto") from exc

    headers = {
        "Cache-Control": "no-store",
        "X-PDF-Version": version or str(int(pdf.stat().st_mtime)),
        "Content-Disposition": f'inline; filename="{pdf.name}"',
    }
    return FileResponse(
        path=str(pdf),
        media_type="application/pdf",
        filename=pdf.name,
        content_disposition_type="inline",
        headers=headers,
    )
