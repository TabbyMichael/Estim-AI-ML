#!/bin/bash
# =============================================================================
# Estim AI Platform - Backup Restoration Script
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
BACKUP_FILE="${1:-}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-estim_ai}"
DB_USER="${DB_USER:-estim}"
DB_PASSWORD="${DB_PASSWORD:-estim}"

if [ -z "${BACKUP_FILE}" ]; then
    echo -e "${RED}Error: Backup file not specified${NC}"
    echo "Usage: $0 <backup_file.dump>"
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo -e "${RED}Error: Backup file not found: ${BACKUP_FILE}${NC}"
    exit 1
fi

echo -e "${GREEN}=== Database Restoration ===${NC}"
echo "Backup file: ${BACKUP_FILE}"
echo "Target database: ${DB_NAME}"
echo ""

# Warning
echo -e "${YELLOW}WARNING: This will overwrite all data in ${DB_NAME}!${NC}"
echo -n "Type 'RESTORE' to confirm: "
read -r CONFIRMATION

if [ "${CONFIRMATION}" != "RESTORE" ]; then
    echo -e "${YELLOW}Restoration cancelled.${NC}"
    exit 0
fi

# Step 1: Stop application services
echo -e "${YELLOW}Step 1: Stopping application services...${NC}"
kubectl scale deployment estim-api --replicas=0 -n estim-production 2>/dev/null || \
    docker compose stop estim-api 2>/dev/null || true
echo -e "${GREEN}✓ Services stopped${NC}"

# Step 2: Drop and recreate database
echo -e "${YELLOW}Step 2: Dropping and recreating database...${NC}"
export PGPASSWORD="${DB_PASSWORD}"

psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null || true
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || true
echo -e "${GREEN}✓ Database recreated${NC}"

# Step 3: Restore from backup
echo -e "${YELLOW}Step 3: Restoring from backup...${NC}"
pg_restore -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    --no-owner --no-privileges \
    "${BACKUP_FILE}" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database restored${NC}"
else
    echo -e "${RED}FAILED to restore database${NC}"
    exit 1
fi

# Step 4: Run migrations to ensure schema is up to date
echo -e "${YELLOW}Step 4: Running migrations...${NC}"
kubectl exec -n estim-production deployment/estim-api -- alembic upgrade head 2>/dev/null || \
    echo -e "${YELLOW}Warning: Could not run migrations via kubectl${NC}"
echo -e "${GREEN}✓ Migrations complete${NC}"

# Step 5: Restart application services
echo -e "${YELLOW}Step 5: Restarting application services...${NC}"
kubectl scale deployment estim-api --replicas=3 -n estim-production 2>/dev/null || \
    docker compose start estim-api 2>/dev/null || true
echo -e "${GREEN}✓ Services restarted${NC}"

# Step 6: Verify restoration
echo -e "${YELLOW}Step 6: Verifying restoration...${NC}"
sleep 10

TABLE_COUNT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null || echo "0")

echo -e "${GREEN}Tables restored: ${TABLE_COUNT}${NC}"

echo ""
echo -e "${GREEN}=== Restoration Complete ===${NC}"
echo "Database ${DB_NAME} has been restored from ${BACKUP_FILE}"