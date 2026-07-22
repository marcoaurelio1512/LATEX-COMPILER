from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


Engine = Literal["lualatex", "xelatex", "pdflatex"]
CompilerMode = Literal["native", "docker"]
BibliographyMode = Literal["auto", "biber", "bibtex", "none"]
JobStatus = Literal[
    "idle",
    "queued",
    "preparing",
    "compiling",
    "completed",
    "failed",
    "timeout",
    "cancelled",
]
Severity = Literal["error", "warning", "info"]


class ProjectConfig(BaseModel):
    main_file: Optional[str] = None
    engine: Engine = "lualatex"
    bibliography: BibliographyMode = "auto"
    auto_compile: bool = True
    synctex: bool = True
    compiler_mode: CompilerMode = "native"
    halt_on_error: bool = False
    timeout_seconds: int = 120
    cancel_previous_on_new: bool = True
    compile_debounce_ms: int = 1200
    autosave_debounce_ms: int = 800
    autosave: bool = False


class ProjectSummary(BaseModel):
    id: str
    name: str
    root_path: str
    main_file: Optional[str] = None
    engine: Engine = "lualatex"
    compiler_mode: CompilerMode = "native"
    auto_compile: bool = True
    last_opened_at: datetime
    created_at: datetime
    updated_at: datetime


class ProjectDetail(ProjectSummary):
    config: ProjectConfig
    main_candidates: List[str] = Field(default_factory=list)
    initial_file: Optional[str] = None


class OpenProjectRequest(BaseModel):
    path: Optional[str] = None
    use_native_picker: bool = False
    pick_tex_file: bool = False


class CreateProjectRequest(BaseModel):
    parent_path: Optional[str] = None
    name: str
    template: Literal["article", "book", "empty"] = "article"
    use_native_picker: bool = False


class FileNode(BaseModel):
    name: str
    path: str
    type: Literal["file", "directory"]
    extension: Optional[str] = None
    size: Optional[int] = None
    modified_at: Optional[datetime] = None
    children: Optional[List["FileNode"]] = None


FileNode.model_rebuild()


class FileContent(BaseModel):
    path: str
    content: str
    encoding: str = "utf-8"
    size: int
    modified_at: datetime
    editable: bool = True


class WriteFileRequest(BaseModel):
    path: str
    content: str
    encoding: str = "utf-8"
    expected_mtime: Optional[float] = None
    force: bool = False


class CreateFileRequest(BaseModel):
    path: str
    content: str = ""
    is_directory: bool = False


class RenameRequest(BaseModel):
    path: str
    new_path: str


class MkdirRequest(BaseModel):
    path: str


class DeleteFileRequest(BaseModel):
    path: str


class CompileRequest(BaseModel):
    engine: Optional[Engine] = None
    compiler_mode: Optional[CompilerMode] = None
    clean: bool = False
    main_file: Optional[str] = None


class Diagnostic(BaseModel):
    severity: Severity
    code: str
    file: Optional[str] = None
    line: Optional[int] = None
    column: Optional[int] = None
    message: str
    raw_message: str
    context: Optional[str] = None
    suggestion: Optional[str] = None


class CompilationJobOut(BaseModel):
    job_id: str
    project_id: str
    status: JobStatus
    engine: Engine
    main_file: str
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    exit_code: Optional[int] = None
    error_count: int = 0
    warning_count: int = 0
    log_path: Optional[str] = None
    pdf_path: Optional[str] = None
    synctex_path: Optional[str] = None
    diagnostics: List[Diagnostic] = Field(default_factory=list)
    compile_pending: bool = False


class ToolStatus(BaseModel):
    name: str
    installed: bool
    path: Optional[str] = None
    version: Optional[str] = None
    guidance: Optional[str] = None


class SystemDiagnostics(BaseModel):
    platform: str
    tools: List[ToolStatus]
    ready_native: bool
    ready_docker: bool
    notes: List[str] = Field(default_factory=list)


class WsEvent(BaseModel):
    type: str
    project_id: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)


class MdToTexRequest(BaseModel):
    path: str
    output_path: Optional[str] = None


class MdToTexResponse(BaseModel):
    source_path: str
    output_path: str
    method: str
    message: str


class TexToMdRequest(BaseModel):
    path: str
    output_path: Optional[str] = None


class TexToMdResponse(BaseModel):
    source_path: str
    output_path: str
    method: str
    message: str
