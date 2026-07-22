from __future__ import annotations

from pathlib import Path

from app.services.tex_to_md import _builtin_tex_to_md, convert_tex_to_markdown


def test_builtin_basic():
    tex = r"""
\documentclass{article}
\begin{document}
\section{Intro}
Texto \textbf{forte} e \textit{italico}.
\begin{itemize}
\item um
\item dois
\end{itemize}
\end{document}
"""
    md = _builtin_tex_to_md(tex)
    assert "# Intro" in md
    assert "**forte**" in md
    assert "*italico*" in md
    assert "- um" in md


def test_convert_writes_file(tmp_path: Path):
    src = tmp_path / "a.tex"
    src.write_text(
        "\\documentclass{article}\\begin{document}\\section{Oi}x\\end{document}\n",
        encoding="utf-8",
    )
    out = tmp_path / "a.md"
    result = convert_tex_to_markdown(tmp_path, src, out)
    assert out.exists()
    assert result.output_path == "a.md"
    assert "Oi" in out.read_text(encoding="utf-8")
