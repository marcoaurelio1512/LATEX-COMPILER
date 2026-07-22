from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Dict, Optional

from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

from app.core.config import settings
from app.core.logging import get_logger
from app.core.paths import relative_to_project
from app.services.events import event_bus

logger = get_logger(__name__)


class ProjectHandler(FileSystemEventHandler):
    def __init__(self, project_id: str, root: Path, loop: asyncio.AbstractEventLoop):
        super().__init__()
        self.project_id = project_id
        self.root = root.resolve()
        self.loop = loop

    def _emit(self, event_type: str, src: str) -> None:
        try:
            path = Path(src)
            if any(part in settings.ignored_dir_names for part in path.parts):
                return
            if ".latex-local" in path.parts:
                return
            rel = relative_to_project(self.root, path) if path.exists() or True else src
            try:
                rel = relative_to_project(self.root, Path(src))
            except Exception:
                return
            asyncio.run_coroutine_threadsafe(
                event_bus.publish(
                    event_type,
                    self.project_id,
                    {"path": rel},
                ),
                self.loop,
            )
        except Exception as exc:
            logger.warning("watcher emit failed: %s", exc)

    def on_modified(self, event: FileSystemEvent) -> None:
        if event.is_directory:
            return
        self._emit("fs.modified", event.src_path)

    def on_created(self, event: FileSystemEvent) -> None:
        self._emit("fs.created", event.src_path)

    def on_deleted(self, event: FileSystemEvent) -> None:
        self._emit("fs.deleted", event.src_path)

    def on_moved(self, event: FileSystemEvent) -> None:
        self._emit("fs.deleted", event.src_path)
        dest = getattr(event, "dest_path", None)
        if dest:
            self._emit("fs.created", dest)


class WatcherService:
    def __init__(self) -> None:
        self._observer: Optional[Observer] = None
        self._watches: Dict[str, object] = {}
        self._roots: Dict[str, Path] = {}
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def start(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop
        self._observer = Observer()
        self._observer.daemon = True
        self._observer.start()

    def stop(self) -> None:
        if self._observer:
            self._observer.stop()
            self._observer.join(timeout=5)
            self._observer = None

    def watch_project(self, project_id: str, root: Path) -> None:
        if not self._observer or not self._loop:
            return
        if project_id in self._watches:
            return
        handler = ProjectHandler(project_id, root, self._loop)
        watch = self._observer.schedule(handler, str(root), recursive=True)
        self._watches[project_id] = watch
        self._roots[project_id] = root.resolve()
        logger.info("watching project", extra={"project_id": project_id, "event": "watch"})

    def unwatch_project(self, project_id: str) -> None:
        if not self._observer:
            return
        watch = self._watches.pop(project_id, None)
        self._roots.pop(project_id, None)
        if watch:
            self._observer.unschedule(watch)


watcher_service = WatcherService()
