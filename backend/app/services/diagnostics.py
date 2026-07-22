from __future__ import annotations

import platform
import subprocess
from typing import List, Optional

from app.core.tex_env import find_tex_binary, tex_path_prefix
from app.schemas.common import SystemDiagnostics, ToolStatus

TOOLS = [
    ("latexmk", "Latexmk", "brew install --cask mactex-no-gui"),
    ("lualatex", "LuaLaTeX", "brew install --cask mactex-no-gui"),
    ("xelatex", "XeLaTeX", "brew install --cask mactex-no-gui"),
    ("pdflatex", "PDFLaTeX", "brew install --cask mactex-no-gui"),
    ("biber", "Biber", "brew install --cask mactex-no-gui"),
    ("bibtex", "BibTeX", "brew install --cask mactex-no-gui"),
    ("docker", "Docker", "Instale o Docker Desktop para macOS: https://www.docker.com/products/docker-desktop/"),
]


def _version(cmd_path: str) -> Optional[str]:
    try:
        result = subprocess.run(
            [cmd_path, "--version"],
            capture_output=True,
            text=True,
            check=False,
            timeout=10,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        return None
    out = (result.stdout or result.stderr or "").strip()
    if not out:
        return None
    return out.splitlines()[0][:200]


def check_tool(binary: str, label: str, guidance: str) -> ToolStatus:
    path = find_tex_binary(binary) if binary != "docker" else _find_docker()
    installed = path is not None
    version = _version(path) if installed and path else None
    tip = None
    if not installed:
        tip = guidance
        if binary != "docker" and platform.system() == "Darwin":
            tip = (
                f"{guidance}\n"
                "Se o MacTeX já foi instalado mas ainda aparece ausente, "
                "reinicie o Studio (PARAR/INICIAR). O app agora procura em "
                "/usr/local/texlive/... automaticamente."
            )
    return ToolStatus(
        name=label,
        installed=installed,
        path=path,
        version=version,
        guidance=tip,
    )


def _find_docker() -> Optional[str]:
    import shutil
    return shutil.which("docker")


def run_system_diagnostics() -> SystemDiagnostics:
    tools = [check_tool(b, label, guide) for b, label, guide in TOOLS]
    by_name = {t.name: t for t in tools}
    ready_native = all(by_name[n].installed for n in ("Latexmk", "LuaLaTeX"))
    ready_docker = by_name["Docker"].installed
    notes: List[str] = []
    prefix = tex_path_prefix()
    if prefix:
        notes.append(f"Pastas TeX detectadas: {prefix}")
    if platform.system() == "Darwin" and not ready_native:
        notes.append(
            "No macOS, a forma mais simples é instalar o MacTeX: "
            "brew install --cask mactex-no-gui (ou mactex). "
            "Se a senha do Terminal falhar, baixe o instalador visual em "
            "https://www.tug.org/mactex/ e instale com dois cliques."
        )
    elif platform.system() == "Darwin" and ready_native and not _library_texbin_exists():
        notes.append(
            "O TeX foi encontrado, mas o atalho /Library/TeX/texbin ainda não existe. "
            "O Studio já consegue compilar assim mesmo. Opcional: no Terminal, "
            "após acertar a senha: sudo ln -sfn "
            "/usr/local/texlive/2026/bin/universal-darwin /Library/TeX/texbin"
        )
    if not ready_docker:
        notes.append(
            "Docker é opcional. Use o modo nativo se o TeX Live/MacTeX estiver instalado."
        )
    notes.append("Nenhuma instalação automática é executada sem confirmação explícita.")
    return SystemDiagnostics(
        platform=platform.platform(),
        tools=tools,
        ready_native=ready_native,
        ready_docker=ready_docker,
        notes=notes,
    )


def _library_texbin_exists() -> bool:
    from pathlib import Path
    return Path("/Library/TeX/texbin").exists()
