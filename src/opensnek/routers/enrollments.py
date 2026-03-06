"""
Enrollment management router — join/leave courses, manage students.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.opensnek.auth import get_user_from_request
from src.opensnek.database import get_db
from src.opensnek.models import (
    EnrollmentResponse,
    EnrollRequest,
    StudentResponse,
)

router = APIRouter()


async def _require_auth(request: Request):
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.post("/enroll", response_model=EnrollmentResponse, status_code=201)
async def enroll_by_code(
    body: EnrollRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Join a course using an enrollment code."""
    user = await _require_auth(request)

    # Look up course by enrollment code
    course_result = await db.execute(
        text("SELECT id FROM courses WHERE enrollment_code = :code AND is_active = true"),
        {"code": body.enrollment_code},
    )
    course_row = course_result.first()
    if not course_row:
        raise HTTPException(status_code=404, detail="Invalid enrollment code")

    course_id = str(course_row[0])

    # Get user ID
    user_result = await db.execute(
        text("SELECT id FROM users WHERE azure_oid = :oid"),
        {"oid": user.azure_oid},
    )
    user_row = user_result.first()
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = str(user_row[0])

    # Insert enrollment (ON CONFLICT = already enrolled)
    try:
        result = await db.execute(
            text("""
                INSERT INTO enrollments (user_id, course_id)
                VALUES (:uid, :cid)
                ON CONFLICT (user_id, course_id) DO NOTHING
                RETURNING id, user_id, course_id, enrolled_at
            """),
            {"uid": user_id, "cid": course_id},
        )
        await db.commit()
        row = result.mappings().first()

        if not row:
            # Already enrolled
            existing = await db.execute(
                text("SELECT id, user_id, course_id, enrolled_at FROM enrollments WHERE user_id = :uid AND course_id = :cid"),
                {"uid": user_id, "cid": course_id},
            )
            row = existing.mappings().first()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    return EnrollmentResponse(
        id=str(row["id"]),
        user_id=str(row["user_id"]),
        course_id=str(row["course_id"]),
        enrolled_at=row["enrolled_at"],
    )


@router.get("/enrollments", response_model=list[EnrollmentResponse])
async def list_enrollments(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """List the current user's enrolled courses."""
    user = await _require_auth(request)

    result = await db.execute(
        text("""
            SELECT e.id, e.user_id, e.course_id, e.enrolled_at
            FROM enrollments e
            JOIN users u ON e.user_id = u.id
            WHERE u.azure_oid = :oid
            ORDER BY e.enrolled_at DESC
        """),
        {"oid": user.azure_oid},
    )

    return [
        EnrollmentResponse(
            id=str(r["id"]),
            user_id=str(r["user_id"]),
            course_id=str(r["course_id"]),
            enrolled_at=r["enrolled_at"],
        )
        for r in result.mappings().all()
    ]


@router.delete("/enrollments/{enrollment_id}")
async def leave_course(
    enrollment_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Leave a course (delete enrollment). Student or admin."""
    user = await _require_auth(request)

    result = await db.execute(
        text("""
            DELETE FROM enrollments
            WHERE id = :eid AND user_id = (SELECT id FROM users WHERE azure_oid = :oid)
            RETURNING id
        """),
        {"eid": enrollment_id, "oid": user.azure_oid},
    )
    deleted = result.first()  # must fetch before commit — cursor closes after commit
    await db.commit()

    if not deleted and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    elif user.role == "admin":
        await db.execute(text("DELETE FROM enrollments WHERE id = :eid"), {"eid": enrollment_id})
        await db.commit()

    return {"status": "ok"}


@router.delete("/courses/{course_id}/leave")
async def leave_course(
    course_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Leave a course (student unenrolls themselves)."""
    user = await _require_auth(request)

    result = await db.execute(
        text("""
            DELETE FROM enrollments
            WHERE course_id = :cid
              AND user_id = (SELECT id FROM users WHERE azure_oid = :oid)
            RETURNING id
        """),
        {"cid": course_id, "oid": user.azure_oid},
    )
    deleted = result.first()  # must fetch before commit — cursor closes after commit
    await db.commit()

    if not deleted:
        raise HTTPException(status_code=404, detail="Not enrolled in this course")

    return {"status": "ok"}


@router.get("/courses/{course_id}/students", response_model=list[StudentResponse])
async def list_course_students(
    course_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """List enrolled students for a course. Professor owner or admin only."""
    user = await _require_auth(request)
    if user.role not in ("professor", "admin"):
        raise HTTPException(status_code=403, detail="Professor access required")

    # Verify ownership (unless admin)
    if user.role == "professor":
        ownership = await db.execute(
            text("""
                SELECT 1 FROM courses c
                JOIN users u ON c.professor_id = u.id
                WHERE c.id = :cid AND u.azure_oid = :oid
            """),
            {"cid": course_id, "oid": user.azure_oid},
        )
        if not ownership.first():
            raise HTTPException(status_code=403, detail="Not your course")

    result = await db.execute(
        text("""
            SELECT u.id, u.name, u.email, e.enrolled_at,
                   COUNT(a.id) AS total_sessions,
                   MAX(a.created_at) AS last_active
            FROM enrollments e
            JOIN users u ON e.user_id = u.id
            LEFT JOIN activity_logs a ON a.user_id = u.id AND a.course_id = e.course_id
            WHERE e.course_id = :cid
            GROUP BY u.id, u.name, u.email, e.enrolled_at
            ORDER BY u.name ASC
        """),
        {"cid": course_id},
    )

    return [
        StudentResponse(
            id=str(r["id"]),
            name=r["name"],
            email=r["email"],
            enrolled_at=r["enrolled_at"],
            total_sessions=r["total_sessions"],
            last_active=r["last_active"],
        )
        for r in result.mappings().all()
    ]


@router.delete("/courses/{course_id}/students/{user_id}")
async def remove_student(
    course_id: str,
    user_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Remove a student from a course. Professor owner or admin only."""
    user = await _require_auth(request)
    if user.role not in ("professor", "admin"):
        raise HTTPException(status_code=403, detail="Professor access required")

    # Verify professor owns this course (admins bypass)
    if user.role == "professor":
        ownership = await db.execute(
            text("""
                SELECT 1 FROM courses c
                JOIN users u ON c.professor_id = u.id
                WHERE c.id = :cid AND u.azure_oid = :oid
            """),
            {"cid": course_id, "oid": user.azure_oid},
        )
        if not ownership.first():
            raise HTTPException(status_code=403, detail="Not your course")

    result = await db.execute(
        text("DELETE FROM enrollments WHERE user_id = :uid AND course_id = :cid RETURNING id"),
        {"uid": user_id, "cid": course_id},
    )
    await db.commit()
    if not result.first():
        raise HTTPException(status_code=404, detail="Enrollment not found")

    return {"status": "ok"}
