#!/bin/bash

# Setup HTTPS for Steno Backend using CloudFront (No Domain Required)

set -e

REGION="us-east-1"
EB_ENV="steno-prod-backend-env"

echo "☁️  Setting up HTTPS via CloudFront"
echo "Region: $REGION"
echo ""

# Step 1: Get EB URL
echo "📝 Step 1: Getting EB load balancer URL..."
EB_URL=$(aws elasticbeanstalk describe-environments \
  --environment-names "$EB_ENV" \
  --region "$REGION" \
  --query 'Environments[0].CNAME' \
  --output text)

echo "✅ EB URL: $EB_URL"
echo ""

# Step 2: Create CloudFront distribution config
echo "📝 Step 2: Creating CloudFront distribution..."

CALLER_REF="steno-backend-$(date +%s)"

cat > /tmp/cf-distribution-config.json <<EOFCF
{
  "CallerReference": "$CALLER_REF",
  "Comment": "HTTPS proxy for Steno backend",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "eb-origin",
        "DomainName": "$EB_URL",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.2"]
          }
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "eb-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "POST", "DELETE"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "ForwardedValues": {
      "QueryString": true,
      "Cookies": {
        "Forward": "all"
      },
      "Headers": {
        "Quantity": 4,
        "Items": ["Authorization", "Content-Type", "Origin", "Accept"]
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 0,
    "MaxTTL": 0,
    "Compress": true,
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    }
  },
  "CacheBehaviors": {
    "Quantity": 0
  },
  "Comment": "HTTPS proxy for Steno backend"
}
EOFCF

# Create distribution
DIST_ID=$(aws cloudfront create-distribution \
  --distribution-config file:///tmp/cf-distribution-config.json \
  --query 'Distribution.Id' \
  --output text 2>/dev/null || echo "")

if [ -z "$DIST_ID" ]; then
    echo "❌ Failed to create CloudFront distribution"
    echo "   Trying to find existing distribution..."
    
    DIST_ID=$(aws cloudfront list-distributions \
      --query "DistributionList.Items[?Comment=='HTTPS proxy for Steno backend'].Id | [0]" \
      --output text 2>/dev/null || echo "")
    
    if [ -z "$DIST_ID" ] || [ "$DIST_ID" = "None" ]; then
        echo "❌ Could not create or find distribution"
        exit 1
    fi
    
    echo "✅ Found existing distribution: $DIST_ID"
else
    echo "✅ Distribution created: $DIST_ID"
fi

echo ""

# Step 3: Get CloudFront domain
echo "📝 Step 3: Getting CloudFront domain name..."
CF_DOMAIN=$(aws cloudfront get-distribution \
  --id "$DIST_ID" \
  --query 'Distribution.DomainName' \
  --output text)

echo "✅ CloudFront Domain: $CF_DOMAIN"
echo ""

# Step 4: Wait for deployment
echo "⏳ Step 4: Waiting for CloudFront deployment..."
echo "   (This takes 10-15 minutes for global distribution)"
echo ""

COUNTER=0
MAX_WAIT=30

while [ $COUNTER -lt $MAX_WAIT ]; do
    STATUS=$(aws cloudfront get-distribution \
      --id "$DIST_ID" \
      --query 'Distribution.Status' \
      --output text)
    
    echo "   [$((COUNTER * 30))s] Status: $STATUS"
    
    if [ "$STATUS" = "Deployed" ]; then
        echo "✅ CloudFront deployed!"
        break
    fi
    
    sleep 30
    COUNTER=$((COUNTER + 1))
done

if [ $COUNTER -eq $MAX_WAIT ]; then
    echo "⚠️  Deployment is taking longer than expected (this is normal)"
    echo "   Continue with setup - it will complete in the background"
fi

echo ""

# Step 5: Update EB CORS_ORIGIN
echo "📝 Step 5: Updating backend CORS_ORIGIN..."
aws elasticbeanstalk update-environment \
  --environment-name "$EB_ENV" \
  --region "$REGION" \
  --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=CORS_ORIGIN,Value=https://ai-demand-letters.vercel.app

echo "✅ CORS_ORIGIN updated"
echo ""

# Step 6: Save configuration
mkdir -p deployment/config
cat > deployment/config/cloudfront-config.json <<EOFCONFIG
{
  "DistributionId": "$DIST_ID",
  "CloudFrontDomain": "$CF_DOMAIN",
  "CloudFrontURL": "https://$CF_DOMAIN",
  "OriginURL": "http://$EB_URL",
  "ConfiguredDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "Region": "$REGION"
}
EOFCONFIG

echo "✅ Configuration saved to: deployment/config/cloudfront-config.json"
echo ""

# Summary
echo "═══════════════════════════════════════════════════════"
echo "✨ HTTPS Setup Complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Your backend is now available at:"
echo "   https://$CF_DOMAIN"
echo ""
echo "Next Steps:"
echo ""
echo "1. Test the HTTPS endpoint (wait 5-10 more minutes if it fails):"
echo "   curl https://$CF_DOMAIN/health"
echo ""
echo "2. Update Vercel environment variable:"
echo "   Go to: https://vercel.com/dashboard"
echo "   Project: ai-demand-letters"
echo "   Settings → Environment Variables"
echo "   Set: NEXT_PUBLIC_API_URL=https://$CF_DOMAIN"
echo ""
echo "3. Redeploy frontend on Vercel"
echo ""
echo "4. Test in browser:"
echo "   Open: https://ai-demand-letters.vercel.app"
echo "   Check Network tab - should see https://$CF_DOMAIN requests"
echo "   No mixed content errors!"
echo ""
echo "Distribution ID: $DIST_ID"
echo "CloudFront URL: https://$CF_DOMAIN"
echo ""

