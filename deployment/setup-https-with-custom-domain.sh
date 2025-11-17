#!/bin/bash

# Setup HTTPS for Steno Backend with Custom Domain
# Prerequisites: You must own a domain and have access to its DNS settings

set -e

REGION="us-east-1"
EB_ENV="steno-prod-backend-env"

# TODO: Replace with your actual domain
DOMAIN="api.yourdomain.com"

echo "🔐 Setting up HTTPS for Steno Backend"
echo "Domain: $DOMAIN"
echo "Region: $REGION"
echo ""

# Step 1: Request ACM Certificate
echo "📝 Step 1: Requesting ACM Certificate..."
CERT_ARN=$(aws acm request-certificate \
  --domain-name "$DOMAIN" \
  --validation-method DNS \
  --region "$REGION" \
  --subject-alternative-names "*.$DOMAIN" \
  --tags Key=Project,Value=steno Key=Environment,Value=production \
  --query 'CertificateArn' \
  --output text)

echo "✅ Certificate requested: $CERT_ARN"
echo ""

# Step 2: Get DNS validation records
echo "📝 Step 2: Getting DNS validation records..."
sleep 5  # Wait for AWS to generate validation records

VALIDATION_RECORD=$(aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region "$REGION" \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
  --output json)

echo "🎯 Add this CNAME record to your DNS provider:"
echo "$VALIDATION_RECORD" | jq -r '"Name: " + .Name + "\nType: " + .Type + "\nValue: " + .Value'
echo ""

# Step 3: Wait for validation
echo "⏳ Step 3: Waiting for certificate validation..."
echo "   (This usually takes 5-15 minutes)"
echo ""
echo "   Please add the DNS record above, then press Enter to continue..."
read -p ""

echo "   Checking validation status..."
COUNTER=0
MAX_ATTEMPTS=30

while [ $COUNTER -lt $MAX_ATTEMPTS ]; do
    STATUS=$(aws acm describe-certificate \
      --certificate-arn "$CERT_ARN" \
      --region "$REGION" \
      --query 'Certificate.Status' \
      --output text)
    
    echo "   [$((COUNTER * 10))s] Status: $STATUS"
    
    if [ "$STATUS" = "ISSUED" ]; then
        echo "✅ Certificate validated and issued!"
        break
    elif [ "$STATUS" = "FAILED" ]; then
        echo "❌ Certificate validation failed"
        exit 1
    fi
    
    sleep 10
    COUNTER=$((COUNTER + 1))
done

if [ $COUNTER -eq $MAX_ATTEMPTS ]; then
    echo "⚠️  Certificate validation is taking longer than expected"
    echo "   You can check status later with:"
    echo "   aws acm describe-certificate --certificate-arn $CERT_ARN --region $REGION"
    exit 1
fi

# Step 4: Add HTTPS listener to EB
echo ""
echo "📝 Step 4: Adding HTTPS listener to Elastic Beanstalk..."
aws elasticbeanstalk update-environment \
  --environment-name "$EB_ENV" \
  --region "$REGION" \
  --option-settings \
    Namespace=aws:elbv2:listener:443,OptionName=Protocol,Value=HTTPS \
    Namespace=aws:elbv2:listener:443,OptionName=SSLCertificateArns,Value="$CERT_ARN" \
    Namespace=aws:elbv2:listener:443,OptionName=DefaultProcess,Value=default

echo "✅ HTTPS listener added to EB"
echo ""

# Step 5: Get EB ALB DNS name
echo "📝 Step 5: Getting EB load balancer DNS name..."
EB_CNAME=$(aws elasticbeanstalk describe-environments \
  --environment-names "$EB_ENV" \
  --region "$REGION" \
  --query 'Environments[0].CNAME' \
  --output text)

echo "✅ EB Load Balancer: $EB_CNAME"
echo ""

# Step 6: DNS configuration
echo "🎯 Step 6: DNS Configuration Required"
echo ""
echo "Add this CNAME record to your DNS provider:"
echo "   Name:  $DOMAIN"
echo "   Type:  CNAME"
echo "   Value: $EB_CNAME"
echo "   TTL:   300 (5 minutes)"
echo ""

# Step 7: Save configuration
cat > deployment/config/https-config.json <<EOFCONFIG
{
  "Domain": "$DOMAIN",
  "CertificateArn": "$CERT_ARN",
  "EBLoadBalancer": "$EB_CNAME",
  "ConfiguredDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "Region": "$REGION"
}
EOFCONFIG

echo "✅ Configuration saved to: deployment/config/https-config.json"
echo ""

# Summary
echo "═══════════════════════════════════════════════════════"
echo "✨ HTTPS Setup Complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Next Steps:"
echo "1. Add the CNAME record above to your DNS provider"
echo "2. Wait 5-10 minutes for DNS propagation"
echo "3. Test: curl https://$DOMAIN/health"
echo "4. Update Vercel env var:"
echo "   NEXT_PUBLIC_API_URL=https://$DOMAIN"
echo "5. Update EB CORS_ORIGIN (if not already set):"
echo "   CORS_ORIGIN=https://ai-demand-letters.vercel.app"
echo ""
echo "Certificate ARN: $CERT_ARN"
echo "EB Endpoint: $EB_CNAME"
echo ""

