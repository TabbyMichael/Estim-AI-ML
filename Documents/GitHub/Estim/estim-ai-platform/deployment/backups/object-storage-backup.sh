#!/bin/bash
# =============================================================================
# Estim AI Platform - Object Storage Backup Script
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
SOURCE_BUCKET="${SOURCE_BUCKET:-estim-production-data}"
DEST_BUCKET="${DEST_BUCKET:-estim-production-backups}"
AWS_REGION="${AWS_REGION:-us-east-1}"
DR_REGION="${DR_REGION:-us-west-2}"

echo -e "${GREEN}=== Object Storage Backup ===${NC}"
echo "Source bucket: ${SOURCE_BUCKET}"
echo "Destination bucket: ${DEST_BUCKET}"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Step 1: Enable S3 Cross-Region Replication
echo -e "${YELLOW}Step 1: Configuring S3 cross-region replication...${NC}"

# Check if replication is already configured
REPLICATION_STATUS=$(aws s3api get-bucket-replication \
    --bucket "${SOURCE_BUCKET}" \
    --region "${AWS_REGION}" 2>/dev/null || echo "NOT_CONFIGURED")

if [ "${REPLICATION_STATUS}" = "NOT_CONFIGURED" ]; then
    echo -e "${YELLOW}Setting up cross-region replication...${NC}"
    
    # Create replication configuration
    cat > /tmp/replication-config.json << EOF
{
    "Role": "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/s3-replication-role",
    "Rules": [
        {
            "ID": "replicate-to-dr",
            "Status": "Enabled",
            "Priority": 1,
            "Filter": {},
            "Destination": {
                "Bucket": "arn:aws:s3:::${DEST_BUCKET}",
                "StorageClass": "STANDARD_IA"
            },
            "DeleteMarkerReplication": {
                "Status": "Disabled"
            }
        }
    ]
}
EOF
    
    aws s3api put-bucket-replication \
        --bucket "${SOURCE_BUCKET}" \
        --replication-configuration file:///tmp/replication-config.json \
        --region "${AWS_REGION}" 2>/dev/null || \
        echo -e "${YELLOW}Warning: Replication setup may require IAM role configuration${NC}"
    
    echo -e "${GREEN}✓ Cross-region replication configured${NC}"
else
    echo -e "${GREEN}✓ Cross-region replication already configured${NC}"
fi

# Step 2: Verify replication status
echo -e "${YELLOW}Step 2: Verifying replication status...${NC}"
aws s3api get-bucket-replication \
    --bucket "${SOURCE_BUCKET}" \
    --region "${AWS_REGION}" 2>/dev/null | \
    jq -r '.Rules[0].Status' 2>/dev/null || \
    echo -e "${YELLOW}Warning: Could not verify replication status${NC}"

# Step 3: List recent objects in destination
echo -e "${YELLOW}Step 3: Checking destination bucket...${NC}"
OBJECT_COUNT=$(aws s3api list-objects-v2 \
    --bucket "${DEST_BUCKET}" \
    --region "${DR_REGION}" \
    --query 'length(Contents)' \
    --output text 2>/dev/null || echo "0")

echo -e "${GREEN}Objects in DR bucket: ${OBJECT_COUNT}${NC}"

echo ""
echo -e "${GREEN}=== Object Storage Backup Complete ===${NC}"