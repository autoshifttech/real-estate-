"""In-process sliding-window rate limiter.

Good for a single instance. With several instances behind a load balancer, swap
the storage for Redis (see README "Known gaps").
"""

import time
from collections import defaultdict, deque
from collections.abc import Callable, Coroutine
from typing import Any

from fastapi import HTTPException, Request, status

from .config import get_settings


class SlidingWindowLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def hit(self, key: str, limit: int, window_s: float) -> float | None:
        """Record a hit. Return seconds to wait if the limit is exceeded, else None."""
        now = time.monotonic()
        q = self._hits[key]
        while q and now - q[0] >= window_s:
            q.popleft()
        if len(q) >= limit:
            return window_s - (now - q[0])
        q.append(now)
        return None

    def reset(self) -> None:
        self._hits.clear()


limiter = SlidingWindowLimiter()


def client_ip(request: Request) -> str:
    if get_settings().trust_proxy:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(
    scope: str, rules: Callable[[], list[tuple[int, float]]]
) -> Callable[[Request], Coroutine[Any, Any, None]]:
    """FastAPI dependency factory. `rules` returns (limit, window_seconds) pairs."""

    async def dependency(request: Request) -> None:
        ip = client_ip(request)
        for limit, window in rules():
            retry = limiter.hit(f"{scope}:{window}:{ip}", limit, window)
            if retry is not None:
                raise HTTPException(
                    status.HTTP_429_TOO_MANY_REQUESTS,
                    "Too many requests, please try again shortly.",
                    headers={"Retry-After": str(max(1, int(retry) + 1))},
                )

    return dependency


def enquiry_rules() -> list[tuple[int, float]]:
    s = get_settings()
    return [(s.enquiry_rate_per_minute, 60), (s.enquiry_rate_per_hour, 3600)]


def login_rules() -> list[tuple[int, float]]:
    return [(get_settings().login_rate_per_minute, 60)]


def tracking_rules() -> list[tuple[int, float]]:
    return [(120, 60)]
