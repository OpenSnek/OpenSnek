#!/bin/bash
# ============================================
# OpenSnek Restore Script
# ============================================
# Restores from a backup created by backup.sh:
#   1. PostgreSQL database from SQL dump
#   2. Data directory from tar archive
#
# Usage:
#   ./scripts/restore.sh ./backups/20260215_120000
# ============================================

set -euo pipefail

BACKUP_DIR="${1:-}"

if [ -z "$BACKUP_DIR" ]; then
    echo "Usage: $0 <backup_directory>"
    echo ""
    echo "Available backups:"
    if [ -d "./backups" ]; then
        ls -1 ./backups/ 2>/dev/null || echo "  (none)"
    else
        echo "  (no backups directory)"
    fi
    exit 1
fi

if [ ! -d "$BACKUP_DIR" ]; then
    echo "ERROR: Backup directory not found: $BACKUP_DIR"
    exit 1
fi

echo "============================================"
echo "  OpenSnek Restore"
echo "  Source: ${BACKUP_DIR}"
echo "============================================"
echo ""
echo "WARNING: This will overwrite current data!"
read -p "Continue? [y/N]: " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Aborted."
    exit 0
fi

# 1. Restore PostgreSQL
if [ -f "${BACKUP_DIR}/opensnek.sql" ]; then
    echo ""
    echo "[1/2] Restoring PostgreSQL database..."
    if docker compose exec -T postgres psql -U "${POSTGRES_USER:-opensnek}" opensnek < "${BACKUP_DIR}/opensnek.sql" 2>/dev/null; then
        echo "  Database restored successfully"
    else
        echo "  WARNING: Docker restore failed. Trying direct connection..."
        if command -v psql &> /dev/null; then
            psql -h localhost -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-opensnek}" opensnek < "${BACKUP_DIR}/opensnek.sql"
            echo "  Database restored successfully"
        else
            echo "  FAILED: psql not available"
        fi
    fi
else
    echo "[1/2] SKIPPED: No database dump found"
fi

# 2. Restore data directory
if [ -f "${BACKUP_DIR}/data.tar.gz" ]; then
    echo ""
    echo "[2/2] Restoring data directory..."
    tar xzf "${BACKUP_DIR}/data.tar.gz" -C .
    echo "  Data directory restored successfully"
else
    echo "[2/2] SKIPPED: No data archive found"
fi

echo ""
echo "============================================"
echo "  Restore complete!"
echo "  Restart services: docker compose restart"
echo "============================================"
