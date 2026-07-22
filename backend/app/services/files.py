from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from app.core.config import settings
from app.core.paths import (
    PathSecurityError,
    is_ignored_dir,
    normalize_relative_path,
    relative_to_project,
    resolve_safe_project_path,
    sanitize_filename,
)
from app.schemas.common import FileContent, FileNode


class FileConflictError(RuntimeError):
    def __init__(self, message: str, disk_mtime: float, disk_content: str):
        super().__init__(message)
        self.disk_mtime = disk_mtime
        self.disk_content = disk_content


def _mtime(path: Path) -> datetime:
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)


def is_editable(path: Path) -> bool:
    return path.suffix.lower() in settings.editable_extensions


def build_tree(project_root: Path) -> FileNode:
    root = project_root.resolve()
    ignored = settings.ignored_dir_names

    def walk(directory: Path) -> List[FileNode]:
        nodes: List[FileNode] = []
        try:
            entries = sorted(
                directory.iterdir(),
                key=lambda p: (not p.is_dir(), p.name.lower()),
            )
        except OSError:
            return nodes
        for entry in entries:
            name = entry.name
            if entry.is_dir() and is_ignored_dir(name, ignored):
                continue
            if name.startswith(".") and name != ".latex-local.json":
                continue
            rel = relative_to_project(root, entry)
            if entry.is_dir():
                nodes.append(
                    FileNode(
                        name=name,
                        path=rel,
                        type="directory",
                        modified_at=_mtime(entry),
                        children=walk(entry),
                    )
                )
            else:
                try:
                    size = entry.stat().st_size
                except OSError:
                    size = None
                nodes.append(
                    FileNode(
                        name=name,
                        path=rel,
                        type="file",
                        extension=entry.suffix.lower() or None,
                        size=size,
                        modified_at=_mtime(entry),
                    )
                )
        return nodes

    return FileNode(
        name=root.name,
        path="",
        type="directory",
        modified_at=_mtime(root),
        children=walk(root),
    )


def read_file(project_root: Path, relative_path: str) -> FileContent:
    path = resolve_safe_project_path(project_root, relative_path)
    if not path.exists() or not path.is_file():
        raise FileNotFoundError(relative_path)
    if path.stat().st_size > settings.max_file_size_bytes:
        raise PathSecurityError("Arquivo excede o tamanho máximo permitido")
    if not is_editable(path):
        raise PathSecurityError("Extensão não editável nesta interface")
    content = path.read_text(encoding="utf-8")
    return FileContent(
        path=normalize_relative_path(relative_path),
        content=content,
        size=path.stat().st_size,
        modified_at=_mtime(path),
        editable=True,
    )


def write_file(
    project_root: Path,
    relative_path: str,
    content: str,
    expected_mtime: Optional[float] = None,
    force: bool = False,
) -> FileContent:
    path = resolve_safe_project_path(project_root, relative_path)
    if path.suffix.lower() not in settings.editable_extensions:
        raise PathSecurityError("Extensão não permitida para escrita")
    data = content.encode("utf-8")
    if len(data) > settings.max_file_size_bytes:
        raise PathSecurityError("Conteúdo excede o tamanho máximo permitido")
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and expected_mtime is not None and not force:
        disk_mtime = path.stat().st_mtime
        if abs(disk_mtime - expected_mtime) > 0.001:
            disk_content = path.read_text(encoding="utf-8", errors="replace")
            raise FileConflictError(
                "O arquivo foi modificado no disco",
                disk_mtime=disk_mtime,
                disk_content=disk_content,
            )
    path.write_bytes(data)
    return read_file(project_root, relative_path)


def create_entry(
    project_root: Path,
    relative_path: str,
    content: str = "",
    is_directory: bool = False,
) -> FileNode:
    path = resolve_safe_project_path(project_root, relative_path)
    if path.exists():
        raise FileExistsError(relative_path)
    if is_directory:
        path.mkdir(parents=True, exist_ok=False)
        return FileNode(
            name=path.name,
            path=relative_to_project(project_root, path),
            type="directory",
        )
    allowed = settings.editable_extensions + settings.binary_upload_extensions
    if path.suffix.lower() not in allowed:
        raise PathSecurityError("Extensão não permitida")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return FileNode(
        name=path.name,
        path=relative_to_project(project_root, path),
        type="file",
        extension=path.suffix.lower() or None,
        size=path.stat().st_size,
        modified_at=_mtime(path),
    )


def mkdir(project_root: Path, relative_path: str) -> FileNode:
    return create_entry(project_root, relative_path, is_directory=True)


def delete_entry(project_root: Path, relative_path: str) -> None:
    path = resolve_safe_project_path(project_root, relative_path)
    if not path.exists():
        raise FileNotFoundError(relative_path)
    if path.resolve() == project_root.resolve():
        raise PathSecurityError("Não é permitido excluir a raiz do projeto")
    if path.is_dir():
        shutil.rmtree(path)
    else:
        path.unlink()


def rename_entry(
    project_root: Path,
    relative_path: str,
    new_relative_path: str,
) -> FileNode:
    src = resolve_safe_project_path(project_root, relative_path)
    dst = resolve_safe_project_path(project_root, new_relative_path)
    if not src.exists():
        raise FileNotFoundError(relative_path)
    if dst.exists():
        raise FileExistsError(new_relative_path)
    dst.parent.mkdir(parents=True, exist_ok=True)
    src.rename(dst)
    if dst.is_dir():
        return FileNode(
            name=dst.name,
            path=relative_to_project(project_root, dst),
            type="directory",
        )
    return FileNode(
        name=dst.name,
        path=relative_to_project(project_root, dst),
        type="file",
        extension=dst.suffix.lower() or None,
        size=dst.stat().st_size,
        modified_at=_mtime(dst),
    )


def duplicate_entry(project_root: Path, relative_path: str) -> FileNode:
    src = resolve_safe_project_path(project_root, relative_path)
    if not src.exists() or not src.is_file():
        raise FileNotFoundError(relative_path)
    stem = src.stem
    suffix = src.suffix
    parent = src.parent
    i = 1
    while True:
        extra = "" if i == 1 else f" {i}"
        candidate = parent / f"{stem} copy{extra}{suffix}"
        if not candidate.exists():
            break
        i += 1
    shutil.copy2(src, candidate)
    return FileNode(
        name=candidate.name,
        path=relative_to_project(project_root, candidate),
        type="file",
        extension=candidate.suffix.lower() or None,
        size=candidate.stat().st_size,
        modified_at=_mtime(candidate),
    )


def save_upload(
    project_root: Path,
    relative_dir: str,
    filename: str,
    data: bytes,
) -> FileNode:
    safe_name = sanitize_filename(filename)
    ext = Path(safe_name).suffix.lower()
    allowed = settings.binary_upload_extensions + settings.editable_extensions
    if ext not in allowed:
        raise PathSecurityError("Tipo de arquivo não permitido para upload")
    if len(data) > settings.max_file_size_bytes:
        raise PathSecurityError("Upload excede o tamanho máximo")
    base = normalize_relative_path(relative_dir)
    rel = f"{base}/{safe_name}".strip("/") if base else safe_name
    path = resolve_safe_project_path(project_root, rel)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return FileNode(
        name=path.name,
        path=relative_to_project(project_root, path),
        type="file",
        extension=ext or None,
        size=path.stat().st_size,
        modified_at=_mtime(path),
    )


def search_files(project_root: Path, query: str) -> List[str]:
    q = query.lower().strip()
    if not q:
        return []
    matches: List[str] = []

    def walk(node: FileNode) -> None:
        if node.type == "file" and q in node.name.lower():
            matches.append(node.path)
        for child in node.children or []:
            walk(child)

    walk(build_tree(project_root))
    return matches
