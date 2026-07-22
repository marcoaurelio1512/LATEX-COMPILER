from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import ai, compile, files, projects, system

api_router = APIRouter()
api_router.include_router(projects.router)
api_router.include_router(files.router)
api_router.include_router(compile.router)
api_router.include_router(system.router)
api_router.include_router(ai.router)
