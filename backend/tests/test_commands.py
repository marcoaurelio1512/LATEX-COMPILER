from __future__ import annotations

from pathlib import Path

import pytest

from app.compiler.commands import FORBIDDEN_FLAGS, build_latexmk_args


def test_no_shell_escape_in_args(tmp_path: Path):
    args = build_latexmk_args(
        engine="lualatex",
        main_file="main.tex",
        out_dir=tmp_path,
    )
    joined = " ".join(args)
    assert "--shell-escape" not in args
    assert "-shell-escape" not in args
    assert "-enable-write18" not in args
    assert any("no-shell-escape" in a for a in args)
    for flag in FORBIDDEN_FLAGS:
        assert flag not in args


def test_engines(tmp_path: Path):
    assert "-lualatex" in build_latexmk_args(
        engine="lualatex", main_file="m.tex", out_dir=tmp_path
    )
    assert "-xelatex" in build_latexmk_args(
        engine="xelatex", main_file="m.tex", out_dir=tmp_path
    )
    assert "-pdf" in build_latexmk_args(
        engine="pdflatex", main_file="m.tex", out_dir=tmp_path
    )
