#!/bin/bash
# =============================================================================
# Estim AI Platform - Database Backup Script
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/postgresql}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BACKUP_BUCKET:-estim-production-backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-estim_ai}"
DB_USER="${DB_USER:-estim}"
DB_PASSWORD="${DB_PASSWORD:-estim}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="estim_db_${TIMESTAMP}.dump"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

echo -e "${GREEN}=== Database Backup ===${NC}"
echo "Timestamp: ${TIMESTAMP}"
echo "Database: ${DB_NAME}"
echo "Backup file: ${BACKUP_PATH}"
echo ""

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Perform pg_dump
echo -n "Creating database backup... "
export PGPASSWORD="${DB_PASSWORD}"
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    --format=custom --compress=9 \
    --file="${BACKUP_PATH}" 2>/dev/null

if [ $? -eq 0 ] && [ -f "${BACKUP_PATH}" ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
    echo -e "${GREEN}DONE${NC} (${BACKUP_SIZE})"
else
    echo -e "${RED}FAILED${NC}"
    exit 1
fi

# Upload to S3
echo -n "Uploading to S3... "
if command -v aws &> /dev/null; then
    aws s3 cp "${BACKUP_PATH}" "s3://${S3_BUCKET}/database/${BACKUP_FILE}" 2>/dev/null && \
    echo -e "${GREEN}DONE${NC}" || \
    echo -e "${YELLOW}SKIP (AWS CLI not available or upload failed)${NC}"
else
    echo -e "${YELLOW}SKIP (AWS CLI not installed)${NC}"
fi

# Remove old backups
echo -n "Cleaning up old backups (older than ${RETENTION_DAYS} days)... "
find "${BACKUP_DIR}" -name "estim_db_*.dump" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
echo -e "${GREEN}DONE${NC}"

echo ""
echo -e "${GREEN}=== Backup Complete ===${NC}"
echo "Backup file: ${BACKUP_PATH}"
echo "Retention: ${RETENTION_DAYS} days"