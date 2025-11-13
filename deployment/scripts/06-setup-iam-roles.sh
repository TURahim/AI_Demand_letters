#!/bin/bash

# Steno AI - IAM Roles Setup
# This script creates IAM roles and policies for the backend service

set -e

REGION="us-east-1"
PROJECT_NAME="steno-prod"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "🔐 Setting up IAM Roles for Steno AI"
echo "Region: $REGION"
echo "Account: $ACCOUNT_ID"
echo ""

# Determine script directory for config path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/config"

# Load configuration
if [ ! -f "$CONFIG_DIR/secrets-config.json" ]; then
    echo "❌ Secrets config not found. Run setup-secrets-manager.sh first."
    exit 1
fi

S3_DOCS_BUCKET=$(jq -r '.DocsBucket' "$CONFIG_DIR/s3-config.json")
S3_EXPORTS_BUCKET=$(jq -r '.ExportsBucket' "$CONFIG_DIR/s3-config.json")

# 1. Create IAM Role for App Runner / ECS
ROLE_NAME="${PROJECT_NAME}-backend-role"
echo "📝 Creating IAM role: $ROLE_NAME"

# Trust policy for App Runner
cat > /tmp/trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": [
          "tasks.apprunner.amazonaws.com",
          "ecs-tasks.amazonaws.com"
        ]
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name "$ROLE_NAME" \
  --assume-role-policy-document file:///tmp/trust-policy.json \
  --description "Steno AI Backend Service Role" \
  --tags "Key=Project,Value=steno" "Key=Environment,Value=production" \
  2>/dev/null || echo "Role already exists, continuing..."

echo "✅ IAM role created/exists"

# 2. Create inline policy for the role
POLICY_NAME="${PROJECT_NAME}-backend-policy"
echo "📝 Creating IAM policy: $POLICY_NAME"

cat > /tmp/backend-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SecretsManagerAccess",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:${PROJECT_NAME}/*"
      ]
    },
    {
      "Sid": "S3DocumentsAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetObjectVersion"
      ],
      "Resource": [
        "arn:aws:s3:::${S3_DOCS_BUCKET}",
        "arn:aws:s3:::${S3_DOCS_BUCKET}/*",
        "arn:aws:s3:::${S3_EXPORTS_BUCKET}",
        "arn:aws:s3:::${S3_EXPORTS_BUCKET}/*"
      ]
    },
    {
      "Sid": "BedrockAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:${REGION}::foundation-model/*"
      ]
    },
    {
      "Sid": "CloudWatchLogsAccess",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": [
        "arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:/aws/apprunner/${PROJECT_NAME}*:*",
        "arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:/ecs/${PROJECT_NAME}*:*"
      ]
    }
  ]
}
EOF

# Attach policy to role
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "$POLICY_NAME" \
  --policy-document file:///tmp/backend-policy.json

echo "✅ IAM policy attached"

# 3. Create IAM role for App Runner service (to pull from ECR)
APP_RUNNER_ROLE="${PROJECT_NAME}-apprunner-service-role"
echo "📝 Creating App Runner access role: $APP_RUNNER_ROLE"

cat > /tmp/apprunner-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "build.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name "$APP_RUNNER_ROLE" \
  --assume-role-policy-document file:///tmp/apprunner-trust-policy.json \
  --description "App Runner Service Access Role" \
  2>/dev/null || echo "App Runner role already exists, continuing..."

# Attach AWS managed policy for ECR access
aws iam attach-role-policy \
  --role-name "$APP_RUNNER_ROLE" \
  --policy-arn "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess" \
  2>/dev/null || echo "Policy already attached"

echo "✅ App Runner access role created"

# Get role ARNs
ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
APP_RUNNER_ROLE_ARN=$(aws iam get-role --role-name "$APP_RUNNER_ROLE" --query 'Role.Arn' --output text)

# Save to config
cat > "$CONFIG_DIR/iam-config.json" <<EOF
{
  "BackendRole": {
    "Name": "$ROLE_NAME",
    "ARN": "$ROLE_ARN"
  },
  "AppRunnerAccessRole": {
    "Name": "$APP_RUNNER_ROLE",
    "ARN": "$APP_RUNNER_ROLE_ARN"
  },
  "Region": "$REGION"
}
EOF

# Clean up temp files
rm -f /tmp/trust-policy.json /tmp/backend-policy.json /tmp/apprunner-trust-policy.json

echo ""
echo "✨ IAM Roles Setup Complete!"
echo ""
echo "📊 Role Details:"
echo "  Backend Role: $ROLE_NAME"
echo "  ARN: $ROLE_ARN"
echo ""
echo "  App Runner Access Role: $APP_RUNNER_ROLE"
echo "  ARN: $APP_RUNNER_ROLE_ARN"
echo ""
echo "💾 Configuration saved to: $CONFIG_DIR/iam-config.json"
echo ""
echo "✅ Permissions granted:"
echo "  ✓ Secrets Manager (read steno-prod/* secrets)"
echo "  ✓ S3 (read/write documents and exports buckets)"
echo "  ✓ Bedrock (invoke AI models)"
echo "  ✓ CloudWatch Logs (write application logs)"
echo ""
echo "Next steps:"
echo "  1. Build and push Docker image to ECR"
echo "  2. Deploy backend to App Runner"
echo ""

