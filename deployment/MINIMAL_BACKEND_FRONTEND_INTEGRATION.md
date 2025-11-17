# Minimal Backend-Frontend Integration Guide

**Goal**: Connect the Vercel-hosted frontend to the Elastic Beanstalk backend with proper CORS configuration.

---

## Current Setup

- **Frontend**: Next.js deployed on Vercel  
  → https://ai-demand-letters.vercel.app

- **Backend**: Node.js/Express deployed on Elastic Beanstalk (production VPC)  
  → https://d1comazpq780af.cloudfront.net (CloudFront HTTPS proxy for `steno-prod-backend-vpc`)

---

## Environment Variables to Configure

### 1. Elastic Beanstalk Environment (`steno-prod-backend-vpc`)

Set the following environment variable to allow CORS requests from the Vercel frontend:

```bash
CORS_ORIGIN=https://ai-demand-letters.vercel.app
```

**How to set it**:
```bash
aws elasticbeanstalk update-environment \
  --environment-name steno-prod-backend-vpc \
  --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=CORS_ORIGIN,Value=https://ai-demand-letters.vercel.app \
  --region us-east-1
```

Or via AWS Console:
1. Go to Elastic Beanstalk → `steno-prod-backend-vpc`
2. Configuration → Software → Environment properties
3. Add: `CORS_ORIGIN` = `https://ai-demand-letters.vercel.app`
4. Click "Apply"

#### Other Required Backend Environment Variables

These should already be set (verify they exist):

- `DATABASE_URL` - PostgreSQL connection string ✓ (already configured)
- `REDIS_HOST` - Redis endpoint ✓ (already configured)
- `REDIS_PORT=6379` ✓
- `JWT_SECRET` - JWT signing secret ✓
- `S3_BUCKET_NAME` - Document storage bucket ✓
- `AWS_REGION=us-east-1` ✓
- `NODE_ENV=production` ✓
- `PORT=3001` ✓

### 2. Vercel Project (Frontend)

Set the following environment variable to point the frontend API client to the HTTPS CloudFront URL:

```bash
NEXT_PUBLIC_API_URL=https://d1comazpq780af.cloudfront.net
```

**How to set it**:

Via Vercel CLI:
```bash
vercel env add NEXT_PUBLIC_API_URL
# When prompted, paste: https://d1comazpq780af.cloudfront.net
# Select: Production, Preview, Development (all environments)
```

Or via Vercel Dashboard:
1. Go to https://vercel.com/dashboard
2. Select your project (`ai-demand-letters`)
3. Settings → Environment Variables
4. Add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://d1comazpq780af.cloudfront.net`
   - **Environments**: Production, Preview, Development
5. Click "Save"

---

## Deployment Steps

### Step 1: Update Backend CORS Configuration

1. **Set the `CORS_ORIGIN` environment variable** in Elastic Beanstalk (see above).

2. **Redeploy the backend** (or trigger an environment restart) so the updated Dockerfile runs Prisma migrations automatically.

3. **Verify backend is running (via CloudFront)**:
   ```bash
   curl https://d1comazpq780af.cloudfront.net/health
   ```
   Expected response:
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-11-17T...",
     "uptime": 123.456,
     "environment": "production"
   }
   ```

### Step 2: Update Frontend API URL

1. **Set the `NEXT_PUBLIC_API_URL` environment variable** in Vercel (see above).

2. **Redeploy the frontend**:
   ```bash
   cd frontend
   git commit -m "Configure production API URL" --allow-empty
   git push origin main
   ```
   - Or trigger a manual redeployment in Vercel Dashboard.

3. **Wait for Vercel deployment** to complete (~1-2 minutes).

---

## Manual Testing Checklist

Once both environments are redeployed:

### ✅ Test 1: Backend Health Check
```bash
curl https://d1comazpq780af.cloudfront.net/health
```
- Expected: `200 OK` with JSON response
- Expected: `{"status":"healthy",...}`

### ✅ Test 2: Backend API Root
```bash
curl https://d1comazpq780af.cloudfront.net/api/v1
```
- Expected: `200 OK` 
- Expected: `{"message":"Steno API","version":"v1","environment":"production"}`

### ✅ Test 3: Frontend Loads
1. Open https://ai-demand-letters.vercel.app in your browser
2. Verify the page loads without errors

### ✅ Test 4: CORS & API Integration
1. Open https://ai-demand-letters.vercel.app
2. Open **Browser DevTools** (F12)
3. Go to **Network** tab
4. Trigger an API call (e.g., try to log in, load documents, or any feature that hits the backend)
5. **Verify**:
   - ✅ Request URL starts with `https://d1comazpq780af.cloudfront.net`
   - ✅ Response status is `200 OK` (or appropriate status for the endpoint)
   - ✅ **No CORS errors** in Console (no messages like "has been blocked by CORS policy")
   - ✅ Response headers include:
     - `access-control-allow-origin: https://ai-demand-letters.vercel.app`
     - `access-control-allow-credentials: true`

### ✅ Test 5: Preflight OPTIONS Request
1. In Network tab, filter by "Fetch/XHR"
2. Look for an `OPTIONS` request to the backend (before the actual GET/POST)
3. **Verify**:
   - Status: `204 No Content` or `200 OK`
   - Response headers include CORS headers

---

## Troubleshooting

### Problem: CORS errors in browser console

**Symptoms**:
```
Access to fetch at 'https://d1comazpq780af.cloudfront.net/...' from origin 'https://ai-demand-letters.vercel.app' 
has been blocked by CORS policy
```

**Solutions**:
1. Verify `CORS_ORIGIN` is set in EB environment:
   ```bash
   aws elasticbeanstalk describe-configuration-settings \
     --environment-name steno-prod-backend-vpc \
     --region us-east-1 \
     --query 'ConfigurationSettings[0].OptionSettings[?OptionName==`CORS_ORIGIN`]'
   ```
2. Ensure the value exactly matches: `https://ai-demand-letters.vercel.app` (no trailing slash)
3. Restart the EB environment if needed
4. Check backend logs for CORS-related errors

### Problem: Frontend still calling localhost

**Symptoms**: Network tab shows requests to `http://localhost:3001`

**Solutions**:
1. Verify `NEXT_PUBLIC_API_URL` is set in Vercel
2. Redeploy the frontend (env vars only take effect after rebuild)
3. Clear browser cache and hard refresh (Ctrl+Shift+R)

### Problem: Backend returns 401 Unauthorized

**Symptoms**: API calls return `401` status

**This is expected** if:
- User is not logged in
- Auth token is missing or expired

**Solutions**:
1. Test with the `/health` or `/api/v1` endpoints first (no auth required)
2. For authenticated endpoints, ensure user is logged in and token is valid
3. Check backend logs for authentication errors

### Problem: Backend returns 500 Internal Server Error

**Symptoms**: API calls return `500` status

**Solutions**:
1. Check EB application logs:
   ```bash
   aws logs tail /aws/elasticbeanstalk/steno-prod-backend-vpc/var/log/eb-engine.log \
     --region us-east-1 \
     --follow
   ```
2. Check for database connection issues (DATABASE_URL)
3. Check for Redis connection issues (REDIS_HOST)
4. Verify all required environment variables are set

---

## Quick Reference Commands

### Check EB Environment Status
```bash
aws elasticbeanstalk describe-environments \
  --environment-names steno-prod-backend-vpc \
  --region us-east-1 \
  --query 'Environments[0].[Status,Health,HealthStatus]'
```

### View EB Environment Variables
```bash
aws elasticbeanstalk describe-configuration-settings \
  --environment-name steno-prod-backend-vpc \
  --region us-east-1 \
  --query 'ConfigurationSettings[0].OptionSettings[?Namespace==`aws:elasticbeanstalk:application:environment`]'
```

### Test Backend from Command Line
```bash
# Health check
curl -i https://d1comazpq780af.cloudfront.net/health

# API root
curl -i https://d1comazpq780af.cloudfront.net/api/v1

# Test CORS preflight
curl -i -X OPTIONS \
  -H "Origin: https://ai-demand-letters.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  https://d1comazpq780af.cloudfront.net/api/v1/auth/login
```

### Check Vercel Deployment Status
```bash
vercel list
```

### View Vercel Environment Variables
```bash
vercel env ls
```

---

## Code Changes Made

### Backend (`backend/src/app.ts`)
```typescript
// Updated CORS configuration to include explicit methods and headers
app.use(
  cors({
    origin: config.cors.origin, // Reads from CORS_ORIGIN env var
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: config.cors.credentials,
  })
);
```

### Frontend (`frontend/src/api/client.ts`)
```typescript
// Already configured to use NEXT_PUBLIC_API_URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
```

---

## Summary

**Minimal changes required**:
1. ✅ Set `CORS_ORIGIN` in EB environment
2. ✅ Set `NEXT_PUBLIC_API_URL` in Vercel project
3. ✅ Redeploy backend (or wait for env var change to take effect)
4. ✅ Redeploy frontend (triggers automatic rebuild with new env var)
5. ✅ Test in browser

**No infrastructure changes needed**:
- ❌ No new AWS resources
- ❌ No VPC changes
- ❌ No HTTPS/domain setup
- ❌ No load balancer configuration
- ❌ No security group changes

**Result**: Frontend and backend are connected and CORS is properly configured for production use.

---

**Last Updated**: November 17, 2025

