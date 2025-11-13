#!/bin/bash

# Steno AI - Backend Deployment to AWS App Runner (with Environment Variables)
# This script deploys the backend with all required environment variables from Secrets Manager

set -e

REGION="us-east-1"
PROJECT_NAME="steno-prod"
SERVICE_NAME="${PROJECT_NAME}-backend"

echo "🚀 Deploying Backend to AWS App Runner (with full configuration)"
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
          "RATE_LIMIT_MAX_REQUESTS": "100"
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
    "UnhealthyThreshold": 5
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
aws apprunner create-service \
  --cli-input-json file:///tmp/apprunner-config.json \
  --region $REGION

rm -f /tmp/apprunner-config.json

echo "✅ Service creation initiated"
echo ""
echo "⏳ Waiting for service to become available (this may take 5-10 minutes)..."
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
MAX_ATTEMPTS=30  # 15 minutes max

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
        echo ""
        echo "Checking logs for errors..."
        # Get the actual service ID from the ARN
        SERVICE_LOG_ID=$(echo "$SERVICE_ARN" | awk -F'/' '{print $NF}')
        aws logs tail "/aws/apprunner/$SERVICE_NAME/$SERVICE_LOG_ID/service" --region $REGION --since 30m --format short 2>&1 | tail -20
        exit 1
    fi
    
    sleep 30
    COUNTER=$((COUNTER + 1))
done

if [ $COUNTER -eq $MAX_ATTEMPTS ]; then
    echo ""
    echo "⚠️  Deployment is taking longer than expected."
    echo "Current status: $STATUS"
    echo ""
    echo "Checking logs..."
    # Get the actual service ID from the ARN
    SERVICE_LOG_ID=$(echo "$SERVICE_ARN" | awk -F'/' '{print $NF}')
    echo "Log group: /aws/apprunner/$SERVICE_NAME/$SERVICE_LOG_ID/service"
    aws logs tail "/aws/apprunner/$SERVICE_NAME/$SERVICE_LOG_ID/service" --region $REGION --since 30m --format short 2>&1 | tail -20
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
echo "  URL: https://$SERVICE_URL"
echo "  Status: RUNNING"
echo ""
echo "💾 Configuration saved to: $CONFIG_DIR/apprunner-config.json"
echo ""
echo "🔍 Test the backend:"
echo "  curl https://$SERVICE_URL/health"
echo "  curl https://$SERVICE_URL/api/v1/health"
echo ""
echo "📱 View in AWS Console:"
echo "  https://console.aws.amazon.com/apprunner/home?region=$REGION#/services/$SERVICE_ID"
echo ""
echo "💰 Cost: ~\$25-50/month (1 vCPU, 2GB RAM + compute usage)"
echo ""
echo "Next steps:"
echo "  1. Test API endpoints"
echo "  2. Run database migrations"
echo "  3. Deploy frontend with API URL: https://$SERVICE_URL"
echo ""

