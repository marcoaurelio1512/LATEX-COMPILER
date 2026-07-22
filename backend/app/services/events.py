from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional, Set

from app.schemas.common import WsEvent


class EventBus:
    """In-process pub/sub for WebSocket clients."""

    def __init__(self) -> None:
        self._subscribers: Set[asyncio.Queue] = set()
        self._lock = asyncio.Lock()

    async def subscribe(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        async with self._lock:
            self._subscribers.add(queue)
        return queue

    async def unsubscribe(self, queue: asyncio.Queue) -> None:
        async with self._lock:
            self._subscribers.discard(queue)

    async def publish(
        self,
        event_type: str,
        project_id: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
    ) -> None:
        event = WsEvent(
            type=event_type,
            project_id=project_id,
            payload=payload or {},
        )
        async with self._lock:
            dead: List[asyncio.Queue] = []
            for queue in self._subscribers:
                try:
                    queue.put_nowait(event)
                except asyncio.QueueFull:
                    dead.append(queue)
            for queue in dead:
                self._subscribers.discard(queue)


event_bus = EventBus()
