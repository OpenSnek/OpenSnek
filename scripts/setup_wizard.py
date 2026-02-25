#!/usr/bin/env python3
"""
OpenSnek Setup Wizard
=====================
Interactive CLI that generates the .env configuration file.

Usage:
    python3 scripts/setup_wizard.py

Supports two deployment modes:
  - Docker (recommended): PostgreSQL + Redis + app in containers
  - Bare-metal: services run directly on the host (GPU cloud, VM, etc.)
"""

import os
import secrets
import sys
from pathlib import Path

try:
    import urllib.request
    import json
except ImportError:
    pass


def banner():
    print()
    print("=" * 60)
    print("  OpenSnek Setup Wizard")
    print("  AI-Powered University Learning Platform")
    print("=" * 60)
    print()


def prompt(label: str, default: str = "", secret: bool = False) -> str:
    """Prompt the user for input with an optional default."""
    if default:
        display = f"{label} [{default}]: "
    else:
        display = f"{label}: "

    if secret and default:
        display = f"{label} [{'*' * min(len(default), 8)}]: "

    value = input(display).strip()
    return value if value else default


def generate_secret() -> str:
    """Generate a URL-safe random secret."""
    return secrets.token_urlsafe(32)


def detect_ollama() -> str | None:
    """Try to detect a running Ollama instance."""
    for url in ["http://localhost:11434", "http://127.0.0.1:11434"]:
        try:
            req = urllib.request.Request(f"{url}/api/tags", method="GET")
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.status == 200:
                    return url
        except Exception:
            continue
    return None


def main():
    banner()

    project_root = Path(__file__).parent.parent
    env_path = project_root / ".env"

    if env_path.exists():
        overwrite = input(
            ".env file already exists. Overwrite? [y/N]: "
        ).strip().lower()
        if overwrite != "y":
            print("Aborted. Existing .env file preserved.")
            sys.exit(0)

    # ── Deployment Mode ──────────────────────────────────────────
    print("--- Deployment Mode ---")
    print("  1. Docker (recommended — one command, includes PostgreSQL)")
    print("  2. Bare-metal / VM / GPU cloud (you manage services)")
    print()
    deploy_mode = prompt("Deployment mode", "1")
    is_docker = deploy_mode != "2"

    # ── University ───────────────────────────────────────────────
    print()
    print("--- University Configuration ---")
    print()
    university_name = prompt("University name", "University")

    # ── Azure AD ─────────────────────────────────────────────────
    print()
    print("--- Azure AD / Microsoft Entra ID ---")
    print("Required for SSO login. You can skip and configure later in .env.")
    print()
    skip_azure = prompt("Skip Azure AD for now? [y/N]", "N").lower() == "y"

    azure_tenant = ""
    azure_client = ""
    azure_secret = ""

    if not skip_azure:
        print()
        print("Create an App Registration in Azure Portal:")
        print("  Microsoft Entra ID → App registrations → New registration")
        print("  Redirect URI: http://localhost:3782/api/auth/callback/microsoft-entra-id")
        print()
        azure_tenant = prompt("Azure AD Tenant ID")
        azure_client = prompt("Azure AD Client ID")
        azure_secret = prompt("Azure AD Client Secret", secret=True)
    else:
        print("  Skipped. Set AZURE_AD_* values in .env before first login.")

    # ── LLM Configuration ────────────────────────────────────────
    print()
    print("--- LLM Configuration ---")
    print("Choose your LLM provider:")
    print("  1. OpenAI (gpt-4o)")
    print("  2. Anthropic (claude-3-5-sonnet)")
    print("  3. Ollama (local, free, private — recommended for universities)")
    print("     Recommended model: qwen3:30b-a3b (runs on a single RTX 4090)")
    print("  4. Custom")
    print()
    llm_choice = prompt("Provider", "3")

    # Defaults
    llm_binding = "openai"
    llm_model = "gpt-4o"
    llm_key = ""
    llm_host = "https://api.openai.com/v1"
    embed_binding = "openai"
    embed_model = "text-embedding-3-small"
    embed_key = ""
    embed_host = "https://api.openai.com/v1"
    embed_dim = "3072"

    if llm_choice == "1":
        llm_binding = "openai"
        llm_model = prompt("Model name", "gpt-4o")
        llm_key = prompt("OpenAI API key", secret=True)
        llm_host = "https://api.openai.com/v1"
        # Embedding defaults to OpenAI
        embed_key = llm_key

    elif llm_choice == "2":
        llm_binding = "anthropic"
        llm_model = prompt("Model name", "claude-3-5-sonnet")
        llm_key = prompt("Anthropic API key", secret=True)
        llm_host = "https://api.anthropic.com"
        # Anthropic has no embeddings — default to OpenAI
        print()
        print("  Anthropic doesn't provide embeddings. Using OpenAI for embeddings.")
        embed_key = prompt("OpenAI API key (for embeddings)", secret=True)

    elif llm_choice == "3":
        llm_binding = "ollama"
        llm_model = prompt("Model name", "qwen3:30b-a3b")
        llm_key = "ollama"

        # Auto-detect Ollama
        detected = detect_ollama()
        if detected:
            print(f"  Ollama detected at {detected}")
            ollama_url = detected
        else:
            print("  Ollama not detected. Make sure it's running: ollama serve")
            if is_docker:
                ollama_url = prompt("Ollama URL", "http://host.docker.internal:11434")
            else:
                ollama_url = prompt("Ollama URL", "http://localhost:11434")

        llm_host = f"{ollama_url}/v1"

        # Embedding defaults to Ollama with nomic-embed-text
        embed_binding = "ollama"
        embed_model = "nomic-embed-text"
        embed_key = "ollama"
        embed_host = f"{ollama_url}/v1"
        embed_dim = "768"

    else:
        llm_binding = prompt("LLM binding")
        llm_model = prompt("Model name")
        llm_key = prompt("API key", secret=True)
        llm_host = prompt("API host URL")
        embed_key = llm_key

    # ── Embedding (allow override) ───────────────────────────────
    print()
    print(f"--- Embedding Configuration (default: {embed_binding} / {embed_model}) ---")
    customize_embed = prompt("Customize embedding settings? [y/N]", "N").lower() == "y"

    if customize_embed:
        embed_binding = prompt("Embedding provider", embed_binding)
        embed_model = prompt("Embedding model", embed_model)
        embed_key = prompt("Embedding API key", embed_key, secret=True)
        embed_host = prompt("Embedding host", embed_host)
        embed_dim = prompt("Embedding dimensions", embed_dim)

    # ── Database ─────────────────────────────────────────────────
    print()
    print("--- Database Configuration (defaults work with Docker) ---")
    pg_user = prompt("PostgreSQL user", "opensnek")
    pg_pass = prompt("PostgreSQL password", "opensnek_secret", secret=True)
    pg_port = prompt("PostgreSQL port", "5432")

    # ── Ports ────────────────────────────────────────────────────
    print()
    print("--- Ports ---")
    backend_port = prompt("Backend API port", "8001")
    frontend_port = prompt("Frontend port", "3782")

    # ── Generate secrets ─────────────────────────────────────────
    nextauth_secret = generate_secret()

    # ── Build DATABASE_URL for bare-metal ────────────────────────
    db_host = "localhost" if not is_docker else "postgres"
    database_url = f"postgresql+asyncpg://{pg_user}:{pg_pass}@{db_host}:{pg_port}/opensnek"

    # ── Write .env ───────────────────────────────────────────────
    env_content = f"""# ============================================
# OpenSnek Configuration
# Generated by setup_wizard.py
# ============================================

# University
UNIVERSITY_NAME={university_name}

# Server Ports
BACKEND_PORT={backend_port}
FRONTEND_PORT={frontend_port}

# LLM Configuration
LLM_BINDING={llm_binding}
LLM_MODEL={llm_model}
LLM_API_KEY={llm_key}
LLM_HOST={llm_host}

# Embedding Configuration
EMBEDDING_BINDING={embed_binding}
EMBEDDING_MODEL={embed_model}
EMBEDDING_API_KEY={embed_key}
EMBEDDING_HOST={embed_host}
EMBEDDING_DIMENSION={embed_dim}

# Azure AD / Microsoft Entra ID
AZURE_AD_TENANT_ID={azure_tenant}
AZURE_AD_CLIENT_ID={azure_client}
AZURE_AD_CLIENT_SECRET={azure_secret}

# NextAuth.js (auto-generated, do not change)
NEXTAUTH_SECRET={nextauth_secret}
NEXTAUTH_URL=http://localhost:{frontend_port}
AUTH_TRUST_HOST=true

# PostgreSQL
POSTGRES_USER={pg_user}
POSTGRES_PASSWORD={pg_pass}
POSTGRES_PORT={pg_port}
DATABASE_URL={database_url}

# Redis
REDIS_PORT=6379

# Optional: TTS, Search, etc.
# TTS_BINDING=openai
# TTS_MODEL=tts-1
# TTS_API_KEY=
# TTS_URL=https://api.openai.com/v1
# TTS_VOICE=alloy
# SEARCH_PROVIDER=perplexity
# SEARCH_API_KEY=
"""

    with open(env_path, "w") as f:
        f.write(env_content)

    print()
    print("=" * 60)
    print(f"  .env file written to: {env_path}")
    print("=" * 60)
    print()

    if is_docker:
        print("Next steps:")
        print("  1. docker compose up -d")
        print(f"  2. Open http://localhost:{frontend_port}")
        print("  3. Sign in with your Microsoft account")
    else:
        print("Next steps:")
        print("  1. ./scripts/start.sh")
        print(f"  2. Open http://localhost:{frontend_port}")
        print("  3. Sign in with your Microsoft account")
        print()
        print("Or start manually:")
        print(f"  Backend:  PYTHONPATH=. python3 -m uvicorn src.api.main:app --host 0.0.0.0 --port {backend_port}")
        print(f"  Frontend: cd web && npm run build && npm run start -- -H 0.0.0.0 -p {frontend_port}")

    print()
    print("To make a user a professor:")
    print("  docker compose exec postgres psql -U opensnek opensnek \\")
    print("    -c \"UPDATE users SET role = 'professor' WHERE email = 'prof@university.edu';\"")
    print()


if __name__ == "__main__":
    main()
