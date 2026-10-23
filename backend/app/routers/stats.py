"""Dashboard metrics."""

from collections import Counter
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Query

from ..db import get_db
from ..schemas import LeadStage, UnitStatus
from ..security import CurrentUser

router = APIRouter(prefix="/admin/stats", tags=["dashboard"])


@router.get("")
async def stats(_: CurrentUser, days: Annotated[int, Query(ge=7, le=180)] = 30) -> dict[str, Any]:
    db = get_db()
    today = datetime.now(UTC).date()
    start = today - timedelta(days=days - 1)
    start_dt = datetime(start.year, start.month, start.day, tzinfo=UTC)

    per_day: Counter[str] = Counter()
    stages: Counter[str] = Counter()
    sources: Counter[str] = Counter()
    total = 0
    async for lead in db.leads.find({}, {"created_at": 1, "stage": 1, "source": 1}):
        total += 1
        stages[lead.get("stage", "new")] += 1
        sources[lead.get("source", "website")] += 1
        created = lead.get("created_at")
        if created and created >= start_dt:
            per_day[created.date().isoformat()] += 1

    leads_per_day = [
        {
            "date": (start + timedelta(days=i)).isoformat(),
            "count": per_day.get((start + timedelta(days=i)).isoformat(), 0),
        }
        for i in range(days)
    ]
    won, lost = stages.get("won", 0), stages.get("lost", 0)

    units_by_status = {s.value: 0 for s in UnitStatus}
    by_building: dict[str, dict[str, int]] = {}
    buildings = {b["_id"]: b async for b in db.buildings.find({}, {"code": 1, "name": 1})}
    inventory_value = 0
    sold_value = 0
    async for unit in db.units.find({}, {"status": 1, "building_id": 1, "price": 1}):
        units_by_status[unit["status"]] += 1
        b = buildings.get(unit["building_id"])
        label = f"{b['code']} · {b['name']}" if b else "Unassigned"
        by_building.setdefault(label, {s.value: 0 for s in UnitStatus})[unit["status"]] += 1
        inventory_value += unit["price"]
        if unit["status"] == "sold":
            sold_value += unit["price"]

    return {
        "range_days": days,
        "leads_total": total,
        "leads_in_range": sum(per_day.values()),
        "leads_per_day": leads_per_day,
        "pipeline": {s.value: stages.get(s.value, 0) for s in LeadStage},
        "sources": dict(sources.most_common()),
        "conversion_rate": round(won / total, 4) if total else 0.0,
        "win_rate": round(won / (won + lost), 4) if (won + lost) else 0.0,
        "units_by_status": units_by_status,
        "units_by_building": by_building,
        "inventory_value": inventory_value,
        "sold_value": sold_value,
    }
