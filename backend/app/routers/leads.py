"""CRM: leads, pipeline stages, notes, CSV export."""

import csv
import io
import re
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse

from ..db import get_db
from ..schemas import LeadCreate, LeadSource, LeadStage, LeadUpdate, NoteIn, dump_update
from ..security import CurrentUser
from ..serialize import oid, serialize

router = APIRouter(prefix="/admin/leads", tags=["crm"])

SORTS = {"created_at", "updated_at", "name", "stage", "source"}


def _filters(q: str | None, stage: list[LeadStage] | None, source: list[LeadSource] | None) -> dict[str, Any]:
    query: dict[str, Any] = {}
    if q:
        pattern = re.compile(re.escape(q.strip()[:80]), re.IGNORECASE)
        query["$or"] = [{"name": pattern}, {"email": pattern}, {"phone": pattern}, {"unit_interest.code": pattern}]
    if stage:
        query["stage"] = {"$in": [s.value for s in stage]}
    if source:
        query["source"] = {"$in": [s.value for s in source]}
    return query


async def _resolve_units(unit_ids: list[str]) -> list[dict[str, Any]]:
    out = []
    for uid in unit_ids:
        unit = await get_db().units.find_one({"_id": oid(uid)}, {"code": 1})
        if unit:
            out.append({"unit_id": unit["_id"], "code": unit["code"]})
    return out


@router.get("")
async def list_leads(
    _: CurrentUser,
    q: Annotated[str | None, Query(max_length=80)] = None,
    stage: Annotated[list[LeadStage] | None, Query()] = None,
    source: Annotated[list[LeadSource] | None, Query()] = None,
    sort: Annotated[str, Query()] = "-created_at",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=500)] = 25,
) -> dict[str, Any]:
    field = sort.lstrip("-")
    if field not in SORTS:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Invalid sort field")
    direction = -1 if sort.startswith("-") else 1
    query = _filters(q, stage, source)
    db = get_db()
    total = await db.leads.count_documents(query)
    cursor = (
        db.leads.find(query)
        .sort([(field, direction), ("_id", direction)])
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    items = [lead async for lead in cursor]
    return {"items": serialize(items), "total": total, "page": page, "page_size": page_size}


@router.get("/export.csv")
async def export_csv(
    _: CurrentUser,
    q: Annotated[str | None, Query(max_length=80)] = None,
    stage: Annotated[list[LeadStage] | None, Query()] = None,
    source: Annotated[list[LeadSource] | None, Query()] = None,
) -> StreamingResponse:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "name",
            "email",
            "phone",
            "source",
            "stage",
            "units_of_interest",
            "units_viewed",
            "notes",
            "assignee",
            "created_at",
            "updated_at",
        ]
    )
    async for lead in get_db().leads.find(_filters(q, stage, source)).sort("created_at", -1):
        writer.writerow(
            [
                _csv_safe(v)
                for v in [
                    lead.get("name", ""),
                    lead.get("email", ""),
                    lead.get("phone", ""),
                    lead.get("source", ""),
                    lead.get("stage", ""),
                    " ".join(u["code"] for u in lead.get("unit_interest", [])),
                    " ".join(sorted({u["code"] for u in lead.get("units_viewed", [])})),
                    len(lead.get("notes", [])),
                    lead.get("assignee", ""),
                    lead["created_at"].isoformat() if lead.get("created_at") else "",
                    lead["updated_at"].isoformat() if lead.get("updated_at") else "",
                ]
            ]
        )
    stamp = datetime.now(UTC).strftime("%Y%m%d")
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="leads-{stamp}.csv"'},
    )


def _csv_safe(value: Any) -> Any:
    """Neutralise spreadsheet formula injection."""
    if isinstance(value, str) and value[:1] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + value
    return value


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_lead(body: LeadCreate, user: CurrentUser) -> dict[str, Any]:
    now = datetime.now(UTC)
    doc = {
        "name": body.name,
        "email": str(body.email),
        "phone": body.phone,
        "message": body.message,
        "source": body.source.value,
        "stage": body.stage.value,
        "unit_interest": await _resolve_units(body.unit_ids),
        "units_viewed": [],
        "notes": [],
        "visitor_id": None,
        "consent": True,
        "assignee": body.assignee or user.get("name", ""),
        "created_at": now,
        "updated_at": now,
    }
    result = await get_db().leads.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize(doc)


@router.get("/{lead_id}")
async def get_lead(lead_id: str, _: CurrentUser) -> dict[str, Any]:
    lead = await get_db().leads.find_one({"_id": oid(lead_id)})
    if not lead:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")
    return serialize(lead)


@router.patch("/{lead_id}")
async def update_lead(lead_id: str, body: LeadUpdate, user: CurrentUser) -> dict[str, Any]:
    changes = dump_update(body)
    db = get_db()
    lead = await db.leads.find_one({"_id": oid(lead_id)})
    if not lead:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")
    now = datetime.now(UTC)
    update: dict[str, Any] = {"$set": {"updated_at": now}}
    if "unit_ids" in changes:
        update["$set"]["unit_interest"] = await _resolve_units(changes.pop("unit_ids") or [])
    for key, value in changes.items():
        if value is None:
            continue
        update["$set"][key] = value.value if hasattr(value, "value") else (str(value) if key == "email" else value)
    new_stage = update["$set"].get("stage")
    if new_stage and new_stage != lead.get("stage"):
        update["$push"] = {
            "notes": {
                "id": now.strftime("%Y%m%d%H%M%S%f"),
                "body": f"Stage changed: {lead.get('stage')} → {new_stage}",
                "author": user.get("name", "system"),
                "at": now,
                "system": True,
            }
        }
        update["$set"]["stage_changed_at"] = now
    await db.leads.update_one({"_id": lead["_id"]}, update)
    return serialize(await db.leads.find_one({"_id": lead["_id"]}))


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(lead_id: str, _: CurrentUser) -> Response:
    result = await get_db().leads.delete_one({"_id": oid(lead_id)})
    if not result.deleted_count:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{lead_id}/notes", status_code=status.HTTP_201_CREATED)
async def add_note(lead_id: str, body: NoteIn, user: CurrentUser) -> dict[str, Any]:
    now = datetime.now(UTC)
    note = {"id": now.strftime("%Y%m%d%H%M%S%f"), "body": body.body, "author": user.get("name", ""), "at": now}
    result = await get_db().leads.update_one(
        {"_id": oid(lead_id)}, {"$push": {"notes": note}, "$set": {"updated_at": now}}
    )
    if not result.matched_count:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")
    return serialize(note)
