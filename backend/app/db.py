"""Mongo connection handling. Uses Motor; `mongomock://` swaps in an in-memory DB."""

from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from .config import get_settings

_client: Any = None


def get_client() -> Any:
    global _client
    if _client is None:
        settings = get_settings()
        if settings.mongo_url.startswith("mongomock://"):
            from mongomock_motor import AsyncMongoMockClient

            _client = AsyncMongoMockClient(tz_aware=True)
        else:
            _client = AsyncIOMotorClient(settings.mongo_url, tz_aware=True, serverSelectionTimeoutMS=5000)
    return _client


def get_db() -> AsyncIOMotorDatabase:  # type: ignore[type-arg]
    return get_client()[get_settings().mongo_db]


def reset_client() -> None:
    """Drop the cached client (tests use this to get a fresh in-memory DB)."""
    global _client
    _client = None


async def ensure_indexes() -> None:
    db = get_db()
    await db.users.create_index("email", unique=True)
    await db.projects.create_index("slug", unique=True)
    await db.buildings.create_index([("project_id", 1), ("code", 1)], unique=True)
    await db.units.create_index([("project_id", 1), ("code", 1)], unique=True)
    await db.units.create_index([("project_id", 1), ("status", 1), ("price", 1)])
    await db.leads.create_index([("created_at", -1)])
    await db.leads.create_index("stage")
    await db.leads.create_index("email")
    await db.unit_views.create_index([("visitor_id", 1), ("at", -1)])
    await db.posts.create_index("slug", unique=True)
