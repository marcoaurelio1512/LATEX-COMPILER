from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.deps import project_or_404
from app.core import database as db_module
from app.core.paths import resolve_safe_project_path
from app.models.db import Project
from app.schemas.ai import (
    AiChatRequest,
    AiChatResponse,
    AiKeyUpdate,
    AiSaveMarkdownRequest,
    AiSaveMarkdownResponse,
    AiSettingsPublic,
    AiSettingsUpdate,
    TranslateProjectRequest,
    TranslateProjectResponse,
)
from app.services.ai_chat import AiChatError, chat_completion
from app.services.ai_translate import translate_project
from app.services.ai_settings import (
    DEFAULT_SYSTEM_PROMPT,
    load_ai_settings,
    mask_key,
    update_fields,
)
from app.services.md_to_tex import convert_markdown_to_tex, default_output_path
from app.services.project_config import load_project_config, save_project_config

router = APIRouter(tags=["ai"])


def _public() -> AiSettingsPublic:
    data = load_ai_settings()
    return AiSettingsPublic(
        enabled=data.enabled and bool(data.api_key.strip()),
        base_url=data.base_url,
        model=data.model,
        has_api_key=bool(data.api_key.strip()),
        api_key_hint=mask_key(data.api_key),
        system_prompt=data.system_prompt or DEFAULT_SYSTEM_PROMPT,
        temperature=data.temperature,
        max_tokens=data.max_tokens,
    )


@router.get("/ai/settings", response_model=AiSettingsPublic)
def api_get_ai_settings():
    return _public()


@router.put("/ai/settings", response_model=AiSettingsPublic)
def api_put_ai_settings(body: AiSettingsUpdate):
    update_fields(
        base_url=body.base_url,
        model=body.model,
        system_prompt=body.system_prompt,
        temperature=body.temperature,
        max_tokens=body.max_tokens,
        enabled=body.enabled,
    )
    return _public()


@router.put("/ai/settings/key", response_model=AiSettingsPublic)
def api_put_ai_key(body: AiKeyUpdate):
    key = body.api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="Informe a chave da API.")
    update_fields(api_key=key, enabled=True)
    return _public()


@router.delete("/ai/settings/key", response_model=AiSettingsPublic)
def api_delete_ai_key():
    update_fields(clear_key=True)
    return _public()


@router.post("/ai/chat", response_model=AiChatResponse)
async def api_ai_chat(body: AiChatRequest):
    try:
        reply, model, usage = await chat_completion(
            body.messages,
            context_path=body.context_path,
            context_excerpt=body.context_excerpt,
        )
        return AiChatResponse(reply_markdown=reply, model=model, usage_tokens=usage)
    except AiChatError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.post(
    "/projects/{project_id}/ai/save-markdown",
    response_model=AiSaveMarkdownResponse,
)
def api_ai_save_markdown(
    project_id: str,
    body: AiSaveMarkdownRequest,
    project: Project = Depends(project_or_404),
):
    root = Path(project.root_path)
    try:
        md_path = resolve_safe_project_path(root, body.path)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if md_path.suffix.lower() not in {".md", ".markdown"}:
        raise HTTPException(
            status_code=400,
            detail="O caminho precisa terminar com .md",
        )

    content = (body.content or "").strip() + "\n"
    md_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.write_text(content, encoding="utf-8")

    rel_md = str(md_path.resolve().relative_to(root.resolve())).replace("\\", "/")
    tex_rel = None
    message = f"Markdown salvo em {rel_md}."

    if body.convert_to_tex:
        try:
            out = default_output_path(md_path)
            result = convert_markdown_to_tex(root, md_path, out)
            tex_rel = result.output_path
            message = (
                f"Markdown salvo em {rel_md}. "
                f"{result.message} TeX em {tex_rel}."
            )
            if body.set_as_main:
                cfg = load_project_config(root)
                cfg.main_file = tex_rel
                save_project_config(root, cfg)
                with Session(db_module.engine) as session:
                    proj = session.get(Project, project_id)
                    if proj:
                        proj.main_file = tex_rel
                        session.add(proj)
                        session.commit()
                message += " Definido como arquivo principal."
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"MD salvo, mas falhou a conversão para TeX: {exc}",
            ) from exc

    return AiSaveMarkdownResponse(
        md_path=rel_md,
        tex_path=tex_rel,
        message=message,
    )


@router.post(
    "/projects/{project_id}/ai/translate-project",
    response_model=TranslateProjectResponse,
)
async def api_translate_project(
    body: TranslateProjectRequest,
    project: Project = Depends(project_or_404),
):
    """Traduz .tex/.md/.bib/.txt do projeto de português para inglês via LLM."""
    try:
        return await translate_project(
            Path(project.root_path),
            extensions=body.extensions,
            dry_run=body.dry_run,
            create_backup=body.create_backup,
        )
    except AiChatError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
