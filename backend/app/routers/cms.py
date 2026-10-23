"""CMS: projects, buildings, units (pricing/status), blog posts. Admin role required."""

from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query, Response, status
from pymongo.errors import DuplicateKeyError

from ..db import get_db
from ..schemas import (
    BuildingIn,
    BuildingUpdate,
    BulkPriceIn,
    PostIn,
    PostUpdate,
    ProjectIn,
    ProjectUpdate,
    UnitIn,
    UnitStatus,
    UnitUpdate,
    dump_update,
)
from ..security import AdminUser, CurrentUser
from ..serialize import oid, serialize

router = APIRouter(prefix="/admin", tags=["cms"])


def _now() -> datetime:
    return datetime.now(UTC)


def _conflict(what: str) -> HTTPException:
    return HTTPException(status.HTTP_409_CONFLICT, f"{what} already exists")


def _plain(data: dict[str, Any]) -> dict[str, Any]:
    return {k: (v.value if hasattr(v, "value") else v) for k, v in data.items()}


async def _get_or_404(collection: str, doc_id: str) -> dict[str, Any]:
    doc = await get_db()[collection].find_one({"_id": oid(doc_id)})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return doc


# ---------- Projects ----------


@router.get("/projects")
async def list_projects(_: CurrentUser) -> list[dict[str, Any]]:
    return serialize([p async for p in get_db().projects.find().sort("name", 1)])


@router.get("/projects/{project_id}")
async def get_project(project_id: str, _: CurrentUser) -> dict[str, Any]:
    return serialize(await _get_or_404("projects", project_id))


@router.post("/projects", status_code=status.HTTP_201_CREATED)
async def create_project(body: ProjectIn, _: AdminUser) -> dict[str, Any]:
    doc = {**body.model_dump(), "created_at": _now(), "updated_at": _now()}
    try:
        result = await get_db().projects.insert_one(doc)
    except DuplicateKeyError as exc:
        raise _conflict("A project with this slug") from exc
    doc["_id"] = result.inserted_id
    return serialize(doc)


@router.patch("/projects/{project_id}")
async def update_project(project_id: str, body: ProjectUpdate, _: AdminUser) -> dict[str, Any]:
    project = await _get_or_404("projects", project_id)
    try:
        await get_db().projects.update_one(
            {"_id": project["_id"]}, {"$set": {**dump_update(body), "updated_at": _now()}}
        )
    except DuplicateKeyError as exc:
        raise _conflict("A project with this slug") from exc
    return serialize(await get_db().projects.find_one({"_id": project["_id"]}))


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str, _: AdminUser) -> Response:
    project = await _get_or_404("projects", project_id)
    if await get_db().buildings.count_documents({"project_id": project["_id"]}):
        raise HTTPException(status.HTTP_409_CONFLICT, "Delete the project's buildings first")
    await get_db().projects.delete_one({"_id": project["_id"]})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- Buildings ----------


@router.get("/buildings")
async def list_buildings(_: CurrentUser, project_id: Annotated[str | None, Query()] = None) -> list[dict[str, Any]]:
    query = {"project_id": oid(project_id)} if project_id else {}
    return serialize([b async for b in get_db().buildings.find(query).sort("code", 1)])


@router.post("/buildings", status_code=status.HTTP_201_CREATED)
async def create_building(body: BuildingIn, _: AdminUser) -> dict[str, Any]:
    project = await _get_or_404("projects", body.project_id)
    doc = {**body.model_dump(), "project_id": project["_id"], "created_at": _now(), "updated_at": _now()}
    try:
        result = await get_db().buildings.insert_one(doc)
    except DuplicateKeyError as exc:
        raise _conflict("A building with this code") from exc
    doc["_id"] = result.inserted_id
    return serialize(doc)


@router.patch("/buildings/{building_id}")
async def update_building(building_id: str, body: BuildingUpdate, _: AdminUser) -> dict[str, Any]:
    building = await _get_or_404("buildings", building_id)
    try:
        await get_db().buildings.update_one(
            {"_id": building["_id"]}, {"$set": {**dump_update(body), "updated_at": _now()}}
        )
    except DuplicateKeyError as exc:
        raise _conflict("A building with this code") from exc
    return serialize(await get_db().buildings.find_one({"_id": building["_id"]}))


@router.delete("/buildings/{building_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_building(building_id: str, _: AdminUser) -> Response:
    building = await _get_or_404("buildings", building_id)
    if await get_db().units.count_documents({"building_id": building["_id"]}):
        raise HTTPException(status.HTTP_409_CONFLICT, "Delete the building's units first")
    await get_db().buildings.delete_one({"_id": building["_id"]})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- Units ----------


@router.get("/units")
async def list_units(
    _: CurrentUser,
    project_id: Annotated[str | None, Query()] = None,
    building_id: Annotated[str | None, Query()] = None,
    unit_status: Annotated[UnitStatus | None, Query(alias="status")] = None,
) -> list[dict[str, Any]]:
    query: dict[str, Any] = {}
    if project_id:
        query["project_id"] = oid(project_id)
    if building_id:
        query["building_id"] = oid(building_id)
    if unit_status:
        query["status"] = unit_status.value
    return serialize([u async for u in get_db().units.find(query).sort("code", 1)])


@router.post("/units", status_code=status.HTTP_201_CREATED)
async def create_unit(body: UnitIn, _: AdminUser) -> dict[str, Any]:
    building = await _get_or_404("buildings", body.building_id)
    doc = {
        **_plain(body.model_dump()),
        "building_id": building["_id"],
        "project_id": building["project_id"],
        "created_at": _now(),
        "updated_at": _now(),
    }
    try:
        result = await get_db().units.insert_one(doc)
    except DuplicateKeyError as exc:
        raise _conflict("A unit with this code") from exc
    doc["_id"] = result.inserted_id
    return serialize(doc)


@router.patch("/units/{unit_id}")
async def update_unit(unit_id: str, body: UnitUpdate, user: CurrentUser) -> dict[str, Any]:
    changes = _plain(dump_update(body))
    # Agents may change status (reserve/sell); everything else needs an admin.
    if user.get("role") != "admin" and set(changes) - {"status"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin role required")
    unit = await _get_or_404("units", unit_id)
    history = None
    if "price" in changes and changes["price"] != unit.get("price"):
        history = {"price": unit.get("price"), "at": _now()}
    update: dict[str, Any] = {"$set": {**changes, "updated_at": _now()}}
    if history:
        update["$push"] = {"price_history": history}
    try:
        await get_db().units.update_one({"_id": unit["_id"]}, update)
    except DuplicateKeyError as exc:
        raise _conflict("A unit with this code") from exc
    return serialize(await get_db().units.find_one({"_id": unit["_id"]}))


@router.delete("/units/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_unit(unit_id: str, _: AdminUser) -> Response:
    unit = await _get_or_404("units", unit_id)
    await get_db().units.delete_one({"_id": unit["_id"]})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/units/bulk-price")
async def bulk_price(body: BulkPriceIn, _: AdminUser) -> dict[str, Any]:
    if (body.percent is None) == (body.amount is None):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Provide exactly one of percent or amount")
    query: dict[str, Any] = {"project_id": oid(body.project_id)}
    if body.building_id:
        query["building_id"] = oid(body.building_id)
    if body.only_status:
        query["status"] = body.only_status.value
    db = get_db()
    updated = 0
    now = _now()
    async for unit in db.units.find(query, {"price": 1}):
        old = int(unit["price"])
        new = old * (1 + body.percent / 100) if body.percent is not None else old + (body.amount or 0)
        new_price = max(body.round_to, int(round(new / body.round_to) * body.round_to))
        if new_price != old:
            await db.units.update_one(
                {"_id": unit["_id"]},
                {
                    "$set": {"price": new_price, "updated_at": now},
                    "$push": {"price_history": {"price": old, "at": now}},
                },
            )
            updated += 1
    return {"updated": updated}


# ---------- Blog ----------


@router.get("/posts")
async def list_posts(_: CurrentUser) -> list[dict[str, Any]]:
    return serialize([p async for p in get_db().posts.find().sort("updated_at", -1)])


@router.get("/posts/{post_id}")
async def get_post(post_id: str, _: CurrentUser) -> dict[str, Any]:
    return serialize(await _get_or_404("posts", post_id))


@router.post("/posts", status_code=status.HTTP_201_CREATED)
async def create_post(body: PostIn, _: AdminUser) -> dict[str, Any]:
    doc = {**body.model_dump(), "created_at": _now(), "updated_at": _now()}
    if doc["published"] and not doc["published_at"]:
        doc["published_at"] = _now()
    try:
        result = await get_db().posts.insert_one(doc)
    except DuplicateKeyError as exc:
        raise _conflict("A post with this slug") from exc
    doc["_id"] = result.inserted_id
    return serialize(doc)


@router.patch("/posts/{post_id}")
async def update_post(post_id: str, body: PostUpdate, _: AdminUser) -> dict[str, Any]:
    post = await _get_or_404("posts", post_id)
    changes = dump_update(body)
    if changes.get("published") and not (changes.get("published_at") or post.get("published_at")):
        changes["published_at"] = _now()
    try:
        await get_db().posts.update_one({"_id": post["_id"]}, {"$set": {**changes, "updated_at": _now()}})
    except DuplicateKeyError as exc:
        raise _conflict("A post with this slug") from exc
    return serialize(await get_db().posts.find_one({"_id": post["_id"]}))


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(post_id: str, _: AdminUser) -> Response:
    post = await _get_or_404("posts", post_id)
    await get_db().posts.delete_one({"_id": post["_id"]})
    return Response(status_code=status.HTTP_204_NO_CONTENT)
