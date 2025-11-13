#!/bin/bash

# Steno AI - ECR Repository Setup
# This script creates an ECR repository for the backend Docker image

set -e

REGION="us-east-1"
PROJECT_NAME="steno-prod"
REPO_NAME="${PROJECT_NAME}-backend"

echo "🐳 Setting up ECR Repository for Steno AI"
echo "Region: $REGION"
echo "Repository: $REPO_NAME"
echo ""

# Create ECR repository
echo "📦 Creating ECR repository..."

aws ecr create-repository \
  --repository-name "$REPO_NAME" \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256 \
  --region $REGION \
  --tags "Key=Project,Value=steno" "Key=Environment,Value=production" \
  2>/dev/null || echo "Repository already exists, continuing..."

# Get repository URI
REPO_URI=$(aws ecr describe-repositories \
  --repository-names "$REPO_NAME" \
  --region $REGION \
  --query 'repositories[0].repositoryUri' \
  --output text)

echo "✅ ECR repository ready"
echo "  URI: $REPO_URI"

# Set lifecycle policy to keep only recent images
echo "📝 Setting lifecycle policy..."

cat > /tmp/ecr-lifecycle-policy.json <<EOF
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
EOF

aws ecr put-lifecycle-policy \
  --repository-name "$REPO_NAME" \
  --lifecycle-policy-text file:///tmp/ecr-lifecycle-policy.json \
  --region $REGION

rm -f /tmp/ecr-lifecycle-policy.json

echo "✅ Lifecycle policy set"

# Determine script directory for config path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/config"
mkdir -p "$CONFIG_DIR"

# Save to config
cat > "$CONFIG_DIR/ecr-config.json" <<EOF
{
  "RepositoryName": "$REPO_NAME",
  "RepositoryUri": "$REPO_URI",
  "Region": "$REGION"
}
EOF

echo ""
echo "✨ ECR Setup Complete!"
echo ""
echo "📊 Repository Details:"
echo "  Name: $REPO_NAME"
echo "  URI: $REPO_URI"
echo ""
echo "💾 Configuration saved to: $CONFIG_DIR/ecr-config.json"
echo ""
echo "🐳 To build and push Docker image:"
echo "  1. cd ../backend"
echo "  2. docker build -t $REPO_NAME ."
echo "  3. aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $REPO_URI"
echo "  4. docker tag $REPO_NAME:latest $REPO_URI:latest"
echo "  5. docker push $REPO_URI:latest"
echo ""
echo "💰 Cost: \$0.10/GB/month for storage"
echo ""
echo "Next step: Build and deploy backend"
echo ""

