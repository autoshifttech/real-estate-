import csv
import io

from httpx import AsyncClient

from app.db import get_db
from app.security import hash_password


async def test_auth_required(client: AsyncClient) -> None:
    assert (await client.get("/api/admin/leads")).status_code == 401
    bad = {"Authorization": "Bearer nonsense"}
    assert (await client.get("/api/admin/leads", headers=bad)).status_code == 401


async def test_login(client: AsyncClient) -> None:
    r = await client.post("/api/auth/login", json={"email": "admin@test.example", "password": "wrong-password"})
    assert r.status_code == 401
    r = await client.post("/api/auth/login", json={"email": "nobody@test.example", "password": "whatever"})
    assert r.status_code == 401
    r = await client.post("/api/auth/login", json={"email": "admin@test.example", "password": "correct-horse-battery"})
    assert r.status_code == 200
    assert "password_hash" not in r.json()["user"]
    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"})
    assert me.json()["role"] == "admin"


async def test_password_is_hashed(client: AsyncClient) -> None:
    user = await get_db().users.find_one({"email": "admin@test.example"})
    assert user is not None
    assert user["password_hash"].startswith("$2")
    assert "correct-horse-battery" not in user["password_hash"]


async def test_leads_list_filter_sort(client: AsyncClient, admin_headers: dict[str, str]) -> None:
    r = await client.get("/api/admin/leads", headers=admin_headers, params={"page_size": 100})
    data = r.json()
    assert data["total"] == 25 and len(data["items"]) == 25
    dates = [i["created_at"] for i in data["items"]]
    assert dates == sorted(dates, reverse=True)
    new = (await client.get("/api/admin/leads", headers=admin_headers, params={"stage": "new"})).json()
    assert new["total"] == 7
    search = (await client.get("/api/admin/leads", headers=admin_headers, params={"q": "okafor"})).json()
    assert search["total"] == 1
    bad = await client.get("/api/admin/leads", headers=admin_headers, params={"sort": "password_hash"})
    assert bad.status_code == 422


async def test_lead_stage_and_notes(client: AsyncClient, admin_headers: dict[str, str]) -> None:
    lead = (await client.get("/api/admin/leads", headers=admin_headers, params={"stage": "new"})).json()["items"][0]
    r = await client.patch(f"/api/admin/leads/{lead['id']}", headers=admin_headers, json={"stage": "viewing"})
    assert r.status_code == 200
    assert r.json()["stage"] == "viewing"
    assert "Stage changed" in r.json()["notes"][-1]["body"]
    r = await client.post(
        f"/api/admin/leads/{lead['id']}/notes", headers=admin_headers, json={"body": "Booked Sat 11:00"}
    )
    assert r.status_code == 201
    detail = (await client.get(f"/api/admin/leads/{lead['id']}", headers=admin_headers)).json()
    assert detail["notes"][-1]["body"] == "Booked Sat 11:00"
    bad = await client.patch(f"/api/admin/leads/{lead['id']}", headers=admin_headers, json={"stage": "maybe"})
    assert bad.status_code == 422


async def test_create_and_delete_lead(client: AsyncClient, admin_headers: dict[str, str]) -> None:
    r = await client.post(
        "/api/admin/leads",
        headers=admin_headers,
        json={"name": "Walk In", "email": "walk@example.org", "source": "walk_in"},
    )
    assert r.status_code == 201
    lead_id = r.json()["id"]
    assert (await client.delete(f"/api/admin/leads/{lead_id}", headers=admin_headers)).status_code == 204
    assert (await client.get(f"/api/admin/leads/{lead_id}", headers=admin_headers)).status_code == 404


async def test_csv_export(client: AsyncClient, admin_headers: dict[str, str]) -> None:
    await client.post(
        "/api/admin/leads", headers=admin_headers, json={"name": "=HYPERLINK(1)", "email": "csv@example.org"}
    )
    r = await client.get("/api/admin/leads/export.csv", headers=admin_headers)
    assert r.status_code == 200
    rows = list(csv.reader(io.StringIO(r.text)))
    assert rows[0][0] == "name"
    assert len(rows) == 27
    assert any(row[0] == "'=HYPERLINK(1)" for row in rows)


async def test_stats(client: AsyncClient, admin_headers: dict[str, str]) -> None:
    s = (await client.get("/api/admin/stats", headers=admin_headers)).json()
    assert s["leads_total"] == 25
    assert len(s["leads_per_day"]) == 30
    assert s["units_by_status"] == {"available": 24, "reserved": 8, "sold": 8}
    assert s["pipeline"]["won"] == 2
    assert s["conversion_rate"] == round(2 / 25, 4)
    assert s["win_rate"] == 0.5


async def test_cms_units_and_bulk_price(client: AsyncClient, admin_headers: dict[str, str]) -> None:
    projects = (await client.get("/api/admin/projects", headers=admin_headers)).json()
    pid = projects[0]["id"]
    units = (await client.get("/api/admin/units", headers=admin_headers, params={"project_id": pid})).json()
    unit = next(u for u in units if u["status"] == "available")
    r = await client.patch(
        f"/api/admin/units/{unit['id']}",
        headers=admin_headers,
        json={"status": "reserved", "price": unit["price"] + 10_000},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "reserved"
    assert r.json()["price_history"][0]["price"] == unit["price"]

    available = [u for u in units if u["status"] == "available" and u["id"] != unit["id"]]
    r = await client.post(
        "/api/admin/units/bulk-price", headers=admin_headers, json={"project_id": pid, "percent": 10, "round_to": 1000}
    )
    assert r.json()["updated"] == len(available)
    after = {u["id"]: u for u in (await client.get("/api/admin/units", headers=admin_headers)).json()}
    for u in available:
        assert after[u["id"]]["price"] == round(u["price"] * 1.1 / 1000) * 1000

    bad = await client.post(
        "/api/admin/units/bulk-price", headers=admin_headers, json={"project_id": pid, "percent": 5, "amount": 1000}
    )
    assert bad.status_code == 422


async def test_cms_project_building_unit_crud(client: AsyncClient, admin_headers: dict[str, str]) -> None:
    r = await client.post(
        "/api/admin/projects",
        headers=admin_headers,
        json={"slug": "harbour-lofts", "name": "Harbour Lofts", "published": False},
    )
    assert r.status_code == 201
    pid = r.json()["id"]
    dup = await client.post("/api/admin/projects", headers=admin_headers, json={"slug": "harbour-lofts", "name": "X Y"})
    assert dup.status_code == 409
    # Unpublished projects are hidden from the public API.
    assert (await client.get("/api/projects/harbour-lofts")).status_code == 404

    r = await client.post(
        "/api/admin/buildings",
        headers=admin_headers,
        json={"project_id": pid, "code": "N", "name": "North", "floors": 3, "units_per_floor": 2},
    )
    bid = r.json()["id"]
    r = await client.post(
        "/api/admin/units",
        headers=admin_headers,
        json={
            "building_id": bid,
            "code": "N-101",
            "floor": 1,
            "position": 1,
            "beds": 2,
            "baths": 2,
            "area_sqm": 90,
            "price": 500000,
            "plan_type": "B2",
        },
    )
    assert r.status_code == 201
    uid = r.json()["id"]
    assert (await client.delete(f"/api/admin/buildings/{bid}", headers=admin_headers)).status_code == 409
    assert (await client.delete(f"/api/admin/units/{uid}", headers=admin_headers)).status_code == 204
    assert (await client.delete(f"/api/admin/buildings/{bid}", headers=admin_headers)).status_code == 204
    assert (await client.delete(f"/api/admin/projects/{pid}", headers=admin_headers)).status_code == 204


async def test_blog_crud_sanitises_html(client: AsyncClient, admin_headers: dict[str, str]) -> None:
    r = await client.post(
        "/api/admin/posts",
        headers=admin_headers,
        json={
            "slug": "hello-world",
            "title": "Hello",
            "published": True,
            "body": '<p onclick="x()">Hi <script>alert(1)</script><a href="javascript:alert(1)">x</a></p>',
        },
    )
    assert r.status_code == 201
    body = r.json()["body"]
    assert "script" not in body and "onclick" not in body and "javascript" not in body
    assert r.json()["published_at"]
    assert (await client.get("/api/posts/hello-world")).status_code == 200


async def test_agent_cannot_edit_cms(client: AsyncClient) -> None:
    await get_db().users.insert_one(
        {
            "email": "agent@test.example",
            "name": "Agent",
            "role": "agent",
            "password_hash": hash_password("agent-password-1"),
        }
    )
    token = (
        await client.post("/api/auth/login", json={"email": "agent@test.example", "password": "agent-password-1"})
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert (await client.get("/api/admin/leads", headers=headers)).status_code == 200
    r = await client.post("/api/admin/projects", headers=headers, json={"slug": "nope-nope", "name": "Nope"})
    assert r.status_code == 403
    units = (await client.get("/api/admin/units", headers=headers)).json()
    assert (
        await client.patch(f"/api/admin/units/{units[0]['id']}", headers=headers, json={"status": "sold"})
    ).status_code == 200
    assert (
        await client.patch(f"/api/admin/units/{units[0]['id']}", headers=headers, json={"price": 1})
    ).status_code == 403


async def test_upload_rejects_non_images(client: AsyncClient, admin_headers: dict[str, str]) -> None:
    r = await client.post(
        "/api/admin/uploads", headers=admin_headers, files={"file": ("x.png", b"<?php echo 1; ?>", "image/png")}
    )
    assert r.status_code == 415
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (40, 30), (200, 150, 90)).save(buf, "PNG")
    r = await client.post(
        "/api/admin/uploads", headers=admin_headers, files={"file": ("ok.png", buf.getvalue(), "image/png")}
    )
    assert r.status_code == 201
    assert r.json()["url"].endswith(".webp")
