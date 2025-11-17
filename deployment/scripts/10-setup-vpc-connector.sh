#!/bin/bash

# Steno AI - App Runner VPC Connector Setup
# This script creates a VPC connector so App Runner can access RDS and Redis

set -e

REGION="us-east-1"
PROJECT_NAME="steno-prod"
CONNECTOR_NAME="${PROJECT_NAME}-vpc-connector"

echo "🔌 Setting up App Runner VPC Connector"
echo "Region: $REGION"
echo "Connector: $CONNECTOR_NAME"
echo ""

# Determine script directory for config path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/config"

# Load VPC configuration
VPC_ID=$(jq -r '.VpcId' "$CONFIG_DIR/vpc-config.json")
PRIVATE_SUBNET_1=$(jq -r '.PrivateSubnet1Id' "$CONFIG_DIR/vpc-config.json")
PRIVATE_SUBNET_2=$(jq -r '.PrivateSubnet2Id' "$CONFIG_DIR/vpc-config.json")

echo "📋 VPC Configuration:"
echo "  VPC: $VPC_ID"
echo "  Subnet 1: $PRIVATE_SUBNET_1"
echo "  Subnet 2: $PRIVATE_SUBNET_2"
echo ""

# Create security group for App Runner VPC connector
SG_NAME="${PROJECT_NAME}-apprunner-sg"
echo "🛡️  Creating security group for App Runner..."

APP_RUNNER_SG=$(aws ec2 create-security-group \
  --group-name "$SG_NAME" \
  --description "Security group for App Runner VPC connector" \
  --vpc-id "$VPC_ID" \
  --region "$REGION" \
  --query 'GroupId' \
  --output text 2>/dev/null || \
  aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$SG_NAME" "Name=vpc-id,Values=$VPC_ID" \
    --region "$REGION" \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

echo "✅ Security Group: $APP_RUNNER_SG"

# Allow outbound traffic to RDS
echo "📝 Configuring security group rules..."
RDS_SG="sg-088fcf2f142405cab"
REDIS_SG="sg-05d5e9142ab4ecdb8"

# Add ingress rule to RDS security group to allow App Runner SG
aws ec2 authorize-security-group-ingress \
  --group-id "$RDS_SG" \
  --protocol tcp \
  --port 5432 \
  --source-group "$APP_RUNNER_SG" \
  --region "$REGION" 2>/dev/null || echo "RDS rule already exists"

# Add ingress rule to Redis security group to allow App Runner SG
aws ec2 authorize-security-group-ingress \
  --group-id "$REDIS_SG" \
  --protocol tcp \
  --port 6379 \
  --source-group "$APP_RUNNER_SG" \
  --region "$REGION" 2>/dev/null || echo "Redis rule already exists"

echo "✅ Security group rules configured"
echo ""

# Create VPC connector
echo "🔌 Creating VPC Connector..."

CONNECTOR_ARN=$(aws apprunner create-vpc-connector \
  --vpc-connector-name "$CONNECTOR_NAME" \
  --subnets "$PRIVATE_SUBNET_1" "$PRIVATE_SUBNET_2" \
  --security-groups "$APP_RUNNER_SG" \
  --region "$REGION" \
  --query 'VpcConnector.VpcConnectorArn' \
  --output text 2>/dev/null || \
  aws apprunner list-vpc-connectors \
    --region "$REGION" \
    --query "VpcConnectors[?VpcConnectorName=='$CONNECTOR_NAME'].VpcConnectorArn | [0]" \
    --output text)

if [ "$CONNECTOR_ARN" = "" ] || [ "$CONNECTOR_ARN" = "None" ]; then
    echo "❌ Failed to create VPC connector"
    exit 1
fi

echo "✅ VPC Connector created: $CONNECTOR_ARN"
echo ""

# Wait for connector to be active
echo "⏳ Waiting for VPC connector to become active..."
COUNTER=0
MAX_ATTEMPTS=20

while [ $COUNTER -lt $MAX_ATTEMPTS ]; do
    STATUS=$(aws apprunner describe-vpc-connector \
      --vpc-connector-arn "$CONNECTOR_ARN" \
      --region "$REGION" \
      --query 'VpcConnector.Status' \
      --output text)
    
    echo "[$((COUNTER * 5))s] Status: $STATUS"
    
    if [ "$STATUS" = "ACTIVE" ]; then
        echo "✅ VPC Connector is active!"
        break
    elif [ "$STATUS" = "INACTIVE" ]; then
        echo "❌ VPC Connector failed to activate"
        exit 1
    fi
    
    sleep 5
    COUNTER=$((COUNTER + 1))
done

if [ $COUNTER -eq $MAX_ATTEMPTS ]; then
    echo "⚠️  VPC Connector is taking longer than expected"
    exit 1
fi

# Save configuration
cat > "$CONFIG_DIR/vpc-connector-config.json" <<EOF
{
  "VpcConnectorName": "$CONNECTOR_NAME",
  "VpcConnectorArn": "$CONNECTOR_ARN",
  "AppRunnerSecurityGroup": "$APP_RUNNER_SG",
  "Region": "$REGION"
}
EOF

echo ""
echo "✨ VPC Connector Setup Complete!"
echo ""
echo "📊 Connector Details:"
echo "  Name: $CONNECTOR_NAME"
echo "  ARN: $CONNECTOR_ARN"
echo "  Security Group: $APP_RUNNER_SG"
echo "  Subnets: $PRIVATE_SUBNET_1, $PRIVATE_SUBNET_2"
echo ""
echo "💾 Configuration saved to: $CONFIG_DIR/vpc-connector-config.json"
echo ""
echo "✅ Network Configuration:"
echo "  ✓ App Runner can now access RDS (port 5432)"
echo "  ✓ App Runner can now access Redis (port 6379)"
echo "  ✓ All traffic stays within private VPC"
echo ""
echo "Next step: Deploy backend with VPC connector"
echo ""

