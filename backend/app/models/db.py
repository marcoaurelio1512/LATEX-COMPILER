from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid4())


class Project(SQLModel, table=True):
    __tablename__ = "projects"

    id: str = Field(default_factory=new_id, primary_key=True)
    name: str
    root_path: str = Field(index=True, unique=True)
    main_file: Optional[str] = None
    engine: str = "lualatex"
    compiler_mode: str = "native"
    auto_compile: bool = True
    last_opened_at: datetime = Field(default_factory=utcnow)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class CompilationJob(SQLModel, table=True):
    __tablename__ = "compilation_jobs"

    id: str = Field(default_factory=new_id, primary_key=True)
    project_id: str = Field(index=True, foreign_key="projects.id")
    status: str = "idle"
    engine: str = "lualatex"
    main_file: str = ""
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    exit_code: Optional[int] = None
    error_count: int = 0
    warning_count: int = 0
    log_path: Optional[str] = None
    pdf_path: Optional[str] = None
    synctex_path: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)


class AppSetting(SQLModel, table=True):
    __tablename__ = "app_settings"

    key: str = Field(primary_key=True)
    value: str
    updated_at: datetime = Field(default_factory=utcnow)


class RecentFile(SQLModel, table=True):
    __tablename__ = "recent_files"

    id: str = Field(default_factory=new_id, primary_key=True)
    project_id: str = Field(index=True, foreign_key="projects.id")
    relative_path: str
    opened_at: datetime = Field(default_factory=utcnow)
