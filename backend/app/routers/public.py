"""Public, unauthenticated endpoints used by the marketing site and explorer."""

from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse

from ..db import get_db
from ..pdf import render_brochure
from ..plans import PLANS, get_plan
from ..ratelimit import enquiry_rules, rate_limit, tracking_rules
from ..sanitize import clean_text
from ..schemas import EnquiryIn, LeadStage, TrackViewIn, UnitStatus
from ..serialize import oid, serialize

router = APIRouter(tags=["public"])

PUBLIC_UNIT_FIELDS = {
    "_id": 1,
    "project_id": 1,
    "building_id": 1,
    "code": 1,
    "floor": 1,
    "position": 1,
    "beds": 1,
    "baths": 1,
    "area_sqm": 1,
    "terrace_sqm": 1,
    "price": 1,
    "status": 1,
    "orientation": 1,
    "plan_type": 1,
    "features": 1,
    "updated_at": 1,
}


async def _published_project(slug: str) -> dict[str, Any]:
    project = await get_db().projects.find_one({"slug": slug, "published": True})
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project


async def _unit_counts(project_id: Any) -> dict[str, int]:
    counts = {s.value: 0 for s in UnitStatus}
    async for row in get_db().units.aggregate(
        [
            {"$match": {"project_id": project_id}},
            {"$group": {"_id": "$status", "n": {"$sum": 1}}},
        ]
    ):
        counts[row["_id"]] = row["n"]
    return counts


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/projects")
async def list_projects() -> list[dict[str, Any]]:
    out = []
    cursor = get_db().projects.find({"published": True}, {"description": 0}).sort("name", 1)
    async for project in cursor:
        data = serialize(project)
        data["unit_counts"] = await _unit_counts(project["_id"])
        prices = [
            u["price"]
            async for u in get_db().units.find({"project_id": project["_id"], "status": "available"}, {"price": 1})
        ]
        data["price_from"] = min(prices) if prices else None
        out.append(data)
    return out


@router.get("/projects/{slug}")
async def project_detail(slug: str) -> dict[str, Any]:
    project = await _published_project(slug)
    data = serialize(project)
    buildings = [b async for b in get_db().buildings.find({"project_id": project["_id"]}).sort("code", 1)]
    data["buildings"] = serialize(buildings)
    data["unit_counts"] = await _unit_counts(project["_id"])
    return data


@router.get("/projects/{slug}/units")
async def project_units(
    slug: str,
    building: Annotated[str | None, Query(pattern=r"^[A-Z0-9]{1,4}$")] = None,
    beds: Annotated[list[int] | None, Query()] = None,
    min_price: Annotated[int | None, Query(ge=0)] = None,
    max_price: Annotated[int | None, Query(ge=0)] = None,
    floor_min: Annotated[int | None, Query(ge=0)] = None,
    floor_max: Annotated[int | None, Query(ge=0)] = None,
    unit_status: Annotated[list[UnitStatus] | None, Query(alias="status")] = None,
) -> list[dict[str, Any]]:
    project = await _published_project(slug)
    query: dict[str, Any] = {"project_id": project["_id"]}
    if building:
        b = await get_db().buildings.find_one({"project_id": project["_id"], "code": building})
        if not b:
            return []
        query["building_id"] = b["_id"]
    if beds:
        query["beds"] = {"$in": beds}
    price: dict[str, int] = {}
    if min_price is not None:
        price["$gte"] = min_price
    if max_price is not None:
        price["$lte"] = max_price
    if price:
        query["price"] = price
    floor: dict[str, int] = {}
    if floor_min is not None:
        floor["$gte"] = floor_min
    if floor_max is not None:
        floor["$lte"] = floor_max
    if floor:
        query["floor"] = floor
    if unit_status:
        query["status"] = {"$in": [s.value for s in unit_status]}
    units = [u async for u in get_db().units.find(query, PUBLIC_UNIT_FIELDS).sort([("code", 1)])]
    return serialize(units)


async def _public_unit(unit_id: str) -> dict[str, Any]:
    unit = await get_db().units.find_one({"_id": oid(unit_id)}, PUBLIC_UNIT_FIELDS)
    if not unit:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unit not found")
    project = await get_db().projects.find_one({"_id": unit["project_id"], "published": True})
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unit not found")
    unit["_project"] = project
    return unit


@router.get("/units/{unit_id}")
async def unit_detail(unit_id: str) -> dict[str, Any]:
    unit = await _public_unit(unit_id)
    project = unit.pop("_project")
    building = await get_db().buildings.find_one({"_id": unit["building_id"]})
    data = serialize(unit)
    data["plan"] = get_plan(unit["plan_type"])
    data["building"] = {"code": building["code"], "name": building["name"]} if building else None
    data["project"] = {"slug": project["slug"], "name": project["name"], "currency": project.get("currency", "EUR")}
    return data


@router.get("/plans")
async def list_plans() -> dict[str, Any]:
    return dict(PLANS)


@router.get("/plans/{plan_type}")
async def plan_detail(plan_type: str) -> dict[str, Any]:
    plan = get_plan(plan_type)
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")
    return plan


@router.get("/units/{unit_id}/brochure.pdf", dependencies=[Depends(rate_limit("pdf", lambda: [(20, 60)]))])
async def unit_brochure(
    unit_id: str,
    name: Annotated[str, Query(max_length=80)] = "",
) -> StreamingResponse:
    unit = await _public_unit(unit_id)
    project = unit.pop("_project")
    building = await get_db().buildings.find_one({"_id": unit["building_id"]})
    recipient = clean_text(name)[:80]
    pdf_bytes = render_brochure(project=project, building=building or {}, unit=unit, recipient=recipient)
    filename = f"{project['slug']}-{unit['code']}.pdf"
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


@router.post(
    "/enquiries",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(rate_limit("enquiry", enquiry_rules))],
)
async def create_enquiry(body: EnquiryIn) -> dict[str, Any]:
    if body.website:
        # Honeypot tripped: pretend success, store nothing.
        return {"ok": True}
    db = get_db()
    now = datetime.now(UTC)
    unit_interest = []
    for uid in body.unit_ids:
        unit = await db.units.find_one({"_id": oid(uid)}, {"code": 1})
        if unit:
            unit_interest.append({"unit_id": unit["_id"], "code": unit["code"]})
    units_viewed = []
    if body.visitor_id:
        async for v in db.unit_views.find({"visitor_id": body.visitor_id}).sort("at", -1).limit(50):
            units_viewed.append({"unit_id": v["unit_id"], "code": v["code"], "at": v["at"]})

    existing = await db.leads.find_one({"email": body.email, "stage": {"$nin": ["won", "lost"]}})
    if existing:
        # Merge repeat enquiries into the open lead rather than duplicating it.
        known = {str(u["unit_id"]) for u in existing.get("unit_interest", [])}
        new_interest = [u for u in unit_interest if str(u["unit_id"]) not in known]
        seen = {(str(v["unit_id"]), v["at"]) for v in existing.get("units_viewed", [])}
        new_views = [v for v in units_viewed if (str(v["unit_id"]), v["at"]) not in seen]
        note = {
            "id": now.strftime("%Y%m%d%H%M%S%f"),
            "body": f"Repeat enquiry via {body.source.value}: {body.message}".strip(),
            "author": "system",
            "at": now,
        }
        await db.leads.update_one(
            {"_id": existing["_id"]},
            {
                "$push": {
                    "unit_interest": {"$each": new_interest},
                    "units_viewed": {"$each": new_views},
                    "notes": note,
                },
                "$set": {"updated_at": now, **({"phone": body.phone} if body.phone else {})},
            },
        )
        return {"ok": True}

    await db.leads.insert_one(
        {
            "name": body.name,
            "email": body.email,
            "phone": body.phone,
            "message": body.message,
            "source": body.source.value,
            "stage": LeadStage.new.value,
            "unit_interest": unit_interest,
            "units_viewed": units_viewed,
            "notes": [],
            "visitor_id": body.visitor_id,
            "consent": True,
            "assignee": "",
            "created_at": now,
            "updated_at": now,
        }
    )
    return {"ok": True}


@router.post(
    "/track/view",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit("track", tracking_rules))],
)
async def track_view(body: TrackViewIn) -> Response:
    db = get_db()
    unit = await db.units.find_one({"_id": oid(body.unit_id)}, {"code": 1})
    if unit:
        now = datetime.now(UTC)
        await db.unit_views.insert_one(
            {
                "visitor_id": body.visitor_id,
                "unit_id": unit["_id"],
                "code": unit["code"],
                "at": now,
            }
        )
        # If this visitor already became a lead, attach the view live.
        await db.leads.update_many(
            {"visitor_id": body.visitor_id},
            {"$push": {"units_viewed": {"unit_id": unit["_id"], "code": unit["code"], "at": now}}},
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/posts")
async def list_posts() -> list[dict[str, Any]]:
    cursor = get_db().posts.find({"published": True}, {"body": 0}).sort("published_at", -1)
    return serialize([p async for p in cursor])


@router.get("/posts/{slug}")
async def post_detail(slug: str) -> dict[str, Any]:
    post = await get_db().posts.find_one({"slug": slug, "published": True})
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    return serialize(post)
