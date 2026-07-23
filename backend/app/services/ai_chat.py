from __future__ import annotations

from typing import List, Optional, Tuple

import httpx

from app.schemas.ai import ChatMessage
from app.services.ai_settings import AiSettingsData, load_ai_settings


class AiChatError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


def _strip_md_fence(text: str) -> str:
    raw = (text or "").strip()
    if raw.startswith("```"):
        lines = raw.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        raw = "\n".join(lines).strip()
    return raw


async def chat_completion(
    messages: List[ChatMessage],
    *,
    context_path: Optional[str] = None,
    context_excerpt: Optional[str] = None,
    settings_data: Optional[AiSettingsData] = None,
    system_prompt_override: Optional[str] = None,
    max_tokens_override: Optional[int] = None,
    temperature_override: Optional[float] = None,
    timeout: float = 180.0,
) -> Tuple[str, str, Optional[int]]:
    cfg = settings_data or load_ai_settings()
    if not cfg.api_key.strip():
        raise AiChatError(
            "Cadastre a chave da API (padrão OpenAI) nas configurações do assistente.",
            status_code=400,
        )
    if not cfg.enabled:
        raise AiChatError(
            "O assistente de IA está desativado. Ative-o nas configurações.",
            status_code=400,
        )

    system_prompt = (system_prompt_override or cfg.system_prompt).strip()
    api_messages = [{"role": "system", "content": system_prompt}]
    if context_path or context_excerpt:
        ctx_parts = ["Contexto do projeto aberto pelo usuário:"]
        if context_path:
            ctx_parts.append(f"- Arquivo: {context_path}")
        if context_excerpt:
            excerpt = context_excerpt.strip()
            if len(excerpt) > 6000:
                excerpt = excerpt[:6000] + "\n…[trecho truncado]…"
            ctx_parts.append("- Trecho atual:\n```\n" + excerpt + "\n```")
        api_messages.append({"role": "system", "content": "\n".join(ctx_parts)})

    for msg in messages:
        if msg.role == "system":
            continue
        content = msg.content.strip()
        if not content:
            continue
        api_messages.append({"role": msg.role, "content": content})

    if len(api_messages) <= 1:
        raise AiChatError("Envie pelo menos uma mensagem do usuário.")

    url = f"{cfg.base_url.rstrip('/')}/chat/completions"
    payload = {
        "model": cfg.model,
        "messages": api_messages,
        "temperature": (
            temperature_override
            if temperature_override is not None
            else cfg.temperature
        ),
        "max_tokens": max_tokens_override or cfg.max_tokens,
    }
    headers = {
        "Authorization": f"Bearer {cfg.api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, headers=headers, json=payload)
    except httpx.TimeoutException as exc:
        raise AiChatError(
            "A LLM demorou demais para responder. Tente de novo.",
            status_code=504,
        ) from exc
    except httpx.HTTPError as exc:
        raise AiChatError(
            f"Falha de rede ao falar com a LLM: {exc}",
            status_code=502,
        ) from exc

    if response.status_code >= 400:
        detail = response.text[:500]
        try:
            data = response.json()
            err = data.get("error")
            if isinstance(err, dict):
                detail = str(err.get("message") or detail)
            elif isinstance(err, str):
                detail = err
        except Exception:
            pass
        raise AiChatError(
            f"A API da LLM retornou erro ({response.status_code}): {detail}",
            status_code=502,
        )

    data = response.json()
    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise AiChatError("Resposta inesperada da LLM.", status_code=502) from exc

    usage = None
    try:
        usage = int(data.get("usage", {}).get("total_tokens"))
    except (TypeError, ValueError):
        usage = None

    return _strip_md_fence(str(content or "")), cfg.model, usage
