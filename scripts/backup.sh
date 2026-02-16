#!/bin/bash
# ============================================
# OpenSnek Backup Script
# ============================================
# Creates a timestamped backup of:
#   1. PostgreSQL database (SQL dump)
#   2. Data directory (knowledge bases + user data)
#
# Usage:
#   ./scripts/backup.sh
#   ./scripts/backup.sh /custom/backup/path
# ============================================

set -euo pipefail

BACKUP_BASE="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_BASE}/${TIMESTAMP}"

echo "============================================"
echo "  OpenSnek Backup"
echo "  Target: ${BACKUP_DIR}"
echo "============================================"

mkdir -p "$BACKUP_DIR"

# 1. Dump PostgreSQL
echo ""
echo "[1/2] Dumping PostgreSQL database..."
if docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-opensnek}" opensnek > "${BACKUP_DIR}/opensnek.sql" 2>/dev/null; then
    SQL_SIZE=$(du -h "${BACKUP_DIR}/opensnek.sql" | cut -f1)
    echo "  Database dump: ${BACKUP_DIR}/opensnek.sql (${SQL_SIZE})"
else
    echo "  WARNING: PostgreSQL dump failed. Is the container running?"
    echo "  Trying direct connection..."
    if command -v pg_dump &> /dev/null; then
        pg_dump -h localhost -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-opensnek}" opensnek > "${BACKUP_DIR}/opensnek.sql"
        echo "  Database dump: ${BACKUP_DIR}/opensnek.sql"
    else
        echo "  SKIPPED: pg_dump not available"
    fi
fi

# 2. Tar data directory
echo ""
echo "[2/2] Archiving data directory..."
if [ -d "./data" ]; then
    tar czf "${BACKUP_DIR}/data.tar.gz" -C . data/
    DATA_SIZE=$(du -h "${BACKUP_DIR}/data.tar.gz" | cut -f1)
    echo "  Data archive: ${BACKUP_DIR}/data.tar.gz (${DATA_SIZE})"
else
    echo "  SKIPPED: ./data directory not found"
fi

echo ""
echo "============================================"
echo "  Backup complete: ${BACKUP_DIR}"
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
echo "  Total size: ${TOTAL_SIZE}"
echo "============================================"
