#!/bin/bash

# Steno AI - AWS Secrets Manager Setup
# This script creates secrets for database, Redis, and S3 credentials

set -e

REGION="us-east-1"
PROJECT_NAME="steno-prod"

echo "🔐 Setting up AWS Secrets Manager for Steno AI"
echo "Region: $REGION"
echo ""

# Determine script directory for config path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/config"

# Check if config files exist
if [ ! -f "$CONFIG_DIR/rds-config.json" ]; then
    echo "❌ RDS config not found. Run setup-rds.sh first."
    exit 1
fi

if [ ! -f "$CONFIG_DIR/redis-config.json" ]; then
    echo "❌ Redis config not found. Run setup-redis.sh first."
    exit 1
fi

if [ ! -f "$CONFIG_DIR/s3-config.json" ]; then
    echo "❌ S3 config not found. Run setup-s3.sh first."
    exit 1
fi

# Load configuration
DB_ENDPOINT=$(jq -r '.Endpoint' "$CONFIG_DIR/rds-config.json")
DB_PORT=$(jq -r '.Port' "$CONFIG_DIR/rds-config.json")
DB_NAME=$(jq -r '.Database' "$CONFIG_DIR/rds-config.json")
DB_USERNAME=$(jq -r '.Username' "$CONFIG_DIR/rds-config.json")
DB_PASSWORD=$(jq -r '.Password' "$CONFIG_DIR/rds-config.json")

REDIS_ENDPOINT=$(jq -r '.RedisEndpoint' "$CONFIG_DIR/redis-config.json")
REDIS_PORT=$(jq -r '.RedisPort' "$CONFIG_DIR/redis-config.json")

S3_DOCS_BUCKET=$(jq -r '.DocsBucket' "$CONFIG_DIR/s3-config.json")
S3_EXPORTS_BUCKET=$(jq -r '.ExportsBucket' "$CONFIG_DIR/s3-config.json")

# Build DATABASE_URL
DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_ENDPOINT}:${DB_PORT}/${DB_NAME}?schema=public"

echo "📝 Creating secrets..."
echo ""

# 1. Database credentials
SECRET_NAME_DB="${PROJECT_NAME}/database"
echo "Creating secret: $SECRET_NAME_DB"

aws secretsmanager create-secret \
  --name "$SECRET_NAME_DB" \
  --description "Steno AI Database Credentials" \
  --secret-string "{
    \"host\": \"${DB_ENDPOINT}\",
    \"port\": ${DB_PORT},
    \"database\": \"${DB_NAME}\",
    \"username\": \"${DB_USERNAME}\",
    \"password\": \"${DB_PASSWORD}\",
    \"connectionString\": \"${DATABASE_URL}\"
  }" \
  --region $REGION \
  --tags "Key=Project,Value=steno" "Key=Environment,Value=production" \
  2>/dev/null || \
aws secretsmanager update-secret \
  --secret-id "$SECRET_NAME_DB" \
  --secret-string "{
    \"host\": \"${DB_ENDPOINT}\",
    \"port\": ${DB_PORT},
    \"database\": \"${DB_NAME}\",
    \"username\": \"${DB_USERNAME}\",
    \"password\": \"${DB_PASSWORD}\",
    \"connectionString\": \"${DATABASE_URL}\"
  }" \
  --region $REGION

echo "✅ Database secret created/updated"

# 2. Redis credentials
SECRET_NAME_REDIS="${PROJECT_NAME}/redis"
echo "Creating secret: $SECRET_NAME_REDIS"

aws secretsmanager create-secret \
  --name "$SECRET_NAME_REDIS" \
  --description "Steno AI Redis Configuration" \
  --secret-string "{
    \"host\": \"${REDIS_ENDPOINT}\",
    \"port\": ${REDIS_PORT},
    \"url\": \"redis://${REDIS_ENDPOINT}:${REDIS_PORT}\"
  }" \
  --region $REGION \
  --tags "Key=Project,Value=steno" "Key=Environment,Value=production" \
  2>/dev/null || \
aws secretsmanager update-secret \
  --secret-id "$SECRET_NAME_REDIS" \
  --secret-string "{
    \"host\": \"${REDIS_ENDPOINT}\",
    \"port\": ${REDIS_PORT},
    \"url\": \"redis://${REDIS_ENDPOINT}:${REDIS_PORT}\"
  }" \
  --region $REGION

echo "✅ Redis secret created/updated"

# 3. S3 configuration
SECRET_NAME_S3="${PROJECT_NAME}/s3"
echo "Creating secret: $SECRET_NAME_S3"

aws secretsmanager create-secret \
  --name "$SECRET_NAME_S3" \
  --description "Steno AI S3 Bucket Configuration" \
  --secret-string "{
    \"documentsBucket\": \"${S3_DOCS_BUCKET}\",
    \"exportsBucket\": \"${S3_EXPORTS_BUCKET}\",
    \"region\": \"${REGION}\"
  }" \
  --region $REGION \
  --tags "Key=Project,Value=steno" "Key=Environment,Value=production" \
  2>/dev/null || \
aws secretsmanager update-secret \
  --secret-id "$SECRET_NAME_S3" \
  --secret-string "{
    \"documentsBucket\": \"${S3_DOCS_BUCKET}\",
    \"exportsBucket\": \"${S3_EXPORTS_BUCKET}\",
    \"region\": \"${REGION}\"
  }" \
  --region $REGION

echo "✅ S3 secret created/updated"

# 4. Application secrets (JWT, API keys, etc.)
SECRET_NAME_APP="${PROJECT_NAME}/application"
echo "Creating secret: $SECRET_NAME_APP"

# Generate secure random secrets
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

aws secretsmanager create-secret \
  --name "$SECRET_NAME_APP" \
  --description "Steno AI Application Secrets" \
  --secret-string "{
    \"jwtSecret\": \"${JWT_SECRET}\",
    \"encryptionKey\": \"${ENCRYPTION_KEY}\",
    \"nodeEnv\": \"production\"
  }" \
  --region $REGION \
  --tags "Key=Project,Value=steno" "Key=Environment,Value=production" \
  2>/dev/null || \
echo "⚠️  Application secret already exists (skipping to preserve existing values)"

echo "✅ Application secret created/exists"

# Save secret ARNs to config
echo ""
echo "📊 Retrieving secret ARNs..."

DB_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id "$SECRET_NAME_DB" --region $REGION --query 'ARN' --output text)
REDIS_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id "$SECRET_NAME_REDIS" --region $REGION --query 'ARN' --output text)
S3_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id "$SECRET_NAME_S3" --region $REGION --query 'ARN' --output text)
APP_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id "$SECRET_NAME_APP" --region $REGION --query 'ARN' --output text)

# Save to config file
cat > "$CONFIG_DIR/secrets-config.json" <<EOF
{
  "DatabaseSecret": {
    "Name": "$SECRET_NAME_DB",
    "ARN": "$DB_SECRET_ARN"
  },
  "RedisSecret": {
    "Name": "$SECRET_NAME_REDIS",
    "ARN": "$REDIS_SECRET_ARN"
  },
  "S3Secret": {
    "Name": "$SECRET_NAME_S3",
    "ARN": "$S3_SECRET_ARN"
  },
  "ApplicationSecret": {
    "Name": "$SECRET_NAME_APP",
    "ARN": "$APP_SECRET_ARN"
  },
  "Region": "$REGION"
}
EOF

echo ""
echo "✨ Secrets Manager Setup Complete!"
echo ""
echo "📊 Secret Details:"
echo "  Database: $SECRET_NAME_DB"
echo "  Redis: $SECRET_NAME_REDIS"
echo "  S3: $SECRET_NAME_S3"
echo "  Application: $SECRET_NAME_APP"
echo ""
echo "💾 Configuration saved to: $CONFIG_DIR/secrets-config.json"
echo ""
echo "🔍 To view secrets:"
echo "  aws secretsmanager get-secret-value --secret-id $SECRET_NAME_DB --region $REGION"
echo ""
echo "💰 Cost: ~\$0.40/secret/month + \$0.05 per 10,000 API calls"
echo "  Estimated: ~\$2/month for 4 secrets"
echo ""
echo "Next steps:"
echo "  1. Update backend IAM role to allow secretsmanager:GetSecretValue"
echo "  2. Update backend code to read from Secrets Manager"
echo "  3. Deploy backend (option 6)"
echo ""

