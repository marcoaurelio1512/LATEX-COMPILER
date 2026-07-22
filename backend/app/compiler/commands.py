from __future__ import annotations

from pathlib import Path
from typing import List, Literal

from app.core.tex_env import find_tex_binary

Engine = Literal["lualatex", "xelatex", "pdflatex"]

# Shell-escape must never appear in any command.
FORBIDDEN_FLAGS = {
    "--shell-escape",
    "-shell-escape",
    "-enable-write18",
    "--enable-write18",
    "-shell-restricted",
}


def engine_flag(engine: Engine) -> str:
    if engine == "lualatex":
        return "-lualatex"
    if engine == "xelatex":
        return "-xelatex"
    if engine == "pdflatex":
        return "-pdf"
    raise ValueError(f"Motor inválido: {engine}")


def build_latexmk_args(
    *,
    engine: Engine,
    main_file: str,
    synctex: bool = True,
    halt_on_error: bool = False,
    out_dir: Path,
) -> List[str]:
    latexmk = find_tex_binary("latexmk") or "latexmk"
    args = [
        latexmk,
        engine_flag(engine),
        "-interaction=nonstopmode",
        "-file-line-error",
        f"-outdir={str(out_dir)}",
        f"-auxdir={str(out_dir)}",
    ]
    if synctex:
        args.append("-synctex=1")
    if halt_on_error:
        args.append("-halt-on-error")
    # Explicitly disable shell escape via latexmk/tex options when supported
    args.append("-latexoption=-no-shell-escape")
    args.append(main_file)

    for a in args:
        if a in FORBIDDEN_FLAGS or a.lstrip("-") in {"shell-escape", "enable-write18"}:
            raise RuntimeError("Tentativa de habilitar shell-escape bloqueada")
    return args


def build_clean_args(out_dir: Path, main_file: str) -> List[str]:
    latexmk = find_tex_binary("latexmk") or "latexmk"
    return [
        latexmk,
        "-C",
        f"-outdir={str(out_dir)}",
        f"-auxdir={str(out_dir)}",
        main_file,
    ]
