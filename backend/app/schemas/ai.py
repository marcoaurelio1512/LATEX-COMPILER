from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class AiSettingsPublic(BaseModel):
    enabled: bool = False
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o-mini"
    has_api_key: bool = False
    api_key_hint: Optional[str] = None
    system_prompt: str = ""
    temperature: float = 0.7
    max_tokens: int = 4096


class AiSettingsUpdate(BaseModel):
    base_url: Optional[str] = None
    model: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = Field(default=None, ge=0, le=2)
    max_tokens: Optional[int] = Field(default=None, ge=256, le=128000)
    enabled: Optional[bool] = None


class AiKeyUpdate(BaseModel):
    api_key: str = Field(min_length=1)


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class AiChatRequest(BaseModel):
    messages: List[ChatMessage]
    project_id: Optional[str] = None
    context_path: Optional[str] = None
    context_excerpt: Optional[str] = None


class AiChatResponse(BaseModel):
    reply_markdown: str
    model: str
    usage_tokens: Optional[int] = None


class AiSaveMarkdownRequest(BaseModel):
    path: str
    content: str
    convert_to_tex: bool = False
    set_as_main: bool = False


class AiSaveMarkdownResponse(BaseModel):
    md_path: str
    tex_path: Optional[str] = None
    message: str



class TranslateProjectRequest(BaseModel):
    extensions: List[str] = Field(
        default_factory=lambda: [".tex", ".md", ".bib", ".txt"]
    )
    dry_run: bool = False
    create_backup: bool = True


class TranslateFileResult(BaseModel):
    path: str
    status: Literal["ok", "skipped", "error", "planned"]
    message: Optional[str] = None
    chars_in: int = 0
    chars_out: int = 0


class TranslateProjectResponse(BaseModel):
    files: List[TranslateFileResult] = Field(default_factory=list)
    message: str
    translated: int = 0
    failed: int = 0
    skipped: int = 0
    planned: int = 0
