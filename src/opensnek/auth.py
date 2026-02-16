"""
JWT verification and user extraction for OpenSnek authentication.

Supports three auth methods (checked in order):
1. Authorization: Bearer <token> header (REST API — plain JWT)
2. ?token=<token> query parameter (plain JWT)
3. NextAuth session cookie — validated by calling the NextAuth session
   endpoint, since NextAuth v5 encrypts cookies with JWE which cannot
   be decoded by python-jose alone.
"""

import os
from dataclasses import dataclass
from typing import Optional

import httpx
from fastapi import HTTPException, Request
from jose import JWTError, jwt

NEXTAUTH_SECRET = os.environ.get("NEXTAUTH_SECRET", "")
FRONTEND_PORT = os.environ.get("FRONTEND_PORT", "3782")
NEXTAUTH_SESSION_URL = f"http://localhost:{FRONTEND_PORT}/api/auth/session"

# Cache httpx client for connection reuse
_http_client: Optional[httpx.AsyncClient] = None


def _get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(timeout=5.0)
    return _http_client


@dataclass
class AuthUser:
    """Authenticated user extracted from a JWT or session."""

    azure_oid: str
    email: str
    name: str
    role: str  # 'student', 'professor', 'admin'


def _decode_jwt(token: str) -> dict:
    """Decode and verify a plain JWT signed with NEXTAUTH_SECRET."""
    try:
        return jwt.decode(
            token,
            NEXTAUTH_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")


def verify_token(token: str) -> AuthUser:
    """Verify a plain JWT and extract user info."""
    payload = _decode_jwt(token)
    return AuthUser(
        azure_oid=payload.get("sub", payload.get("azure_oid", "")),
        email=payload.get("email", ""),
        name=payload.get("name", ""),
        role=payload.get("role", "student"),
    )


async def verify_session_cookie(request: Request) -> Optional[AuthUser]:
    """
    Validate a NextAuth session cookie by calling the NextAuth session endpoint.

    NextAuth v5 encrypts cookies with JWE, so we cannot decode them in Python.
    Instead, we forward the cookie to the Next.js /api/auth/session endpoint,
    which decrypts the cookie and returns the session data.
    """
    # Forward all cookies from the incoming request
    cookie_header = request.headers.get("cookie", "")
    if not cookie_header:
        return None

    try:
        client = _get_http_client()
        resp = await client.get(
            NEXTAUTH_SESSION_URL,
            headers={"cookie": cookie_header},
        )
        if resp.status_code != 200:
            return None

        data = resp.json()
        if not data or not data.get("user"):
            return None

        user = data["user"]
        return AuthUser(
            azure_oid=user.get("azure_oid", user.get("sub", "")),
            email=user.get("email", ""),
            name=user.get("name", ""),
            role=user.get("role", "student"),
        )
    except Exception:
        return None


async def get_user_from_request(request: Request) -> Optional[AuthUser]:
    """
    Extract the authenticated user from a request using multiple strategies.

    Checks (in order):
    1. Authorization: Bearer <token> (plain JWT)
    2. ?token=<token> query parameter (plain JWT)
    3. NextAuth session cookie (forwarded to Next.js for decryption)
    """
    # 1. Authorization header
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return verify_token(auth_header[7:])

    # 2. Query parameter
    token = request.query_params.get("token")
    if token:
        return verify_token(token)

    # 3. NextAuth session cookie
    return await verify_session_cookie(request)
