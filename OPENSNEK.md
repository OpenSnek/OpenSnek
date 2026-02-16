<div align="center">

<img src="assets/logo-ver2.png" alt="OpenSnek Logo" width="150" style="border-radius: 15px;">

# OpenSnek

**AI-Powered University Learning Platform**

[![Built on DeepTutor](https://img.shields.io/badge/Built_on-DeepTutor-009688?style=flat-square)](https://github.com/HKUDS/DeepTutor)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)](LICENSE)

An open-source, self-hosted AI learning platform that universities deploy on their own servers.
Built on [DeepTutor](https://github.com/HKUDS/DeepTutor) — all upstream AI features inherited automatically.

[**Quick Start**](#-quick-start) · [**For Students**](#-for-students) · [**For Professors**](#-for-professors) · [**For IT**](#-for-university-it) · [**Architecture**](#-architecture)

</div>

---

## What is OpenSnek?

OpenSnek wraps [DeepTutor](https://github.com/HKUDS/DeepTutor)'s AI tutoring engine with everything a university needs to deploy it at scale:

| Layer | What it does |
|:------|:-------------|
| **Authentication** | Azure AD SSO — students and professors sign in with their university Microsoft accounts |
| **Multi-tenancy** | Each course maps to a knowledge base. Students only see their enrolled courses' materials |
| **Course Management** | Professors create courses, upload materials, share enrollment codes, and view analytics |
| **Activity Tracking** | Every interaction is logged to PostgreSQL — professors see which topics students ask about most |
| **Production Deployment** | One-command Docker deploy with PostgreSQL, Redis, automated backups |

When `NEXTAUTH_SECRET` is **not set**, OpenSnek is completely disabled and the system runs as vanilla DeepTutor — making upstream merges trivial.

---

## Inherited from DeepTutor

All of these AI features work out of the box, grounded in course materials:

| Feature | Description |
|:--------|:------------|
| **AI Chat** | Conversational tutor with RAG + web search |
| **Smart Solver** | Multi-agent problem solving with step-by-step reasoning |
| **Question Generator** | Auto-validated practice questions + exam mimicking |
| **Deep Research** | Systematic research reports with citations |
| **Guided Learning** | Interactive step-by-step learning journeys |
| **IdeaGen** | Novel research idea generation from notes |
| **Co-Writer** | AI-assisted writing with audio narration |
| **Notebooks** | Save and organize outputs from all modules |

See the [DeepTutor README](README.md) for detailed documentation of each module.

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- An Azure AD App Registration ([setup guide](#azure-ad-setup))
- An LLM API key (OpenAI, Anthropic, or local Ollama)

### Step 1: Clone and configure

```bash
git clone https://github.com/your-org/OpenSnek.git
cd OpenSnek

# Interactive setup wizard — generates .env file
python3 scripts/setup_wizard.py
```

The wizard prompts for:
1. **University name** — displayed on the login page
2. **Azure AD credentials** — tenant ID, client ID, client secret
3. **LLM provider** — OpenAI, Anthropic, Ollama, or custom
4. **Embedding model** — for knowledge base indexing
5. **Database credentials** — defaults work with Docker

<details>
<summary><b>Or configure manually</b></summary>

```bash
cp .env.example .env
# Edit .env with your values — see Environment Variables section below
```

Generate a NextAuth secret:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

</details>

### Step 2: Launch

```bash
docker compose up -d
```

This starts three services:
- **PostgreSQL** — user/course/activity data (port 5432)
- **Redis** — session cache (port 6379)
- **OpenSnek** — FastAPI backend (port 8001) + Next.js frontend (port 3782)

### Step 3: Access

Open **http://localhost:3782** — you'll see the OpenSnek login page.

| URL | Purpose |
|:----|:--------|
| http://localhost:3782 | Frontend (login, courses, AI features) |
| http://localhost:3782/login | Login page |
| http://localhost:3782/professor | Professor dashboard |
| http://localhost:8001/docs | API documentation |

### Step 4: First-time setup

1. **Sign in** with your Microsoft account
2. **Set yourself as admin** — connect to the database:
   ```bash
   docker compose exec postgres psql -U opensnek opensnek
   UPDATE users SET role = 'professor' WHERE email = 'your@email.com';
   ```
3. **Create a course** — go to `/professor/courses` → "New Course"
4. **Upload materials** — go to `/knowledge` → create a knowledge base, then link it to your course
5. **Share the enrollment code** — students join at `/courses`

---

## 👩‍🎓 For Students

### Signing in

1. Navigate to your university's OpenSnek instance
2. Click **"Sign in with Microsoft (SSO)"**
3. Authenticate with your university Microsoft account
4. You're redirected to the courses page

### Joining a course

**Option A — Enrollment code:**
1. Go to **My Courses** → click **"Join Course"**
2. Enter the code your professor gave you (e.g., `A1B2C3D4EF`)

**Option B — Direct link:**
Your professor may share a link like:
```
https://opensnek.university.edu/courses/join?code=A1B2C3D4EF
```

### Using AI features

Once you select a course, the sidebar shows all available tools. Your course's knowledge base is automatically selected:

- **Home** — Chat with the AI tutor about course materials
- **Smart Solver** — Get step-by-step solutions to problems
- **Question Generator** — Create practice questions from course content
- **Deep Research** — Generate research reports
- **Guided Learning** — Interactive learning journeys
- **IdeaGen** — Generate research ideas from your notes
- **Co-Writer** — AI-assisted writing with course context
- **Notebooks** — Save outputs from any module

---

## 👨‍🏫 For Professors

### Accessing the dashboard

After signing in, click **"Professor Dashboard"** in the sidebar (visible only to professors).

### Creating a course

1. Go to **Professor Dashboard** → **Courses** → **"New Course"**
2. Fill in:
   - **Course Name** — e.g., "Introduction to Machine Learning"
   - **Course Code** — e.g., "CS101" (must be unique)
   - **Description** — brief description
3. Click **"Create Course"** — an enrollment code is generated automatically

### Uploading materials

1. Go to the main app → **Knowledge Bases** page
2. Click **"New Knowledge Base"** → give it a name (e.g., `cs101-materials`)
3. Upload PDFs, documents, slides — the system indexes them automatically
4. Go back to **Professor Dashboard** → your course → **Materials** tab
5. Link the knowledge base to the course by entering its name

### Sharing with students

On the course detail page, you'll see:
- **Enrollment code** — give this to students (e.g., `A1B2C3D4EF`)
- **Join link** — click to copy a direct enrollment URL

### Viewing analytics

The course detail page has three tabs:

**Students tab:**
- See all enrolled students with name, email
- Total sessions per student
- Last active timestamp
- Remove students if needed

**Analytics tab:**
- **Feature usage** — bar chart showing chat vs solver vs research vs questions usage
- **Most asked topics** — see what students are asking about most frequently

**Materials tab:**
- View and update the linked knowledge base

---

## 🏗 For University IT

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Docker Compose                      │
│                                                       │
│  ┌──────────────┐  ┌─────────┐  ┌─────────────────┐ │
│  │  PostgreSQL   │  │  Redis  │  │    OpenSnek      │ │
│  │  (port 5432)  │  │ (6379)  │  │                  │ │
│  │               │  │         │  │  Next.js  :3782  │ │
│  │  - users      │  │ session │  │  FastAPI  :8001  │ │
│  │  - courses    │  │  cache  │  │                  │ │
│  │  - enrollments│  │         │  │  DeepTutor AI    │ │
│  │  - activity   │  │         │  │  (untouched)     │ │
│  └──────────────┘  └─────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Environment Variables

<details>
<summary><b>Full reference</b></summary>

**OpenSnek (Required)**

| Variable | Description | Default |
|:---------|:------------|:--------|
| `UNIVERSITY_NAME` | Shown on login page | `University` |
| `NEXTAUTH_SECRET` | JWT signing key (generate with setup wizard) | *(empty = OpenSnek disabled)* |
| `AZURE_AD_TENANT_ID` | Azure AD tenant | |
| `AZURE_AD_CLIENT_ID` | Azure AD app client ID | |
| `AZURE_AD_CLIENT_SECRET` | Azure AD app client secret | |
| `NEXTAUTH_URL` | Frontend public URL | `http://localhost:3782` |

**Database**

| Variable | Description | Default |
|:---------|:------------|:--------|
| `POSTGRES_USER` | PostgreSQL username | `opensnek` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `opensnek_secret` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `REDIS_PORT` | Redis port | `6379` |

**LLM (Required — inherited from DeepTutor)**

| Variable | Description | Default |
|:---------|:------------|:--------|
| `LLM_BINDING` | Provider: `openai`, `anthropic`, `ollama`, etc. | `openai` |
| `LLM_MODEL` | Model name | `gpt-4o` |
| `LLM_API_KEY` | API key | |
| `LLM_HOST` | API endpoint URL | `https://api.openai.com/v1` |

**Embedding (Required)**

| Variable | Description | Default |
|:---------|:------------|:--------|
| `EMBEDDING_BINDING` | Provider | `openai` |
| `EMBEDDING_MODEL` | Model name | `text-embedding-3-small` |
| `EMBEDDING_API_KEY` | API key | |
| `EMBEDDING_HOST` | API endpoint | `https://api.openai.com/v1` |
| `EMBEDDING_DIMENSION` | Vector dimensions | `3072` |

**Ports**

| Variable | Description | Default |
|:---------|:------------|:--------|
| `BACKEND_PORT` | FastAPI port | `8001` |
| `FRONTEND_PORT` | Next.js port | `3782` |

</details>

### Azure AD Setup

1. Go to [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**
2. **Name**: `OpenSnek`
3. **Supported account types**: "Accounts in this organizational directory only"
4. **Redirect URI**: `http://localhost:3782/api/auth/callback/microsoft-entra-id`
   - For production, use your actual domain: `https://opensnek.university.edu/api/auth/callback/microsoft-entra-id`
5. After creation, note:
   - **Application (client) ID** → `AZURE_AD_CLIENT_ID`
   - **Directory (tenant) ID** → `AZURE_AD_TENANT_ID`
6. Go to **Certificates & secrets** → **New client secret** → copy the value → `AZURE_AD_CLIENT_SECRET`
7. Go to **API permissions** → ensure `User.Read` and `openid`, `profile`, `email` are granted

### Backup and Restore

**Create a backup:**
```bash
./scripts/backup.sh
# Creates ./backups/YYYYMMDD_HHMMSS/ with:
#   - opensnek.sql (PostgreSQL dump)
#   - data.tar.gz (knowledge bases + user data)
```

**Restore from backup:**
```bash
./scripts/restore.sh ./backups/20260215_120000
```

**Automated backups (recommended):**
```bash
# Add to crontab: daily backup at 2 AM
0 2 * * * cd /path/to/opensnek && ./scripts/backup.sh
```

### Common Operations

```bash
# Start
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f

# Rebuild after code changes
docker compose up --build -d

# Database shell
docker compose exec postgres psql -U opensnek opensnek

# Make a user a professor
docker compose exec postgres psql -U opensnek opensnek \
  -c "UPDATE users SET role = 'professor' WHERE email = 'prof@university.edu';"

# Make a user an admin
docker compose exec postgres psql -U opensnek opensnek \
  -c "UPDATE users SET role = 'admin' WHERE email = 'admin@university.edu';"
```

### Cloud Deployment

For production deployment behind a reverse proxy:

```bash
# In .env, set:
NEXTAUTH_URL=https://opensnek.university.edu
NEXT_PUBLIC_API_BASE_EXTERNAL=https://opensnek.university.edu:8001
```

See the [DeepTutor README](README.md#docker-frontend-cannot-connect-in-cloud-deployment) for nginx configuration examples.

### Data Privacy

- **All data stays on your servers** — zero external dependencies beyond the LLM API
- Student data is stored in PostgreSQL on your infrastructure
- Knowledge base content stays in local file storage
- For maximum privacy, use a local LLM (Ollama) — no data leaves campus

---

## 🔧 Architecture Details

### How OpenSnek Integrates with DeepTutor

OpenSnek adds a **conditional middleware layer** to DeepTutor's FastAPI backend. When `NEXTAUTH_SECRET` is set:

1. **Auth middleware** verifies JWT tokens on every request
2. **Activity logging** records feature usage to PostgreSQL in the background
3. **OpenSnek API routes** (`/api/v1/opensnek/*`) handle courses, enrollments, and analytics

When `NEXTAUTH_SECRET` is **not set**, all OpenSnek code is completely bypassed — DeepTutor runs in its original single-user mode.

### Files Modified in DeepTutor

Only **1 backend file** is modified (`src/api/main.py` — ~20 lines added, fully conditional). Frontend changes are limited to:
- `web/app/layout.tsx` — auth provider wrapper
- `web/components/Sidebar.tsx` — course selector + user menu
- `web/next.config.js` — env var forwarding

### OpenSnek Package Structure

```
src/opensnek/               # Backend (Python)
├── auth.py                 # JWT verification (3 strategies)
├── middleware.py            # Auth enforcement + activity logging
├── database.py             # PostgreSQL async connection
├── models.py               # Pydantic schemas
└── routers/
    ├── auth.py             # User upsert, session, roles
    ├── courses.py          # Course CRUD
    ├── enrollments.py      # Join/leave courses
    ├── professor.py        # Analytics endpoints
    └── activity.py         # Frontend activity logging

web/                        # Frontend (TypeScript)
├── lib/auth.ts             # NextAuth.js v5 config
├── lib/activity.ts         # Activity reporting utility
├── middleware.ts            # Route protection
├── context/AuthContext.tsx  # Auth state
├── context/CourseContext.tsx # Course state
├── components/AppShell.tsx  # Conditional sidebar
├── components/ActivityReporter.tsx # State observer
├── app/login/page.tsx      # Login page
├── app/courses/            # Course selection + join
└── app/professor/          # Dashboard, courses, analytics
```

### Database Schema

```sql
users        — Azure AD users (id, email, name, role)
courses      — Courses mapped to KB names (id, code, kb_name, enrollment_code, professor_id)
enrollments  — Student ↔ Course (user_id, course_id)
activity_logs — All tracked interactions (user_id, course_id, feature, topic, timestamp)
```

---

## 🤝 Contributing

OpenSnek is designed for developer contributions with clean module boundaries:

- **DeepTutor AI features** — in `src/agents/`, `src/knowledge/`, `src/services/` — maintained by the DeepTutor community
- **OpenSnek layer** — in `src/opensnek/`, `web/app/professor/`, `web/context/AuthContext.tsx` — maintained separately
- **Infrastructure** — `docker-compose.yml`, `scripts/` — shared

To pull upstream DeepTutor updates:
```bash
git remote add upstream https://github.com/HKUDS/DeepTutor.git
git fetch upstream
git merge upstream/main
# Resolve conflicts (minimal — OpenSnek changes are mostly additive)
```

---

## 📄 License

This project is licensed under the [AGPL-3.0 License](LICENSE).

Built on [DeepTutor](https://github.com/HKUDS/DeepTutor) by the [Data Intelligence Lab @ HKU](https://github.com/HKUDS).
