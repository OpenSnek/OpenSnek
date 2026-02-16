-- ============================================
-- OpenSnek Database Schema
-- ============================================
-- Automatically applied on first PostgreSQL startup via
-- docker-entrypoint-initdb.d mount.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Users (synced from Azure AD on first login)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    azure_oid VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student'
        CHECK (role IN ('student', 'professor', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- ============================================
-- Courses (each maps to a DeepTutor knowledge base)
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    kb_name VARCHAR(255),           -- Maps to DeepTutor knowledge base name
    enrollment_code VARCHAR(20) UNIQUE NOT NULL,
    azure_group_id VARCHAR(255),    -- For auto-enrollment via Azure AD groups
    professor_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- ============================================
-- Enrollments (student ↔ course many-to-many)
-- ============================================
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- ============================================
-- Activity Logs (for professor dashboards)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    feature VARCHAR(50) NOT NULL,   -- chat, solver, question, research, guide, ideagen, co_writer, knowledge
    action VARCHAR(255),            -- e.g. "POST /api/v1/chat"
    topic TEXT,                     -- extracted from user's query
    session_id VARCHAR(255),
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- ============================================
-- Knowledge Base Ownership (tracks who created each KB)
-- ============================================
CREATE TABLE IF NOT EXISTS user_kbs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kb_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, kb_name)
);

-- ============================================
-- Indexes for common query patterns
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_azure_oid ON users(azure_oid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE INDEX IF NOT EXISTS idx_courses_professor_id ON courses(professor_id);
CREATE INDEX IF NOT EXISTS idx_courses_enrollment_code ON courses(enrollment_code);
CREATE INDEX IF NOT EXISTS idx_courses_kb_name ON courses(kb_name);

CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_course_id ON activity_logs(course_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_feature ON activity_logs(feature);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_course ON activity_logs(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_user_kbs_user_id ON user_kbs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_kbs_kb_name ON user_kbs(kb_name);
