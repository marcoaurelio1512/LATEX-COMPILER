from __future__ import annotations

from pathlib import Path

import pytest

from app.core.paths import PathSecurityError, resolve_safe_project_path


def test_rejects_parent_traversal(tmp_path: Path):
    root = tmp_path / "proj"
    root.mkdir()
    with pytest.raises(PathSecurityError):
        resolve_safe_project_path(root, "../outside.tex")


def test_rejects_absolute(tmp_path: Path):
    root = tmp_path / "proj"
    root.mkdir()
    with pytest.raises(PathSecurityError):
        resolve_safe_project_path(root, "/etc/passwd")


def test_allows_nested(tmp_path: Path):
    root = tmp_path / "proj"
    nested = root / "a" / "b"
    nested.mkdir(parents=True)
    (nested / "c.tex").write_text("x", encoding="utf-8")
    resolved = resolve_safe_project_path(root, "a/b/c.tex")
    assert resolved == (nested / "c.tex").resolve()


def test_rejects_external_symlink(tmp_path: Path):
    root = tmp_path / "proj"
    root.mkdir()
    outside = tmp_path / "secret.txt"
    outside.write_text("secret", encoding="utf-8")
    link = root / "link.tex"
    link.symlink_to(outside)
    with pytest.raises(PathSecurityError):
        resolve_safe_project_path(root, "link.tex")
