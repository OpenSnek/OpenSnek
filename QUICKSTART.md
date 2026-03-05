## Prerequisites

- Python 3 (for setup wizard)
- Azure AD App Registration ([instructions below](#azure-ad-setup))
- **Docker path**: Docker & Docker Compose
- **Bare-metal path**: PostgreSQL 16, Node.js 22, Ollama (if using local LLM)

## 1. Configure

```bash
git clone https://github.com/OpenSnek/OpenSnek.git
cd OpenSnek
python3 scripts/setup_wizard.py
```

The wizard asks for your deployment mode (Docker or bare-metal), university name, Azure AD credentials (skippable), and LLM provider. It generates `.env` with all settings.

For Ollama users, the wizard defaults to **qwen3:30b-a3b** (recommended) with **nomic-embed-text** for embeddings.

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

**Docker (recommended):**
```bash
docker compose up -d
```
Wait ~60s for startup. Check with `docker compose logs -f deeptutor`.

**Bare-metal / GPU cloud:**
```bash
./scripts/start.sh
```
This automatically checks PostgreSQL, starts Ollama (if configured), installs dependencies, builds the frontend, and launches both services. It detects port conflicts and adapts automatically.

| URL | What |
|-----|------|
| http://localhost:3782 | App (login, courses, AI features) |
| http://localhost:3782/professor | Professor dashboard |
| http://localhost:8001/docs | API docs (port may differ on bare-metal) |

## 3. First login

1. Open http://localhost:3782 → **Sign in with Microsoft**
2. Authenticate with your Azure AD account
3. You land on `/courses` as a student

## 4. Make yourself professor

```bash
# Docker:
docker compose exec postgres psql -U opensnek opensnek \
  -c "UPDATE users SET role = 'professor' WHERE email = 'you@university.edu';"

# Bare-metal:
psql -U opensnek opensnek \
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

**Docker:**
```bash
docker compose logs -f              # All logs
docker compose up --build -d        # Rebuild after code changes
docker compose down                 # Stop
docker compose restart deeptutor    # Restart app only
docker compose exec postgres psql -U opensnek opensnek  # DB shell
```

**Bare-metal:**
```bash
./scripts/start.sh                  # Start all services
./scripts/start.sh --stop           # Stop all services
./scripts/start.sh --status         # Check if running
psql -U opensnek opensnek           # DB shell
```

**Both:**
```bash
./scripts/backup.sh                                    # Backup
./scripts/restore.sh ./backups/YYYYMMDD_HHMMSS         # Restore
```

## Gotchas

- **DB schema only applies on first startup.** If you add tables later, apply them manually via `psql`. The `start.sh` script does this automatically for bare-metal.
- **`NEXTAUTH_SECRET` empty = OpenSnek disabled.** System runs as vanilla DeepTutor (no auth, no courses).
- **Azure AD redirect URI must match exactly** — including port and path. No trailing slash.
- **KB isolation is automatic.** Users only see KBs they created or are linked to their enrolled courses.
- **Port conflicts:** `start.sh` auto-detects and uses the next available port. Docker uses the ports from `.env` directly.
