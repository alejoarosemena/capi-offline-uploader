from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .api.uploads import router as uploads_router


def create_app() -> FastAPI:
    app = FastAPI(title="CAPI Offline CSV Uploader", version="0.1.0")

    # CORS configuration
    allowed_origins = [origin.strip() for origin in settings.cors_allowed_origins.split(",") if origin.strip()] if settings.cors_allowed_origins else ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    def health() -> dict:
        return {"status": "ok"}

    # Routers
    app.include_router(uploads_router, prefix="/api")

    return app


app = create_app()


