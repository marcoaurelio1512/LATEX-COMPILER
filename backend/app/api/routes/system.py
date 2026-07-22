from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.schemas.common import SystemDiagnostics
from app.services.diagnostics import run_system_diagnostics
from app.services.events import event_bus

router = APIRouter(tags=["system"])


@router.get("/system/diagnostics", response_model=SystemDiagnostics)
def api_diagnostics():
    return run_system_diagnostics()


@router.get("/health")
def api_health():
    return {"status": "ok", "service": "latex-studio-local"}


@router.websocket("/ws")
async def websocket_events(ws: WebSocket):
    await ws.accept()
    queue = await event_bus.subscribe()
    try:
        while True:
            event = await queue.get()
            await ws.send_json(event.model_dump(mode="json"))
    except WebSocketDisconnect:
        pass
    finally:
        await event_bus.unsubscribe(queue)
