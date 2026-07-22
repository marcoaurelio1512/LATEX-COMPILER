from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.compiler.service import compilation_service
from app.core.config import settings
from app.core.database import init_db
from app.core.logging import setup_logging
from app.services.watcher import watcher_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    init_db()
    loop = asyncio.get_running_loop()
    watcher_service.start(loop)
    try:
        yield
    finally:
        await compilation_service.shutdown()
        watcher_service.stop()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix=settings.api_prefix)
    return app


app = create_app()
