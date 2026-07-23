from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import ai, compile, docs, files, projects, system, templates

api_router = APIRouter()
api_router.include_router(projects.router)
api_router.include_router(files.router)
api_router.include_router(compile.router)
api_router.include_router(system.router)
api_router.include_router(ai.router)
api_router.include_router(templates.router)
api_router.include_router(docs.router)
