"""
Professor dashboard router — analytics and activity data.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.opensnek.auth import get_user_from_request
from src.opensnek.database import get_db
from src.opensnek.models import (
    ActivitySummary,
    FeatureBreakdown,
    StudentActivity,
    TimelinePoint,
    TopicAnalytics,
)

router = APIRouter()


async def _require_professor(request: Request):
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if user.role not in ("professor", "admin"):
        raise HTTPException(status_code=403, detail="Professor access required")
    return user


async def _verify_course_ownership(
    db: AsyncSession, course_id: str, azure_oid: str, role: str
):
    """Verify the user owns the course (or is admin)."""
    if role == "admin":
        return
    result = await db.execute(
        text("""
            SELECT 1 FROM courses c
            JOIN users u ON c.professor_id = u.id
            WHERE c.id = :cid AND u.azure_oid = :oid
        """),
        {"cid": course_id, "oid": azure_oid},
    )
    if not result.first():
        raise HTTPException(status_code=403, detail="Not your course")


@router.get("/courses/{course_id}/activity", response_model=ActivitySummary)
async def course_activity_summary(
    course_id: str,
    request: Request,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Get activity summary for a course."""
    user = await _require_professor(request)
    await _verify_course_ownership(db, course_id, user.azure_oid, user.role)

    # Total sessions
    total_result = await db.execute(
        text("""
            SELECT COUNT(*) AS total
            FROM activity_logs
            WHERE course_id = :cid AND created_at > NOW() - :days * INTERVAL '1 day'
        """),
        {"cid": course_id, "days": days},
    )
    total = total_result.scalar() or 0

    # Active students (distinct users with activity)
    active_result = await db.execute(
        text("""
            SELECT COUNT(DISTINCT user_id) AS active
            FROM activity_logs
            WHERE course_id = :cid AND created_at > NOW() - :days * INTERVAL '1 day'
        """),
        {"cid": course_id, "days": days},
    )
    active = active_result.scalar() or 0

    # Feature breakdown
    features_result = await db.execute(
        text("""
            SELECT feature, COUNT(*) AS count
            FROM activity_logs
            WHERE course_id = :cid AND created_at > NOW() - :days * INTERVAL '1 day'
            GROUP BY feature
        """),
        {"cid": course_id, "days": days},
    )
    features = {r["feature"]: r["count"] for r in features_result.mappings().all()}

    return ActivitySummary(
        total_sessions=total,
        active_students=active,
        features_used=features,
    )


@router.get("/courses/{course_id}/analytics/features", response_model=list[FeatureBreakdown])
async def course_feature_analytics(
    course_id: str,
    request: Request,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Feature usage breakdown for a course."""
    user = await _require_professor(request)
    await _verify_course_ownership(db, course_id, user.azure_oid, user.role)

    result = await db.execute(
        text("""
            SELECT feature, COUNT(*) AS count
            FROM activity_logs
            WHERE course_id = :cid AND created_at > NOW() - :days * INTERVAL '1 day'
            GROUP BY feature
            ORDER BY count DESC
        """),
        {"cid": course_id, "days": days},
    )

    return [
        FeatureBreakdown(feature=r["feature"], count=r["count"])
        for r in result.mappings().all()
    ]


@router.get("/courses/{course_id}/analytics/topics", response_model=list[TopicAnalytics])
async def course_topic_analytics(
    course_id: str,
    request: Request,
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Most-asked topics for a course."""
    user = await _require_professor(request)
    await _verify_course_ownership(db, course_id, user.azure_oid, user.role)

    result = await db.execute(
        text("""
            SELECT topic, COUNT(*) AS count, feature
            FROM activity_logs
            WHERE course_id = :cid
              AND topic IS NOT NULL AND topic != ''
              AND created_at > NOW() - :days * INTERVAL '1 day'
            GROUP BY topic, feature
            ORDER BY count DESC
            LIMIT :lim
        """),
        {"cid": course_id, "days": days, "lim": limit},
    )

    return [
        TopicAnalytics(topic=r["topic"], count=r["count"], feature=r["feature"])
        for r in result.mappings().all()
    ]


@router.get("/courses/{course_id}/analytics/timeline", response_model=list[TimelinePoint])
async def course_activity_timeline(
    course_id: str,
    request: Request,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Daily activity count for a course."""
    user = await _require_professor(request)
    await _verify_course_ownership(db, course_id, user.azure_oid, user.role)

    result = await db.execute(
        text("""
            SELECT TO_CHAR(created_at::date, 'YYYY-MM-DD') AS date, COUNT(*) AS count
            FROM activity_logs
            WHERE course_id = :cid AND created_at > NOW() - :days * INTERVAL '1 day'
            GROUP BY created_at::date
            ORDER BY created_at::date ASC
        """),
        {"cid": course_id, "days": days},
    )

    return [
        TimelinePoint(date=r["date"], count=r["count"])
        for r in result.mappings().all()
    ]


@router.get("/students/{student_id}/activity", response_model=StudentActivity)
async def student_activity_detail(
    student_id: str,
    request: Request,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Per-student activity detail. Professor must own a course the student is enrolled in."""
    user = await _require_professor(request)

    # Get student info
    student_result = await db.execute(
        text("SELECT id, name, email FROM users WHERE id = :sid"),
        {"sid": student_id},
    )
    student = student_result.mappings().first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Verify professor has access (owns a course the student is in)
    if user.role != "admin":
        access = await db.execute(
            text("""
                SELECT 1 FROM enrollments e
                JOIN courses c ON e.course_id = c.id
                JOIN users prof ON c.professor_id = prof.id
                WHERE e.user_id = :sid AND prof.azure_oid = :oid
                LIMIT 1
            """),
            {"sid": student_id, "oid": user.azure_oid},
        )
        if not access.first():
            raise HTTPException(status_code=403, detail="No access to this student's data")

    # Activity stats
    stats_result = await db.execute(
        text("""
            SELECT COUNT(*) AS total, MAX(created_at) AS last_active
            FROM activity_logs
            WHERE user_id = :sid AND created_at > NOW() - :days * INTERVAL '1 day'
        """),
        {"sid": student_id, "days": days},
    )
    stats = stats_result.mappings().first()

    # Feature breakdown
    features_result = await db.execute(
        text("""
            SELECT feature, COUNT(*) AS count
            FROM activity_logs
            WHERE user_id = :sid AND created_at > NOW() - :days * INTERVAL '1 day'
            GROUP BY feature
        """),
        {"sid": student_id, "days": days},
    )
    features = {r["feature"]: r["count"] for r in features_result.mappings().all()}

    return StudentActivity(
        id=str(student["id"]),
        name=student["name"],
        email=student["email"],
        total_sessions=stats["total"] if stats else 0,
        last_active=stats["last_active"] if stats else None,
        features=features,
    )
