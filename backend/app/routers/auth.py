import secrets
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from ..db import get_db
from ..ratelimit import login_rules, rate_limit
from ..schemas import LoginIn
from ..security import CurrentUser, create_token, hash_password, verify_password
from ..serialize import serialize

router = APIRouter(prefix="/auth", tags=["auth"])

# Compared against when the email is unknown, so response time doesn't reveal which emails exist.
_DUMMY_HASH = hash_password(secrets.token_hex(16))


@router.post("/login", dependencies=[Depends(rate_limit("login", login_rules))])
async def login(body: LoginIn) -> dict[str, Any]:
    user = await get_db().users.find_one({"email": body.email.lower()})
    hashed = user["password_hash"] if user else _DUMMY_HASH
    if not verify_password(body.password, hashed) or not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    return {
        "access_token": create_token(str(user["_id"]), user["role"]),
        "token_type": "bearer",
        "user": serialize(user),
    }


@router.get("/me")
async def me(user: CurrentUser) -> dict[str, Any]:
    return serialize(user)
