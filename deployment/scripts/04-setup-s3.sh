#!/bin/bash

# Steno AI - S3 Buckets Setup
# This script creates S3 buckets for documents and exports

set -e

REGION="us-east-1"
PROJECT_NAME="steno-prod"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "☁️  Setting up S3 Buckets for Steno AI"
echo "Region: $REGION"
echo "Account: $ACCOUNT_ID"
echo ""

# Bucket names
DOCS_BUCKET="$PROJECT_NAME-docs-$ACCOUNT_ID"
EXPORTS_BUCKET="$PROJECT_NAME-exports-$ACCOUNT_ID"

# Create Documents Bucket
echo "📁 Creating documents bucket..."
aws s3api create-bucket \
  --bucket $DOCS_BUCKET \
  --region $REGION \
  --create-bucket-configuration LocationConstraint=$REGION 2>/dev/null || echo "Bucket may already exist"

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket $DOCS_BUCKET \
  --versioning-configuration Status=Enabled \
  --region $REGION

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket $DOCS_BUCKET \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }' \
  --region $REGION

# Block public access
aws s3api put-public-access-block \
  --bucket $DOCS_BUCKET \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --region $REGION

# CORS configuration for documents
aws s3api put-bucket-cors \
  --bucket $DOCS_BUCKET \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": ["https://*.vercel.app", "https://steno.ai", "http://localhost:3000"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }]
  }' \
  --region $REGION

# Lifecycle policy for documents
aws s3api put-bucket-lifecycle-configuration \
  --bucket $DOCS_BUCKET \
  --lifecycle-configuration '{
    "Rules": [{
      "Id": "MoveToIA",
      "Status": "Enabled",
      "Transitions": [{
        "Days": 90,
        "StorageClass": "STANDARD_IA"
      }],
      "NoncurrentVersionTransitions": [{
        "NoncurrentDays": 30,
        "StorageClass": "STANDARD_IA"
      }]
    }]
  }' \
  --region $REGION

echo "✅ Documents bucket created: $DOCS_BUCKET"

# Create Exports Bucket
echo "📁 Creating exports bucket..."
aws s3api create-bucket \
  --bucket $EXPORTS_BUCKET \
  --region $REGION \
  --create-bucket-configuration LocationConstraint=$REGION 2>/dev/null || echo "Bucket may already exist"

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket $EXPORTS_BUCKET \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }' \
  --region $REGION

# Block public access
aws s3api put-public-access-block \
  --bucket $EXPORTS_BUCKET \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --region $REGION

# CORS configuration for exports
aws s3api put-bucket-cors \
  --bucket $EXPORTS_BUCKET \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedOrigins": ["https://*.vercel.app", "https://steno.ai", "http://localhost:3000"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }]
  }' \
  --region $REGION

# Lifecycle policy for exports (delete after 30 days)
aws s3api put-bucket-lifecycle-configuration \
  --bucket $EXPORTS_BUCKET \
  --lifecycle-configuration '{
    "Rules": [{
      "Id": "DeleteOldExports",
      "Status": "Enabled",
      "Expiration": {
        "Days": 30
      }
    }]
  }' \
  --region $REGION

echo "✅ Exports bucket created: $EXPORTS_BUCKET"

# Add tags
for bucket in $DOCS_BUCKET $EXPORTS_BUCKET; do
    aws s3api put-bucket-tagging \
      --bucket $bucket \
      --tagging "TagSet=[{Key=Project,Value=steno},{Key=Environment,Value=production},{Key=ManagedBy,Value=deployment-script}]" \
      --region $REGION
done

# Determine script directory for config path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/config"
mkdir -p "$CONFIG_DIR"

# Save configuration
cat > "$CONFIG_DIR/s3-config.json" <<EOF
{
  "DocsBucket": "$DOCS_BUCKET",
  "ExportsBucket": "$EXPORTS_BUCKET",
  "Region": "$REGION",
  "DocsUrl": "https://$DOCS_BUCKET.s3.$REGION.amazonaws.com",
  "ExportsUrl": "https://$EXPORTS_BUCKET.s3.$REGION.amazonaws.com"
}
EOF

echo ""
echo "✨ S3 Setup Complete!"
echo ""
echo "📊 Bucket Details:"
echo "  Documents: s3://$DOCS_BUCKET"
echo "  Exports: s3://$EXPORTS_BUCKET"
echo ""
echo "💾 Configuration saved to: $CONFIG_DIR/s3-config.json"
echo ""
echo "Environment variables for backend:"
echo "S3_BUCKET_NAME=$DOCS_BUCKET"
echo "S3_EXPORTS_BUCKET=$EXPORTS_BUCKET"
echo "AWS_REGION=$REGION"
echo ""
echo "Next steps:"
echo "  1. Setup Secrets Manager (option 5)"
echo "  2. Deploy backend (option 6)"

