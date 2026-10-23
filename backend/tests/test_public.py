from httpx import AsyncClient


async def test_health(client: AsyncClient) -> None:
    r = await client.get("/api/health")
    assert r.json() == {"status": "ok"}


async def test_projects_and_detail(client: AsyncClient) -> None:
    r = await client.get("/api/projects")
    assert r.status_code == 200
    projects = r.json()
    assert len(projects) == 1
    p = projects[0]
    assert p["slug"] == "calanthe-bay"
    assert sum(p["unit_counts"].values()) == 40
    assert p["unit_counts"] == {"available": 24, "reserved": 8, "sold": 8}
    assert p["price_from"] > 0

    r = await client.get("/api/projects/calanthe-bay")
    assert r.status_code == 200
    assert [b["code"] for b in r.json()["buildings"]] == ["A", "B"]

    assert (await client.get("/api/projects/nope")).status_code == 404


async def test_unit_filters(client: AsyncClient) -> None:
    all_units = (await client.get("/api/projects/calanthe-bay/units")).json()
    assert len(all_units) == 40
    a = (await client.get("/api/projects/calanthe-bay/units", params={"building": "A"})).json()
    assert len(a) == 20 and all(u["code"].startswith("A-") for u in a)
    beds = (await client.get("/api/projects/calanthe-bay/units", params=[("beds", 3), ("beds", 4)])).json()
    assert beds and all(u["beds"] in (3, 4) for u in beds)
    priced = (await client.get("/api/projects/calanthe-bay/units", params={"max_price": 1_200_000})).json()
    assert priced and all(u["price"] <= 1_200_000 for u in priced)
    floors = (await client.get("/api/projects/calanthe-bay/units", params={"floor_min": 4, "floor_max": 5})).json()
    assert len(floors) == 16
    avail = (await client.get("/api/projects/calanthe-bay/units", params={"status": "available"})).json()
    assert len(avail) == 24
    bad = await client.get("/api/projects/calanthe-bay/units", params={"status": "bogus"})
    assert bad.status_code == 422


async def test_unit_detail_and_plan(client: AsyncClient) -> None:
    units = (await client.get("/api/projects/calanthe-bay/units")).json()
    r = await client.get(f"/api/units/{units[0]['id']}")
    assert r.status_code == 200
    unit = r.json()
    assert unit["plan"]["type"] == unit["plan_type"]
    assert unit["building"]["code"] == "A"
    assert (await client.get("/api/units/not-an-id")).status_code == 404
    assert (await client.get("/api/plans/P4")).json()["beds"] == 4


async def test_brochure_pdf(client: AsyncClient) -> None:
    units = (await client.get("/api/projects/calanthe-bay/units")).json()
    r = await client.get(f"/api/units/{units[5]['id']}/brochure.pdf", params={"name": "<b>Ada</b> Lovelace"})
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content.startswith(b"%PDF")
    assert len(r.content) > 10_000


async def test_blog(client: AsyncClient) -> None:
    posts = (await client.get("/api/posts")).json()
    assert len(posts) == 3 and "body" not in posts[0]
    detail = (await client.get(f"/api/posts/{posts[0]['slug']}")).json()
    assert "<p>" in detail["body"]
