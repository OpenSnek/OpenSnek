"""
Course management router — CRUD for courses.
"""

import secrets

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.opensnek.auth import get_user_from_request
from src.opensnek.database import get_db
from src.opensnek.models import (
    CourseCreate,
    CourseKbUpdate,
    CourseResponse,
    CourseUpdate,
)

router = APIRouter()


def _generate_enrollment_code() -> str:
    """Generate a short, URL-safe enrollment code."""
    return secrets.token_urlsafe(8)[:10].upper()


async def _require_auth(request: Request):
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.get("", response_model=list[CourseResponse])
@router.get("/", response_model=list[CourseResponse])
async def list_courses(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    List courses visible to the current user.
    - Students: enrolled courses only
    - Professors: owned courses
    - Admins: all courses
    """
    user = await _require_auth(request)

    if user.role == "admin":
        result = await db.execute(text("""
            SELECT c.*, u.name AS professor_name,
                   (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrolled_count
            FROM courses c
            JOIN users u ON c.professor_id = u.id
            WHERE c.is_active = true
            ORDER BY c.created_at DESC
        """))
    elif user.role == "professor":
        result = await db.execute(
            text("""
                SELECT c.*, u.name AS professor_name,
                       (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrolled_count
                FROM courses c
                JOIN users u ON c.professor_id = u.id
                WHERE c.professor_id = (SELECT id FROM users WHERE azure_oid = :oid)
                  AND c.is_active = true
                ORDER BY c.created_at DESC
            """),
            {"oid": user.azure_oid},
        )
    else:
        # Students: only enrolled courses
        result = await db.execute(
            text("""
                SELECT c.*, u.name AS professor_name,
                       (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrolled_count
                FROM courses c
                JOIN users u ON c.professor_id = u.id
                JOIN enrollments en ON en.course_id = c.id
                JOIN users stu ON en.user_id = stu.id AND stu.azure_oid = :oid
                WHERE c.is_active = true
                ORDER BY c.created_at DESC
            """),
            {"oid": user.azure_oid},
        )

    rows = result.mappings().all()
    return [
        CourseResponse(
            id=str(r["id"]),
            name=r["name"],
            code=r["code"],
            description=r["description"] or "",
            kb_name=r["kb_name"],
            enrollment_code=r["enrollment_code"],
            professor_id=str(r["professor_id"]),
            professor_name=r["professor_name"],
            created_at=r["created_at"],
            is_active=r["is_active"],
            enrolled_count=r["enrolled_count"],
        )
        for r in rows
    ]


@router.post("", response_model=CourseResponse, status_code=201)
@router.post("/", response_model=CourseResponse, status_code=201)
async def create_course(
    body: CourseCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Create a new course. Professor or admin only."""
    user = await _require_auth(request)
    if user.role not in ("professor", "admin"):
        raise HTTPException(status_code=403, detail="Professor or admin access required")

    enrollment_code = _generate_enrollment_code()

    result = await db.execute(
        text("""
            INSERT INTO courses (name, code, description, enrollment_code, professor_id)
            SELECT :name, :code, :desc, :enroll_code, u.id
            FROM users u WHERE u.azure_oid = :oid
            RETURNING id, name, code, description, kb_name, enrollment_code,
                      professor_id, created_at, is_active
        """),
        {
            "name": body.name,
            "code": body.code,
            "desc": body.description,
            "enroll_code": enrollment_code,
            "oid": user.azure_oid,
        },
    )
    await db.commit()
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=400, detail="Failed to create course. Code may already exist.")

    return CourseResponse(
        id=str(row["id"]),
        name=row["name"],
        code=row["code"],
        description=row["description"] or "",
        kb_name=row["kb_name"],
        enrollment_code=row["enrollment_code"],
        professor_id=str(row["professor_id"]),
        professor_name=user.name,
        created_at=row["created_at"],
        is_active=row["is_active"],
        enrolled_count=0,
    )


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Get course details."""
    _require_auth(request)

    result = await db.execute(
        text("""
            SELECT c.*, u.name AS professor_name,
                   (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrolled_count
            FROM courses c
            JOIN users u ON c.professor_id = u.id
            WHERE c.id = :cid
        """),
        {"cid": course_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Course not found")

    return CourseResponse(
        id=str(row["id"]),
        name=row["name"],
        code=row["code"],
        description=row["description"] or "",
        kb_name=row["kb_name"],
        enrollment_code=row["enrollment_code"],
        professor_id=str(row["professor_id"]),
        professor_name=row["professor_name"],
        created_at=row["created_at"],
        is_active=row["is_active"],
        enrolled_count=row["enrolled_count"],
    )


@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: str,
    body: CourseUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Update a course. Owner professor or admin only."""
    user = await _require_auth(request)

    # Verify ownership
    owner_check = await db.execute(
        text("""
            SELECT c.id FROM courses c
            JOIN users u ON c.professor_id = u.id
            WHERE c.id = :cid AND (u.azure_oid = :oid OR :role = 'admin')
        """),
        {"cid": course_id, "oid": user.azure_oid, "role": user.role},
    )
    if not owner_check.first():
        raise HTTPException(status_code=403, detail="Not authorized to update this course")

    # Build dynamic update
    updates = []
    params = {"cid": course_id}
    if body.name is not None:
        updates.append("name = :name")
        params["name"] = body.name
    if body.code is not None:
        updates.append("code = :code")
        params["code"] = body.code
    if body.description is not None:
        updates.append("description = :desc")
        params["desc"] = body.description
    if body.is_active is not None:
        updates.append("is_active = :active")
        params["active"] = body.is_active

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await db.execute(
        text(f"""
            UPDATE courses SET {', '.join(updates)}
            WHERE id = :cid
            RETURNING id, name, code, description, kb_name, enrollment_code,
                      professor_id, created_at, is_active
        """),
        params,
    )
    await db.commit()
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Course not found")

    return CourseResponse(
        id=str(row["id"]),
        name=row["name"],
        code=row["code"],
        description=row["description"] or "",
        kb_name=row["kb_name"],
        enrollment_code=row["enrollment_code"],
        professor_id=str(row["professor_id"]),
        professor_name=user.name,
        created_at=row["created_at"],
        is_active=row["is_active"],
    )


@router.delete("/{course_id}")
async def deactivate_course(
    course_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Deactivate (soft-delete) a course. Owner professor or admin only."""
    user = await _require_auth(request)

    result = await db.execute(
        text("""
            UPDATE courses SET is_active = false
            WHERE id = :cid
              AND professor_id = (SELECT id FROM users WHERE azure_oid = :oid)
            RETURNING id
        """),
        {"cid": course_id, "oid": user.azure_oid},
    )
    await db.commit()

    if user.role != "admin" and not result.first():
        raise HTTPException(status_code=403, detail="Not authorized")
    elif user.role == "admin":
        await db.execute(
            text("UPDATE courses SET is_active = false WHERE id = :cid"),
            {"cid": course_id},
        )
        await db.commit()

    return {"status": "ok"}


@router.put("/{course_id}/kb")
async def update_course_kb(
    course_id: str,
    body: CourseKbUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Link or update the knowledge base for a course. Professor owner only."""
    user = await _require_auth(request)
    if user.role not in ("professor", "admin"):
        raise HTTPException(status_code=403, detail="Professor access required")

    result = await db.execute(
        text("""
            UPDATE courses SET kb_name = :kb
            WHERE id = :cid
              AND (professor_id = (SELECT id FROM users WHERE azure_oid = :oid) OR :role = 'admin')
            RETURNING id
        """),
        {"kb": body.kb_name, "cid": course_id, "oid": user.azure_oid, "role": user.role},
    )
    await db.commit()
    if not result.first():
        raise HTTPException(status_code=403, detail="Not authorized or course not found")
    return {"status": "ok", "kb_name": body.kb_name}
