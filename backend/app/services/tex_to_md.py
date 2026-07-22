from __future__ import annotations

import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Literal


@dataclass
class TexToMdResult:
    source_path: str
    output_path: str
    method: Literal["pandoc", "builtin"]
    message: str


def convert_tex_to_markdown(
    project_root: Path,
    source: Path,
    output: Path,
) -> TexToMdResult:
    if source.suffix.lower() != ".tex":
        raise ValueError("O arquivo de origem precisa ser .tex")
    if not source.is_file():
        raise FileNotFoundError(str(source))

    output.parent.mkdir(parents=True, exist_ok=True)
    tex = source.read_text(encoding="utf-8", errors="ignore")

    pandoc = shutil.which("pandoc")
    if pandoc:
        _run_pandoc(pandoc, source, output)
        return TexToMdResult(
            source_path=_rel(project_root, source),
            output_path=_rel(project_root, output),
            method="pandoc",
            message="Convertido com Pandoc (melhor fidelidade).",
        )

    md = _builtin_tex_to_md(tex)
    output.write_text(md, encoding="utf-8")
    return TexToMdResult(
        source_path=_rel(project_root, source),
        output_path=_rel(project_root, output),
        method="builtin",
        message=(
            "Convertido com o conversor interno (básico). "
            "Para melhor qualidade: brew install pandoc"
        ),
    )


def default_md_output_path(source: Path) -> Path:
    return source.with_suffix(".md")


def _rel(root: Path, path: Path) -> str:
    return str(path.resolve().relative_to(root.resolve())).replace("\\", "/")


def _run_pandoc(pandoc: str, source: Path, output: Path) -> None:
    result = subprocess.run(
        [
            pandoc,
            str(source),
            "-f",
            "latex",
            "-t",
            "gfm",
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


def _builtin_tex_to_md(tex: str) -> str:
    # Remove comments
    text = re.sub(r"(?<!\\)%.*?$", "", tex, flags=re.M)

    # Extract document body if present
    body_match = re.search(
        r"\\begin\{document\}(.*)\\end\{document\}",
        text,
        flags=re.S,
    )
    body = body_match.group(1) if body_match else text

    # Drop preamble leftovers if no begin{document}
    body = re.sub(r"\\documentclass(\[[^\]]*\])?\{[^}]*\}", "", body)
    body = re.sub(r"\\usepackage(\[[^\]]*\])?\{[^}]*\}", "", body)

    title = _cmd_arg(text, "title")
    author = _cmd_arg(text, "author")

    lines_out: list[str] = []
    if title:
        lines_out.append(f"# {_unescape_tex(title)}")
        lines_out.append("")
    if author:
        lines_out.append(f"*Autor: {_unescape_tex(author)}*")
        lines_out.append("")

    # Remove maketitle / tableofcontents
    body = re.sub(r"\\maketitle\b", "", body)
    body = re.sub(r"\\tableofcontents\b", "", body)

    # Sections
    body = re.sub(
        r"\\chapter\*?\{([^}]*)\}",
        lambda m: f"\n# {_unescape_tex(m.group(1))}\n",
        body,
    )
    body = re.sub(
        r"\\section\*?\{([^}]*)\}",
        lambda m: f"\n# {_unescape_tex(m.group(1))}\n",
        body,
    )
    body = re.sub(
        r"\\subsection\*?\{([^}]*)\}",
        lambda m: f"\n## {_unescape_tex(m.group(1))}\n",
        body,
    )
    body = re.sub(
        r"\\subsubsection\*?\{([^}]*)\}",
        lambda m: f"\n### {_unescape_tex(m.group(1))}\n",
        body,
    )

    # Lists
    body = re.sub(r"\\begin\{itemize\}", "\n", body)
    body = re.sub(r"\\end\{itemize\}", "\n", body)
    body = re.sub(r"\\begin\{enumerate\}", "\n", body)
    body = re.sub(r"\\end\{enumerate\}", "\n", body)
    body = re.sub(r"\\item\s*", "\n- ", body)

    # Verbatim / lstlisting rough
    body = re.sub(
        r"\\begin\{verbatim\}(.*?)\\end\{verbatim\}",
        lambda m: f"\n```\n{m.group(1).strip()}\n```\n",
        body,
        flags=re.S,
    )

    # Images
    body = re.sub(
        r"\\includegraphics(?:\[[^\]]*\])?\{([^}]*)\}",
        r"![](\1)",
        body,
    )

    # Links href
    body = re.sub(
        r"\\href\{([^}]*)\}\{([^}]*)\}",
        lambda m: f"[{_unescape_tex(m.group(2))}]({m.group(1)})",
        body,
    )

    # Text styles
    body = re.sub(
        r"\\textbf\{([^}]*)\}",
        lambda m: f"**{_unescape_tex(m.group(1))}**",
        body,
    )
    body = re.sub(
        r"\\textit\{([^}]*)\}",
        lambda m: f"*{_unescape_tex(m.group(1))}*",
        body,
    )
    body = re.sub(
        r"\\emph\{([^}]*)\}",
        lambda m: f"*{_unescape_tex(m.group(1))}*",
        body,
    )
    body = re.sub(
        r"\\texttt\{([^}]*)\}",
        lambda m: f"`{_unescape_tex(m.group(1))}`",
        body,
    )

    # Simple line breaks
    body = body.replace("\\\\", "\n")
    body = re.sub(r"\\par\b", "\n\n", body)
    body = re.sub(r"\\bigskip\b|\\medskip\b|\\smallskip\b", "\n\n", body)
    body = re.sub(r"\\hrule\b", "\n---\n", body)

    # Drop remaining common commands (keep args when useful)
    body = re.sub(r"\\label\{[^}]*\}", "", body)
    body = re.sub(r"\\cite\{[^}]*\}", "", body)
    body = re.sub(r"\\ref\{[^}]*\}", "", body)
    body = re.sub(r"\\[a-zA-Z@]+\*?(?:\[[^\]]*\])?\{([^}]*)\}", r"\1", body)
    body = re.sub(r"\\[a-zA-Z@]+\*?", "", body)

    body = _unescape_tex(body)

    # Cleanup whitespace
    body = re.sub(r"[ \t]+\n", "\n", body)
    body = re.sub(r"\n{3,}", "\n\n", body)
    body = body.strip()

    if lines_out:
        return "\n".join(lines_out) + "\n" + body + "\n"
    return body + "\n"


def _cmd_arg(tex: str, name: str) -> str:
    m = re.search(rf"\\{name}\{{([^}}]*)\}}", tex)
    return m.group(1).strip() if m else ""


def _unescape_tex(text: str) -> str:
    replacements = {
        r"\%": "%",
        r"\$": "$",
        r"\&": "&",
        r"\#": "#",
        r"\_": "_",
        r"\{": "{",
        r"\}": "}",
        r"\textbackslash{}": "\\",
        r"\textasciitilde{}": "~",
        r"\textasciicircum{}": "^",
        r"~": " ",
        r"\,": " ",
        r"\;": " ",
        r"\ ": " ",
    }
    out = text
    for a, b in replacements.items():
        out = out.replace(a, b)
    return out
