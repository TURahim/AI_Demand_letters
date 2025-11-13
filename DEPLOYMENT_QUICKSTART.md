# Steno AI - Deployment Quick Start Guide

## 🚀 Quick Deploy to AWS

### Prerequisites
- AWS Account with appropriate permissions
- AWS CLI configured (`aws configure`)
- Docker installed
- Node.js 18+ and pnpm installed
- Vercel CLI installed (for frontend): `npm i -g vercel`

### Estimated Time: 30-45 minutes
### Estimated Cost: $45-70/month (development) or $260-360/month (production)

## Option 1: Automated Deployment (Recommended)

```bash
cd deployment
./deploy.sh
```

This will launch an interactive menu where you can:
1. Deploy all infrastructure automatically (option 11)
2. Or deploy step-by-step (options 1-10)

## Option 2: Manual Step-by-Step

### Step 1: Set up AWS Infrastructure (5 minutes)
```bash
cd deployment
./deploy.sh
# Select option 1: Setup VPC and Network
```

This creates:
- VPC with public and private subnets
- NAT Gateway and Internet Gateway
- Security Groups for all services

### Step 2: Set up Database (10-15 minutes)
```bash
# Select option 2: Setup RDS PostgreSQL
```

This creates:
- RDS PostgreSQL instance (Multi-AZ for production)
- Automated backups
- Parameter groups

### Step 3: Set up Redis (5-10 minutes)
```bash
# Select option 3: Setup ElastiCache Redis
```

This creates:
- ElastiCache Redis cluster
- Subnet group in private subnets

### Step 4: Set up S3 Storage (2 minutes)
```bash
# Select option 4: Setup S3 Buckets
```

This creates:
- S3 bucket for document uploads
- S3 bucket for letter exports
- CORS configuration

### Step 5: Set up Secrets Manager (2 minutes)
```bash
# Select option 5: Setup Secrets Manager
```

This stores:
- Database credentials
- JWT secrets
- API keys securely

### Step 6: Deploy Backend (10-15 minutes)
```bash
# Select option 6: Deploy Backend
```

This:
- Builds Docker image
- Pushes to ECR
- Deploys to AWS App Runner
- Configures auto-scaling

### Step 7: Run Database Migrations (2 minutes)
```bash
# Select option 10: Run Database Migrations
```

This:
- Runs Prisma migrations
- Seeds initial data (optional)

### Step 8: Deploy Frontend (5 minutes)
```bash
cd ../frontend

# Option A: Deploy to Vercel (Recommended)
vercel --prod

# Option B: Deploy to AWS Amplify
# (Use deploy script option 7)
```

### Step 9: Configure Domain (Optional, 10 minutes)
```bash
# In deployment menu, select option 9
# Follow prompts to configure:
# - Route53 hosted zone
# - SSL certificate (ACM)
# - CloudFront distribution
```

### Step 10: Set up Monitoring (5 minutes)
```bash
# Select option 8: Setup Monitoring
```

This configures:
- CloudWatch Logs
- CloudWatch Alarms
- SNS notifications

## Verify Deployment

### Check Backend Health
```bash
curl https://your-backend-url/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "database": "connected",
  "redis": "connected"
}
```

### Check Frontend
Visit your frontend URL and verify:
- [ ] Login page loads
- [ ] Can create account
- [ ] Can generate a letter
- [ ] Documents upload successfully

## Important URLs (Save These)

After deployment, you'll have:

1. **Backend API**: 
   - URL in `deployment/config/backend-config.json`
   - Format: `https://xxxxx.us-east-1.awsapprunner.com`

2. **Frontend**: 
   - Vercel: `https://your-app.vercel.app`
   - Or custom domain if configured

3. **Database**: 
   - Endpoint in `deployment/config/rds-config.json`
   - Only accessible from private subnet

4. **Redis**: 
   - Endpoint in `deployment/config/redis-config.json`
   - Only accessible from private subnet

## Environment Variables

### Backend (App Runner)
Environment variables are automatically configured from:
- AWS Secrets Manager
- Configuration files
- IAM role permissions

### Frontend (Vercel)
Set these in Vercel dashboard:
```
NEXT_PUBLIC_API_URL=https://your-backend-url
NEXT_PUBLIC_APP_URL=https://your-app-url
NEXT_PUBLIC_WS_URL=wss://your-backend-url
```

## Troubleshooting

### Backend won't start
1. Check CloudWatch Logs: `/aws/apprunner/steno-prod/`
2. Verify Secrets Manager has all required secrets
3. Check security group rules

### Database connection failed
1. Verify RDS is in "available" state
2. Check security group allows connections from app
3. Verify DATABASE_URL is correct in Secrets Manager

### Redis connection failed
1. Verify ElastiCache status is "available"
2. Check security group rules
3. Verify REDIS_HOST in environment variables

### Frontend can't reach backend
1. Check CORS configuration in backend
2. Verify API URL in frontend environment variables
3. Check App Runner service is running

## Cost Management

### Development (Minimal Resources)
- Use `db.t3.micro` for RDS (~$15/month)
- Use `cache.t3.micro` for Redis (~$12/month)
- App Runner with minimal instances (~$10-30/month)

### Production (Recommended)
- Use `db.t3.medium` with Multi-AZ (~$120/month)
- Use `cache.t3.medium` (~$50/month)
- App Runner with auto-scaling (~$50-150/month)

### Cost Optimization Tips
1. Use AWS Cost Explorer to track spending
2. Set up billing alarms
3. Use Savings Plans for predictable workloads
4. Stop development instances when not in use

## Updating Deployed Application

### Update Backend
```bash
cd deployment
./deploy.sh
# Select option 6: Deploy Backend
```

### Update Frontend
```bash
cd frontend
vercel --prod
```

### Update Database Schema
```bash
cd deployment
./deploy.sh
# Select option 10: Run Database Migrations
```

## Rollback

### Rollback Backend
```bash
cd deployment/scripts
./rollback-backend.sh [previous-image-tag]
```

### Rollback Database
```bash
# Use RDS automated backups
# Or run: ./rollback-migration.sh
```

## Cleanup / Teardown

⚠️ **WARNING**: This will DELETE all infrastructure and data!

```bash
cd deployment
./deploy.sh
# Select option 13: Teardown Infrastructure
# Type 'DELETE' to confirm
```

## Support

- Check deployment logs in `deployment/logs/`
- CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/
- AWS App Runner: https://console.aws.amazon.com/apprunner/

## Security Checklist

Before going to production:
- [ ] Change all default passwords and secrets
- [ ] Enable MFA on AWS root account
- [ ] Review IAM policies
- [ ] Enable AWS GuardDuty
- [ ] Enable AWS Config
- [ ] Set up WAF rules (if using ALB)
- [ ] Configure backup retention
- [ ] Set up disaster recovery plan
- [ ] Review security group rules
- [ ] Enable CloudTrail logging

## Next Steps

1. Configure custom domain
2. Set up CI/CD pipeline (GitHub Actions)
3. Configure monitoring alerts
4. Set up log aggregation
5. Plan disaster recovery
6. Document runbook for incidents

