"""
Pydantic models for OpenSnek API request/response schemas.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Auth ─────────────────────────────────────────────────────────

class AuthCallbackRequest(BaseModel):
    azure_oid: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    sub: Optional[str] = None  # Fallback: NextAuth may send 'sub' instead of 'azure_oid'
    access_token: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    azure_oid: str
    email: str
    name: str
    role: str
    created_at: datetime
    last_login: Optional[datetime] = None


class SetRoleRequest(BaseModel):
    user_id: str
    role: str = Field(..., pattern="^(student|professor|admin)$")


# ── Courses ──────────────────────────────────────────────────────

class CourseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=50)
    description: str = ""


class CourseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CourseKbUpdate(BaseModel):
    kb_name: str


class CourseResponse(BaseModel):
    id: str
    name: str
    code: str
    description: str
    kb_name: Optional[str] = None
    enrollment_code: str
    professor_id: str
    professor_name: Optional[str] = None
    created_at: datetime
    is_active: bool
    enrolled_count: Optional[int] = None


# ── Enrollments ──────────────────────────────────────────────────

class EnrollRequest(BaseModel):
    enrollment_code: str


class EnrollmentResponse(BaseModel):
    id: str
    user_id: str
    course_id: str
    enrolled_at: datetime
    course: Optional[CourseResponse] = None


class StudentResponse(BaseModel):
    id: str
    name: str
    email: str
    enrolled_at: datetime
    total_sessions: int = 0
    last_active: Optional[datetime] = None


# ── Activity ─────────────────────────────────────────────────────

class ActivityLogCreate(BaseModel):
    feature: str = Field(..., pattern="^(chat|solver|question|research|guide|ideagen|co_writer|knowledge)$")
    topic: Optional[str] = None
    session_id: Optional[str] = None
    course_id: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


class ActivitySummary(BaseModel):
    total_sessions: int
    active_students: int
    features_used: dict  # feature_name -> count


class FeatureBreakdown(BaseModel):
    feature: str
    count: int


class TopicAnalytics(BaseModel):
    topic: str
    count: int
    feature: str


class TimelinePoint(BaseModel):
    date: str
    count: int


class StudentActivity(BaseModel):
    id: str
    name: str
    email: str
    total_sessions: int
    last_active: Optional[datetime] = None
    features: dict = Field(default_factory=dict)  # feature -> count
