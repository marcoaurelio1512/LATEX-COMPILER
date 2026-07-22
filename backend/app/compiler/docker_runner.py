from __future__ import annotations

from pathlib import Path
from typing import List

from app.core.config import settings
from app.core.paths import PathSecurityError


def build_docker_args(
    *,
    project_root: Path,
    latexmk_args: List[str],
) -> List[str]:
    root = project_root.resolve()
    if root.parent == root:
        raise PathSecurityError("Não é permitido montar a raiz do sistema")
    if not root.is_dir():
        raise PathSecurityError("Projeto inválido para Docker")

    # Never mount anything outside project_root
    return [
        "docker",
        "run",
        "--rm",
        "--network",
        "none",
        "--memory",
        settings.docker_memory,
        "--cpus",
        settings.docker_cpus,
        "--pids-limit",
        str(settings.docker_pids_limit),
        "--security-opt",
        "no-new-privileges",
        "--user",
        "10001:10001",
        "-v",
        f"{root}:/workspace:rw",
        "-w",
        "/workspace",
        settings.docker_image,
        *latexmk_args,
    ]
