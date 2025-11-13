#!/bin/bash

# Steno AI - Backend Deployment to AWS App Runner
# This script deploys the backend Docker image to AWS App Runner

set -e

REGION="us-east-1"
PROJECT_NAME="steno-prod"
SERVICE_NAME="${PROJECT_NAME}-backend"

echo "🚀 Deploying Backend to AWS App Runner"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo ""

# Determine script directory for config path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/config"

# Load configuration
if [ ! -f "$CONFIG_DIR/ecr-config.json" ]; then
    echo "❌ ECR config not found. Run setup-ecr.sh first."
    exit 1
fi

if [ ! -f "$CONFIG_DIR/iam-config.json" ]; then
    echo "❌ IAM config not found. Run setup-iam-roles.sh first."
    exit 1
fi

if [ ! -f "$CONFIG_DIR/secrets-config.json" ]; then
    echo "❌ Secrets config not found. Run setup-secrets-manager.sh first."
    exit 1
fi

# Load values
IMAGE_URI=$(jq -r '.RepositoryUri' "$CONFIG_DIR/ecr-config.json")
INSTANCE_ROLE_ARN=$(jq -r '.BackendRole.ARN' "$CONFIG_DIR/iam-config.json")
ACCESS_ROLE_ARN=$(jq -r '.AppRunnerAccessRole.ARN' "$CONFIG_DIR/iam-config.json")

DB_SECRET_ARN=$(jq -r '.DatabaseSecret.ARN' "$CONFIG_DIR/secrets-config.json")
REDIS_SECRET_ARN=$(jq -r '.RedisSecret.ARN' "$CONFIG_DIR/secrets-config.json")
S3_SECRET_ARN=$(jq -r '.S3Secret.ARN' "$CONFIG_DIR/secrets-config.json")
APP_SECRET_ARN=$(jq -r '.ApplicationSecret.ARN' "$CONFIG_DIR/secrets-config.json")

echo "📋 Configuration:"
echo "  Image: $IMAGE_URI:latest"
echo "  Instance Role: $INSTANCE_ROLE_ARN"
echo "  Access Role: $ACCESS_ROLE_ARN"
echo ""

# Create App Runner configuration file
cat > /tmp/apprunner-config.json <<EOF
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
          "AWS_REGION": "$REGION",
          "AWS_SECRETS_MANAGER_ENABLED": "true"
        }
      }
    },
    "AuthenticationConfiguration": {
      "AccessRoleArn": "$ACCESS_ROLE_ARN"
    }
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
    "UnhealthyThreshold": 3
  },
  "Tags": [
    {
      "Key": "Project",
      "Value": "steno"
    },
    {
      "Key": "Environment",
      "Value": "production"
    }
  ]
}
EOF

echo "🚀 Creating App Runner service..."
echo ""

# Check if service already exists
SERVICE_ARN=$(aws apprunner list-services --region $REGION --query "ServiceSummaryList[?ServiceName=='$SERVICE_NAME'].ServiceArn | [0]" --output text 2>/dev/null || echo "")

if [ "$SERVICE_ARN" != "" ] && [ "$SERVICE_ARN" != "None" ]; then
    echo "⚠️  Service already exists: $SERVICE_ARN"
    echo "Updating service..."
    
    aws apprunner update-service \
      --service-arn "$SERVICE_ARN" \
      --source-configuration "{
        \"ImageRepository\": {
          \"ImageIdentifier\": \"$IMAGE_URI:latest\",
          \"ImageRepositoryType\": \"ECR\",
          \"ImageConfiguration\": {
            \"Port\": \"3001\",
            \"RuntimeEnvironmentVariables\": {
              \"NODE_ENV\": \"production\",
              \"PORT\": \"3001\",
              \"AWS_REGION\": \"$REGION\",
              \"AWS_SECRETS_MANAGER_ENABLED\": \"true\"
            }
          }
        },
        \"AuthenticationConfiguration\": {
          \"AccessRoleArn\": \"$ACCESS_ROLE_ARN\"
        }
      }" \
      --instance-configuration "{
        \"Cpu\": \"1 vCPU\",
        \"Memory\": \"2 GB\",
        \"InstanceRoleArn\": \"$INSTANCE_ROLE_ARN\"
      }" \
      --health-check-configuration "{
        \"Protocol\": \"HTTP\",
        \"Path\": \"/health\",
        \"Interval\": 10,
        \"Timeout\": 5,
        \"HealthyThreshold\": 2,
        \"UnhealthyThreshold\": 3
      }" \
      --region $REGION
else
    aws apprunner create-service \
      --cli-input-json file:///tmp/apprunner-config.json \
      --region $REGION
    
    echo "✅ Service creation initiated"
fi

rm -f /tmp/apprunner-config.json

echo ""
echo "⏳ Waiting for service to become available..."
echo "This may take 5-10 minutes. Checking status..."
echo ""

# Wait and check status
sleep 30

# Get service ARN
SERVICE_ARN=$(aws apprunner list-services --region $REGION --query "ServiceSummaryList[?ServiceName=='$SERVICE_NAME'].ServiceArn | [0]" --output text)

if [ "$SERVICE_ARN" = "" ] || [ "$SERVICE_ARN" = "None" ]; then
    echo "❌ Failed to get service ARN"
    exit 1
fi

echo "Service ARN: $SERVICE_ARN"
echo ""

# Monitor deployment
COUNTER=0
MAX_ATTEMPTS=40  # 20 minutes max

while [ $COUNTER -lt $MAX_ATTEMPTS ]; do
    STATUS=$(aws apprunner describe-service --service-arn "$SERVICE_ARN" --region $REGION --query 'Service.Status' --output text)
    
    echo "[$((COUNTER * 30))s] Current status: $STATUS"
    
    if [ "$STATUS" = "RUNNING" ]; then
        echo ""
        echo "✅ Service is now running!"
        break
    elif [ "$STATUS" = "CREATE_FAILED" ] || [ "$STATUS" = "DELETE_FAILED" ]; then
        echo ""
        echo "❌ Deployment failed with status: $STATUS"
        exit 1
    fi
    
    sleep 30
    COUNTER=$((COUNTER + 1))
done

if [ $COUNTER -eq $MAX_ATTEMPTS ]; then
    echo ""
    echo "⚠️  Deployment is taking longer than expected. Check AWS console for details."
    echo "  Service ARN: $SERVICE_ARN"
    exit 1
fi

# Get service details
SERVICE_URL=$(aws apprunner describe-service --service-arn "$SERVICE_ARN" --region $REGION --query 'Service.ServiceUrl' --output text)
SERVICE_ID=$(aws apprunner describe-service --service-arn "$SERVICE_ARN" --region $REGION --query 'Service.ServiceId' --output text)

# Save to config
cat > "$CONFIG_DIR/apprunner-config.json" <<EOF
{
  "ServiceName": "$SERVICE_NAME",
  "ServiceArn": "$SERVICE_ARN",
  "ServiceId": "$SERVICE_ID",
  "ServiceUrl": "https://$SERVICE_URL",
  "Region": "$REGION",
  "ImageUri": "$IMAGE_URI:latest"
}
EOF

echo ""
echo "✨ Backend Deployment Complete!"
echo ""
echo "📊 Service Details:"
echo "  Name: $SERVICE_NAME"
echo "  ARN: $SERVICE_ARN"
echo "  URL: https://$SERVICE_URL"
echo "  Status: RUNNING"
echo ""
echo "💾 Configuration saved to: $CONFIG_DIR/apprunner-config.json"
echo ""
echo "🔍 Test the backend:"
echo "  curl https://$SERVICE_URL/health"
echo ""
echo "📱 View in AWS Console:"
echo "  https://console.aws.amazon.com/apprunner/home?region=$REGION#/services/$SERVICE_ID"
echo ""
echo "💰 Cost: ~\$25-50/month (1 vCPU, 2GB RAM)"
echo "  - Base: \$0.064/hour (~\$46/mo)"
echo "  - Additional compute/memory based on usage"
echo ""
echo "⚠️  IMPORTANT: You need to run database migrations before the app will work fully:"
echo "  cd ../backend"
echo "  DATABASE_URL=<from-secrets-manager> npm run prisma:migrate"
echo ""
echo "Next steps:"
echo "  1. Run database migrations"
echo "  2. Test the API endpoints"
echo "  3. Deploy frontend with this API URL"
echo ""

