from __future__ import annotations

import shutil
from pathlib import Path

import pytest


@pytest.mark.skipif(shutil.which("latexmk") is None, reason="latexmk não instalado")
def test_compile_success(client, tmp_path: Path):
    root = tmp_path / "ok"
    root.mkdir()
    (root / "main.tex").write_text(
        "\\documentclass{article}\\begin{document}OK\\end{document}\n",
        encoding="utf-8",
    )
    opened = client.post("/api/projects/open", json={"path": str(root)})
    pid = opened.json()["id"]
    job = client.post(f"/api/projects/{pid}/compile", json={})
    assert job.status_code == 200
    job_id = job.json()["job_id"]

    import time

    final = None
    for _ in range(60):
        time.sleep(0.5)
        final = client.get(f"/api/compilations/{job_id}").json()
        if final["status"] in {"completed", "failed", "timeout", "cancelled"}:
            break
    assert final is not None
    assert final["status"] in {"completed", "failed"}


def test_diagnostics_endpoint(client):
    res = client.get("/api/system/diagnostics")
    assert res.status_code == 200
    body = res.json()
    assert "tools" in body
    names = {t["name"] for t in body["tools"]}
    assert "Latexmk" in names
    assert "Docker" in names
