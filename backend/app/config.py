"""Environment-based settings. Nothing secret is hard-coded; see `.env.example`."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"
    brand_name: str = "Aurevia"

    # `mongomock://` runs an in-memory database (development/tests only).
    mongo_url: str = "mongodb://localhost:27017"
    mongo_db: str = "aurevia"

    jwt_secret: str = Field(default="", min_length=0)
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 8

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:4173"]
    public_site_url: str = "http://localhost:5173"

    upload_dir: str = "uploads"
    max_upload_mb: int = 8

    enquiry_rate_per_minute: int = 5
    enquiry_rate_per_hour: int = 20
    login_rate_per_minute: int = 10

    # Used only by `python -m app.seed` to create the first admin.
    seed_admin_email: str = "admin@aurevia.example"
    seed_admin_password: str = ""

    # Trust X-Forwarded-For (set to true behind Render/Railway/Vercel proxies).
    trust_proxy: bool = False

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str) and not value.startswith("["):
            return [v.strip() for v in value.split(",") if v.strip()]
        return value

    def validate_runtime(self) -> None:
        if self.environment == "production":
            if len(self.jwt_secret) < 32:
                raise RuntimeError("JWT_SECRET must be set to at least 32 characters in production")
            if self.mongo_url.startswith("mongomock://"):
                raise RuntimeError("mongomock:// is for development only")

    @property
    def effective_jwt_secret(self) -> str:
        # Development falls back to a per-process random secret so tokens never
        # rely on a value committed to the repo.
        return self.jwt_secret or _dev_secret()


@lru_cache
def _dev_secret() -> str:
    import secrets

    return secrets.token_urlsafe(48)


@lru_cache
def get_settings() -> Settings:
    return Settings()
