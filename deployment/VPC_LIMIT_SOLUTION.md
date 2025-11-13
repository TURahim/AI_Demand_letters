# VPC Limit Reached - Solution Guide

## Current Situation

Your AWS account has reached the VPC limit (15 VPCs maximum). However, you already have an existing **`stenoai-dev-vpc`** that we can reuse for this deployment!

## Existing Resources

**VPC ID:** `vpc-0b5ff75842342f527`
**Name:** `stenoai-dev-vpc`
**CIDR:** `10.0.0.0/16`

**Existing Subnets:**
- `subnet-0fd1ae4a15040a502` - Private Subnet 1 (us-east-1a) - 10.0.1.0/24
- `subnet-0454ed18175d192cd` - Private Subnet 2 (us-east-1b) - 10.0.2.0/24

## Recommended Solution: Reuse Existing VPC

Since you already have a Steno VPC, we'll reuse it and add the missing components (public subnets, NAT gateway, etc.).

### Option 1: Add Missing Components (RECOMMENDED)

Run this script to add public subnets and networking to your existing VPC:

```bash
cd deployment
chmod +x scripts/01b-add-public-subnets.sh
./scripts/01b-add-public-subnets.sh
```

This will add:
- 2 public subnets (10.0.101.0/24, 10.0.102.0/24)
- Internet Gateway
- NAT Gateway for private subnet internet access
- Public route table
- Security groups for ALB, App, RDS, Redis

**Time:** 5-10 minutes  
**Cost:** ~$32/month for NAT Gateway

### Option 2: Use Existing VPC As-Is (Budget Option)

If you want to save costs by avoiding NAT Gateway:

1. Deploy services directly in private subnets
2. Use VPC Endpoints for AWS services
3. Use bastion host for access (if needed)

**Time:** Immediate  
**Cost:** $0 additional (saves $32/month)

### Option 3: Delete an Unused VPC

If you want a completely fresh setup and have unused VPCs:

1. Identify unused VPCs:
```bash
aws ec2 describe-vpcs --region us-east-1 \
  --query 'Vpcs[*].[VpcId,Tags[?Key==`Name`].Value|[0]]' \
  --output table
```

2. Delete an unused VPC:
```bash
# First, delete all resources in the VPC:
# - NAT Gateways
# - Internet Gateways  
# - Subnets
# - Route tables
# - Security groups
# - Then delete the VPC

aws ec2 delete-vpc --vpc-id <vpc-id> --region us-east-1
```

3. Run the full deployment:
```bash
cd deployment
./deploy.sh
# Select option 1: Setup VPC
```

### Option 4: Request VPC Limit Increase

Request a limit increase from AWS Support:

1. Go to AWS Service Quotas console
2. Search for "VPC"
3. Request increase to 20 or 25 VPCs
4. Usually approved within 24 hours

## Quick Start (Using Existing VPC)

Here's the fastest path to deployment:

```bash
cd deployment

# 1. Add public subnets to existing VPC
./scripts/01b-add-public-subnets.sh

# 2. Setup RDS database
./scripts/02-setup-rds.sh

# 3. Setup Redis cache
./scripts/03-setup-redis.sh

# 4. Setup S3 buckets
./scripts/04-setup-s3.sh

# 5. Setup Secrets Manager
./scripts/05-setup-secrets.sh

# 6. Build and deploy backend
./scripts/06-build-backend.sh
./scripts/07-deploy-backend.sh

# 7. Run database migrations
./scripts/09-run-migrations.sh

# 8. Deploy frontend
cd ../frontend
vercel --prod
```

## What We'll Build

```
Internet
    │
    ├─→ Public Subnet 1 (10.0.101.0/24)
    │   ├─→ NAT Gateway
    │   └─→ Internet Gateway
    │
    ├─→ Public Subnet 2 (10.0.102.0/24)
    │   └─→ Load Balancer (optional)
    │
    ├─→ Private Subnet 1 (10.0.1.0/24) [EXISTS]
    │   ├─→ Backend (App Runner)
    │   ├─→ RDS PostgreSQL
    │   └─→ ElastiCache Redis
    │
    └─→ Private Subnet 2 (10.0.2.0/24) [EXISTS]
        ├─→ RDS Standby (Multi-AZ)
        └─→ Redis Replica
```

## Cost Comparison

### With NAT Gateway (Full Setup)
- NAT Gateway: ~$32/month
- RDS db.t3.micro: ~$15/month
- Redis cache.t3.micro: ~$12/month
- App Runner: ~$10-30/month
- **Total: ~$70-90/month**

### Without NAT Gateway (Budget Setup)
- RDS db.t3.micro: ~$15/month
- Redis cache.t3.micro: ~$12/month
- App Runner: ~$10-30/month
- VPC Endpoints: ~$7/month
- **Total: ~$45-65/month**

## Next Steps

1. **Choose your option above**
2. **Run the corresponding commands**
3. **Continue with the deployment guide**

For questions or issues, check:
- `deployment/README.md` - Full deployment guide
- `DEPLOYMENT_QUICKSTART.md` - Quick start guide
- CloudWatch Logs for troubleshooting

## Manual VPC Configuration (if scripts fail)

If the automated scripts have issues, you can manually configure through AWS Console:

1. **Add Public Subnets:**
   - VPC Dashboard → Subnets → Create subnet
   - Select `stenoai-dev-vpc`
   - CIDR: 10.0.101.0/24 (AZ: us-east-1a)
   - CIDR: 10.0.102.0/24 (AZ: us-east-1b)
   - Enable auto-assign public IPv4

2. **Create Internet Gateway:**
   - VPC Dashboard → Internet Gateways → Create
   - Attach to `stenoai-dev-vpc`

3. **Create NAT Gateway:**
   - VPC Dashboard → NAT Gateways → Create
   - Select public subnet
   - Allocate Elastic IP

4. **Update Route Tables:**
   - Public subnets → route 0.0.0.0/0 to Internet Gateway
   - Private subnets → route 0.0.0.0/0 to NAT Gateway

5. **Create Security Groups:**
   - ALB-SG: Allow 80, 443 from 0.0.0.0/0
   - App-SG: Allow 3001, 3002 from ALB-SG
   - RDS-SG: Allow 5432 from App-SG
   - Redis-SG: Allow 6379 from App-SG

