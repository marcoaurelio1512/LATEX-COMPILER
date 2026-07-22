from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional

from sqlmodel import Session, select

from app.compiler.commands import build_clean_args, build_latexmk_args
from app.compiler.docker_runner import build_docker_args
from app.compiler.runner import process_manager
from app.core.config import settings
from app.core import database as db_module
from app.core.logging import get_logger
from app.core.paths import project_build_dir, resolve_safe_project_path
from app.log_parser.parser import parse_with_meta
from app.models.db import CompilationJob, Project, new_id, utcnow
from app.schemas.common import CompilationJobOut, CompileRequest, Diagnostic
from app.services.events import event_bus
from app.services.project_config import load_project_config

logger = get_logger(__name__)


class CompilationService:
    def __init__(self) -> None:
        self._project_locks: Dict[str, asyncio.Lock] = {}
        self._pending: Dict[str, bool] = {}
        self._active_job: Dict[str, str] = {}
        self._diagnostics_cache: Dict[str, list] = {}
        self._logs_cache: Dict[str, str] = {}
        self._tasks: Dict[str, asyncio.Task] = {}

    def _lock_for(self, project_id: str) -> asyncio.Lock:
        if project_id not in self._project_locks:
            self._project_locks[project_id] = asyncio.Lock()
        return self._project_locks[project_id]

    async def shutdown(self) -> None:
        """Cancela jobs em andamento para o uvicorn não ficar preso no reload."""
        job_ids = list(self._active_job.values())
        for job_id in job_ids:
            try:
                await process_manager.cancel(job_id)
            except Exception:
                pass
        tasks = list(self._tasks.values())
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        self._tasks.clear()
        self._pending.clear()
        self._active_job.clear()

    def get_cached_diagnostics(self, job_id: str) -> list:
        return self._diagnostics_cache.get(job_id, [])

    def get_cached_log(self, job_id: str) -> str:
        return self._logs_cache.get(job_id, "")

    def job_to_out(self, job: CompilationJob, compile_pending: bool = False) -> CompilationJobOut:
        return CompilationJobOut(
            job_id=job.id,
            project_id=job.project_id,
            status=job.status,  # type: ignore[arg-type]
            engine=job.engine,  # type: ignore[arg-type]
            main_file=job.main_file,
            started_at=job.started_at,
            finished_at=job.finished_at,
            duration_ms=job.duration_ms,
            exit_code=job.exit_code,
            error_count=job.error_count,
            warning_count=job.warning_count,
            log_path=job.log_path,
            pdf_path=job.pdf_path,
            synctex_path=job.synctex_path,
            diagnostics=self.get_cached_diagnostics(job.id),
            compile_pending=compile_pending or self._pending.get(job.project_id, False),
        )

    async def enqueue(
        self,
        project_id: str,
        request: Optional[CompileRequest] = None,
        *,
        clean: bool = False,
    ) -> CompilationJobOut:
        request = request or CompileRequest()
        if clean:
            request.clean = True

        with Session(db_module.engine) as session:
            project = session.get(Project, project_id)
            if not project:
                raise LookupError("Projeto não encontrado")
            root = Path(project.root_path)
            config = load_project_config(root)
            engine = request.engine or config.engine
            mode = request.compiler_mode or config.compiler_mode
            main_file = request.main_file or config.main_file or project.main_file
            if not main_file:
                raise ValueError("Arquivo principal não definido")
            # validate main stays in project
            resolve_safe_project_path(root, main_file)

            cancel_prev = config.cancel_previous_on_new
            timeout = config.timeout_seconds or settings.default_timeout_seconds
            synctex = config.synctex
            halt_on_error = config.halt_on_error

            # Coalesce: se já há job rodando/enfileirado, não cria outro processo.
            active = self._active_job.get(project_id)
            lock_busy = self._lock_for(project_id).locked()
            if active or lock_busy:
                self._pending[project_id] = True
                job = session.get(CompilationJob, active) if active else None
                if not job:
                    latest = session.exec(
                        select(CompilationJob)
                        .where(CompilationJob.project_id == project_id)
                        .order_by(CompilationJob.created_at.desc())
                    ).first()
                    job = latest
                out = self.job_to_out(job, compile_pending=True) if job else None
            else:
                job = CompilationJob(
                    id=new_id(),
                    project_id=project_id,
                    status="queued",
                    engine=engine,
                    main_file=main_file,
                )
                session.add(job)
                session.commit()
                session.refresh(job)
                # Reserva o slot antes do create_task (evita corrida).
                self._active_job[project_id] = job.id
                out = self.job_to_out(job)
                job_id = job.id

        if active or lock_busy:
            if active and cancel_prev:
                await process_manager.cancel(active)
            if out is not None:
                return out

        # Garante job criado (caminho normal ou fallback sem histórico).
        if out is None or not self._active_job.get(project_id):
            with Session(db_module.engine) as session:
                project = session.get(Project, project_id)
                if not project:
                    raise LookupError("Projeto não encontrado")
                job = CompilationJob(
                    id=new_id(),
                    project_id=project_id,
                    status="queued",
                    engine=engine,
                    main_file=main_file,
                )
                session.add(job)
                session.commit()
                session.refresh(job)
                self._active_job[project_id] = job.id
                out = self.job_to_out(job)
                job_id = job.id
        else:
            job_id = self._active_job[project_id]

        task = asyncio.create_task(
            self._run_job(
                project_id=project_id,
                job_id=job_id,
                engine=engine,
                mode=mode,
                main_file=main_file,
                clean=bool(request.clean),
                timeout=timeout,
                synctex=synctex,
                halt_on_error=halt_on_error,
            )
        )
        self._tasks[job_id] = task

        def _cleanup(t: asyncio.Task, jid: str = job_id) -> None:
            self._tasks.pop(jid, None)

        task.add_done_callback(_cleanup)
        return out

    async def _run_job(
        self,
        *,
        project_id: str,
        job_id: str,
        engine: str,
        mode: str,
        main_file: str,
        clean: bool,
        timeout: int,
        synctex: bool,
        halt_on_error: bool,
    ) -> None:
        lock = self._lock_for(project_id)
        async with lock:
            self._pending[project_id] = False
            self._active_job[project_id] = job_id
            try:
                await self._execute(
                    project_id=project_id,
                    job_id=job_id,
                    engine=engine,
                    mode=mode,
                    main_file=main_file,
                    clean=clean,
                    timeout=timeout,
                    synctex=synctex,
                    halt_on_error=halt_on_error,
                )
            finally:
                if self._active_job.get(project_id) == job_id:
                    self._active_job.pop(project_id, None)

        # Fora do lock: senão o coalesce vê lock_busy e nunca recompila o pending.
        if self._pending.get(project_id):
            self._pending[project_id] = False
            await self.enqueue(project_id)

    async def _execute(
        self,
        *,
        project_id: str,
        job_id: str,
        engine: str,
        mode: str,
        main_file: str,
        clean: bool,
        timeout: int,
        synctex: bool,
        halt_on_error: bool,
    ) -> None:
        with Session(db_module.engine) as session:
            project = session.get(Project, project_id)
            job = session.get(CompilationJob, job_id)
            if not project or not job:
                return
            root = Path(project.root_path)
            build_dir = project_build_dir(root)
            job.status = "preparing"
            job.started_at = utcnow()
            session.add(job)
            session.commit()

        await event_bus.publish(
            "compilation.status",
            project_id,
            {"job_id": job_id, "status": "preparing"},
        )

        latex_args = build_latexmk_args(
            engine=engine,  # type: ignore[arg-type]
            main_file=main_file,
            synctex=synctex,
            halt_on_error=halt_on_error,
            out_dir=build_dir,
        )

        if mode == "docker":
            run_args = build_docker_args(project_root=root, latexmk_args=latex_args)
            # outdir inside container must be relative to /workspace
            # rewrite -outdir/-auxdir to container paths
            run_args = [
                a.replace(str(build_dir), "/workspace/.latex-local/build")
                if str(build_dir) in a
                else a
                for a in run_args
            ]
            cwd = root
        else:
            run_args = latex_args
            cwd = root

        if clean:
            clean_args = build_clean_args(build_dir, main_file)
            if mode == "docker":
                clean_args = build_docker_args(project_root=root, latexmk_args=clean_args)
                clean_args = [
                    a.replace(str(build_dir), "/workspace/.latex-local/build")
                    if str(build_dir) in a
                    else a
                    for a in clean_args
                ]
            await process_manager.start(
                f"{job_id}-clean",
                clean_args,
                cwd=cwd,
                timeout=min(60, timeout),
            )

        with Session(db_module.engine) as session:
            job = session.get(CompilationJob, job_id)
            if job:
                job.status = "compiling"
                session.add(job)
                session.commit()

        await event_bus.publish(
            "compilation.status",
            project_id,
            {"job_id": job_id, "status": "compiling"},
        )

        result = await process_manager.start(
            job_id,
            run_args,
            cwd=cwd,
            timeout=timeout,
        )

        log_text = result.stdout
        if result.stderr:
            log_text = (log_text + "\n" + result.stderr).strip()

        # Prefer latex log file if present
        main_stem = Path(main_file).stem
        log_file = build_dir / f"{main_stem}.log"
        if log_file.exists():
            try:
                file_log = log_file.read_text(encoding="utf-8", errors="replace")
                log_text = file_log + "\n" + log_text
            except OSError:
                pass

        status = "completed"
        if result.cancelled:
            status = "cancelled"
        elif result.timed_out:
            status = "timeout"
        elif result.exit_code not in (0, None):
            status = "failed"

        diagnostics, err_count, warn_count = parse_with_meta(log_text, status=status)
        if status == "completed" and err_count > 0:
            status = "failed"

        pdf_path = build_dir / f"{main_stem}.pdf"
        synctex_path = build_dir / f"{main_stem}.synctex.gz"
        captured_log = build_dir / f"{main_stem}.studio.log"
        try:
            captured_log.write_text(log_text, encoding="utf-8")
        except OSError:
            captured_log = log_file if log_file.exists() else None

        self._diagnostics_cache[job_id] = diagnostics
        self._logs_cache[job_id] = log_text

        with Session(db_module.engine) as session:
            job = session.get(CompilationJob, job_id)
            if not job:
                return
            job.status = status
            job.finished_at = utcnow()
            job.duration_ms = result.duration_ms
            job.exit_code = result.exit_code
            job.error_count = err_count
            job.warning_count = warn_count
            job.log_path = str(captured_log) if captured_log else None
            job.pdf_path = str(pdf_path) if pdf_path.exists() else None
            job.synctex_path = str(synctex_path) if synctex_path.exists() else None
            session.add(job)
            session.commit()
            out = self.job_to_out(job)

        await event_bus.publish(
            "compilation.status",
            project_id,
            {"job_id": job_id, "status": status, "job": out.model_dump(mode="json")},
        )
        if out.pdf_path:
            await event_bus.publish(
                "pdf.updated",
                project_id,
                {
                    "pdf_version": int(datetime.now(timezone.utc).timestamp()),
                    "job_id": job_id,
                },
            )

    async def cancel(self, job_id: str) -> bool:
        return await process_manager.cancel(job_id)

    def get_job(self, job_id: str) -> Optional[CompilationJobOut]:
        with Session(db_module.engine) as session:
            job = session.get(CompilationJob, job_id)
            if not job:
                return None
            return self.job_to_out(job)

    def latest_pdf(self, project_id: str) -> Optional[Path]:
        with Session(db_module.engine) as session:
            project = session.get(Project, project_id)
            if not project:
                return None
            root = Path(project.root_path)
            jobs = session.exec(
                select(CompilationJob)
                .where(CompilationJob.project_id == project_id)
                .where(CompilationJob.pdf_path.is_not(None))  # type: ignore[attr-defined]
                .order_by(CompilationJob.created_at.desc())
            ).all()
            for job in jobs:
                if job.pdf_path and Path(job.pdf_path).exists():
                    return Path(job.pdf_path)
            # fallback: build dir
            config = load_project_config(root)
            main = config.main_file or project.main_file
            if not main:
                return None
            candidate = project_build_dir(root) / f"{Path(main).stem}.pdf"
            return candidate if candidate.exists() else None


compilation_service = CompilationService()
