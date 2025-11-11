# Steno Infrastructure - Terraform

This directory contains Terraform configurations for deploying Steno AI to AWS.

## 📋 Overview

The infrastructure is organized into reusable modules:

- `networking` - VPC, subnets, internet gateway, NAT gateway
- `security` - Security groups, IAM roles & policies
- `database` - RDS PostgreSQL instance
- `storage` - S3 buckets for documents and letters
- `kms` - KMS keys for encryption
- `secrets` - Secrets Manager for sensitive configuration
- `lambda` - Lambda functions for API endpoints
- `api_gateway` - API Gateway configuration
- `cloudwatch` - Monitoring, logging, alarms

## 🚀 Quick Start

### Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform 1.5+ installed
- Access to AWS account with admin permissions

### Initial Setup

1. **Copy example variables:**

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

2. **Initialize Terraform:**

```bash
terraform init
```

3. **Review plan:**

```bash
terraform plan
```

4. **Apply infrastructure:**

```bash
terraform apply
```

## 🏗️ Architecture

### Serverless Deployment

The application runs on AWS Lambda with API Gateway, providing:
- Auto-scaling
- Pay-per-use pricing
- High availability
- Minimal operational overhead

### Network Architecture

- VPC with public and private subnets across multiple AZs
- NAT Gateway for outbound internet access from private subnets
- VPC endpoints for AWS services (S3, Secrets Manager, etc.)

### Security

- All data encrypted at rest (S3, RDS, EBS)
- Data encrypted in transit (TLS/SSL)
- Secrets stored in AWS Secrets Manager
- KMS keys for field-level encryption
- Security groups with minimal access
- IAM roles following least privilege principle

### Database

- RDS PostgreSQL 16 in private subnet
- Multi-AZ for high availability (production)
- Automated backups with point-in-time recovery
- Read replicas for scaling (production)

## 📁 Directory Structure

```
terraform/
├── main.tf                  # Main configuration
├── variables.tf             # Variable definitions
├── outputs.tf              # Output values
├── terraform.tfvars.example # Example variables
├── modules/                # Reusable modules
│   ├── networking/
│   ├── security/
│   ├── database/
│   ├── storage/
│   ├── kms/
│   ├── secrets/
│   ├── lambda/
│   ├── api_gateway/
│   └── cloudwatch/
└── environments/           # Environment-specific configs
    ├── dev/
    ├── staging/
    └── prod/
```

## 🔧 Environments

### Development

```bash
cd environments/dev
terraform init
terraform apply
```

### Staging

```bash
cd environments/staging
terraform init
terraform apply
```

### Production

```bash
cd environments/prod
terraform init
terraform apply
```

## 📊 Cost Estimation

### Development Environment

- Lambda: ~$10-20/month (based on usage)
- RDS (t3.micro): ~$15-20/month
- S3: ~$5-10/month
- Other services: ~$10-15/month
- **Total: ~$40-65/month**

### Production Environment

- Lambda (with provisioned concurrency): ~$100-200/month
- RDS (db.r6g.large, Multi-AZ): ~$300-400/month
- S3: ~$20-50/month
- CloudFront: ~$20-50/month
- Other services: ~$50-100/month
- **Total: ~$490-800/month**

## 🔒 Security Best Practices

1. **State Management:**
   - Store Terraform state in S3 with encryption
   - Use DynamoDB for state locking
   - Never commit state files to git

2. **Secrets:**
   - Never hardcode secrets in Terraform files
   - Use AWS Secrets Manager
   - Reference secrets via data sources

3. **Access Control:**
   - Use IAM roles instead of access keys where possible
   - Implement least privilege principle
   - Enable MFA for production access

## 🚨 Troubleshooting

### Common Issues

**Issue:** `Error: Bucket already exists`
- **Solution:** S3 bucket names must be globally unique. Change bucket name in variables.

**Issue:** `Error: insufficient IAM permissions`
- **Solution:** Ensure your AWS credentials have admin permissions or required policies.

**Issue:** `Error: Resource already exists`
- **Solution:** Import existing resources or destroy and recreate.

## 📚 Resources

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

## 🔄 Updates and Maintenance

### Applying Updates

```bash
# Pull latest changes
git pull

# Review changes
terraform plan

# Apply changes
terraform apply
```

### Destroying Resources

**⚠️ WARNING:** This will destroy all resources. Use with caution!

```bash
terraform destroy
```

## 📞 Support

For infrastructure issues, contact:
- DevOps Team: devops@steno.ai
- Slack: #steno-infra

