#!/bin/bash

# Deploy backend with comprehensive logging enabled
# This version uses a clean service name to avoid conflicts

set -e

REGION="us-east-1"
SERVICE_NAME="steno-backend-v3"  # New service name

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   🚀 DEPLOYING BACKEND WITH COMPREHENSIVE LOGGING            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/config"

# Load configuration
VPC_CONNECTOR_ARN=$(jq -r '.VpcConnectorArn' "$CONFIG_DIR/vpc-connector-prod.json")
IMAGE_URI=$(jq -r '.RepositoryUri' "$CONFIG_DIR/ecr-config.json")
INSTANCE_ROLE_ARN=$(jq -r '.BackendRole.ARN' "$CONFIG_DIR/iam-config.json")
ACCESS_ROLE_ARN=$(jq -r '.AppRunnerAccessRole.ARN' "$CONFIG_DIR/iam-config.json")

echo "📋 Configuration:"
echo "  Image: $IMAGE_URI:latest"
echo "  VPC Connector: $VPC_CONNECTOR_ARN"
echo ""

# Fetch secrets
echo "📋 Fetching secrets..."
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

echo "✅ Secrets loaded"
echo ""

# Create service configuration
cat > /tmp/apprunner-v3.json <<EOF
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
    "UnhealthyThreshold": 12
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
      "Value": "v3-with-logging"
    }
  ]
}
EOF

echo "🚀 Creating App Runner service..."
SERVICE_OUTPUT=$(aws apprunner create-service \
  --cli-input-json file:///tmp/apprunner-v3.json \
  --region $REGION)

SERVICE_ARN=$(echo $SERVICE_OUTPUT | jq -r '.Service.ServiceArn')
SERVICE_URL=$(echo $SERVICE_OUTPUT | jq -r '.Service.ServiceUrl')
SERVICE_ID=$(echo "$SERVICE_ARN" | awk -F'/' '{print $NF}')

echo "✅ Service created"
echo "   ARN: $SERVICE_ARN"
echo "   URL: https://$SERVICE_URL"
echo "   ID: $SERVICE_ID"
echo ""

rm -f /tmp/apprunner-v3.json

echo "⏳ Monitoring deployment..."
echo ""

# Follow application logs in real-time
echo "📋 Tailing application logs (this will show early logging):"
echo ""

# Wait a bit for the service to start pulling the image
sleep 30

# Tail logs
aws logs tail "/aws/apprunner/$SERVICE_NAME/$SERVICE_ID/application" \
  --region $REGION \
  --follow \
  --format short \
  --since 30m 2>&1 &

LOG_PID=$!

# Monitor service status
for i in {1..30}; do
  STATUS=$(aws apprunner describe-service --service-arn $SERVICE_ARN --region $REGION --query 'Service.Status' --output text)
  echo "[$(date +%H:%M:%S)] Service Status: $STATUS"
  
  if [ "$STATUS" = "RUNNING" ]; then
    echo ""
    echo "✅ SERVICE IS RUNNING!"
    kill $LOG_PID 2>/dev/null || true
    
    # Test health endpoint
    echo ""
    echo "🏥 Testing health endpoint..."
    sleep 3
    curl -s "https://$SERVICE_URL/health" | jq . || curl -s "https://$SERVICE_URL/health"
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║   🎉 DEPLOYMENT SUCCESSFUL                                   ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Service URL: https://$SERVICE_URL"
    echo "Health: https://$SERVICE_URL/health"
    echo ""
    exit 0
  elif [ "$STATUS" = "CREATE_FAILED" ]; then
    echo ""
    echo "❌ DEPLOYMENT FAILED"
    kill $LOG_PID 2>/dev/null || true
    
    echo ""
    echo "📋 Service logs:"
    aws logs tail "/aws/apprunner/$SERVICE_NAME/$SERVICE_ID/service" --region $REGION --since 30m --format short | tail -50
    
    exit 1
  fi
  
  sleep 20
done

kill $LOG_PID 2>/dev/null || true

echo ""
echo "⏰ Deployment still in progress after 10 minutes"
echo "   Check AWS console for details: https://console.aws.amazon.com/apprunner/"
echo ""

