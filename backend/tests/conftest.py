import os

os.environ["MONGO_URL"] = "mongomock://"
os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET"] = "test-secret-" + "x" * 40
os.environ["SEED_ADMIN_EMAIL"] = "admin@test.example"
os.environ["SEED_ADMIN_PASSWORD"] = "correct-horse-battery"
os.environ["UPLOAD_DIR"] = os.path.join(os.path.dirname(__file__), ".uploads")

from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient

from app import db as db_module
from app.config import get_settings
from app.main import create_app
from app.ratelimit import limiter
from app.seed import seed


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    get_settings.cache_clear()
    db_module.reset_client()
    limiter.reset()
    app = create_app()
    async with app.router.lifespan_context(app):
        await seed(reset=True)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c


@pytest.fixture
async def admin_headers(client: AsyncClient) -> dict[str, str]:
    r = await client.post("/api/auth/login", json={"email": "admin@test.example", "password": "correct-horse-battery"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
