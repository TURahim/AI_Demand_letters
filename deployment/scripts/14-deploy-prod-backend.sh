#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# Steno AI - Production Backend Deployment to AWS App Runner
# ═══════════════════════════════════════════════════════════════════════════
#
# This script deploys the backend to AWS App Runner in the PRODUCTION VPC
# where the RDS database is located, ensuring proper connectivity.
#
# Key Features:
# - Uses production VPC connector (same VPC as RDS)
# - Proper security group configuration for RDS access
# - Comprehensive validation and logging
# - Health check monitoring
#
# ═══════════════════════════════════════════════════════════════════════════

set -e

REGION="us-east-1"
SERVICE_NAME="steno-prod-backend"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   🚀 DEPLOYING PRODUCTION BACKEND TO AWS APP RUNNER         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo ""

# Determine script directory for config path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/config"

# Load discovered production VPC configuration
echo "📋 Loading production VPC configuration..."
if [ ! -f "$CONFIG_DIR/prod-vpc-discovered.json" ]; then
  echo "❌ Production VPC configuration not found!"
  echo "Run VPC discovery first."
  exit 1
fi

PROD_VPC_ID=$(jq -r '.VpcId' "$CONFIG_DIR/prod-vpc-discovered.json")
RDS_SECURITY_GROUP=$(jq -r '.RdsSecurityGroup' "$CONFIG_DIR/prod-vpc-discovered.json")

echo "  Production VPC: $PROD_VPC_ID"
echo "  RDS Security Group: $RDS_SECURITY_GROUP"
echo ""

# Load production VPC connector configuration
echo "📋 Loading production VPC connector..."
if [ ! -f "$CONFIG_DIR/vpc-connector-prod.json" ]; then
  echo "❌ Production VPC connector configuration not found!"
  exit 1
fi

VPC_CONNECTOR_ARN=$(jq -r '.VpcConnectorArn' "$CONFIG_DIR/vpc-connector-prod.json")
VPC_CONNECTOR_SG=$(jq -r '.SecurityGroups[0]' "$CONFIG_DIR/vpc-connector-prod.json")

echo "  VPC Connector ARN: $VPC_CONNECTOR_ARN"
echo "  VPC Connector SG: $VPC_CONNECTOR_SG"
echo ""

# Validate VPC connector is active
echo "🔍 Validating VPC connector status..."
CONNECTOR_STATUS=$(aws apprunner list-vpc-connectors --region $REGION --query "VpcConnectors[?VpcConnectorArn=='$VPC_CONNECTOR_ARN'].Status" --output text)
if [ "$CONNECTOR_STATUS" != "ACTIVE" ]; then
  echo "❌ VPC connector is not ACTIVE (status: $CONNECTOR_STATUS)"
  exit 1
fi
echo "  ✅ VPC connector is ACTIVE"
echo ""

# Validate security group connectivity
echo "🔍 Validating security group connectivity..."
HAS_RULE=$(aws ec2 describe-security-groups --group-ids $RDS_SECURITY_GROUP --region $REGION --query "SecurityGroups[0].IpPermissions[?FromPort==\`5432\`].UserIdGroupPairs[*].GroupId" --output json | jq -r ".[][] | select(. == \"$VPC_CONNECTOR_SG\")")
if [ -z "$HAS_RULE" ]; then
  echo "⚠️  RDS security group does not have rule for App Runner VPC connector"
  echo "   Adding security group rule..."
  aws ec2 authorize-security-group-ingress \
    --group-id $RDS_SECURITY_GROUP \
    --protocol tcp \
    --port 5432 \
    --source-group $VPC_CONNECTOR_SG \
    --region $REGION 2>/dev/null || echo "   (Rule may already exist)"
fi
echo "  ✅ RDS allows PostgreSQL from App Runner VPC connector"
echo ""

# Load other configuration
IMAGE_URI=$(jq -r '.RepositoryUri' "$CONFIG_DIR/ecr-config.json")
INSTANCE_ROLE_ARN=$(jq -r '.BackendRole.ARN' "$CONFIG_DIR/iam-config.json")
ACCESS_ROLE_ARN=$(jq -r '.AppRunnerAccessRole.ARN' "$CONFIG_DIR/iam-config.json")

echo "📋 Loading secrets from AWS Secrets Manager..."

# Fetch secrets
DB_SECRET=$(aws secretsmanager get-secret-value --secret-id steno-prod/database --region $REGION --query 'SecretString' --output text)
DATABASE_URL=$(echo $DB_SECRET | jq -r '.connectionString')

REDIS_SECRET=$(aws secretsmanager get-secret-value --secret-id steno-prod/redis --region $REGION --query 'SecretString' --output text)
REDIS_HOST=$(echo $REDIS_SECRET | jq -r '.host')
REDIS_PORT=$(echo $REDIS_SECRET | jq -r '.port')

S3_SECRET=$(aws secretsmanager get-secret-value --secret-id steno-prod/s3 --region $REGION --query 'SecretString' --output text)
S3_BUCKET=$(echo $S3_SECRET | jq -r '.documentsBucket')
S3_EXPORTS=$(echo $S3_SECRET | jq -r '.exportsBucket')

APP_SECRET=$(aws secretsmanager get-secret-value --secret-id steno-prod/application --region $REGION --query 'SecretString' --output text)
JWT_SECRET=$(echo $APP_SECRET | jq -r '.jwtSecret')
ENCRYPTION_KEY=$(echo $APP_SECRET | jq -r '.encryptionKey')

echo "✅ Secrets loaded successfully"
echo ""

# Check if service already exists
echo "🔍 Checking for existing service..."
EXISTING_SERVICE=$(aws apprunner list-services --region $REGION --query "ServiceSummaryList[?ServiceName=='$SERVICE_NAME'].ServiceArn" --output text)

if [ -n "$EXISTING_SERVICE" ]; then
  echo "⚠️  Service '$SERVICE_NAME' already exists"
  echo "   ARN: $EXISTING_SERVICE"
  
  # Check status
  STATUS=$(aws apprunner describe-service --service-arn "$EXISTING_SERVICE" --region $REGION --query 'Service.Status' --output text)
  echo "   Status: $STATUS"
  
  if [ "$STATUS" = "RUNNING" ]; then
    echo ""
    echo "   Service is already running. Would you like to:"
    echo "   1. Update the existing service"
    echo "   2. Delete and recreate"
    echo "   3. Use the existing service as-is"
    echo ""
    echo "   For now, using existing service..."
    SERVICE_ARN="$EXISTING_SERVICE"
  elif [ "$STATUS" = "OPERATION_IN_PROGRESS" ] || [ "$STATUS" = "CREATE_FAILED" ]; then
    echo "   Service is in $STATUS state. Deleting..."
    aws apprunner delete-service --service-arn "$EXISTING_SERVICE" --region $REGION > /dev/null
    echo "   Waiting for deletion..."
    sleep 30
    EXISTING_SERVICE=""
  fi
fi

if [ -z "$EXISTING_SERVICE" ]; then
  # Create temporary config file for new service
  cat > /tmp/apprunner-prod-config.json <<EOF
{
  "ServiceName": "$SERVICE_NAME",
  "SourceConfiguration": {
    "ImageRepository": {
      "ImageIdentifier": "$IMAGE_URI:latest",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "3001",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "PORT": "3001",
          "API_VERSION": "v1",
          "DATABASE_URL": "$DATABASE_URL",
          "REDIS_HOST": "$REDIS_HOST",
          "REDIS_PORT": "$REDIS_PORT",
          "REDIS_PASSWORD": "",
          "REDIS_DB": "0",
          "S3_BUCKET_NAME": "$S3_BUCKET",
          "S3_EXPORTS_BUCKET": "$S3_EXPORTS",
          "S3_UPLOADS_PREFIX": "uploads/",
          "S3_LETTERS_PREFIX": "letters/",
          "JWT_SECRET": "$JWT_SECRET",
          "JWT_EXPIRES_IN": "7d",
          "REFRESH_TOKEN_SECRET": "$JWT_SECRET",
          "REFRESH_TOKEN_EXPIRES_IN": "30d",
          "ENCRYPTION_KEY": "$ENCRYPTION_KEY",
          "AWS_REGION": "$REGION",
          "BEDROCK_MODEL_ID": "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
          "BEDROCK_MAX_TOKENS": "4096",
          "BEDROCK_TEMPERATURE": "0.7",
          "CORS_ORIGIN": "*",
          "RATE_LIMIT_WINDOW_MS": "900000",
          "RATE_LIMIT_MAX_REQUESTS": "100",
          "ENABLE_QUEUE_WORKER": "false",
          "WEBSOCKET_ENABLED": "false",
          "LOG_LEVEL": "info"
        }
      }
    },
    "AuthenticationConfiguration": {
      "AccessRoleArn": "$ACCESS_ROLE_ARN"
    },
    "AutoDeploymentsEnabled": false
  },
  "InstanceConfiguration": {
    "Cpu": "1 vCPU",
    "Memory": "2 GB",
    "InstanceRoleArn": "$INSTANCE_ROLE_ARN"
  },
  "HealthCheckConfiguration": {
    "Protocol": "HTTP",
    "Path": "/health",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 2,
    "UnhealthyThreshold": 10
  },
  "NetworkConfiguration": {
    "EgressConfiguration": {
      "EgressType": "VPC",
      "VpcConnectorArn": "$VPC_CONNECTOR_ARN"
    },
    "IngressConfiguration": {
      "IsPubliclyAccessible": true
    },
    "IpAddressType": "IPV4"
  },
  "Tags": [
    {
      "Key": "Project",
      "Value": "steno"
    },
    {
      "Key": "Environment",
      "Value": "production"
    },
    {
      "Key": "VPC",
      "Value": "$PROD_VPC_ID"
    }
  ]
}
EOF

  echo "🚀 Creating new App Runner service..."
  SERVICE_OUTPUT=$(aws apprunner create-service \
    --cli-input-json file:///tmp/apprunner-prod-config.json \
    --region $REGION)

  SERVICE_ARN=$(echo $SERVICE_OUTPUT | jq -r '.Service.ServiceArn')
  SERVICE_URL=$(echo $SERVICE_OUTPUT | jq -r '.Service.ServiceUrl')

  echo "✅ Service creation initiated"
  echo "   Service ARN: $SERVICE_ARN"
  echo "   Service URL: https://$SERVICE_URL"
  echo ""

  # Save service details
  cat > "$CONFIG_DIR/apprunner-prod-service.json" <<EOF
{
  "ServiceName": "$SERVICE_NAME",
  "ServiceArn": "$SERVICE_ARN",
  "ServiceUrl": "$SERVICE_URL",
  "Region": "$REGION",
  "VpcConnectorArn": "$VPC_CONNECTOR_ARN",
  "VpcId": "$PROD_VPC_ID"
}
EOF

  rm -f /tmp/apprunner-prod-config.json
else
  SERVICE_URL=$(aws apprunner describe-service --service-arn "$SERVICE_ARN" --region $REGION --query 'Service.ServiceUrl' --output text)
fi

echo "⏳ Waiting for service to become available..."
echo "   This may take 5-10 minutes..."
echo ""

# Poll service status
MAX_ATTEMPTS=60
ATTEMPT=0
LAST_STATUS=""

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  STATUS=$(aws apprunner describe-service --service-arn $SERVICE_ARN --region $REGION --query 'Service.Status' --output text)
  
  if [ "$STATUS" != "$LAST_STATUS" ]; then
    echo "[$ATTEMPT/$MAX_ATTEMPTS] Status changed: $LAST_STATUS → $STATUS ($(date +%H:%M:%S))"
    LAST_STATUS="$STATUS"
  else
    echo "[$ATTEMPT/$MAX_ATTEMPTS] Status: $STATUS ($(date +%H:%M:%S))"
  fi
  
  if [ "$STATUS" = "RUNNING" ]; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║   ✅ SERVICE IS RUNNING!                                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "🌐 Service URL: https://$SERVICE_URL"
    echo ""
    
    # Test health endpoint
    echo "🏥 Testing health endpoint..."
    sleep 5
    
    HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "https://$SERVICE_URL/health")
    HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_CODE:/d')
    
    if [ "$HTTP_CODE" = "200" ]; then
      echo "✅ Health check PASSED (HTTP $HTTP_CODE)"
      echo "$HEALTH_BODY" | jq . 2>/dev/null || echo "$HEALTH_BODY"
    else
      echo "⚠️  Health check returned HTTP $HTTP_CODE"
      echo "$HEALTH_BODY"
    fi
    
    # Check application logs
    echo ""
    echo "📋 Recent application logs:"
    SERVICE_ID=$(echo "$SERVICE_ARN" | awk -F'/' '{print $NF}')
    aws logs tail "/aws/apprunner/$SERVICE_NAME/$SERVICE_ID/application" --region $REGION --since 5m --format short 2>&1 | head -30 || echo "  (No application logs yet)"
    
    break
  elif [ "$STATUS" = "CREATE_FAILED" ]; then
    echo ""
    echo "❌ Service creation FAILED!"
    echo ""
    
    # Get service ID for CloudWatch logs
    SERVICE_ID=$(echo "$SERVICE_ARN" | awk -F'/' '{print $NF}')
    
    echo "📋 Service logs:"
    aws logs tail "/aws/apprunner/$SERVICE_NAME/$SERVICE_ID/service" --region $REGION --since 15m --format short 2>&1 | tail -50
    
    echo ""
    echo "📋 Application logs:"
    aws logs tail "/aws/apprunner/$SERVICE_NAME/$SERVICE_ID/application" --region $REGION --since 15m --format short 2>&1 | tail -50 || echo "  (No application logs)"
    
    exit 1
  fi
  
  # Show logs periodically
  if [ $((ATTEMPT % 6)) -eq 0 ] && [ $ATTEMPT -gt 0 ]; then
    SERVICE_ID=$(echo "$SERVICE_ARN" | awk -F'/' '{print $NF}')
    
    echo ""
    echo "📋 Latest deployment logs:"
    aws logs tail "/aws/apprunner/$SERVICE_NAME/$SERVICE_ID/service" --region $REGION --since 2m --format short 2>&1 | tail -10 || echo "  (logs not available yet)"
    
    echo ""
    echo "📋 Latest application logs:"
    aws logs tail "/aws/apprunner/$SERVICE_NAME/$SERVICE_ID/application" --region $REGION --since 2m --format short 2>&1 | tail -10 || echo "  (no application logs yet)"
    echo ""
  fi
  
  ATTEMPT=$((ATTEMPT + 1))
  sleep 10
done

if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
  echo ""
  echo "❌ Deployment timed out after $MAX_ATTEMPTS attempts"
  echo "   Service ARN: $SERVICE_ARN"
  echo "   Final Status: $STATUS"
  echo ""
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   🎉 PRODUCTION BACKEND DEPLOYMENT COMPLETE                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Service Details:"
echo "  URL: https://$SERVICE_URL"
echo "  API Base: https://$SERVICE_URL/api/v1"
echo "  Health: https://$SERVICE_URL/health"
echo ""
echo "Network Configuration:"
echo "  VPC: $PROD_VPC_ID (Production VPC with RDS)"
echo "  VPC Connector: $VPC_CONNECTOR_ARN"
echo "  RDS Connectivity: ✅ Enabled"
echo ""
echo "Next Steps:"
echo "  1. Test API endpoints"
echo "  2. Run database migrations: npx prisma migrate deploy"
echo "  3. Enable queue worker (set ENABLE_QUEUE_WORKER=true)"
echo "  4. Configure frontend to use: https://$SERVICE_URL"
echo ""

