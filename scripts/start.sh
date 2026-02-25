#!/bin/bash
# ============================================
# OpenSnek Bare-Metal Launcher
# ============================================
# Starts all services for non-Docker deployments (GPU cloud, VM, etc.)
#
# Usage:
#   ./scripts/start.sh           Start all services
#   ./scripts/start.sh --stop    Stop all services
#   ./scripts/start.sh --status  Show running status
#
# Prerequisites:
#   1. Run: python3 scripts/setup_wizard.py (generates .env)
#   2. PostgreSQL must be running
#   3. Ollama must be installed (if using local LLM)
#   4. Python 3.11+ and Node.js 22+ must be installed

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Project root (relative to script location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

PID_FILE="$PROJECT_ROOT/.opensnek.pids"

# ── Handle --stop ────────────────────────────────────────────
if [ "$1" = "--stop" ]; then
    if [ -f "$PID_FILE" ]; then
        echo -e "${CYAN}Stopping OpenSnek...${NC}"
        while read -r pid; do
            kill "$pid" 2>/dev/null && echo "  Stopped PID $pid" || true
        done < "$PID_FILE"
        rm -f "$PID_FILE"
        echo -e "${GREEN}OpenSnek stopped.${NC}"
    else
        echo "OpenSnek is not running (no PID file found)."
    fi
    exit 0
fi

# ── Handle --status ──────────────────────────────────────────
if [ "$1" = "--status" ]; then
    if [ -f "$PID_FILE" ]; then
        alive=0
        while read -r pid; do
            if kill -0 "$pid" 2>/dev/null; then
                alive=$((alive + 1))
            fi
        done < "$PID_FILE"
        if [ "$alive" -gt 0 ]; then
            echo -e "${GREEN}OpenSnek is running ($alive processes).${NC}"
        else
            echo "OpenSnek processes have exited."
            rm -f "$PID_FILE"
        fi
    else
        echo "OpenSnek is not running."
    fi
    exit 0
fi

# ── Banner ───────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  OpenSnek Bare-Metal Launcher"
echo "============================================"
echo ""

# ── Step 1: Load .env ────────────────────────────────────────
if [ ! -f .env ]; then
    echo -e "${RED}No .env file found.${NC}"
    echo "Run: python3 scripts/setup_wizard.py"
    exit 1
fi

set -a
source .env
set +a
echo -e "${GREEN}Loaded .env${NC}"

# ── Step 2: Find available ports ─────────────────────────────
find_available_port() {
    local port=$1
    while ss -tlnp 2>/dev/null | grep -q ":$port " || \
          netstat -tlnp 2>/dev/null | grep -q ":$port "; do
        echo -e "  ${YELLOW}Port $port is in use, trying $((port + 1))...${NC}"
        port=$((port + 1))
    done
    echo "$port"
}

BACKEND_PORT=$(find_available_port "${BACKEND_PORT:-8001}")
FRONTEND_PORT=$(find_available_port "${FRONTEND_PORT:-3782}")
export BACKEND_PORT FRONTEND_PORT

echo -e "${CYAN}Backend port:  $BACKEND_PORT${NC}"
echo -e "${CYAN}Frontend port: $FRONTEND_PORT${NC}"

# ── Step 3: Check PostgreSQL ─────────────────────────────────
echo ""
echo "Checking PostgreSQL..."
PG_HOST="localhost"
PG_PORT="${POSTGRES_PORT:-5432}"
PG_USER="${POSTGRES_USER:-opensnek}"
PG_PASS="${POSTGRES_PASSWORD:-opensnek_secret}"
PG_DB="opensnek"

if command -v pg_isready &>/dev/null; then
    if ! pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" &>/dev/null; then
        echo -e "${RED}PostgreSQL is not running on $PG_HOST:$PG_PORT${NC}"
        echo ""
        echo "Start it with one of:"
        echo "  sudo systemctl start postgresql"
        echo "  pg_ctlcluster 14 main start"
        echo "  docker run -d --name opensnek-postgres -e POSTGRES_DB=$PG_DB -e POSTGRES_USER=$PG_USER -e POSTGRES_PASSWORD=$PG_PASS -p $PG_PORT:5432 -v ./scripts/init_db.sql:/docker-entrypoint-initdb.d/01_schema.sql postgres:16-alpine"
        exit 1
    fi
fi

# Apply schema if tables don't exist
TABLE_COUNT=$(PGPASSWORD="$PG_PASS" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -tAc \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -lt 4 ]; then
    echo "  Applying database schema..."
    PGPASSWORD="$PG_PASS" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" \
        -f scripts/init_db.sql 2>/dev/null
    echo -e "  ${GREEN}Schema applied.${NC}"
else
    echo -e "  ${GREEN}Database OK ($TABLE_COUNT tables).${NC}"
fi

# ── Step 4: Check Ollama (if configured) ─────────────────────
if [ "$LLM_BINDING" = "ollama" ]; then
    echo ""
    echo "Checking Ollama..."

    OLLAMA_URL="${LLM_HOST%/v1}"  # Strip /v1 suffix
    OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"

    if ! curl -s "$OLLAMA_URL/api/tags" >/dev/null 2>&1; then
        if command -v ollama &>/dev/null; then
            echo "  Starting Ollama..."
            ollama serve &>/dev/null &
            sleep 3
        else
            echo -e "${RED}Ollama is not running and not installed.${NC}"
            echo "Install: curl -fsSL https://ollama.com/install.sh | sh"
            exit 1
        fi
    fi

    # Check if model is pulled
    if ! ollama list 2>/dev/null | grep -q "$LLM_MODEL"; then
        echo "  Pulling model $LLM_MODEL (this may take a while)..."
        ollama pull "$LLM_MODEL"
    fi
    echo -e "  ${GREEN}LLM model ready: $LLM_MODEL${NC}"

    # Check embedding model
    if [ "$EMBEDDING_BINDING" = "ollama" ]; then
        if ! ollama list 2>/dev/null | grep -q "$EMBEDDING_MODEL"; then
            echo "  Pulling embedding model $EMBEDDING_MODEL..."
            ollama pull "$EMBEDDING_MODEL"
        fi
        echo -e "  ${GREEN}Embedding model ready: $EMBEDDING_MODEL${NC}"
    fi
fi

# ── Step 5: Set environment ──────────────────────────────────
export PYTHONPATH="$PROJECT_ROOT"
export DATABASE_URL="postgresql+asyncpg://$PG_USER:$PG_PASS@$PG_HOST:$PG_PORT/$PG_DB"
export AUTH_TRUST_HOST=true

# ── Step 6: Install dependencies if needed ───────────────────
echo ""
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "Installing Python dependencies..."
    pip install -r requirements.txt -q
fi
echo -e "${GREEN}Python dependencies OK.${NC}"

if [ ! -d web/node_modules ]; then
    echo "Installing frontend dependencies..."
    cd web && npm install --legacy-peer-deps --silent && cd ..
fi
echo -e "${GREEN}Node dependencies OK.${NC}"

# ── Step 7: Build frontend if needed ─────────────────────────
if [ ! -d web/.next ]; then
    echo ""
    echo "Building frontend (first run only)..."
    cd web && BACKEND_PORT="$BACKEND_PORT" npm run build && cd ..
fi

# ── Step 8: Create .env.local for frontend ───────────────────
cat > web/.env.local <<ENVEOF
NEXT_PUBLIC_API_BASE=http://localhost:${BACKEND_PORT}
NEXT_PUBLIC_UNIVERSITY_NAME=${UNIVERSITY_NAME:-University}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-}
NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:${FRONTEND_PORT}}
AUTH_TRUST_HOST=true
AZURE_AD_CLIENT_ID=${AZURE_AD_CLIENT_ID:-}
AZURE_AD_CLIENT_SECRET=${AZURE_AD_CLIENT_SECRET:-}
AZURE_AD_TENANT_ID=${AZURE_AD_TENANT_ID:-}
ENVEOF

# ── Step 9: Start services ───────────────────────────────────
echo ""
echo "Starting backend on port $BACKEND_PORT..."
python3 -m uvicorn src.api.main:app --host 0.0.0.0 --port "$BACKEND_PORT" &
BACKEND_PID=$!
sleep 2

echo "Starting frontend on port $FRONTEND_PORT..."
cd "$PROJECT_ROOT/web"
BACKEND_PORT="$BACKEND_PORT" node node_modules/next/dist/bin/next start -H 0.0.0.0 -p "$FRONTEND_PORT" &
FRONTEND_PID=$!
cd "$PROJECT_ROOT"

# Save PIDs
echo "$BACKEND_PID" > "$PID_FILE"
echo "$FRONTEND_PID" >> "$PID_FILE"

echo ""
echo "============================================"
echo -e "  ${GREEN}OpenSnek is running!${NC}"
echo "============================================"
echo ""
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo "  Backend:  http://localhost:$BACKEND_PORT"
echo "  API docs: http://localhost:$BACKEND_PORT/docs"
echo ""
echo "  Stop:   ./scripts/start.sh --stop"
echo "  Status: ./scripts/start.sh --status"
echo ""
echo "  Press Ctrl+C to stop."
echo ""

# Handle Ctrl+C gracefully
cleanup() {
    echo ""
    echo -e "${CYAN}Stopping OpenSnek...${NC}"
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    rm -f "$PID_FILE"
    echo -e "${GREEN}Stopped.${NC}"
    exit 0
}
trap cleanup INT TERM

# Wait for processes
wait
