"""
Activity logging router — frontend-initiated activity tracking.

This endpoint is called by the frontend after WebSocket interactions
complete (chat, solver, research, question generation, etc.) since
WebSocket activity cannot be captured by the HTTP middleware.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.opensnek.auth import get_user_from_request
from src.opensnek.database import get_db
from src.opensnek.models import ActivityLogCreate

router = APIRouter()


@router.post("/activity", status_code=201)
async def log_activity(
    body: ActivityLogCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Log a user activity event.

    Called by the frontend after WebSocket interactions complete.
    The middleware handles REST API activity logging automatically,
    but WebSocket interactions need explicit reporting.
    """
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    import json

    await db.execute(
        text("""
            INSERT INTO activity_logs (user_id, course_id, feature, topic, session_id, metadata)
            SELECT u.id, CAST(:course_id AS uuid), :feature, :topic, :session_id, CAST(:metadata AS jsonb)
            FROM users u WHERE u.azure_oid = :oid
        """),
        {
            "oid": user.azure_oid,
            "course_id": body.course_id if body.course_id else None,
            "feature": body.feature,
            "topic": body.topic,
            "session_id": body.session_id,
            "metadata": json.dumps(body.metadata),
        },
    )
    await db.commit()

    return {"status": "ok"}
