from __future__ import annotations

import asyncio
import os
import signal
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

from app.core.config import settings
from app.core.logging import get_logger
from app.core.tex_env import enrich_process_env

logger = get_logger(__name__)


@dataclass
class ProcessResult:
    exit_code: Optional[int]
    stdout: str
    stderr: str
    timed_out: bool = False
    cancelled: bool = False
    duration_ms: int = 0


@dataclass
class RunningProcess:
    job_id: str
    process: asyncio.subprocess.Process
    cancelled: bool = False


class ProcessManager:
    def __init__(self) -> None:
        self._running: dict[str, RunningProcess] = {}
        self._lock = asyncio.Lock()

    async def start(
        self,
        job_id: str,
        args: List[str],
        *,
        cwd: Path,
        timeout: int,
        env: Optional[dict] = None,
    ) -> ProcessResult:
        async with self._lock:
            # one compile at a time per job id namespace; caller handles project queue
            pass

        start = time.monotonic()
        merged_env = enrich_process_env()
        if env:
            merged_env.update(env)

        logger.info("starting process", extra={"job_id": job_id, "event": "proc_start"})
        process = await asyncio.create_subprocess_exec(
            *args,
            cwd=str(cwd),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=merged_env,
            start_new_session=True,
        )
        running = RunningProcess(job_id=job_id, process=process)
        async with self._lock:
            self._running[job_id] = running

        timed_out = False
        cancelled = False
        try:
            try:
                stdout_b, stderr_b = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout,
                )
            except asyncio.TimeoutError:
                timed_out = True
                await self._kill(process)
                stdout_b, stderr_b = await process.communicate()
        except asyncio.CancelledError:
            cancelled = True
            await self._kill(process)
            stdout_b, stderr_b = await process.communicate()
            raise
        finally:
            async with self._lock:
                current = self._running.get(job_id)
                if current and current.process.pid == process.pid:
                    cancelled = cancelled or current.cancelled
                    self._running.pop(job_id, None)

        def clip(data: bytes) -> str:
            text = data.decode("utf-8", errors="replace")
            max_b = settings.max_log_capture_bytes
            if len(text.encode("utf-8")) > max_b:
                return text[:max_b] + "\n...[truncated]...\n"
            return text

        duration_ms = int((time.monotonic() - start) * 1000)
        return ProcessResult(
            exit_code=process.returncode,
            stdout=clip(stdout_b or b""),
            stderr=clip(stderr_b or b""),
            timed_out=timed_out,
            cancelled=cancelled,
            duration_ms=duration_ms,
        )

    async def cancel(self, job_id: str) -> bool:
        async with self._lock:
            running = self._running.get(job_id)
            if not running:
                return False
            running.cancelled = True
            process = running.process
        await self._kill(process)
        return True

    async def _kill(self, process: asyncio.subprocess.Process) -> None:
        if process.returncode is not None:
            return
        try:
            pgid = os.getpgid(process.pid)
            os.killpg(pgid, signal.SIGTERM)
        except (ProcessLookupError, PermissionError, OSError):
            try:
                process.terminate()
            except ProcessLookupError:
                return
        try:
            await asyncio.wait_for(process.wait(), timeout=3)
        except asyncio.TimeoutError:
            try:
                pgid = os.getpgid(process.pid)
                os.killpg(pgid, signal.SIGKILL)
            except (ProcessLookupError, PermissionError, OSError):
                try:
                    process.kill()
                except ProcessLookupError:
                    pass


process_manager = ProcessManager()
