from __future__ import annotations

import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Optional


@dataclass
class MdToTexResult:
    source_path: str
    output_path: str
    method: Literal["pandoc", "builtin"]
    message: str


def convert_markdown_to_tex(
    project_root: Path,
    source: Path,
    output: Path,
) -> MdToTexResult:
    if source.suffix.lower() not in {".md", ".markdown"}:
        raise ValueError("O arquivo de origem precisa ser .md ou .markdown")
    if not source.is_file():
        raise FileNotFoundError(str(source))

    markdown = source.read_text(encoding="utf-8")
    output.parent.mkdir(parents=True, exist_ok=True)

    pandoc = shutil.which("pandoc")
    if pandoc:
        _run_pandoc(pandoc, source, output)
        return MdToTexResult(
            source_path=_rel(project_root, source),
            output_path=_rel(project_root, output),
            method="pandoc",
            message="Convertido com Pandoc (melhor fidelidade).",
        )

    tex = _builtin_md_to_tex(
        markdown,
        title=source.stem.replace("_", " ").replace("-", " "),
    )
    output.write_text(tex, encoding="utf-8")
    return MdToTexResult(
        source_path=_rel(project_root, source),
        output_path=_rel(project_root, output),
        method="builtin",
        message=(
            "Convertido com o conversor interno (básico). "
            "Para melhor qualidade: brew install pandoc"
        ),
    )


def default_output_path(source: Path) -> Path:
    return source.with_suffix(".tex")


def _rel(root: Path, path: Path) -> str:
    return str(path.resolve().relative_to(root.resolve())).replace("\\", "/")


def _run_pandoc(pandoc: str, source: Path, output: Path) -> None:
    result = subprocess.run(
        [
            pandoc,
            str(source),
            "-f",
            "markdown",
            "-t",
            "latex",
            "-s",
            "--metadata",
            f"title={source.stem.replace('_', ' ')}",
            "-o",
            str(output),
        ],
        capture_output=True,
        text=True,
        check=False,
        timeout=60,
    )
    if result.returncode != 0 or not output.exists():
        err = (result.stderr or result.stdout or "falha desconhecida").strip()
        raise RuntimeError(f"Pandoc falhou: {err}")


def _builtin_md_to_tex(markdown: str, title: str) -> str:
    lines = markdown.replace("\r\n", "\n").split("\n")
    body: list[str] = []
    in_code = False
    list_type: Optional[str] = None

    def close_list() -> None:
        nonlocal list_type
        if list_type == "itemize":
            body.append("\\end{itemize}")
        elif list_type == "enumerate":
            body.append("\\end{enumerate}")
        list_type = None

    for raw in lines:
        line = raw.rstrip()

        if line.startswith("```"):
            close_list()
            if not in_code:
                in_code = True
                body.append("\\begin{verbatim}")
            else:
                in_code = False
                body.append("\\end{verbatim}")
            continue

        if in_code:
            body.append(line)
            continue

        if not line.strip():
            close_list()
            body.append("")
            continue

        heading = re.match(r"^(#{1,6})\s+(.*)$", line)
        if heading:
            close_list()
            level = len(heading.group(1))
            text = _format_inline(heading.group(2).strip())
            cmd = {
                1: "section",
                2: "subsection",
                3: "subsubsection",
                4: "paragraph",
                5: "subparagraph",
                6: "subparagraph",
            }[level]
            body.append(f"\\{cmd}{{{text}}}")
            continue

        unordered = re.match(r"^[-*+]\s+(.*)$", line)
        if unordered:
            if list_type != "itemize":
                close_list()
                body.append("\\begin{itemize}")
                list_type = "itemize"
            body.append(f"  \\item {_format_inline(unordered.group(1).strip())}")
            continue

        ordered = re.match(r"^\d+[.)]\s+(.*)$", line)
        if ordered:
            if list_type != "enumerate":
                close_list()
                body.append("\\begin{enumerate}")
                list_type = "enumerate"
            body.append(f"  \\item {_format_inline(ordered.group(1).strip())}")
            continue

        close_list()
        if line.strip() == "---":
            body.append("\\bigskip\\hrule\\bigskip")
            continue

        # paragraph line
        body.append(_format_inline(line))
        body.append("")

    close_list()
    content = "\n".join(body).strip()
    safe_title = _escape_tex(title)

    return (
        "\\documentclass[11pt,a4paper]{article}\n"
        "\\usepackage[T1]{fontenc}\n"
        "\\usepackage[utf8]{inputenc}\n"
        "\\usepackage[brazilian]{babel}\n"
        "\\usepackage{hyperref}\n"
        "\\usepackage{graphicx}\n"
        "\n"
        f"\\title{{{safe_title}}}\n"
        "\\author{}\n"
        "\\date{\\today}\n"
        "\n"
        "\\begin{document}\n"
        "\\maketitle\n"
        "\n"
        f"{content}\n"
        "\n"
        "\\end{document}\n"
    )


def _format_inline(text: str) -> str:
    # images ![alt](path)
    def repl_img(m: re.Match[str]) -> str:
        path = m.group(2)
        return f"\\includegraphics[width=0.8\\linewidth]{{{path}}}"

    text = re.sub(r"!\[(.*?)\]\((.*?)\)", repl_img, text)

    # links [text](url)
    def repl_link(m: re.Match[str]) -> str:
        label = _escape_tex(m.group(1))
        url = m.group(2)
        return f"\\href{{{url}}}{{{label}}}"

    text = re.sub(r"\[(.*?)\]\((.*?)\)", repl_link, text)

    # inline code
    parts: list[str] = []
    last = 0
    for m in re.finditer(r"`([^`]+)`", text):
        parts.append(_escape_tex(text[last:m.start()]))
        parts.append(f"\\texttt{{{_escape_tex(m.group(1))}}}")
        last = m.end()
    parts.append(_escape_tex(text[last:]))
    text = "".join(parts)

    # bold / italic (after escape, markers still present as * _)
    text = re.sub(r"\*\*(.+?)\*\*", r"\\textbf{\1}", text)
    text = re.sub(r"__(.+?)__", r"\\textbf{\1}", text)
    text = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"\\textit{\1}", text)
    text = re.sub(r"(?<!_)_(?!_)(.+?)(?<!_)_(?!_)", r"\\textit{\1}", text)
    return text


def _escape_tex(text: str) -> str:
    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    return "".join(replacements.get(ch, ch) for ch in text)
