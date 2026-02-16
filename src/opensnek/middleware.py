"""
FastAPI middleware for OpenSnek authentication and activity logging.

When NEXTAUTH_SECRET is set, this middleware:
1. Enforces authentication on all non-public routes
2. Attaches the authenticated user to request.state.user
3. Logs activity to PostgreSQL in the background
"""

import asyncio
import os
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from src.opensnek.auth import get_user_from_request, AuthUser

# Public paths that skip authentication entirely
PUBLIC_PATHS = frozenset({
    "/",
    "/api/v1/system",
})

PUBLIC_PREFIXES = (
    "/api/v1/opensnek/auth/",
    "/api/auth/",          # NextAuth.js callback routes
    "/_next/",
    "/static/",
    "/login",
    "/api/outputs/",
    "/favicon.ico",
    "/logo",
)

# Feature map: API path prefix -> feature name for activity logging
FEATURE_MAP = {
    "/api/v1/chat": "chat",
    "/api/v1/solve": "solver",
    "/api/v1/question": "question",
    "/api/v1/research": "research",
    "/api/v1/guide": "guide",
    "/api/v1/ideagen": "ideagen",
    "/api/v1/co_writer": "co_writer",
    "/api/v1/knowledge": "knowledge",
}


def _is_public(path: str) -> bool:
    """Check if a path is public (no auth required)."""
    if path in PUBLIC_PATHS:
        return True
    return any(path.startswith(prefix) for prefix in PUBLIC_PREFIXES)


def _extract_feature(path: str) -> str | None:
    """Map an API path to a feature name for activity logging."""
    for prefix, feature in FEATURE_MAP.items():
        if path.startswith(prefix):
            return feature
    return None


class OpenSnekAuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware that enforces authentication and logs activity.

    Fully conditional: if NEXTAUTH_SECRET is empty, this middleware
    is never registered (see main.py).
    """

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Allow public paths without auth
        if _is_public(path):
            return await call_next(request)

        # Verify authentication
        user = await get_user_from_request(request)
        if user is None:
            return JSONResponse(
                status_code=401,
                content={"detail": "Authentication required"},
            )

        # Attach user to request state for downstream handlers
        request.state.user = user

        # Process the request
        start_time = time.time()
        response = await call_next(request)
        duration_ms = int((time.time() - start_time) * 1000)

        # Log activity in background for DeepTutor feature endpoints
        if path.startswith("/api/v1/") and not path.startswith("/api/v1/opensnek/"):
            feature = _extract_feature(path)
            if feature:
                asyncio.create_task(
                    _log_activity_bg(user, feature, request.method, path, duration_ms)
                )

        return response


async def _log_activity_bg(
    user: AuthUser, feature: str, method: str, path: str, duration_ms: int
):
    """Fire-and-forget activity logger. Failures are silently ignored."""
    try:
        from sqlalchemy import text
        from src.opensnek.database import async_session_factory

        async with async_session_factory() as session:
            await session.execute(
                text("""
                    INSERT INTO activity_logs (user_id, feature, action, duration_ms)
                    SELECT u.id, :feature, :action, :duration
                    FROM users u WHERE u.azure_oid = :oid
                """),
                {
                    "oid": user.azure_oid,
                    "feature": feature,
                    "action": f"{method} {path}",
                    "duration": duration_ms,
                },
            )
            await session.commit()
    except Exception:
        # Never let logging failures break requests
        pass
