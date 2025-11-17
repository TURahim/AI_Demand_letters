# Enable HTTPS on Elastic Beanstalk

## Problem

Browser blocks HTTP API calls from HTTPS frontend:
```
Mixed Content: The page at 'https://ai-demand-letters.vercel.app/auth/login' was loaded over HTTPS,
but requested an insecure resource 'http://steno-prod-backend-env...'. This request has been blocked.
```

## Solution: Add HTTPS Listener to EB Load Balancer

The EB environment already has an Application Load Balancer. We just need to:
1. Create/import an SSL certificate
2. Add HTTPS listener to the ALB
3. Update frontend to use `https://` URL

---

## Option A: Use AWS Certificate Manager (ACM) - Free + Auto-Renewal

### Prerequisites
- A custom domain (e.g., `api.stenoai.com` or subdomain)
- Access to domain's DNS settings

### Steps

#### 1. Request ACM Certificate
```bash
aws acm request-certificate \
  --domain-name api.stenoai.com \
  --validation-method DNS \
  --region us-east-1 \
  --subject-alternative-names "*.api.stenoai.com" \
  --tags Key=Project,Value=steno Key=Environment,Value=production
```

This returns a Certificate ARN - save it!

#### 2. Validate Certificate via DNS
```bash
# Get validation records
aws acm describe-certificate \
  --certificate-arn <your-certificate-arn> \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

Add the returned CNAME record to your DNS:
- **Name**: `_xxx.api.stenoai.com`
- **Type**: `CNAME`
- **Value**: `_yyy.acm-validations.aws.`

Wait 5-15 minutes for validation to complete.

#### 3. Add HTTPS Listener to EB Load Balancer
```bash
aws elasticbeanstalk update-environment \
  --environment-name steno-prod-backend-env \
  --region us-east-1 \
  --option-settings \
    Namespace=aws:elbv2:listener:443,OptionName=Protocol,Value=HTTPS \
    Namespace=aws:elbv2:listener:443,OptionName=SSLCertificateArns,Value=<your-certificate-arn> \
    Namespace=aws:elbv2:listener:443,OptionName=DefaultProcess,Value=default
```

#### 4. Update Route 53 (or your DNS)
Point your domain to the EB load balancer:
```bash
# Get ALB DNS name
aws elasticbeanstalk describe-environments \
  --environment-names steno-prod-backend-env \
  --region us-east-1 \
  --query 'Environments[0].CNAME' \
  --output text
```

Create CNAME record:
- **Name**: `api.stenoai.com`
- **Type**: `CNAME`
- **Value**: `steno-prod-backend-env.eba-exhpmgyi.us-east-1.elasticbeanstalk.com`

#### 5. Update Vercel Environment Variable
```bash
NEXT_PUBLIC_API_URL=https://api.stenoai.com
```

---

## Option B: Self-Signed Certificate (Quick Test Only)

⚠️ **Not recommended for production** - browsers will show warnings.

### Upload Self-Signed Cert to IAM
```bash
# Generate cert (for testing)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Upload to IAM
aws iam upload-server-certificate \
  --server-certificate-name steno-backend-selfsigned \
  --certificate-body file://cert.pem \
  --private-key file://key.pem \
  --region us-east-1
```

Then follow step 3 from Option A, using the IAM certificate ARN.

---

## Option C: Use CloudFront as HTTPS Proxy (No Domain Required)

CloudFront provides a free `*.cloudfront.net` domain with automatic HTTPS.

### Steps

#### 1. Create CloudFront Distribution
```bash
# Get EB ALB DNS name
EB_URL=$(aws elasticbeanstalk describe-environments \
  --environment-names steno-prod-backend-env \
  --region us-east-1 \
  --query 'Environments[0].CNAME' \
  --output text)

# Create distribution config
cat > cf-config.json <<EOF
{
  "CallerReference": "steno-backend-$(date +%s)",
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
          "OriginProtocolPolicy": "http-only"
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
      "Cookies": { "Forward": "all" },
      "Headers": {
        "Quantity": 3,
        "Items": ["Authorization", "Content-Type", "Origin"]
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 0,
    "MaxTTL": 0
  }
}
EOF

aws cloudfront create-distribution \
  --distribution-config file://cf-config.json \
  --region us-east-1
```

#### 2. Get CloudFront Domain Name
```bash
aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='HTTPS proxy for Steno backend'].DomainName" \
  --output text
```

Returns something like: `d1234abcd5678.cloudfront.net`

#### 3. Update CORS_ORIGIN in EB
```bash
aws elasticbeanstalk update-environment \
  --environment-name steno-prod-backend-env \
  --region us-east-1 \
  --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=CORS_ORIGIN,Value=https://ai-demand-letters.vercel.app
```

#### 4. Update Vercel Environment Variable
```bash
NEXT_PUBLIC_API_URL=https://d1234abcd5678.cloudfront.net
```

#### 5. Wait for CloudFront Deployment
CloudFront takes ~15 minutes to deploy globally.

---

## Option D: Temporary Workaround - Disable Mixed Content Blocking

⚠️ **For development/testing only** - not a production solution.

### In Chrome/Edge
1. Click the shield icon in the address bar
2. Click "Load unsafe scripts"

### In Firefox
1. Click the lock icon
2. Click "Disable protection for now"

This is **NOT** a solution - just for testing. Use one of the above options.

---

## Recommended Approach

**If you have a domain**: Use **Option A** (ACM certificate)
- Free SSL certificate
- Auto-renewal
- Professional appearance
- Best performance

**If you DON'T have a domain**: Use **Option C** (CloudFront)
- No domain required
- Free `*.cloudfront.net` subdomain with HTTPS
- Adds CDN caching (bonus)
- Takes ~15 minutes to deploy

**For quick testing only**: Use **Option D** (disable mixed content blocking in browser)

---

## Quick Start: CloudFront Option (No Domain Required)

Since this is the fastest path to HTTPS without buying a domain:

```bash
# 1. Get EB URL
EB_URL=$(aws elasticbeanstalk describe-environments \
  --environment-names steno-prod-backend-env \
  --region us-east-1 \
  --query 'Environments[0].CNAME' \
  --output text)

echo "EB URL: $EB_URL"

# 2. Create CloudFront distribution (simplified)
aws cloudfront create-distribution \
  --origin-domain-name "$EB_URL" \
  --default-root-object "" \
  --comment "Steno Backend HTTPS Proxy" \
  --region us-east-1

# 3. Get CloudFront domain (wait 2 minutes first)
CF_DOMAIN=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='Steno Backend HTTPS Proxy'].DomainName" \
  --output text)

echo "CloudFront URL: https://$CF_DOMAIN"

# 4. Update Vercel env var
echo "Set NEXT_PUBLIC_API_URL=https://$CF_DOMAIN in Vercel"
```

---

## Testing After HTTPS is Enabled

1. **Test HTTPS endpoint**:
   ```bash
   curl https://your-new-url/health
   ```

2. **Update Vercel environment variable**:
   - Change `http://` to `https://` in `NEXT_PUBLIC_API_URL`

3. **Redeploy frontend** to pick up new env var

4. **Test in browser**:
   - Open https://ai-demand-letters.vercel.app
   - Check Network tab - should see `https://` requests
   - No mixed content errors in console

---

## Cost Implications

- **ACM Certificate**: Free
- **EB HTTPS Listener**: Free (already have ALB)
- **CloudFront**: 
  - First 1TB/month data transfer: Free tier eligible
  - After: ~$0.085/GB in US
  - First 10M HTTPS requests: Free tier eligible
  - Typically ~$5-20/month for small apps

---

**Last Updated**: November 17, 2025

