from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel

from app.core import database as db
from app.core.config import settings
from app.main import create_app


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    db_path = tmp_path / "app.db"
    url = f"sqlite:///{db_path}"
    monkeypatch.setattr(settings, "database_url", url)
    settings.data_dir = tmp_path / "data"
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    db.configure_engine(url)
    SQLModel.metadata.drop_all(db.engine)
    SQLModel.metadata.create_all(db.engine)
    app = create_app()
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def sample_project(tmp_path: Path) -> Path:
    root = tmp_path / "proj"
    root.mkdir()
    (root / "main.tex").write_text(
        "\\documentclass{article}\n\\begin{document}\nHi\\end{document}\n",
        encoding="utf-8",
    )
    (root / "capitulos").mkdir()
    (root / "capitulos" / "a.tex").write_text("% cap\n", encoding="utf-8")
    return root
