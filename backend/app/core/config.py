from __future__ import annotations

from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "LaTeX Studio Local"
    api_prefix: str = "/api"
    host: str = "127.0.0.1"
    port: int = 8000
    cors_origins: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    data_dir: Path = Path.home() / ".latex-studio-local"
    database_url: str = ""

    default_engine: str = "lualatex"
    default_compiler_mode: str = "native"
    default_timeout_seconds: int = 120
    default_auto_compile: bool = True
    compile_debounce_ms: int = 1200
    autosave_debounce_ms: int = 800
    cancel_previous_on_new: bool = True

    max_file_size_bytes: int = 5 * 1024 * 1024
    max_project_size_bytes: int = 500 * 1024 * 1024
    max_log_capture_bytes: int = 2 * 1024 * 1024

    docker_image: str = "latex-local-compiler"
    docker_memory: str = "1g"
    docker_cpus: str = "2"
    docker_pids_limit: int = 256

    editable_extensions: List[str] = [
        ".tex", ".bib", ".sty", ".cls", ".txt", ".json", ".md",
        ".cfg", ".clo", ".bst", ".bbx", ".cbx", ".lbx", ".def", ".fd",
    ]

    binary_upload_extensions: List[str] = [
        ".png", ".jpg", ".jpeg", ".gif", ".svg", ".pdf", ".eps", ".webp",
    ]

    ignored_dir_names: List[str] = [
        ".git", ".svn", ".hg", "node_modules", "__pycache__",
        ".venv", "venv", ".latex-local",
    ]

    @property
    def db_url(self) -> str:
        if self.database_url:
            return self.database_url
        db_path = self.data_dir / "app.db"
        return f"sqlite:///{db_path}"


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
