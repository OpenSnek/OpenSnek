# OpenSnek Quickstart

## Prerequisites

- Docker & Docker Compose
- Python 3 (for setup wizard)
- Azure AD App Registration ([instructions below](#azure-ad-setup))
- An LLM API key (OpenAI, Anthropic, or local Ollama)

## 1. Configure

```bash
git clone https://github.com/your-org/OpenSnek.git
cd OpenSnek
python3 scripts/setup_wizard.py
```

The wizard generates `.env` with all settings. It will ask for your university name, Azure AD credentials, LLM provider, and embedding config. Database defaults work out of the box.

<details>
<summary>Manual setup (skip wizard)</summary>

```bash
cp .env.example .env
# Fill in AZURE_AD_*, LLM_*, EMBEDDING_* values
# Generate and set NEXTAUTH_SECRET:
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```
</details>

## 2. Launch

```bash
docker compose up -d
```

Wait ~60s for startup. Check with `docker compose logs -f deeptutor`.

| URL | What |
|-----|------|
| http://localhost:3782 | App (login, courses, AI features) |
| http://localhost:3782/professor | Professor dashboard |
| http://localhost:8001/docs | API docs |

## 3. First login

1. Open http://localhost:3782 → **Sign in with Microsoft**
2. Authenticate with your Azure AD account
3. You land on `/courses` as a student

## 4. Make yourself professor

```bash
docker compose exec postgres psql -U opensnek opensnek \
  -c "UPDATE users SET role = 'professor' WHERE email = 'you@university.edu';"
```

Refresh the browser — **Professor Dashboard** appears in the sidebar.

## 5. Create a course

1. **Professor Dashboard** → **Courses** → **New Course**
2. Fill in name, code (e.g. `CS101`), description
3. An enrollment code is generated automatically (e.g. `A1B2C3D4EF`)

## 6. Upload materials

1. Sidebar → **Knowledge Bases** → **New Knowledge Base** (e.g. `cs101-materials`)
2. Upload PDFs/slides/docs — indexing runs in the background
3. Back in **Professor Dashboard** → your course → **Materials** tab → enter KB name → save

## 7. Enroll students

Share the enrollment code or a join link:
```
http://localhost:3782/courses/join?code=A1B2C3D4EF
```

Students click **Join Course**, enter the code, and gain access to the course KB.

---

## Azure AD Setup

1. [portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**
2. Name: `OpenSnek`, account type: "This org only"
3. Redirect URI: `http://localhost:3782/api/auth/callback/microsoft-entra-id`
   - Production: `https://yourdomain.edu/api/auth/callback/microsoft-entra-id`
4. Copy **Application (client) ID** → `AZURE_AD_CLIENT_ID`
5. Copy **Directory (tenant) ID** → `AZURE_AD_TENANT_ID`
6. **Certificates & secrets** → New secret → copy value → `AZURE_AD_CLIENT_SECRET`
7. **API permissions** → grant `User.Read`, `openid`, `profile`, `email`

---

## Common Commands

```bash
docker compose logs -f              # All logs
docker compose up --build -d        # Rebuild after code changes
docker compose down                 # Stop
docker compose restart deeptutor    # Restart app only

# Database shell
docker compose exec postgres psql -U opensnek opensnek

# Backup / restore
./scripts/backup.sh
./scripts/restore.sh ./backups/YYYYMMDD_HHMMSS

# Make admin
docker compose exec postgres psql -U opensnek opensnek \
  -c "UPDATE users SET role = 'admin' WHERE email = 'admin@university.edu';"
```

## Local Development (no Docker for app)

```bash
# Terminal 1: PostgreSQL
docker run -d --name opensnek-postgres \
  -e POSTGRES_DB=opensnek -e POSTGRES_USER=opensnek -e POSTGRES_PASSWORD=opensnek_secret \
  -p 5432:5432 -v ./scripts/init_db.sql:/docker-entrypoint-initdb.d/01_schema.sql \
  postgres:16-alpine

# Terminal 2: Backend
pip install -r requirements.txt
python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8001 --reload

# Terminal 3: Frontend
cd web && npm install && npm run dev
```

## Gotchas

- **DB schema only applies on first startup.** If you add tables later, apply them manually via `psql`.
- **`NEXTAUTH_SECRET` empty = OpenSnek disabled.** System runs as vanilla DeepTutor (no auth, no courses).
- **Azure AD redirect URI must match exactly** — including port and path. No trailing slash.
- **KB isolation is automatic.** Users only see KBs they created or are linked to their enrolled courses.
