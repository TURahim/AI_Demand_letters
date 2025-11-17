# AWS Infrastructure Summary - Steno AI

**Last Updated**: November 17, 2025  
**Region**: `us-east-1`  
**Account ID**: `971422717446`

---

## 🌐 VPC Configuration

### Production VPC
- **VPC ID**: `vpc-0b5ff75842342f527`
- **Name**: `stenoai-dev-vpc`
- **CIDR Block**: `10.0.0.0/16`
- **DNS Hostnames**: Enabled
- **DNS Resolution**: Enabled

---

## 🔗 Subnets

### Private Subnets (RDS, Redis, App Runner VPC Connector)
| Subnet ID | Name | AZ | CIDR | Auto-assign Public IP |
|-----------|------|----|----- |----------------------|
| `subnet-0fd1ae4a15040a502` | `stenoai-dev-subnet-private-1` | `us-east-1a` | `10.0.1.0/24` | No |
| `subnet-0454ed18175d192cd` | `stenoai-dev-subnet-private-2` | `us-east-1b` | `10.0.2.0/24` | No |

### Public Subnets (Elastic Beanstalk Load Balancer / NAT)
| Subnet ID | Name | AZ | CIDR | Auto-assign Public IP |
|-----------|------|----|----- |----------------------|
| `subnet-0d49a3d5e922be7be` | `steno-prod-public-1` | `us-east-1a` | `10.0.101.0/24` | Yes |
| `subnet-07d397d5e58d74d1b` | `steno-prod-public-2` | `us-east-1b` | `10.0.102.0/24` | Yes |

---

## 🛡️ Security Groups

| Security Group ID | Name | Purpose | Attached To |
|------------------|------|---------|-------------|
| `sg-088fcf2f142405cab` | `steno-prod-rds-sg` | RDS PostgreSQL access | RDS instance |
| `sg-05d5e9142ab4ecdb8` | `steno-prod-redis-sg` | Redis access | ElastiCache |
| `sg-04f4621044673ebb6` | `steno-prod-apprunner-sg` | App Runner VPC Connector | App Runner |
| `sg-0cc060f2894d1c174` | `steno-eb-backend-sg` | Elastic Beanstalk instances | EB environments |
| `sg-0f6f191f4a71f53f8` | `steno-prod-alb-sg` | Elastic Beanstalk ALB | EB load balancer |
| `sg-0617a5fcc3de041c8` | `stenoai-dev-sg-rds` | (Legacy RDS SG) | N/A |
| `sg-019dace16d1d8a403` | `stenoai-dev-sg-lambda` | Lambda functions | Lambda |

### Security Group Rules

#### RDS Security Group (`sg-088fcf2f142405cab`)
**Ingress (PostgreSQL port 5432)**:
- From App Runner SG: `sg-04f4621044673ebb6` ✅
- From VPC CIDR: `10.0.0.0/16` ✅
- From EB Backend SG: `sg-0cc060f2894d1c174` ✅

#### Redis Security Group (`sg-05d5e9142ab4ecdb8`)
**Ingress (Redis port 6379)**:
- From App Runner SG: `sg-04f4621044673ebb6` ✅
- From VPC CIDR: `10.0.0.0/16` ✅ (covers EB instances)

---

## 🗄️ RDS PostgreSQL

- **Instance ID**: `steno-prod-db`
- **Endpoint**: `steno-prod-db.crws0amqe1e3.us-east-1.rds.amazonaws.com`
- **Port**: `5432`
- **Instance Class**: `db.t3.micro`
- **Multi-AZ**: No (single AZ deployment)
- **Security Group**: `sg-088fcf2f142405cab`
- **Subnet Group**: `steno-prod-db-subnet-group`
- **Subnets Used**: Private subnets in `us-east-1a` and `us-east-1b`
- **Database Name**: `steno_prod`
- **Master Username**: `steno_admin`

---

## 🔴 ElastiCache Redis

- **Cluster ID**: `steno-prod-redis`
- **Endpoint**: `steno-prod-redis.ggng2r.0001.use1.cache.amazonaws.com` (from config files)
- **Port**: `6379`
- **Node Type**: `cache.t3.micro`
- **Security Group**: `sg-05d5e9142ab4ecdb8`
- **Subnet Group**: `steno-prod-redis-subnet-group`
- **Subnets Used**: Private subnets in `us-east-1a` and `us-east-1b`

---

## 📦 S3 Buckets

| Bucket Name | Purpose | Region |
|-------------|---------|--------|
| `steno-prod-docs-971422717446` | Production document storage | `us-east-1` |
| `steno-prod-exports-971422717446` | Production exports | `us-east-1` |
| `stenoai-dev-uploads` | Development uploads | `us-east-1` |
| `stenoai-dev-exports` | Development exports | `us-east-1` |
| `steno-dev-docs-971422717446` | Development documents | `us-east-1` |
| `steno-dev-exports-971422717446` | Development exports | `us-east-1` |

---

## 🚀 Current Deployments

### Elastic Beanstalk (Production - VPC)
- **Application**: `steno-prod-backend`
- **Environment**: `steno-prod-backend-vpc`
- **URL**: `http://steno-prod-backend-vpc.eba-exhpmgyi.us-east-1.elasticbeanstalk.com`
- **HTTPS**: `https://d1comazpq780af.cloudfront.net` (CloudFront proxy)
- **Status**: ✅ Running (Green health)
- **Platform**: Docker on Amazon Linux 2
- **VPC**: `vpc-0b5ff75842342f527`
- **Subnets**: Private (`subnet-0fd1ae4a15040a502`, `subnet-0454ed18175d192cd`), Public (`subnet-0d49a3d5e922be7be`, `subnet-07d397d5e58d74d1b`) for ALB/NAT
- **Instance Security Group**: `sg-0cc060f2894d1c174`
- **ALB Security Group**: `sg-0f6f191f4a71f53f8`
- **Current Version**: `vpc-migrate-20251116224320`
- **Deployed**: November 17, 2025

### Elastic Beanstalk (Legacy - Public Internet)
- **Environment**: `steno-prod-backend-env`
- **Status**: ✅ Running but outside production VPC (cannot reach RDS/Redis)
- **Note**: Keep until VPC-backed environment is fully verified, then terminate.

### AWS App Runner (Alternative/Legacy)
- **Service**: `steno-backend-v3`
- **URL**: `https://gyf3j2x7cp.us-east-1.awsapprunner.com`
- **VPC Connector**: `steno-prod-vpc-connector`
- **VPC Connector ARN**: `arn:aws:apprunner:us-east-1:971422717446:vpcconnector/steno-prod-vpc-connector/1/2092b79550e8418488bc62ebbe98d19c`
- **Status**: (check current status)

---

## 🔧 Infrastructure as Code

### Terraform Modules
Located in `infrastructure/terraform/`:
- **networking**: VPC, subnets, route tables, NAT gateway
- **security**: Security groups for Lambda, RDS, and application
- **database**: RDS PostgreSQL module
- **storage**: S3 buckets for documents and exports
- **kms**: KMS encryption keys
- **secrets**: AWS Secrets Manager configuration
- **lambda**: Lambda function deployment (legacy)
- **api_gateway**: API Gateway (legacy)
- **cloudwatch**: Monitoring and logging

**Note**: Current production infrastructure (RDS, Redis, EB) was deployed via bash scripts in `deployment/scripts/`, not Terraform. Terraform modules appear to be for a legacy Lambda-based architecture.

### Deployment Scripts
Located in `deployment/scripts/`:
- `02-setup-rds.sh` - RDS creation
- `03-setup-redis.sh` - Redis cluster creation
- `04-setup-s3.sh` - S3 bucket creation
- `10-setup-vpc-connector.sh` - App Runner VPC connector
- `14-deploy-prod-backend.sh` - Backend deployment to App Runner

---

## 🔐 Secrets & Configuration

### AWS Secrets Manager
- Secrets prefix: `steno/prod/`
- Stored credentials:
  - Database connection string
  - Redis endpoint
  - JWT secrets
  - AWS access keys (for SDK access)
  - S3 bucket names

### Environment Variables (Backend)
- `NODE_ENV=production`
- `PORT=3001`
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST` - Redis endpoint
- `REDIS_PORT=6379`
- `S3_BUCKET_NAME` - Document storage bucket
- `AWS_REGION=us-east-1`
- `CORS_ORIGIN` - Frontend URL
- `WEBSOCKET_ENABLED=false` (in production)

---

## 📋 Resources to Reuse for New EB Environment

### Required for EB Deployment
1. **VPC**: `vpc-0b5ff75842342f527` ✅
2. **Private Subnets**: `subnet-0fd1ae4a15040a502`, `subnet-0454ed18175d192cd` ✅
3. **Public Subnets**: `subnet-09f3119b50b6eff2f` (need 2nd subnet in us-east-1b) ⚠️
4. **RDS Security Group**: `sg-088fcf2f142405cab` ✅
5. **Redis Security Group**: `sg-05d5e9142ab4ecdb8` (needs EB SG rule) ⚠️
6. **EB Security Group**: `sg-0cc060f2894d1c174` ✅
7. **RDS Instance**: `steno-prod-db` ✅
8. **Redis Cluster**: `steno-prod-redis` ✅
9. **S3 Buckets**: Production buckets already exist ✅

### Action Items Before Full EB Deployment
1. ✅ **Create second public subnet** in `us-east-1b` (completed by script `01b-add-public-subnets.sh`)
2. ✅ **Allow EB instances to access Redis** (covered via VPC CIDR + App Runner SG)
3. ✅ **Update backend CORS_ORIGIN** to include Vercel origin
4. ✅ **Configure EB environment variables** (DATABASE_URL, REDIS_HOST, etc.)
5. ⏳ **Set up CloudWatch alarms** for EB environment health
6. ✅ **Expose HTTPS endpoint** via CloudFront (`https://d1comazpq780af.cloudfront.net`)

---

## 🔗 Related Documentation

- `deployment/DEPLOYMENT_STATUS_LATEST.md` - Latest App Runner deployment status
- `deployment/FINAL_STATUS.md` - App Runner deployment history
- `deployment/config/vpc-config.json` - VPC configuration details
- `deployment/config/rds-config.json` - RDS connection details
- `deployment/config/redis-config.json` - Redis connection details
- `infrastructure/terraform/` - Terraform IaC (legacy architecture)

---

## 📊 Network Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ VPC: vpc-0b5ff75842342f527 (10.0.0.0/16)                       │
│                                                                  │
│  ┌────────────────────────┐  ┌────────────────────────┐        │
│  │ Public Subnet (us-1a)  │  │ Public Subnet (us-1b)  │        │
│  │ subnet-09f3119b50b6... │  │ [TO BE CREATED]        │        │
│  │ 10.0.0.0/24            │  │ 10.0.101.0/24          │        │
│  │                        │  │                        │        │
│  │ ┌──────────────────┐   │  │                        │        │
│  │ │ EB Load Balancer │   │  │                        │        │
│  │ └──────────────────┘   │  │                        │        │
│  └────────────────────────┘  └────────────────────────┘        │
│            │                           │                        │
│            │ Internet Gateway          │                        │
│            └───────────────────────────┘                        │
│                         │                                       │
│  ┌────────────────────────┐  ┌────────────────────────┐        │
│  │ Private Subnet (us-1a) │  │ Private Subnet (us-1b) │        │
│  │ subnet-0fd1ae4a1...    │  │ subnet-0454ed181...    │        │
│  │ 10.0.1.0/24            │  │ 10.0.2.0/24            │        │
│  │                        │  │                        │        │
│  │ ┌──────────────────┐   │  │ ┌──────────────────┐   │        │
│  │ │ EB Instances     │   │  │ │ RDS PostgreSQL   │   │        │
│  │ │ (sg-0cc060f...)  │   │  │ │ (sg-088fcf2f...) │   │        │
│  │ └──────────────────┘   │  │ └──────────────────┘   │        │
│  │                        │  │                        │        │
│  │ ┌──────────────────┐   │  │ ┌──────────────────┐   │        │
│  │ │ App Runner Conn. │   │  │ │ Redis Cluster    │   │        │
│  │ │ (sg-04f4621...)  │   │  │ │ (sg-05d5e9142...)│   │        │
│  │ └──────────────────┘   │  │ └──────────────────┘   │        │
│  └────────────────────────┘  └────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

**Generated from live AWS resources and deployment configuration files**

