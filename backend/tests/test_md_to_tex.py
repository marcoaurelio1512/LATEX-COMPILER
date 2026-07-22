from __future__ import annotations

from pathlib import Path

from app.services.md_to_tex import _builtin_md_to_tex, convert_markdown_to_tex


def test_builtin_basic():
    tex = _builtin_md_to_tex("# Titulo\n\n**x** e *y*\n", "Doc")
    assert "\\section{Titulo}" in tex
    assert "\\textbf{x}" in tex
    assert "\\textit{y}" in tex


def test_convert_writes_file(tmp_path: Path):
    src = tmp_path / "a.md"
    src.write_text("# Oi\n\ntexto", encoding="utf-8")
    out = tmp_path / "a.tex"
    result = convert_markdown_to_tex(tmp_path, src, out)
    assert out.exists()
    assert result.output_path == "a.tex"
    assert "documentclass" in out.read_text(encoding="utf-8")
