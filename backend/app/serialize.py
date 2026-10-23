"""Turn Mongo documents into JSON-friendly dicts (`_id` -> `id`, ObjectId -> str)."""

from datetime import datetime
from typing import Any

from bson import ObjectId
from fastapi import HTTPException, status


def serialize(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [serialize(v) for v in value]
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for k, v in value.items():
            if k == "_id":
                out["id"] = serialize(v)
            elif k == "password_hash":
                continue
            else:
                out[k] = serialize(v)
        return out
    return value


def oid(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return ObjectId(value)
