from __future__ import annotations

from pathlib import Path


def test_open_read_write(client, sample_project: Path):
    opened = client.post(
        "/api/projects/open",
        json={"path": str(sample_project), "use_native_picker": False},
    )
    assert opened.status_code == 200
    project_id = opened.json()["id"]

    tree = client.get(f"/api/projects/{project_id}/tree")
    assert tree.status_code == 200
    assert tree.json()["type"] == "directory"

    read = client.get(f"/api/projects/{project_id}/file", params={"path": "main.tex"})
    assert read.status_code == 200
    content = read.json()["content"]

    write = client.put(
        f"/api/projects/{project_id}/file",
        json={"path": "main.tex", "content": content + "% edited\n"},
    )
    assert write.status_code == 200

    # path traversal blocked
    bad = client.get(
        f"/api/projects/{project_id}/file",
        params={"path": "../outside.tex"},
    )
    assert bad.status_code == 400
