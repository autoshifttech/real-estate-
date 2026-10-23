from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .db import ensure_indexes
from .routers import auth, cms, leads, public, stats, uploads


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    settings.validate_runtime()
    await ensure_indexes()
    if settings.mongo_url.startswith("mongomock://"):
        # In-memory dev mode: seed on boot so the site has content.
        from .seed import seed

        await seed(reset=False)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=f"{settings.brand_name} API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/api/docs" if settings.environment != "production" else None,
        openapi_url="/api/openapi.json" if settings.environment != "production" else None,
    )
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
        max_age=600,
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next):  # type: ignore[no-untyped-def]
        response: Response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("X-Frame-Options", "DENY")
        if request.url.path.startswith("/api/admin") or request.url.path.startswith("/api/auth"):
            response.headers.setdefault("Cache-Control", "no-store")
        elif request.method == "GET" and request.url.path.startswith("/api/"):
            response.headers.setdefault("Cache-Control", "public, max-age=30, stale-while-revalidate=300")
        return response

    for router in (public.router, auth.router, leads.router, cms.router, stats.router, uploads.router):
        app.include_router(router, prefix="/api")

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")
    return app


app = create_app()
