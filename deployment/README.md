# Steno AI - AWS Deployment Guide

## Architecture Overview

### Infrastructure Components

**Frontend:**
- Vercel (recommended) or AWS Amplify
- CloudFront CDN
- Route53 DNS

**Backend:**
- AWS App Runner (containerized Node.js app)
- Application Load Balancer (ALB)
- Auto-scaling enabled

**Database:**
- RDS PostgreSQL (Multi-AZ for production)
- Automated backups
- Read replicas (optional)

**Cache & Queue:**
- ElastiCache Redis (cluster mode)
- BullMQ for job processing

**Storage:**
- S3 buckets for documents and exports
- CloudFront for S3 delivery

**AI/ML:**
- AWS Bedrock (Claude 3.5 Sonnet)
- AWS Textract for OCR

**Security:**
- AWS Secrets Manager for credentials
- KMS for encryption
- VPC with private subnets
- Security Groups
- IAM roles with least privilege

**Monitoring:**
- CloudWatch Logs
- CloudWatch Metrics
- CloudWatch Alarms
- X-Ray for distributed tracing

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Docker installed (for building backend image)
3. Node.js 18+ and pnpm
4. Domain name registered (optional but recommended)

## Environment Variables

### Production Environment Variables
See `backend.env.production.example` for required variables.

### Secrets in AWS Secrets Manager
- Database credentials
- JWT secrets
- AWS access keys
- API keys

## Deployment Steps

### 1. Infrastructure Setup
```bash
cd deployment
./scripts/01-setup-vpc.sh
./scripts/02-setup-rds.sh
./scripts/03-setup-redis.sh
./scripts/04-setup-s3.sh
./scripts/05-setup-secrets.sh
```

### 2. Backend Deployment
```bash
./scripts/06-build-backend.sh
./scripts/07-deploy-backend.sh
```

### 3. Frontend Deployment
```bash
cd ../frontend
vercel --prod
# OR
./scripts/08-deploy-frontend-amplify.sh
```

### 4. Database Migration
```bash
./scripts/09-run-migrations.sh
```

### 5. Monitoring Setup
```bash
./scripts/10-setup-monitoring.sh
```

## Estimated Monthly Costs

**Development Environment:**
- RDS PostgreSQL (db.t3.micro): ~$15
- ElastiCache Redis (cache.t3.micro): ~$12
- App Runner: ~$10-30 (pay per use)
- S3 + data transfer: ~$5
- **Total: ~$45-70/month**

**Production Environment:**
- RDS PostgreSQL (db.t3.medium, Multi-AZ): ~$120
- ElastiCache Redis (cache.t3.medium): ~$50
- App Runner (with auto-scaling): ~$50-150
- S3 + CloudFront: ~$20
- ALB: ~$20
- **Total: ~$260-360/month**

## Rollback Strategy

```bash
# Rollback backend deployment
./scripts/rollback-backend.sh [version]

# Rollback database migration
./scripts/rollback-migration.sh
```

## Security Checklist

- [ ] All secrets stored in AWS Secrets Manager
- [ ] Database in private subnet
- [ ] Redis in private subnet
- [ ] Security groups properly configured
- [ ] IAM roles follow least privilege
- [ ] SSL/TLS enabled everywhere
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] CloudWatch alarms configured
- [ ] Backup retention policy set

## Support

For deployment issues, check:
1. CloudWatch Logs
2. App Runner logs
3. RDS performance insights
4. Redis metrics

