# AWS Setup Guide for Steno AI

This guide walks through setting up AWS infrastructure for the Steno AI Demand Letter Generator.

## ✅ Completed Setup

### 1. AWS CLI Configuration
- **Profile**: `steno-dev`
- **Region**: `us-east-1`
- **Account**: `971422717446`
- **User**: `tahmeed.rahim@gmail.com`

Verified with:
```bash
AWS_PROFILE=steno-dev aws sts get-caller-identity
```

### 2. S3 Buckets Created
- **Documents Bucket**: `steno-dev-docs-971422717446`
- **Exports Bucket**: `steno-dev-exports-971422717446`

### 3. Terraform Configuration
- **Working Directory**: `infrastructure/terraform/`
- **State**: Local (for dev)
- **Variables**: `terraform.tfvars` configured

## 📋 Infrastructure Components

### Current Resources (from Terraform plan)
- 12 resources to be created:
  - 2 S3 buckets (documents, letters)
  - 1 KMS key with alias
  - S3 bucket configurations (versioning, encryption, lifecycle)

### Modules
1. **Networking**: VPC, subnets, NAT gateways (placeholder)
2. **Security**: Security groups (placeholder)
3. **Database**: RDS PostgreSQL (placeholder)
4. **Storage**: S3 buckets ✅
5. **KMS**: Encryption keys ✅
6. **Secrets**: AWS Secrets Manager (placeholder)
7. **Lambda**: Serverless functions (placeholder)
8. **API Gateway**: REST API (placeholder)
9. **CloudWatch**: Monitoring (placeholder)

## 🚀 Quick Start

### Initialize Terraform
```bash
cd infrastructure/terraform
make init
```

### Preview Changes
```bash
make plan
```

### Apply Infrastructure (when ready)
```bash
make apply
```

### Destroy Everything (careful!)
```bash
make destroy
```

## 🔧 Makefile Commands

```bash
make help            # Show all available commands
make init            # Initialize Terraform
make validate        # Validate configuration
make fmt             # Format Terraform files
make plan            # Run plan (non-destructive)
make apply           # Apply changes (interactive)
make destroy         # Destroy all resources (requires confirmation)
make show            # Show current state
make output          # Show outputs
make safety-check    # Verify AWS credentials and settings
make clean           # Clean up Terraform files
```

## 🔐 Backend Environment Variables

Update `backend/.env` with these values:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=steno-dev

# S3 Buckets
S3_BUCKET_NAME=steno-dev-docs-971422717446

# AWS Bedrock (for PR-04)
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_MAX_TOKENS=4096
BEDROCK_TEMPERATURE=0.7

# KMS (will be available after terraform apply)
KMS_KEY_ID=<from-terraform-output>
```

## 📊 Cost Estimates

### Current Resources (dev environment)
- **S3 Storage**: ~$0.023/GB/month (first 50 TB)
- **KMS Keys**: $1/month per key
- **Data Transfer**: First 100 GB free/month

### Future Resources (when deployed)
- **RDS db.t3.micro**: ~$15/month (20 GB storage)
- **Lambda**: Free tier (1M requests/month)
- **API Gateway**: $3.50/million requests
- **Bedrock (Claude 3.5 Sonnet)**: 
  - Input: $3.00 per million tokens
  - Output: $15.00 per million tokens

**Estimated Monthly Cost (dev)**: ~$20-30/month

## 🔒 Security Best Practices

### ✅ Implemented
- KMS encryption for S3 buckets
- IAM least privilege principle
- Secrets Manager for sensitive data
- VPC isolation (planned)

### 🔜 To Implement (PR-01 completion)
- Enable CloudWatch logging
- Configure backup policies
- Set up CloudTrail auditing
- Enable AWS Config rules
- Implement network ACLs

## 📝 Next Steps

### For PR-04 (AI Service Integration)
1. Enable Bedrock model access:
   ```bash
   aws bedrock list-foundation-models --region us-east-1 --profile steno-dev
   ```

2. Test Bedrock access:
   ```bash
   aws bedrock-runtime invoke-model \
     --model-id anthropic.claude-3-5-sonnet-20241022-v2:0 \
     --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":100,"messages":[{"role":"user","content":[{"type":"text","text":"Hello"}]}]}' \
     --cli-binary-format raw-in-base64-out \
     --profile steno-dev \
     output.json
   ```

### For Production
1. Set up S3 backend for Terraform state:
   ```hcl
   backend "s3" {
     bucket         = "steno-terraform-state"
     key            = "steno/terraform.tfstate"
     region         = "us-east-1"
     dynamodb_table = "steno-terraform-locks"
     encrypt        = true
   }
   ```

2. Enable multi-region replication for S3
3. Configure RDS automated backups
4. Set up Route 53 for custom domain
5. Enable WAF for API Gateway

## 🐛 Troubleshooting

### AWS CLI not authenticated
```bash
# Verify credentials
aws sts get-caller-identity --profile steno-dev

# Re-configure if needed
aws configure --profile steno-dev
```

### Terraform state issues
```bash
# Refresh state
make refresh

# View state
make show

# List resources
make state-list
```

### S3 bucket already exists
```bash
# Check if bucket exists
aws s3 ls --profile steno-dev | grep steno

# Import existing bucket into state (if needed)
terraform import module.storage.aws_s3_bucket.documents steno-dev-docs-971422717446
```

## 📚 Resources

- [AWS CLI Documentation](https://docs.aws.amazon.com/cli/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)

---

**Last Updated**: November 11, 2025  
**Maintained by**: DevTeam

