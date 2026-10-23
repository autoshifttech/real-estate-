from httpx import AsyncClient

from app.db import get_db
from app.ratelimit import limiter


def enquiry(**overrides: object) -> dict[str, object]:
    body: dict[str, object] = {
        "name": "Ada Lovelace",
        "email": "ada@example.org",
        "phone": "+44 20 7946 0000",
        "message": "Interested in a penthouse.",
        "consent": True,
        "source": "explorer",
    }
    body.update(overrides)
    return body


async def test_enquiry_creates_lead_with_views(client: AsyncClient) -> None:
    units = (await client.get("/api/projects/calanthe-bay/units")).json()
    visitor = "visitor-abc12345"
    for u in units[:2]:
        r = await client.post("/api/track/view", json={"visitor_id": visitor, "unit_id": u["id"]})
        assert r.status_code == 204
    r = await client.post("/api/enquiries", json=enquiry(unit_ids=[units[0]["id"]], visitor_id=visitor))
    assert r.status_code == 202
    lead = await get_db().leads.find_one({"email": "ada@example.org"})
    assert lead is not None
    assert lead["stage"] == "new"
    assert lead["source"] == "explorer"
    assert [u["code"] for u in lead["unit_interest"]] == [units[0]["code"]]
    assert {v["code"] for v in lead["units_viewed"]} == {units[0]["code"], units[1]["code"]}

    # Views after enquiring are attached live.
    await client.post("/api/track/view", json={"visitor_id": visitor, "unit_id": units[3]["id"]})
    lead = await get_db().leads.find_one({"email": "ada@example.org"})
    assert lead is not None and units[3]["code"] in {v["code"] for v in lead["units_viewed"]}


async def test_repeat_enquiry_merges(client: AsyncClient) -> None:
    await client.post("/api/enquiries", json=enquiry())
    await client.post("/api/enquiries", json=enquiry(message="Second message"))
    assert await get_db().leads.count_documents({"email": "ada@example.org"}) == 1
    lead = await get_db().leads.find_one({"email": "ada@example.org"})
    assert lead is not None and "Second message" in lead["notes"][-1]["body"]


async def test_enquiry_is_sanitised(client: AsyncClient) -> None:
    r = await client.post(
        "/api/enquiries",
        json=enquiry(name="<script>alert(1)</script>Eve <b>Hacker</b>", message="<img src=x onerror=alert(1)>hello"),
    )
    assert r.status_code == 202
    lead = await get_db().leads.find_one({"email": "ada@example.org"})
    assert lead is not None
    assert lead["name"] == "Eve Hacker"
    assert lead["message"] == "hello"


async def test_enquiry_validation(client: AsyncClient) -> None:
    # Invalid submissions count against the rate limit too, so reset between checks.
    async def status(body: dict[str, object]) -> int:
        limiter.reset()
        return (await client.post("/api/enquiries", json=body)).status_code

    assert await status(enquiry(consent=False)) == 422
    assert await status(enquiry(email="not-an-email")) == 422
    assert await status(enquiry(name="A")) == 422
    assert await status(enquiry(name="<b></b>")) == 422
    assert await status(enquiry(source="walk_in")) == 422
    assert await status(enquiry(phone="call me maybe")) == 422
    assert await status(enquiry(extra="field")) == 422
    assert await status(enquiry(message="x" * 2001)) == 422


async def test_honeypot_stores_nothing(client: AsyncClient) -> None:
    r = await client.post("/api/enquiries", json=enquiry(website="http://spam.example"))
    assert r.status_code == 202
    assert await get_db().leads.count_documents({"email": "ada@example.org"}) == 0


async def test_enquiry_rate_limited(client: AsyncClient) -> None:
    codes = [
        (await client.post("/api/enquiries", json=enquiry(email=f"p{i}@example.org"))).status_code for i in range(7)
    ]
    assert codes[:5] == [202] * 5
    assert codes[5] == 429
