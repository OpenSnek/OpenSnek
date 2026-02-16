"""
Authentication router — user upsert and session validation.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.opensnek.auth import get_user_from_request
from src.opensnek.database import get_db
from src.opensnek.models import AuthCallbackRequest, SetRoleRequest, UserResponse

router = APIRouter()


@router.post("/callback", response_model=UserResponse)
async def auth_callback(
    body: AuthCallbackRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Called by NextAuth.js jwt callback after Azure AD sign-in.
    Upserts the user in PostgreSQL and returns their role.
    """
    import logging
    logger = logging.getLogger("opensnek.auth")

    # Resolve azure_oid: try azure_oid first, then sub
    oid = body.azure_oid or body.sub or ""
    email = body.email or ""
    name = body.name or email.split("@")[0] or "Unknown"

    logger.info(f"Auth callback: oid={oid}, email={email}, name={name}")

    if not oid:
        raise HTTPException(status_code=400, detail="Missing azure_oid or sub")
    if not email:
        raise HTTPException(status_code=400, detail="Missing email")

    result = await db.execute(
        text("""
            INSERT INTO users (azure_oid, email, name, last_login)
            VALUES (:oid, :email, :name, NOW())
            ON CONFLICT (azure_oid) DO UPDATE SET
                email = EXCLUDED.email,
                name = EXCLUDED.name,
                last_login = NOW()
            RETURNING id, azure_oid, email, name, role, created_at, last_login
        """),
        {"oid": oid, "email": email, "name": name},
    )
    await db.commit()
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=500, detail="Failed to upsert user")
    return UserResponse(
        id=str(row["id"]),
        azure_oid=row["azure_oid"],
        email=row["email"],
        name=row["name"],
        role=row["role"],
        created_at=row["created_at"],
        last_login=row["last_login"],
    )


@router.get("/session", response_model=UserResponse)
async def get_session(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Validate the current session and return user info from the database."""
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    result = await db.execute(
        text("SELECT id, azure_oid, email, name, role, created_at, last_login FROM users WHERE azure_oid = :oid"),
        {"oid": user.azure_oid},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="User not found in database")
    return UserResponse(
        id=str(row["id"]),
        azure_oid=row["azure_oid"],
        email=row["email"],
        name=row["name"],
        role=row["role"],
        created_at=row["created_at"],
        last_login=row["last_login"],
    )


@router.post("/set-role")
async def set_role(
    body: SetRoleRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Set a user's role. Admin only."""
    caller = await get_user_from_request(request)
    if not caller or caller.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await db.execute(
        text("UPDATE users SET role = :role WHERE id = :uid RETURNING id"),
        {"role": body.role, "uid": body.user_id},
    )
    await db.commit()
    if not result.first():
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "ok", "user_id": body.user_id, "role": body.role}
