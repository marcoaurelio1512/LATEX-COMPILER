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
