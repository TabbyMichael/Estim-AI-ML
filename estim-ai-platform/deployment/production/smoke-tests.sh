#!/bin/bash
# =============================================================================
# Estim AI Platform - Production Smoke Tests
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="https://api.estim.ai"
WEB_URL="https://app.estim.ai"
PASS=0
FAIL=0

echo -e "${GREEN}=== Running Production Smoke Tests ===${NC}"
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

# Test 2: SSL Certificate
echo -n "Testing SSL certificate... "
if echo | openssl s_client -connect api.estim.ai:443 2>/dev/null | openssl x509 -noout -dates > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}FAIL${NC}"
    ((FAIL++))
fi

# Test 3: API Documentation
echo -n "Testing API documentation... "
if curl -sf "${API_URL}/docs" > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}FAIL${NC}"
    ((FAIL++))
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

# Test 5: Kubernetes Pod Status
echo -n "Checking Kubernetes pod status... "
UNREADY=$(kubectl get pods -n estim-production --field-selector=status.phase!=Running 2>/dev/null | wc -l)
if [ "${UNREADY}" -le 1 ]; then  # Only header line
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}FAIL (${UNREADY} pods not running)${NC}"
    ((FAIL++))
fi

# Test 6: Error Rate Check
echo -n "Checking error rate... "
ERROR_RATE=$(kubectl logs -n estim-production -l app=estim-api --tail=1000 2>/dev/null | grep -c "ERROR" || echo "0")
if [ "${ERROR_RATE}" -lt 10 ]; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}FAIL (${ERROR_RATE} errors in last 1000 lines)${NC}"
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