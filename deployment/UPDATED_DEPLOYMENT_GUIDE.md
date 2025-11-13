# Steno AI - Updated Deployment Guide
## Using Existing VPC Infrastructure

## ✅ What Changed

The deployment has been updated to **REUSE your existing VPC** instead of creating a new one.

### Existing VPC Details
- **VPC ID:** `vpc-0b5ff75842342f527`
- **VPC Name:** `stenoai-dev-vpc`
- **CIDR Block:** `10.0.0.0/16`
- **Region:** `us-east-1`

### Existing Subnets
- **Private Subnet 1:** `subnet-0fd1ae4a15040a502` (us-east-1a) - `stenoai-dev-subnet-private-1`
- **Private Subnet 2:** `subnet-0454ed18175d192cd` (us-east-1b) - `stenoai-dev-subnet-private-2`

## 🚀 Quick Deployment

All infrastructure will be deployed **inside your existing VPC**.

### Step 1: Setup RDS PostgreSQL (10-15 minutes)
```bash
cd deployment
./scripts/02-setup-rds.sh
```

**What it does:**
- Creates RDS security group in your VPC
- Creates DB subnet group using your private subnets
- Launches PostgreSQL 15.5 instance
- Enables encryption, backups, and CloudWatch logs

**You'll choose:**
- Option 1: `db.t3.micro` ($15/month) - Development
- Option 2: `db.t3.medium` ($120/month) - Production with Multi-AZ

**Output:**
- Database endpoint
- Credentials (saved to `config/rds-config.json`)
- DATABASE_URL connection string

### Step 2: Setup ElastiCache Redis (5-10 minutes)
```bash
./scripts/03-setup-redis.sh
```

**What it does:**
- Creates Redis security group in your VPC
- Creates cache subnet group using your private subnets
- Launches Redis 7.0 cluster
- Enables snapshots and monitoring

**You'll choose:**
- Option 1: `cache.t3.micro` ($12/month) - Development, 1 node
- Option 2: `cache.t3.medium` ($50/month) - Production, 2 nodes

**Output:**
- Redis endpoint
- Port (6379)
- Configuration saved to `config/redis-config.json`

### Step 3: Setup S3 Buckets (2 minutes)
```bash
./scripts/04-setup-s3.sh
```

**What it does:**
- Creates documents bucket: `steno-prod-docs-[account-id]`
- Creates exports bucket: `steno-prod-exports-[account-id]`
- Enables encryption, versioning, CORS
- Sets up lifecycle policies

**Output:**
- Two S3 bucket names
- Bucket URLs
- Configuration saved to `config/s3-config.json`

### Step 4: Setup Secrets Manager (coming next)
```bash
./scripts/05-setup-secrets.sh
```

### Step 5: Deploy Backend (coming next)
```bash
./scripts/06-build-backend.sh
./scripts/07-deploy-backend.sh
```

## 📊 Architecture

```
Existing VPC: vpc-0b5ff75842342f527 (10.0.0.0/16)
│
├─ Private Subnet 1 (us-east-1a)
│  ├─ RDS PostgreSQL (port 5432)
│  ├─ ElastiCache Redis (port 6379)
│  └─ Backend App Runner
│
├─ Private Subnet 2 (us-east-1b)
│  ├─ RDS Standby (if Multi-AZ)
│  └─ Redis Replica (if multi-node)
│
├─ S3 Buckets (not in VPC)
│  ├─ steno-prod-docs-[account]
│  └─ steno-prod-exports-[account]
│
└─ Security Groups
   ├─ steno-prod-rds-sg (allow 5432 from VPC)
   ├─ steno-prod-redis-sg (allow 6379 from VPC)
   └─ steno-prod-app-sg (allow 3001, 3002)
```

## 🔐 Security

### Network Security
- ✅ RDS and Redis in private subnets (no internet access)
- ✅ Security groups allow access only from VPC CIDR (10.0.0.0/16)
- ✅ No public IP addresses on database or cache
- ✅ S3 buckets block all public access

### Data Security
- ✅ RDS encryption at rest enabled
- ✅ S3 encryption at rest (AES-256)
- ✅ RDS automated backups (7-day retention)
- ✅ Redis snapshots enabled
- ✅ SSL/TLS for all connections

### Access Control
- ✅ Database credentials stored in Secrets Manager
- ✅ IAM roles for service access (no hardcoded keys)
- ✅ Security group rules restrict by port and source
- ✅ S3 bucket policies enforce encryption

## 💰 Cost Breakdown

### Development Setup (~$32-40/month)
| Service | Type | Cost/Month |
|---------|------|------------|
| RDS PostgreSQL | db.t3.micro | $15 |
| ElastiCache Redis | cache.t3.micro (1 node) | $12 |
| S3 Storage | ~5GB | $1 |
| S3 Requests | ~10K/month | $1 |
| Data Transfer | ~10GB | $1 |
| CloudWatch Logs | Standard | $2 |
| **Total** | | **~$32/month** |

### Production Setup (~$180-200/month)
| Service | Type | Cost/Month |
|---------|------|------------|
| RDS PostgreSQL | db.t3.medium Multi-AZ | $120 |
| ElastiCache Redis | cache.t3.medium (2 nodes) | $50 |
| S3 Storage | ~20GB | $2 |
| S3 Requests | ~100K/month | $5 |
| Data Transfer | ~50GB | $5 |
| CloudWatch Logs | Enhanced | $5 |
| **Total** | | **~$187/month** |

_Note: Backend App Runner costs will be added later (~$10-150/month depending on traffic)_

## 📋 Configuration Files

After running the scripts, you'll have these config files:

### `config/vpc-config.json`
```json
{
  "VpcId": "vpc-0b5ff75842342f527",
  "PrivateSubnet1Id": "subnet-0fd1ae4a15040a502",
  "PrivateSubnet2Id": "subnet-0454ed18175d192cd",
  "Region": "us-east-1"
}
```

### `config/rds-config.json`
```json
{
  "DBInstanceId": "steno-prod-db",
  "Endpoint": "steno-prod-db.xxxxx.us-east-1.rds.amazonaws.com",
  "Port": 5432,
  "Database": "steno_prod",
  "Username": "steno_admin",
  "Password": "[generated-password]"
}
```

### `config/redis-config.json`
```json
{
  "ClusterId": "steno-prod-redis",
  "Endpoint": "steno-prod-redis.xxxxx.cache.amazonaws.com",
  "Port": 6379
}
```

### `config/s3-config.json`
```json
{
  "DocsBucket": "steno-prod-docs-971422717446",
  "ExportsBucket": "steno-prod-exports-971422717446"
}
```

## 🔄 Environment Variables

After deployment, update your backend `.env` with:

```bash
# From config/rds-config.json
DATABASE_URL=postgresql://steno_admin:[password]@[endpoint]:5432/steno_prod?schema=public

# From config/redis-config.json
REDIS_HOST=[redis-endpoint]
REDIS_PORT=6379

# From config/s3-config.json
S3_BUCKET_NAME=steno-prod-docs-971422717446
S3_EXPORTS_BUCKET=steno-prod-exports-971422717446

# AWS
AWS_REGION=us-east-1
```

## ✅ Verification Steps

### 1. Check RDS Status
```bash
aws rds describe-db-instances \
  --db-instance-identifier steno-prod-db \
  --region us-east-1 \
  --query 'DBInstances[0].DBInstanceStatus'
```

Should return: `"available"`

### 2. Check Redis Status
```bash
aws elasticache describe-cache-clusters \
  --cache-cluster-id steno-prod-redis \
  --region us-east-1 \
  --query 'CacheClusters[0].CacheClusterStatus'
```

Should return: `"available"`

### 3. Check S3 Buckets
```bash
aws s3 ls | grep steno-prod
```

Should show both buckets.

### 4. Test Database Connection (from EC2 in same VPC)
```bash
psql -h [rds-endpoint] -U steno_admin -d steno_prod
```

### 5. Test Redis Connection (from EC2 in same VPC)
```bash
redis-cli -h [redis-endpoint] ping
```

Should return: `PONG`

## 🚨 Troubleshooting

### RDS Connection Fails
1. Check security group allows port 5432 from VPC CIDR
2. Verify you're connecting from within the VPC
3. Check RDS instance status is "available"
4. Verify credentials are correct

### Redis Connection Fails
1. Check security group allows port 6379 from VPC CIDR
2. Verify you're connecting from within the VPC
3. Check Redis cluster status is "available"
4. Ensure you're using the correct endpoint

### S3 Access Denied
1. Verify IAM role has S3 permissions
2. Check bucket policy doesn't block access
3. Ensure using correct bucket name
4. Verify AWS region matches

## 📞 Support

If you encounter issues:

1. **Check CloudWatch Logs:**
   - RDS logs: CloudWatch > Log groups > `/aws/rds/instance/steno-prod-db/`
   - Redis logs: CloudWatch > Log groups > (if enabled)

2. **Check AWS Console:**
   - RDS: https://console.aws.amazon.com/rds/
   - ElastiCache: https://console.aws.amazon.com/elasticache/
   - S3: https://console.aws.amazon.com/s3/

3. **Review Configuration:**
   - Check all files in `deployment/config/`
   - Verify security group rules

## 🎯 Next Steps

After completing steps 1-3 above:

1. ✅ Run database migrations
2. ✅ Deploy backend to App Runner
3. ✅ Deploy frontend to Vercel
4. ✅ Configure monitoring and alerts
5. ✅ Set up domain and SSL

Continue with the deployment guide for these remaining steps!

