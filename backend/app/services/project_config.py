from __future__ import annotations

import json
from pathlib import Path

from app.core.paths import project_config_path
from app.schemas.common import ProjectConfig


def load_project_config(project_root: Path) -> ProjectConfig:
    path = project_config_path(project_root)
    if not path.exists():
        return ProjectConfig()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return ProjectConfig.model_validate(data)
    except Exception:
        return ProjectConfig()


def save_project_config(project_root: Path, config: ProjectConfig) -> ProjectConfig:
    path = project_config_path(project_root)
    path.write_text(
        config.model_dump_json(indent=2) + "\n",
        encoding="utf-8",
    )
    return config


def merge_config(project_root: Path, updates: dict) -> ProjectConfig:
    current = load_project_config(project_root)
    merged = current.model_copy(update=updates)
    return save_project_config(project_root, merged)
