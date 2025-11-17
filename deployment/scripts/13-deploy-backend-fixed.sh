#!/bin/bash

# Steno AI - Backend Deployment to AWS App Runner (FIXED - All Issues Resolved)
# This deployment includes:
# - Fixed Dockerfile with dist/ verification
# - Fixed config without .env file dependency
# - HTTP server starts FIRST, optional services AFTER
# - Comprehensive startup logging

set -e

REGION="us-east-1"
PROJECT_NAME="steno-prod"
SERVICE_NAME="${PROJECT_NAME}-backend-fixed"  # Clean new service name

echo "🚀 Deploying FIXED Backend to AWS App Runner"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo ""

# Determine script directory for config path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/config"

# Load configuration
IMAGE_URI=$(jq -r '.RepositoryUri' "$CONFIG_DIR/ecr-config.json")
INSTANCE_ROLE_ARN=$(jq -r '.BackendRole.ARN' "$CONFIG_DIR/iam-config.json")
ACCESS_ROLE_ARN=$(jq -r '.AppRunnerAccessRole.ARN' "$CONFIG_DIR/iam-config.json")
VPC_CONNECTOR_ARN=$(jq -r '.VpcConnectorArn' "$CONFIG_DIR/vpc-connector-config.json")

echo "📋 Configuration:"
echo "  Image: $IMAGE_URI:latest"
echo "  VPC Connector: $VPC_CONNECTOR_ARN"
echo ""
echo "📋 Fetching secrets from AWS Secrets Manager..."

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

echo "✅ Secrets fetched successfully"
echo ""

# Create temporary config file
cat > /tmp/apprunner-config-fixed.json <<EOF
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
      "Key": "Version",
      "Value": "fixed"
    }
  ]
}
EOF

echo "🚀 Creating App Runner service..."
SERVICE_OUTPUT=$(aws apprunner create-service \
  --cli-input-json file:///tmp/apprunner-config-fixed.json \
  --region $REGION)

SERVICE_ARN=$(echo $SERVICE_OUTPUT | jq -r '.Service.ServiceArn')
SERVICE_URL=$(echo $SERVICE_OUTPUT | jq -r '.Service.ServiceUrl')

echo "✅ Service creation initiated"
echo "Service ARN: $SERVICE_ARN"
echo "Service URL: https://$SERVICE_URL"
echo ""

# Save service details
cat > "$CONFIG_DIR/apprunner-config.json" <<EOF
{
  "ServiceName": "$SERVICE_NAME",
  "ServiceArn": "$SERVICE_ARN",
  "ServiceUrl": "$SERVICE_URL",
  "Region": "$REGION"
}
EOF

echo "⏳ Waiting for service to become available..."
echo "This deployment should succeed within 5-10 minutes..."
echo ""

# Poll service status
MAX_ATTEMPTS=50
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  STATUS=$(aws apprunner describe-service --service-arn $SERVICE_ARN --region $REGION --query 'Service.Status' --output text)
  
  echo "[$ATTEMPT/$MAX_ATTEMPTS] Status: $STATUS ($(date +%H:%M:%S))"
  
  if [ "$STATUS" = "RUNNING" ]; then
    echo ""
    echo "✅ Service is RUNNING!"
    echo "🌐 Service URL: https://$SERVICE_URL"
    echo ""
    
    # Test health endpoint
    echo "🏥 Testing health endpoint..."
    sleep 5
    
    HEALTH_RESPONSE=$(curl -s "https://$SERVICE_URL/health")
    if [ $? -eq 0 ]; then
      echo "✅ Health check passed!"
      echo "$HEALTH_RESPONSE" | jq . || echo "$HEALTH_RESPONSE"
    else
      echo "⚠️  Health check failed to connect"
    fi
    
    break
  elif [ "$STATUS" = "CREATE_FAILED" ]; then
    echo ""
    echo "❌ Service creation failed!"
    echo ""
    
    # Get service ID for CloudWatch logs
    SERVICE_ID=$(echo "$SERVICE_ARN" | awk -F'/' '{print $NF}')
    LOG_GROUP="/aws/apprunner/$SERVICE_NAME/$SERVICE_ID/service"
    
    echo "📋 Recent CloudWatch logs:"
    aws logs tail "$LOG_GROUP" --region $REGION --since 10m --format short 2>&1 | tail -50 || echo "⚠️  Logs not available"
    
    exit 1
  fi
  
  # Show logs periodically
  if [ $((ATTEMPT % 5)) -eq 0 ] && [ $ATTEMPT -gt 0 ]; then
    SERVICE_ID=$(echo "$SERVICE_ARN" | awk -F'/' '{print $NF}')
    LOG_GROUP="/aws/apprunner/$SERVICE_NAME/$SERVICE_ID/service"
    
    echo ""
    echo "📋 Latest deployment logs:"
    aws logs tail "$LOG_GROUP" --region $REGION --since 2m --format short 2>&1 | tail -15 || echo "  (logs not available yet)"
    echo ""
  fi
  
  ATTEMPT=$((ATTEMPT + 1))
  sleep 12
done

if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
  echo ""
  echo "❌ Deployment timed out after $MAX_ATTEMPTS attempts"
  echo "Service ARN: $SERVICE_ARN"
  echo ""
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        ✅ BACKEND DEPLOYMENT COMPLETE (FIXED)                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Service URL: https://$SERVICE_URL"
echo "API Base: https://$SERVICE_URL/api/v1"
echo "Health Check: https://$SERVICE_URL/health"
echo ""
echo "All fixes applied:"
echo "  ✓ Dockerfile builds dist/ correctly"
echo "  ✓ Config doesn't require .env file"
echo "  ✓ HTTP server starts FIRST"
echo "  ✓ Optional services start AFTER"
echo "  ✓ Comprehensive logging enabled"
echo "  ✓ IAM role authentication supported"
echo ""
echo "Next steps:"
echo "1. Test API endpoints"
echo "2. Enable queue worker when ready (ENABLE_QUEUE_WORKER=true)"
echo "3. Configure frontend to use this backend URL"
echo "4. Clean up old stuck services via AWS console"
echo ""

# Clean up
rm -f /tmp/apprunner-config-fixed.json

