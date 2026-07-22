from __future__ import annotations

import platform
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


class FolderPickerError(RuntimeError):
    pass


@dataclass
class OpenTarget:
    """Pasta do projeto + arquivo inicial opcional (relativo)."""

    project_root: Path
    initial_file: Optional[str] = None


def pick_folder_native(prompt: str = "Selecione a pasta do projeto LaTeX") -> Optional[str]:
    system = platform.system()
    if system == "Darwin":
        return _pick_macos_folder(prompt)
    if system == "Linux":
        return _pick_linux_folder(prompt)
    if system == "Windows":
        return _pick_windows_folder(prompt)
    raise FolderPickerError(f"Seletor nativo não suportado em {system}")


def pick_tex_file_native(
    prompt: str = "Selecione um arquivo .tex",
) -> Optional[str]:
    system = platform.system()
    if system == "Darwin":
        return _pick_macos_tex(prompt)
    if system == "Linux":
        return _pick_linux_tex(prompt)
    if system == "Windows":
        return _pick_windows_tex(prompt)
    raise FolderPickerError(f"Seletor nativo não suportado em {system}")


def resolve_open_target(path: str) -> OpenTarget:
    """Aceita pasta OU arquivo .tex/.bib/.sty etc.

    - Se for pasta: usa como raiz do projeto.
    - Se for arquivo: usa a pasta pai como projeto e abre esse arquivo.
    """
    target = Path(path).expanduser().resolve()
    if not target.exists():
        raise FolderPickerError("Caminho inválido ou inexistente")

    if target.is_file():
        root = target.parent
        if root.parent == root:
            raise FolderPickerError(
                "Não é permitido abrir arquivo na raiz do sistema"
            )
        rel = target.name
        return OpenTarget(project_root=root, initial_file=rel)

    if target.is_dir():
        if target.parent == target:
            raise FolderPickerError(
                "Não é permitido abrir a raiz do sistema como projeto"
            )
        return OpenTarget(project_root=target, initial_file=None)

    raise FolderPickerError("Caminho inválido")


def validate_project_root(path: str) -> Path:
    return resolve_open_target(path).project_root


def _pick_macos_folder(prompt: str) -> Optional[str]:
    safe = prompt.replace("\\", "\\\\").replace('"', '\\"')
    script = (
        "try\n"
        f'set chosenFolder to choose folder with prompt "{safe}"\n'
        "return POSIX path of chosenFolder\n"
        "on error number -128\n"
        'return ""\n'
        "end try"
    )
    return _osascript(script)


def _pick_macos_tex(prompt: str) -> Optional[str]:
    safe = prompt.replace("\\", "\\\\").replace('"', '\\"')
    script = (
        "try\n"
        f'set chosenFile to choose file with prompt "{safe}" '
        "of type {\"public.plain-text\", \"tex\", \"bib\", \"sty\", \"cls\"}\n"
        "return POSIX path of chosenFile\n"
        "on error number -128\n"
        'return ""\n'
        "end try"
    )
    # Fallback mais permissivo se o filtro de tipo falhar em alguns macOS
    path = _osascript(script)
    if path:
        return path
    script2 = (
        "try\n"
        f'set chosenFile to choose file with prompt "{safe}"\n'
        "return POSIX path of chosenFile\n"
        "on error number -128\n"
        'return ""\n'
        "end try"
    )
    return _osascript(script2)


def _osascript(script: str) -> Optional[str]:
    result = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True,
        text=True,
        check=False,
        timeout=300,
    )
    path = (result.stdout or "").strip()
    return path or None


def _pick_linux_folder(prompt: str) -> Optional[str]:
    for cmd in (
        ["zenity", "--file-selection", "--directory", "--title", prompt],
        ["kdialog", "--getexistingdirectory", str(Path.home()), prompt],
    ):
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, check=False, timeout=300
            )
        except FileNotFoundError:
            continue
        path = (result.stdout or "").strip()
        if path:
            return path
    raise FolderPickerError(
        "Instale zenity ou kdialog para seleção de pasta no Linux"
    )


def _pick_linux_tex(prompt: str) -> Optional[str]:
    for cmd in (
        [
            "zenity",
            "--file-selection",
            "--title",
            prompt,
            "--file-filter=LaTeX | *.tex *.bib *.sty *.cls",
        ],
        ["kdialog", "--getopenfilename", str(Path.home()), "*.tex"],
    ):
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, check=False, timeout=300
            )
        except FileNotFoundError:
            continue
        path = (result.stdout or "").strip()
        if path:
            return path
    raise FolderPickerError(
        "Instale zenity ou kdialog para seleção de arquivo no Linux"
    )


def _pick_windows_folder(prompt: str) -> Optional[str]:
    safe = prompt.replace("'", "''")
    ps = (
        "Add-Type -AssemblyName System.Windows.Forms; "
        "$f = New-Object System.Windows.Forms.FolderBrowserDialog; "
        f"$f.Description = '{safe}'; "
        "if ($f.ShowDialog() -eq 'OK') { $f.SelectedPath }"
    )
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", ps],
        capture_output=True,
        text=True,
        check=False,
        timeout=300,
    )
    path = (result.stdout or "").strip()
    return path or None


def _pick_windows_tex(prompt: str) -> Optional[str]:
    safe = prompt.replace("'", "''")
    ps = (
        "Add-Type -AssemblyName System.Windows.Forms; "
        "$f = New-Object System.Windows.Forms.OpenFileDialog; "
        f"$f.Title = '{safe}'; "
        "$f.Filter = 'LaTeX (*.tex)|*.tex|BibTeX (*.bib)|*.bib|All (*.*)|*.*'; "
        "if ($f.ShowDialog() -eq 'OK') { $f.FileName }"
    )
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", ps],
        capture_output=True,
        text=True,
        check=False,
        timeout=300,
    )
    path = (result.stdout or "").strip()
    return path or None
