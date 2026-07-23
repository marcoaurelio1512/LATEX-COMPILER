from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, Optional

from app.core.config import settings

DEFAULT_SYSTEM_PROMPT = """Você é um assistente de escrita acadêmica e editorial em português do Brasil.
Ajude o usuário a produzir artigos, capítulos e livros.

Regras importantes:
1. Responda SEMPRE em Markdown válido (.md), pronto para ser convertido depois para LaTeX.
2. Use títulos (# ## ###), listas, ênfase e blocos de código quando fizer sentido.
3. Não invente referências bibliográficas completas; se precisar citar, use placeholders claros como [REF:AutorAno].
4. Se o usuário pedir um capítulo/seção, entregue o texto completo da seção em Markdown.
5. Seja claro, bem estruturado e adequado a publicação acadêmica.
6. Não envolva a resposta inteira em cercas ```markdown — escreva o Markdown direto.
7. Ao citar, use chaves no texto no formato [@autorAno] (ex.: [@silva2020]).
8. Se houver bibliografia, inclua uma seção final exatamente assim:

## Referências

- Silva, Maria (2020). Título da obra. Editora Exemplo.
- [@costa2019] Costa, João (2019). Outro título. Editora Beta.

Isso permite converter depois o Markdown em arquivo .bib automaticamente.
"""


@dataclass
class AiSettingsData:
    enabled: bool = False
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o-mini"
    api_key: str = ""
    system_prompt: str = DEFAULT_SYSTEM_PROMPT
    temperature: float = 0.7
    max_tokens: int = 4096


def settings_path() -> Path:
    return settings.data_dir / "ai-settings.json"


def load_ai_settings() -> AiSettingsData:
    path = settings_path()
    if not path.exists():
        return AiSettingsData()
    try:
        raw: Dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return AiSettingsData()
    return AiSettingsData(
        enabled=bool(raw.get("enabled", False)),
        base_url=str(raw.get("base_url") or "https://api.openai.com/v1").rstrip("/"),
        model=str(raw.get("model") or "gpt-4o-mini"),
        api_key=str(raw.get("api_key") or ""),
        system_prompt=str(raw.get("system_prompt") or DEFAULT_SYSTEM_PROMPT),
        temperature=float(raw.get("temperature", 0.7)),
        max_tokens=int(raw.get("max_tokens", 4096)),
    )


def save_ai_settings(data: AiSettingsData) -> None:
    path = settings_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(asdict(data), ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass


def mask_key(api_key: str) -> Optional[str]:
    key = (api_key or "").strip()
    if not key:
        return None
    if len(key) <= 8:
        return "••••" + key[-2:]
    return key[:4] + "…" + key[-4:]


def update_fields(
    *,
    base_url: Optional[str] = None,
    model: Optional[str] = None,
    system_prompt: Optional[str] = None,
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
    enabled: Optional[bool] = None,
    api_key: Optional[str] = None,
    clear_key: bool = False,
) -> AiSettingsData:
    data = load_ai_settings()
    if base_url is not None:
        data.base_url = base_url.strip().rstrip("/") or data.base_url
    if model is not None:
        data.model = model.strip() or data.model
    if system_prompt is not None:
        data.system_prompt = system_prompt
    if temperature is not None:
        data.temperature = temperature
    if max_tokens is not None:
        data.max_tokens = max_tokens
    if enabled is not None:
        data.enabled = enabled
    if clear_key:
        data.api_key = ""
        data.enabled = False
    elif api_key is not None:
        data.api_key = api_key.strip()
        if data.api_key:
            data.enabled = True
    save_ai_settings(data)
    return data
