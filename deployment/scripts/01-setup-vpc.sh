#!/bin/bash

# Steno AI - VPC and Network Setup
# This script creates VPC, subnets, internet gateway, NAT gateway, and security groups

set -e

# Configuration
REGION="us-east-1"
PROJECT_NAME="steno-prod"
VPC_CIDR="10.0.0.0/16"
PUBLIC_SUBNET_1_CIDR="10.0.1.0/24"
PUBLIC_SUBNET_2_CIDR="10.0.2.0/24"
PRIVATE_SUBNET_1_CIDR="10.0.11.0/24"
PRIVATE_SUBNET_2_CIDR="10.0.12.0/24"

echo "🚀 Setting up VPC and Network Infrastructure for Steno AI"
echo "Region: $REGION"
echo ""

# Create VPC
echo "📦 Creating VPC..."
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block $VPC_CIDR \
  --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$PROJECT_NAME-vpc},{Key=Project,Value=steno}]" \
  --region $REGION \
  --query 'Vpc.VpcId' \
  --output text)

echo "✅ VPC created: $VPC_ID"

# Enable DNS hostnames
aws ec2 modify-vpc-attribute \
  --vpc-id $VPC_ID \
  --enable-dns-hostnames \
  --region $REGION

# Create Internet Gateway
echo "📡 Creating Internet Gateway..."
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=$PROJECT_NAME-igw},{Key=Project,Value=steno}]" \
  --region $REGION \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

aws ec2 attach-internet-gateway \
  --vpc-id $VPC_ID \
  --internet-gateway-id $IGW_ID \
  --region $REGION

echo "✅ Internet Gateway created and attached: $IGW_ID"

# Get availability zones
AZ1=$(aws ec2 describe-availability-zones --region $REGION --query 'AvailabilityZones[0].ZoneName' --output text)
AZ2=$(aws ec2 describe-availability-zones --region $REGION --query 'AvailabilityZones[1].ZoneName' --output text)

# Create Public Subnets
echo "🌐 Creating Public Subnets..."
PUBLIC_SUBNET_1_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block $PUBLIC_SUBNET_1_CIDR \
  --availability-zone $AZ1 \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_NAME-public-1},{Key=Project,Value=steno},{Key=Type,Value=public}]" \
  --region $REGION \
  --query 'Subnet.SubnetId' \
  --output text)

PUBLIC_SUBNET_2_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block $PUBLIC_SUBNET_2_CIDR \
  --availability-zone $AZ2 \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_NAME-public-2},{Key=Project,Value=steno},{Key=Type,Value=public}]" \
  --region $REGION \
  --query 'Subnet.SubnetId' \
  --output text)

echo "✅ Public subnets created: $PUBLIC_SUBNET_1_ID, $PUBLIC_SUBNET_2_ID"

# Create Private Subnets
echo "🔒 Creating Private Subnets..."
PRIVATE_SUBNET_1_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block $PRIVATE_SUBNET_1_CIDR \
  --availability-zone $AZ1 \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_NAME-private-1},{Key=Project,Value=steno},{Key=Type,Value=private}]" \
  --region $REGION \
  --query 'Subnet.SubnetId' \
  --output text)

PRIVATE_SUBNET_2_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block $PRIVATE_SUBNET_2_CIDR \
  --availability-zone $AZ2 \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_NAME-private-2},{Key=Project,Value=steno},{Key=Type,Value=private}]" \
  --region $REGION \
  --query 'Subnet.SubnetId' \
  --output text)

echo "✅ Private subnets created: $PRIVATE_SUBNET_1_ID, $PRIVATE_SUBNET_2_ID"

# Allocate Elastic IP for NAT Gateway
echo "🌍 Allocating Elastic IP for NAT Gateway..."
EIP_ALLOC_ID=$(aws ec2 allocate-address \
  --domain vpc \
  --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=$PROJECT_NAME-nat-eip},{Key=Project,Value=steno}]" \
  --region $REGION \
  --query 'AllocationId' \
  --output text)

echo "✅ Elastic IP allocated: $EIP_ALLOC_ID"

# Create NAT Gateway
echo "🔀 Creating NAT Gateway..."
NAT_GW_ID=$(aws ec2 create-nat-gateway \
  --subnet-id $PUBLIC_SUBNET_1_ID \
  --allocation-id $EIP_ALLOC_ID \
  --tag-specifications "ResourceType=natgateway,Tags=[{Key=Name,Value=$PROJECT_NAME-nat},{Key=Project,Value=steno}]" \
  --region $REGION \
  --query 'NatGateway.NatGatewayId' \
  --output text)

echo "⏳ Waiting for NAT Gateway to become available..."
aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT_GW_ID --region $REGION

echo "✅ NAT Gateway created: $NAT_GW_ID"

# Create Public Route Table
echo "🗺️  Creating Public Route Table..."
PUBLIC_RT_ID=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$PROJECT_NAME-public-rt},{Key=Project,Value=steno}]" \
  --region $REGION \
  --query 'RouteTable.RouteTableId' \
  --output text)

aws ec2 create-route \
  --route-table-id $PUBLIC_RT_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID \
  --region $REGION

aws ec2 associate-route-table \
  --route-table-id $PUBLIC_RT_ID \
  --subnet-id $PUBLIC_SUBNET_1_ID \
  --region $REGION

aws ec2 associate-route-table \
  --route-table-id $PUBLIC_RT_ID \
  --subnet-id $PUBLIC_SUBNET_2_ID \
  --region $REGION

echo "✅ Public route table created and associated: $PUBLIC_RT_ID"

# Create Private Route Table
echo "🗺️  Creating Private Route Table..."
PRIVATE_RT_ID=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$PROJECT_NAME-private-rt},{Key=Project,Value=steno}]" \
  --region $REGION \
  --query 'RouteTable.RouteTableId' \
  --output text)

aws ec2 create-route \
  --route-table-id $PRIVATE_RT_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id $NAT_GW_ID \
  --region $REGION

aws ec2 associate-route-table \
  --route-table-id $PRIVATE_RT_ID \
  --subnet-id $PRIVATE_SUBNET_1_ID \
  --region $REGION

aws ec2 associate-route-table \
  --route-table-id $PRIVATE_RT_ID \
  --subnet-id $PRIVATE_SUBNET_2_ID \
  --region $REGION

echo "✅ Private route table created and associated: $PRIVATE_RT_ID"

# Create Security Groups
echo "🛡️  Creating Security Groups..."

# ALB Security Group
ALB_SG_ID=$(aws ec2 create-security-group \
  --group-name "$PROJECT_NAME-alb-sg" \
  --description "Security group for Application Load Balancer" \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$PROJECT_NAME-alb-sg},{Key=Project,Value=steno}]" \
  --region $REGION \
  --query 'GroupId' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region $REGION

aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region $REGION

echo "✅ ALB Security Group created: $ALB_SG_ID"

# App Runner / Backend Security Group
APP_SG_ID=$(aws ec2 create-security-group \
  --group-name "$PROJECT_NAME-app-sg" \
  --description "Security group for Backend Application" \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$PROJECT_NAME-app-sg},{Key=Project,Value=steno}]" \
  --region $REGION \
  --query 'GroupId' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $APP_SG_ID \
  --protocol tcp \
  --port 3001 \
  --source-group $ALB_SG_ID \
  --region $REGION

aws ec2 authorize-security-group-ingress \
  --group-id $APP_SG_ID \
  --protocol tcp \
  --port 3002 \
  --source-group $ALB_SG_ID \
  --region $REGION

echo "✅ App Security Group created: $APP_SG_ID"

# RDS Security Group
RDS_SG_ID=$(aws ec2 create-security-group \
  --group-name "$PROJECT_NAME-rds-sg" \
  --description "Security group for RDS PostgreSQL" \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$PROJECT_NAME-rds-sg},{Key=Project,Value=steno}]" \
  --region $REGION \
  --query 'GroupId' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $APP_SG_ID \
  --region $REGION

echo "✅ RDS Security Group created: $RDS_SG_ID"

# Redis Security Group
REDIS_SG_ID=$(aws ec2 create-security-group \
  --group-name "$PROJECT_NAME-redis-sg" \
  --description "Security group for ElastiCache Redis" \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$PROJECT_NAME-redis-sg},{Key=Project,Value=steno}]" \
  --region $REGION \
  --query 'GroupId' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $REDIS_SG_ID \
  --protocol tcp \
  --port 6379 \
  --source-group $APP_SG_ID \
  --region $REGION

echo "✅ Redis Security Group created: $REDIS_SG_ID"

# Save configuration to file
echo "💾 Saving configuration..."
cat > ../config/vpc-config.json <<EOF
{
  "VpcId": "$VPC_ID",
  "InternetGatewayId": "$IGW_ID",
  "NatGatewayId": "$NAT_GW_ID",
  "PublicSubnet1Id": "$PUBLIC_SUBNET_1_ID",
  "PublicSubnet2Id": "$PUBLIC_SUBNET_2_ID",
  "PrivateSubnet1Id": "$PRIVATE_SUBNET_1_ID",
  "PrivateSubnet2Id": "$PRIVATE_SUBNET_2_ID",
  "PublicRouteTableId": "$PUBLIC_RT_ID",
  "PrivateRouteTableId": "$PRIVATE_RT_ID",
  "AlbSecurityGroupId": "$ALB_SG_ID",
  "AppSecurityGroupId": "$APP_SG_ID",
  "RdsSecurityGroupId": "$RDS_SG_ID",
  "RedisSecurityGroupId": "$REDIS_SG_ID",
  "Region": "$REGION"
}
EOF

echo ""
echo "✨ VPC Setup Complete!"
echo ""
echo "Summary:"
echo "  VPC ID: $VPC_ID"
echo "  Public Subnets: $PUBLIC_SUBNET_1_ID, $PUBLIC_SUBNET_2_ID"
echo "  Private Subnets: $PRIVATE_SUBNET_1_ID, $PRIVATE_SUBNET_2_ID"
echo "  NAT Gateway: $NAT_GW_ID"
echo "  Security Groups: ALB=$ALB_SG_ID, APP=$APP_SG_ID, RDS=$RDS_SG_ID, REDIS=$REDIS_SG_ID"
echo ""
echo "Configuration saved to: ../config/vpc-config.json"

