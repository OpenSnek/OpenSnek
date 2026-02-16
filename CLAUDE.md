# CLAUDE.md — OpenSnek Developer Guide

## What is OpenSnek?

OpenSnek is an open-source, self-hosted AI learning platform for universities, built as a **thin multi-tenant layer on top of [DeepTutor](https://github.com/HKUDS/DeepTutor)**. DeepTutor provides all AI tutoring features (chat, solver, research, questions, guided learning, ideagen, co-writer, notebooks). OpenSnek adds authentication (Azure AD SSO), course management, enrollment, activity tracking, and professor analytics.

**Critical design principle**: When `NEXTAUTH_SECRET` is not set, **all OpenSnek code is completely bypassed** and the system runs as vanilla DeepTutor. This makes upstream merges trivial.

## Repository Structure

```
OpenSnek/
├── src/
│   ├── api/main.py              # FastAPI entrypoint — registers OpenSnek conditionally
│   ├── api/routers/             # DeepTutor API routes (DO NOT TOUCH)
│   ├── agents/                  # DeepTutor AI agents (DO NOT TOUCH)
│   ├── knowledge/               # DeepTutor KB management (DO NOT TOUCH)
│   ├── services/                # DeepTutor services: LLM, RAG, TTS, etc. (DO NOT TOUCH)
│   ├── tools/                   # DeepTutor tools: code exec, search (DO NOT TOUCH)
│   ├── core/                    # DeepTutor core utilities (DO NOT TOUCH)
│   ├── utils/                   # DeepTutor utilities (DO NOT TOUCH)
│   └── opensnek/                # ★ OpenSnek backend layer (~1,400 lines)
│       ├── auth.py              # JWT/session verification (3 strategies)
│       ├── middleware.py         # Auth enforcement + background activity logging
│       ├── database.py          # Async PostgreSQL (SQLAlchemy + asyncpg)
│       ├── models.py            # Pydantic request/response schemas
│       └── routers/
│           ├── auth.py          # User upsert, session validation, role mgmt
│           ├── courses.py       # Course CRUD with role-based access
│           ├── enrollments.py   # Join/leave courses, student management
│           ├── professor.py     # Analytics: features, topics, timeline, per-student
│           └── activity.py      # Frontend activity log submission
├── web/                         # Next.js 16 + React 19 frontend
│   ├── lib/auth.ts              # ★ NextAuth.js v5 config (Azure AD provider)
│   ├── lib/api.ts               # ★ API URL helper (browser proxy vs server direct)
│   ├── lib/activity.ts          # ★ Activity reporting utility
│   ├── middleware.ts            # ★ Route protection (redirects unauthenticated to /login)
│   ├── context/AuthContext.tsx  # ★ useAuth() hook — wraps NextAuth SessionProvider
│   ├── context/CourseContext.tsx # ★ useCourse() hook — enrolled courses + active selection
│   ├── context/GlobalContext.tsx # DeepTutor state (KB, chat history, etc.)
│   ├── components/AppShell.tsx  # ★ Conditional sidebar (bare layout for login)
│   ├── components/ActivityReporter.tsx # ★ State observer for activity tracking
│   ├── components/Sidebar.tsx   # Modified: added course selector + user menu
│   ├── app/layout.tsx           # Modified: wrapped with Auth/Course providers
│   ├── app/login/page.tsx       # ★ Azure AD login page
│   ├── app/courses/             # ★ Course selection + enrollment
│   │   ├── page.tsx             # Course list with join button
│   │   └── join/page.tsx        # Enrollment code entry
│   ├── app/professor/           # ★ Professor dashboard
│   │   ├── layout.tsx           # Role guard (professor/admin only)
│   │   ├── page.tsx             # Dashboard overview
│   │   ├── courses/page.tsx     # Course list + management
│   │   ├── courses/new/page.tsx # Create new course
│   │   └── courses/[id]/page.tsx # Course detail with analytics tabs
│   ├── app/api/auth/[...nextauth]/route.ts # NextAuth.js route handler
│   ├── next.config.js           # Modified: env forwarding, proxy rewrites
│   └── (DeepTutor pages)        # solver/, question/, research/, guide/, etc. (DO NOT TOUCH)
├── config/
│   ├── main.yaml                # System config: ports, paths, tools, logging
│   └── agents.yaml              # Agent LLM params: temperature, max_tokens per module
├── scripts/
│   ├── setup_wizard.py          # ★ Interactive .env generator
│   ├── init_db.sql              # ★ PostgreSQL schema (applied on first Docker startup)
│   ├── backup.sh                # ★ PostgreSQL dump + data archive
│   └── restore.sh               # ★ Restore from backup
├── Dockerfile                   # Multi-stage: Node 22 (frontend) + Python 3.11 (backend)
├── docker-compose.yml           # PostgreSQL 16 + Redis 7 + OpenSnek container
├── .env.example                 # All env vars documented
├── requirements.txt             # Python deps (87 packages)
├── OPENSNEK.md                  # User-facing documentation
└── README.md                    # DeepTutor upstream docs
```

Files marked ★ are OpenSnek additions. Files marked "Modified" have minimal OpenSnek changes (fully conditional). Everything else is upstream DeepTutor.

## The DeepTutor Boundary — DO NOT TOUCH

DeepTutor is the upstream AI tutoring engine. **Never modify these directories** unless absolutely necessary, as they receive monthly upstream updates:

- `src/agents/` — AI agent implementations (chat, solve, research, question, guide, ideagen, co_writer)
- `src/knowledge/` — Knowledge base management, document indexing
- `src/services/` — LLM client, embedding, RAG, search, TTS, configuration
- `src/tools/` — Code execution, web search, RAG retrieval, paper search
- `src/core/`, `src/utils/` — Core utilities
- `src/api/routers/` — All DeepTutor API endpoints
- `web/app/` pages: solver, question, research, guide, ideagen, co_writer, notebook, knowledge
- `web/context/` feature contexts: ChatContext, SolverContext, etc.

**If a feature requirement touches DeepTutor code, flag it — do not implement.**

### Files with minimal OpenSnek modifications (keep changes conditional):

| File | What was added |
|------|---------------|
| `src/api/main.py` | ~30 lines: conditional import + registration of OpenSnek middleware and routers |
| `src/api/routers/knowledge.py` | KB access control: filtering `list`, access checks on `get`/`delete`, ownership recording on `create`. All gated by `hasattr(request.state, "user")` — no-op when OpenSnek disabled |
| `web/app/layout.tsx` | Wrapped children with `AuthProvider`, `CourseProvider`, `AppShell`, `ActivityReporter` |
| `web/components/Sidebar.tsx` | Course selector dropdown, user menu, professor dashboard link |
| `web/next.config.js` | Env var forwarding for Azure AD / NextAuth |

## Architecture

### Backend (FastAPI, Python 3.11)

```
Request → CORS Middleware → OpenSnekAuthMiddleware* → Route Handler
                                    ↓
                           (if authenticated)
                           request.state.user = AuthUser
                           + background activity log
```

*Only registered when `NEXTAUTH_SECRET` is set.

**DeepTutor routes** (always registered):
- `/api/v1/chat`, `/api/v1/solve`, `/api/v1/question`, `/api/v1/research`
- `/api/v1/guide`, `/api/v1/ideagen`, `/api/v1/co_writer`
- `/api/v1/knowledge`, `/api/v1/dashboard`, `/api/v1/notebook`
- `/api/v1/settings`, `/api/v1/system`, `/api/v1/config`, `/api/v1/agent-config`

**OpenSnek routes** (conditional on `NEXTAUTH_SECRET`):
- `/api/v1/opensnek/auth/*` — callback, session, set-role
- `/api/v1/opensnek/courses/*` — CRUD, KB linking
- `/api/v1/opensnek/enroll` — join by enrollment code
- `/api/v1/opensnek/enrollments` — list user enrollments
- `/api/v1/opensnek/courses/{id}/students/*` — student list, removal
- `/api/v1/opensnek/professor/*` — analytics (features, topics, timeline, per-student)
- `/api/v1/opensnek/activity` — frontend activity log submission

### Frontend (Next.js 16, React 19, TypeScript)

```
RootLayout
├── AuthProvider (NextAuth SessionProvider → useAuth() hook)
│   └── GlobalProvider (DeepTutor state)
│       └── I18nClientBridge
│           └── CourseProvider (→ useCourse() hook)
│               ├── LayoutWrapper
│               │   └── AppShell (conditional sidebar vs bare layout)
│               └── ActivityReporter (background state observer)
```

**API proxy**: `next.config.js` rewrites `/api/v1/*` and `/api/outputs/*` to `http://localhost:8001/*` so browser requests include auth cookies.

**WebSocket**: Always connects directly to backend (no proxy) via `wsUrl()` from `web/lib/api.ts`.

### Authentication Flow

1. User visits site → `web/middleware.ts` checks for session cookie → redirects to `/login`
2. User clicks "Sign in with Microsoft" → NextAuth.js → Azure AD OAuth
3. On callback, `web/lib/auth.ts` JWT callback fires:
   - Extracts `oid`, `email`, `name` from Azure profile
   - POSTs to `/api/v1/opensnek/auth/callback` to upsert user in PostgreSQL
   - Backend returns user role → stored in JWT
4. JWT stored as encrypted httpOnly cookie by NextAuth v5
5. Subsequent requests: middleware passes cookie to backend
6. Backend `OpenSnekAuthMiddleware` validates via 3 strategies (in order):
   - `Authorization: Bearer <token>` header (plain JWT, for API clients)
   - `?token=<token>` query param (plain JWT)
   - NextAuth session cookie (forwarded to Next.js `/api/auth/session` for decryption)

### Activity Tracking

Two mechanisms capture feature usage:

1. **Backend middleware** (`src/opensnek/middleware.py`): Logs every DeepTutor API call as a background task with feature name, action, and duration.
2. **Frontend observer** (`web/components/ActivityReporter.tsx`): Watches context state transitions (e.g., solver finishing, chat completing) and POSTs to `/api/v1/opensnek/activity` with topic extracted from user input.

Both are fire-and-forget — failures never break the user experience.

## Database (PostgreSQL 16)

Schema in `scripts/init_db.sql`, auto-applied via Docker entrypoint:

```sql
users (id UUID, azure_oid UNIQUE, email UNIQUE, name, role CHECK('student'|'professor'|'admin'), created_at, last_login)
courses (id UUID, name, code UNIQUE, description, kb_name, enrollment_code UNIQUE, azure_group_id, professor_id → users, created_at, is_active)
enrollments (id UUID, user_id → users CASCADE, course_id → courses CASCADE, enrolled_at, UNIQUE(user_id, course_id))
activity_logs (id BIGSERIAL, user_id → users, course_id → courses, feature, action, topic, session_id, duration_ms, created_at, metadata JSONB)
user_kbs (id UUID, user_id → users CASCADE, kb_name, created_at, UNIQUE(user_id, kb_name))
```

Connection: `src/opensnek/database.py` — async SQLAlchemy with asyncpg, pool_size=10, max_overflow=20.

`DATABASE_URL` is built in `docker-compose.yml`: `postgresql+asyncpg://{user}:{pass}@postgres:5432/opensnek`

## Docker Deployment

Three services in `docker-compose.yml`:

| Service | Image | Ports | Purpose |
|---------|-------|-------|---------|
| postgres | postgres:16-alpine | 5432 | User/course/activity data |
| redis | redis:7-alpine | 6379 | Session cache (declared but not actively used in code yet) |
| deeptutor | Custom (Dockerfile) | 8001 (backend), 3782 (frontend) | FastAPI + Next.js via supervisord |

**Dockerfile stages**:
1. `frontend-builder` (Node 22) — `npm ci && npm run build` → standalone Next.js
2. `python-base` (Python 3.11) — installs system deps + `pip install -r requirements.txt`
3. `production` — copies built frontend + Python packages, creates supervisord config, startup scripts
4. `development` — extends production with hot-reload (uvicorn --reload, next dev)

**Startup**: `entrypoint.sh` → supervisord → starts `start-backend.sh` (uvicorn) + `start-frontend.sh` (next start with runtime env injection).

## Environment Variables

**Required for OpenSnek** (if any are empty, OpenSnek is disabled):
- `NEXTAUTH_SECRET` — JWT signing key (generates with setup wizard or `python -c "import secrets; print(secrets.token_urlsafe(32))"`)
- `AZURE_AD_TENANT_ID`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET` — Azure AD app registration
- `UNIVERSITY_NAME` — displayed on login page

**Required for DeepTutor** (always needed):
- `LLM_BINDING`, `LLM_MODEL`, `LLM_API_KEY`, `LLM_HOST` — LLM provider
- `EMBEDDING_BINDING`, `EMBEDDING_MODEL`, `EMBEDDING_API_KEY`, `EMBEDDING_HOST`, `EMBEDDING_DIMENSION` — embedding model

**Optional**:
- `BACKEND_PORT` (default 8001), `FRONTEND_PORT` (default 3782)
- `POSTGRES_USER` (default opensnek), `POSTGRES_PASSWORD` (default opensnek_secret), `POSTGRES_PORT` (default 5432)
- `REDIS_PORT` (default 6379)
- `TTS_BINDING`, `TTS_MODEL`, `TTS_API_KEY`, `TTS_URL`, `TTS_VOICE` — text-to-speech
- `SEARCH_PROVIDER`, `SEARCH_API_KEY` — web search
- `NEXT_PUBLIC_API_BASE_EXTERNAL` — for cloud deployment behind reverse proxy
- `AUTH_TRUST_HOST=true` — required for Docker/proxy setups

## Development Workflow

### Quick start (Docker)
```bash
python3 scripts/setup_wizard.py   # Generate .env
docker compose up -d              # Start all services
# Frontend: http://localhost:3782
# API docs: http://localhost:8001/docs
```

### Local development (no Docker)
```bash
# Terminal 1: Backend
pip install -r requirements.txt
python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2: Frontend
cd web && npm install && npm run dev

# Terminal 3: PostgreSQL (required for OpenSnek)
docker run -d --name opensnek-postgres -e POSTGRES_DB=opensnek -e POSTGRES_USER=opensnek -e POSTGRES_PASSWORD=opensnek_secret -p 5432:5432 -v ./scripts/init_db.sql:/docker-entrypoint-initdb.d/01_schema.sql postgres:16-alpine
```

### Making a user professor
```bash
docker compose exec postgres psql -U opensnek opensnek \
  -c "UPDATE users SET role = 'professor' WHERE email = 'prof@university.edu';"
```

### Database access
```bash
docker compose exec postgres psql -U opensnek opensnek
```

### Backup / Restore
```bash
./scripts/backup.sh                              # Creates ./backups/YYYYMMDD_HHMMSS/
./scripts/restore.sh ./backups/20260215_120000   # Restore from backup
```

## Configuration Files

- `config/main.yaml` — system-wide settings: ports, paths, tool config, logging, module settings
- `config/agents.yaml` — per-agent LLM parameters (temperature, max_tokens for guide, solve, research, question, ideagen, co_writer, narrator)

**Startup validation**: `src/api/main.py` validates that `agents.yaml investigate.valid_tools` is a subset of `main.yaml solve.valid_tools`. Drift causes startup failure.

## Key Patterns and Conventions

### Conditional enablement
All OpenSnek code checks `os.environ.get("NEXTAUTH_SECRET")` or `process.env.NEXTAUTH_SECRET`. If empty, OpenSnek is fully disabled. This pattern must be preserved in all new code.

### Role-based access
Three roles: `student`, `professor`, `admin`. Professors can only manage their own courses. Admins can manage everything. Students see only enrolled courses.

### Background tasks for logging
Activity logging uses `asyncio.create_task()` in middleware — never blocks the response. Frontend `ActivityReporter` uses fire-and-forget `fetch()`.

### API URL routing
Browser requests go through Next.js proxy (to include cookies). Server-side and WebSocket requests go directly to backend. Use `apiUrl()` for HTTP and `wsUrl()` for WebSocket from `web/lib/api.ts`.

### Course ↔ Knowledge Base mapping
Each course has an optional `kb_name` field that maps to a DeepTutor knowledge base name. When a student selects a course, the corresponding KB is automatically selected in GlobalContext.

### KB per-user isolation
KBs are stored globally on disk (`data/knowledge_bases/{kb_name}/`) but visibility is filtered per user via conditional logic in `knowledge.py`. A user sees a KB if: they created it (`user_kbs` table), it's linked to a course they're enrolled in, or they're an admin. The filtering helper `_get_allowed_kb_names_from_request()` queries PostgreSQL and returns `None` (no filtering) when OpenSnek is disabled. KB creation records ownership in `user_kbs`. Imports from `src.opensnek.database` are done inside the helper functions to avoid import errors when OpenSnek is not installed.

### SQL queries
OpenSnek backend uses raw SQL via `sqlalchemy.text()` — not ORM models. This keeps the code simple and avoids heavy SQLAlchemy model definitions.

## Upstream Merge Strategy

DeepTutor receives monthly community updates. To merge:

```bash
git remote add upstream https://github.com/HKUDS/DeepTutor.git
git fetch upstream
git merge upstream/main
```

Conflicts should be minimal because:
1. OpenSnek backend is entirely in `src/opensnek/` (new directory)
2. Only 1 backend file modified: `src/api/main.py` (~30 conditional lines)
3. Frontend changes are in new files (login, courses, professor pages, contexts)
4. Only 3 existing frontend files modified: `layout.tsx`, `Sidebar.tsx`, `next.config.js`

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Backend framework | FastAPI (Python 3.11) |
| Frontend framework | Next.js 16 (React 19, TypeScript) |
| Auth | NextAuth.js v5 + Azure AD (Microsoft Entra ID) |
| Database | PostgreSQL 16 (asyncpg + SQLAlchemy async) |
| Cache | Redis 7 (declared, not actively used yet) |
| Styling | Tailwind CSS |
| UI components | shadcn/ui, Lucide React icons |
| Animations | Framer Motion |
| Containerization | Docker + Docker Compose + supervisord |
| AI/ML | LightRAG, OpenAI/Anthropic/Ollama (via DeepTutor) |
| Document processing | Docling, PyMuPDF (via DeepTutor) |
