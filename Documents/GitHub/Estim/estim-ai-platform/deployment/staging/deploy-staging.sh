#!/bin/bash
# =============================================================================
# Estim AI Platform - Staging Deployment Script
# =============================================================================
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${DEPLOY_DIR}/../../.." && pwd)"
STAGING_ENV_FILE="${PROJECT_DIR}/.env.staging"
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.staging.yml"

echo -e "${GREEN}=== Estim AI Platform - Staging Deployment ===${NC}"
echo ""

# Step 1: Set up staging environment
echo -e "${YELLOW}[1/5] Setting up staging environment...${NC}"

# Check if .env.staging exists
if [ ! -f "${STAGING_ENV_FILE}" ]; then
    echo -e "${RED}Error: ${STAGING_ENV_FILE} not found!${NC}"
    echo "Please create .env.staging with staging configuration variables."
    echo "See docs/deployment/00-staging-deployment.md for required variables."
    exit 1
fi

# Load environment variables
export $(grep -v '^#' "${STAGING_ENV_FILE}" | xargs)

# Validate required variables
REQUIRED_VARS=(
    "STAGING_DB_PASSWORD"
    "STAGING_REDIS_PASSWORD"
    "STAGING_MINIO_ACCESS_KEY"
    "STAGING_MINIO_SECRET_KEY"
    "STAGING_SECRET_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var:-}" ]; then
        echo -e "${RED}Error: ${var} is not set in ${STAGING_ENV_FILE}${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ Staging environment configured${NC}"

# Step 2: Deploy to staging
echo -e "${YELLOW}[2/5] Deploying to staging...${NC}"

cd "${PROJECT_DIR}"

# Pull latest images or build
if command -v docker &> /dev/null; then
    docker compose -f "${COMPOSE_FILE}" --env-file "${STAGING_ENV_FILE}" up -d --build
    echo -e "${GREEN}✓ Staging services deployed${NC}"
else
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Wait for services to be healthy
echo "Waiting for services to become healthy..."
sleep 15

# Step 3: Run smoke tests
echo -e "${YELLOW}[3/5] Running smoke tests...${NC}"

SMOKE_TEST_SCRIPT="${DEPLOY_DIR}/smoke-tests.sh"
if [ -f "${SMOKE_TEST_SCRIPT}" ]; then
    bash "${SMOKE_TEST_SCRIPT}"
else
    echo -e "${YELLOW}Warning: Smoke test script not found, running basic checks...${NC}"
    # Basic health check
    curl -sf "http://localhost:8000/health" && echo "" || {
        echo -e "${RED}✓ API health check failed${NC}"
        exit 1
    }
fi

echo -e "${GREEN}✓ Smoke tests passed${NC}"

# Step 4: Perform user acceptance testing
echo -e "${YELLOW}[4/5] Performing user acceptance testing...${NC}"

UAT_TEST_SCRIPT="${DEPLOY_DIR}/uat-tests.sh"
if [ -f "${UAT_TEST_SCRIPT}" ]; then
    bash "${UAT_TEST_SCRIPT}"
else
    echo -e "${YELLOW}Warning: UAT test script not found, skipping...${NC}"
fi

echo -e "${GREEN}✓ UAT testing completed${NC}"

# Step 5: Fix any issues
echo -e "${YELLOW}[5/5] Checking for issues...${NC}"

# Check service status
UNHEALTHY=$(docker compose -f "${COMPOSE_FILE}" ps --filter "health=unhealthy" --format "{{.Name}}" 2>/dev/null || true)

if [ -n "${UNHEALTHY}" ]; then
    echo -e "${RED}Warning: Some services are unhealthy:${NC}"
    echo "${UNHEALTHY}"
    echo ""
    echo "To fix issues, check logs:"
    echo "  docker compose -f ${COMPOSE_FILE} logs <service-name>"
    echo ""
    echo -e "${YELLOW}See docs/deployment/00-staging-deployment.md for troubleshooting${NC}"
    exit 1
else
    echo -e "${GREEN}✓ All services are healthy${NC}"
fi

echo ""
echo -e "${GREEN}=== Staging Deployment Complete! ===${NC}"
echo ""
echo "Access points:"
echo "  API:      http://localhost:8000"
echo "  Web:      http://localhost:3000"
echo "  API Docs: http://localhost:8000/docs"
echo "  Grafana:  http://localhost:3001"
echo "  MLflow:   http://localhost:5000"
echo ""
echo "Staging URL: https://staging.estim.ai"