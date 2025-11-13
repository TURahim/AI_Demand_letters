#!/bin/bash

# Check for existing Steno VPC and offer to reuse it

set -e

REGION="us-east-1"
PROJECT_NAME="steno-prod"

echo "🔍 Checking for existing Steno VPC..."

# Check for existing stenoai VPC
EXISTING_VPC=$(aws ec2 describe-vpcs \
  --region $REGION \
  --filters "Name=tag:Name,Values=stenoai-*" \
  --query 'Vpcs[0].VpcId' \
  --output text 2>/dev/null || echo "None")

if [ "$EXISTING_VPC" != "None" ]; then
    echo ""
    echo "✅ Found existing Steno VPC: $EXISTING_VPC"
    
    # Get VPC details
    VPC_NAME=$(aws ec2 describe-vpcs \
      --vpc-ids $EXISTING_VPC \
      --region $REGION \
      --query 'Vpcs[0].Tags[?Key==`Name`].Value|[0]' \
      --output text)
    
    VPC_CIDR=$(aws ec2 describe-vpcs \
      --vpc-ids $EXISTING_VPC \
      --region $REGION \
      --query 'Vpcs[0].CidrBlock' \
      --output text)
    
    echo "  Name: $VPC_NAME"
    echo "  CIDR: $VPC_CIDR"
    echo ""
    
    # Get subnets
    echo "📍 Subnets:"
    aws ec2 describe-subnets \
      --region $REGION \
      --filters "Name=vpc-id,Values=$EXISTING_VPC" \
      --query 'Subnets[*].[SubnetId,CidrBlock,AvailabilityZone,Tags[?Key==`Name`].Value|[0]]' \
      --output table
    
    echo ""
    echo "Options:"
    echo "  1. Reuse existing VPC (recommended if suitable)"
    echo "  2. Create new VPC (requires deleting an old VPC first)"
    echo "  3. Cancel"
    echo ""
    read -p "Select option (1-3): " choice
    
    case $choice in
        1)
            echo "✅ Will reuse existing VPC: $EXISTING_VPC"
            
            # Check if we need to create public subnets
            PUBLIC_SUBNETS=$(aws ec2 describe-subnets \
              --region $REGION \
              --filters "Name=vpc-id,Values=$EXISTING_VPC" "Name=tag:Type,Values=public" \
              --query 'Subnets[*].SubnetId' \
              --output text)
            
            if [ -z "$PUBLIC_SUBNETS" ]; then
                echo "⚠️  No public subnets found. You'll need to add them."
                echo ""
                read -p "Create public subnets now? (y/n): " create_public
                
                if [[ $create_public =~ ^[Yy]$ ]]; then
                    # Add public subnet creation logic here
                    echo "Creating public subnets..."
                    # This will be handled by a separate script
                fi
            fi
            
            # Save configuration
            mkdir -p ../config
            
            # Get all subnet IDs
            PRIVATE_SUBNETS=($(aws ec2 describe-subnets \
              --region $REGION \
              --filters "Name=vpc-id,Values=$EXISTING_VPC" "Name=tag:Name,Values=*private*" \
              --query 'Subnets[*].SubnetId' \
              --output text))
            
            PUBLIC_SUBNETS=($(aws ec2 describe-subnets \
              --region $REGION \
              --filters "Name=vpc-id,Values=$EXISTING_VPC" "Name=tag:Name,Values=*public*" \
              --query 'Subnets[*].SubnetId' \
              --output text))
            
            # Get or create security groups
            echo "Checking security groups..."
            
            # Check for existing security groups or create them
            RDS_SG=$(aws ec2 describe-security-groups \
              --region $REGION \
              --filters "Name=vpc-id,Values=$EXISTING_VPC" "Name=group-name,Values=*rds*" \
              --query 'SecurityGroups[0].GroupId' \
              --output text 2>/dev/null || echo "None")
            
            if [ "$RDS_SG" = "None" ]; then
                echo "Creating RDS security group..."
                RDS_SG=$(aws ec2 create-security-group \
                  --group-name "$PROJECT_NAME-rds-sg" \
                  --description "Security group for RDS PostgreSQL" \
                  --vpc-id $EXISTING_VPC \
                  --region $REGION \
                  --query 'GroupId' \
                  --output text)
            fi
            
            REDIS_SG=$(aws ec2 describe-security-groups \
              --region $REGION \
              --filters "Name=vpc-id,Values=$EXISTING_VPC" "Name=group-name,Values=*redis*,*elasticache*" \
              --query 'SecurityGroups[0].GroupId' \
              --output text 2>/dev/null || echo "None")
            
            if [ "$REDIS_SG" = "None" ]; then
                echo "Creating Redis security group..."
                REDIS_SG=$(aws ec2 create-security-group \
                  --group-name "$PROJECT_NAME-redis-sg" \
                  --description "Security group for ElastiCache Redis" \
                  --vpc-id $EXISTING_VPC \
                  --region $REGION \
                  --query 'GroupId' \
                  --output text)
                
                # Add inbound rule for Redis
                aws ec2 authorize-security-group-ingress \
                  --group-id $REDIS_SG \
                  --protocol tcp \
                  --port 6379 \
                  --cidr 10.0.0.0/16 \
                  --region $REGION
            fi
            
            # Create or get App security group
            APP_SG=$(aws ec2 describe-security-groups \
              --region $REGION \
              --filters "Name=vpc-id,Values=$EXISTING_VPC" "Name=group-name,Values=*app*,*backend*" \
              --query 'SecurityGroups[0].GroupId' \
              --output text 2>/dev/null || echo "None")
            
            if [ "$APP_SG" = "None" ]; then
                echo "Creating App security group..."
                APP_SG=$(aws ec2 create-security-group \
                  --group-name "$PROJECT_NAME-app-sg" \
                  --description "Security group for Backend Application" \
                  --vpc-id $EXISTING_VPC \
                  --region $REGION \
                  --query 'GroupId' \
                  --output text)
            fi
            
            # Save configuration
            cat > ../config/vpc-config.json <<EOF
{
  "VpcId": "$EXISTING_VPC",
  "VpcName": "$VPC_NAME",
  "VpcCidr": "$VPC_CIDR",
  "PrivateSubnet1Id": "${PRIVATE_SUBNETS[0]:-}",
  "PrivateSubnet2Id": "${PRIVATE_SUBNETS[1]:-}",
  "PublicSubnet1Id": "${PUBLIC_SUBNETS[0]:-}",
  "PublicSubnet2Id": "${PUBLIC_SUBNETS[1]:-}",
  "AppSecurityGroupId": "$APP_SG",
  "RdsSecurityGroupId": "$RDS_SG",
  "RedisSecurityGroupId": "$REDIS_SG",
  "Region": "$REGION",
  "Reused": true
}
EOF
            
            echo ""
            echo "✅ VPC configuration saved to: ../config/vpc-config.json"
            echo ""
            echo "You can now proceed with:"
            echo "  - RDS setup (option 2)"
            echo "  - Redis setup (option 3)"
            echo "  - Backend deployment (option 6)"
            ;;
        2)
            echo ""
            echo "⚠️  To create a new VPC, you need to delete an existing VPC first."
            echo ""
            echo "Existing VPCs:"
            aws ec2 describe-vpcs --region $REGION --query 'Vpcs[*].[VpcId,Tags[?Key==`Name`].Value|[0],IsDefault]' --output table
            echo ""
            echo "To delete a VPC:"
            echo "  1. Go to AWS Console > VPC"
            echo "  2. Select unused VPC"
            echo "  3. Delete associated resources first (NAT gateways, subnets, etc.)"
            echo "  4. Then delete the VPC"
            echo ""
            echo "Or run: aws ec2 delete-vpc --vpc-id <vpc-id> --region us-east-1"
            echo ""
            exit 1
            ;;
        3)
            echo "Cancelled."
            exit 0
            ;;
        *)
            echo "Invalid option."
            exit 1
            ;;
    esac
else
    echo "❌ No existing Steno VPC found."
    echo ""
    echo "You have reached the VPC limit (15 VPCs)."
    echo ""
    echo "Current VPCs:"
    aws ec2 describe-vpcs --region $REGION --query 'Vpcs[*].[VpcId,Tags[?Key==`Name`].Value|[0],IsDefault]' --output table
    echo ""
    echo "Options:"
    echo "  1. Delete an unused VPC to make space"
    echo "  2. Request VPC limit increase from AWS Support"
    echo ""
    exit 1
fi

