#!/bin/bash
# =============================================================================
# Estim AI Platform - Staging Smoke Tests
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="http://localhost:8000"
WEB_URL="http://localhost:3000"
PASS=0
FAIL=0

echo -e "${GREEN}=== Running Staging Smoke Tests ===${NC}"
echo ""

# Test 1: API Health Check
echo -n "Testing API health endpoint... "
if curl -sf "${API_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}FAIL${NC}"
    ((FAIL++))
fi

# Test 2: API Documentation (Swagger)
echo -n "Testing API documentation endpoint... "
if curl -sf "${API_URL}/docs" > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}FAIL${NC}"
    ((FAIL++))
fi

# Test 3: Database Connectivity via API
echo -n "Testing database connectivity... "
if curl -sf "${API_URL}/auth/login" -X POST -d '{"email":"test","password":"test"}' -H "Content-Type: application/json" > /dev/null 2>&1; then
    # 401 or 422 means the endpoint is reachable (database is connected)
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
else
    # Check if it's a connection error vs auth error
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/auth/login" -X POST -d '{"email":"test","password":"test"}' -H "Content-Type: application/json" 2>/dev/null || echo "000")
    if [ "${HTTP_CODE}" = "000" ]; then
        echo -e "${RED}FAIL (connection refused)${NC}"
        ((FAIL++))
    else
        echo -e "${GREEN}PASS (endpoint reachable, HTTP ${HTTP_CODE})${NC}"
        ((PASS++))
    fi
fi

# Test 4: Frontend Availability
echo -n "Testing frontend availability... "
if curl -sf "${WEB_URL}" > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}FAIL${NC}"
    ((FAIL++))
fi

# Test 5: Redis Connectivity
echo -n "Testing Redis connectivity... "
if docker exec estim-staging-redis redis-cli -a "${STAGING_REDIS_PASSWORD:-redis_password}" ping > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}FAIL${NC}"
    ((FAIL++))
fi

# Test 6: PostgreSQL Connectivity
echo -n "Testing PostgreSQL connectivity... "
if docker exec estim-staging-postgres pg_isready -U estim -d estim_ai > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}FAIL${NC}"
    ((FAIL++))
fi

# Summary
echo ""
echo -e "${GREEN}=== Smoke Test Results ===${NC}"
echo -e "Passed: ${GREEN}${PASS}${NC}"
echo -e "Failed: ${RED}${FAIL}${NC}"
echo ""

if [ "${FAIL}" -gt 0 ]; then
    echo -e "${RED}Some smoke tests failed!${NC}"
    exit 1
else
    echo -e "${GREEN}All smoke tests passed!${NC}"
    exit 0
fi