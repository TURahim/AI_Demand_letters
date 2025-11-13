# Steno AI - AWS Deployment Status

**Last Updated:** November 13, 2025  
**Region:** us-east-1  
**Environment:** Production

## ✅ Completed Infrastructure

### 1. VPC & Networking
- **VPC ID:** `vpc-0b5ff75842342f527` (reused existing)
- **Private Subnets:**
  - `subnet-0fd1ae4a15040a502` (us-east-1a)
  - `subnet-0454ed18175d192cd` (us-east-1b)
- **Security Groups:**
  - RDS SG: `sg-088fcf2f142405cab`
  - Redis SG: `sg-05d5e9142ab4ecdb8`

### 2. RDS PostgreSQL Database
- **Status:** ✅ Available
- **Instance ID:** `steno-prod-db`
- **Instance Class:** `db.t3.micro`
- **Engine:** PostgreSQL 15.14
- **Storage:** 20GB gp3 (encrypted)
- **Multi-AZ:** No
- **Endpoint:** `steno-prod-db.crws0amqe1e3.us-east-1.rds.amazonaws.com:5432`
- **Database:** `steno_prod`
- **Username:** `steno_admin`
- **Password:** `dY4peiWkOwEh4bc2jVVtUWfkT`
- **Backup Retention:** 7 days
- **Cost:** ~$15/month

### 3. ElastiCache Redis
- **Status:** ✅ Available
- **Cluster ID:** `steno-prod-redis`
- **Node Type:** `cache.t3.micro`
- **Engine:** Redis 7.0.7
- **Nodes:** 1 (single node)
- **Endpoint:** `steno-prod-redis.ggng2r.0001.use1.cache.amazonaws.com:6379`
- **Snapshot Retention:** 5 days
- **Cost:** ~$12/month

### 4. S3 Buckets
- **Status:** ✅ Created
- **Documents Bucket:** `steno-prod-docs-971422717446`
- **Exports Bucket:** `steno-prod-exports-971422717446`
- **Features:**
  - Versioning enabled
  - Server-side encryption (AES256)
  - Public access blocked
  - CORS configured
  - Lifecycle policies (IA after 90 days, exports auto-delete after 30 days)
- **Cost:** ~$5-10/month (usage-based)

## 🔐 Environment Variables

Add these to your backend `.env` or AWS Secrets Manager:

```bash
# Database
DATABASE_URL=postgresql://steno_admin:dY4peiWkOwEh4bc2jVVtUWfkT@steno-prod-db.crws0amqe1e3.us-east-1.rds.amazonaws.com:5432/steno_prod?schema=public

# Redis
REDIS_HOST=steno-prod-redis.ggng2r.0001.use1.cache.amazonaws.com
REDIS_PORT=6379

# S3
S3_BUCKET_NAME=steno-prod-docs-971422717446
S3_EXPORTS_BUCKET=steno-prod-exports-971422717446
AWS_REGION=us-east-1

# AWS Credentials (use IAM role when deployed)
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
```

## 📊 Cost Estimate

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| RDS PostgreSQL | db.t3.micro, 20GB | ~$15 |
| ElastiCache Redis | cache.t3.micro | ~$12 |
| S3 | Storage + requests | ~$5-10 |
| **Total** | | **~$32-37** |

*Note: Costs may vary based on actual usage, data transfer, and backups.*

## 🔒 Security Configuration

- ✅ All resources in private subnets
- ✅ Security groups restrict access
- ✅ Encryption at rest enabled
- ✅ Public access blocked on S3
- ✅ Backups configured (7 days RDS, 5 days Redis)
- ⚠️ Database credentials in config files (move to Secrets Manager)

## ⏭️ Next Steps

### 5. AWS Secrets Manager (Pending)
- [ ] Create secret for database credentials
- [ ] Create secret for Redis endpoint
- [ ] Create secret for S3 bucket names
- [ ] Update backend to read from Secrets Manager

### 6. Backend Deployment (Pending)
- [ ] Build Docker image for backend
- [ ] Push to Amazon ECR
- [ ] Deploy to AWS App Runner or ECS Fargate
- [ ] Configure environment variables
- [ ] Set up health checks
- [ ] Configure auto-scaling

### 7. Frontend Deployment (Pending)
- [ ] Deploy to Vercel (recommended) or AWS Amplify
- [ ] Configure environment variables (API URL)
- [ ] Set up custom domain (if applicable)
- [ ] Configure CDN/caching

### 8. Database Migrations (Pending)
- [ ] Run Prisma migrations against production DB
- [ ] Seed initial data (if needed)
- [ ] Verify schema

### 9. Monitoring & CloudWatch (Pending)
- [ ] Set up CloudWatch alarms for RDS
- [ ] Set up CloudWatch alarms for Redis
- [ ] Configure application logs to CloudWatch
- [ ] Set up billing alerts

### 10. Domain & SSL (Pending)
- [ ] Configure Route53 (if using custom domain)
- [ ] Set up SSL certificates via ACM
- [ ] Update DNS records

## 📝 Configuration Files

All infrastructure configuration is saved in:
- `deployment/config/rds-config.json`
- `deployment/config/redis-config.json`
- `deployment/config/s3-config.json`
- `deployment/config/vpc-config.json`

## 🛠️ Useful Commands

### Check RDS Status
```bash
aws rds describe-db-instances --db-instance-identifier steno-prod-db --region us-east-1
```

### Check Redis Status
```bash
aws elasticache describe-cache-clusters --cache-cluster-id steno-prod-redis --show-cache-node-info --region us-east-1
```

### List S3 Buckets
```bash
aws s3 ls | grep steno-prod
```

### Connect to Database (from EC2 or local with VPN)
```bash
psql "postgresql://steno_admin:dY4peiWkOwEh4bc2jVVtUWfkT@steno-prod-db.crws0amqe1e3.us-east-1.rds.amazonaws.com:5432/steno_prod"
```

## 🚨 Important Notes

1. **Database credentials are currently stored in plain text** in config files and this document. For production, move them to AWS Secrets Manager.
2. **The database and Redis are in private subnets** and not publicly accessible. You'll need:
   - A bastion host, or
   - AWS Systems Manager Session Manager, or
   - Deploy your backend first to access them
3. **Backup your credentials** before proceeding - if lost, you'll need to reset the database password.
4. **Cost monitoring:** Set up billing alerts in AWS to track spending.

## 🔄 Teardown Instructions

If you need to delete these resources:

```bash
# Delete RDS (will take 5-10 minutes)
aws rds delete-db-instance --db-instance-identifier steno-prod-db --skip-final-snapshot --region us-east-1

# Delete Redis (will take 2-5 minutes)
aws elasticache delete-cache-cluster --cache-cluster-id steno-prod-redis --region us-east-1

# Empty and delete S3 buckets
aws s3 rm s3://steno-prod-docs-971422717446 --recursive
aws s3 rb s3://steno-prod-docs-971422717446
aws s3 rm s3://steno-prod-exports-971422717446 --recursive
aws s3 rb s3://steno-prod-exports-971422717446
```

---

**Deployment Progress:** 4/10 complete (40%)

