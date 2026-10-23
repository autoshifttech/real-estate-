"""Password hashing (bcrypt) and JWT bearer auth."""

from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

import bcrypt
import jwt
from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings
from .db import get_db

_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    # bcrypt only uses the first 72 bytes; reject longer passwords upstream.
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def create_token(user_id: str, role: str) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expires_minutes),
    }
    return jwt.encode(payload, settings.effective_jwt_secret, algorithm=settings.jwt_algorithm)


def _unauthorized(detail: str = "Not authenticated") -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail, headers={"WWW-Authenticate": "Bearer"})


async def current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> dict[str, Any]:
    if creds is None:
        raise _unauthorized()
    settings = get_settings()
    try:
        payload = jwt.decode(creds.credentials, settings.effective_jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = ObjectId(payload["sub"])
    except Exception as exc:  # any decode failure is a 401
        raise _unauthorized("Invalid or expired token") from exc
    user = await get_db().users.find_one({"_id": user_id})
    if not user:
        raise _unauthorized("User no longer exists")
    return user


CurrentUser = Annotated[dict[str, Any], Depends(current_user)]


async def require_admin(user: CurrentUser) -> dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin role required")
    return user


AdminUser = Annotated[dict[str, Any], Depends(require_admin)]
