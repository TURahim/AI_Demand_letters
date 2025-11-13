#!/bin/bash

# Add public subnets and internet gateway to existing VPC

set -e

REGION="us-east-1"
PROJECT_NAME="steno-prod"

echo "🌐 Adding public subnets to existing VPC..."

# Load existing VPC config
if [ ! -f "../config/vpc-config.json" ]; then
    echo "❌ VPC config not found. Run 00-check-existing-vpc.sh first."
    exit 1
fi

VPC_ID=$(jq -r '.VpcId' ../config/vpc-config.json)
echo "Using VPC: $VPC_ID"

# Check for Internet Gateway
echo "📡 Checking for Internet Gateway..."
IGW_ID=$(aws ec2 describe-internet-gateways \
  --region $REGION \
  --filters "Name=attachment.vpc-id,Values=$VPC_ID" \
  --query 'InternetGateways[0].InternetGatewayId' \
  --output text 2>/dev/null || echo "None")

if [ "$IGW_ID" = "None" ]; then
    echo "Creating Internet Gateway..."
    IGW_ID=$(aws ec2 create-internet-gateway \
      --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=$PROJECT_NAME-igw},{Key=Project,Value=steno}]" \
      --region $REGION \
      --query 'InternetGateway.InternetGatewayId' \
      --output text)
    
    aws ec2 attach-internet-gateway \
      --vpc-id $VPC_ID \
      --internet-gateway-id $IGW_ID \
      --region $REGION
    
    echo "✅ Internet Gateway created: $IGW_ID"
else
    echo "✅ Internet Gateway already exists: $IGW_ID"
fi

# Get availability zones
AZ1=$(aws ec2 describe-availability-zones --region $REGION --query 'AvailabilityZones[0].ZoneName' --output text)
AZ2=$(aws ec2 describe-availability-zones --region $REGION --query 'AvailabilityZones[1].ZoneName' --output text)

# Create Public Subnets
echo "🌐 Creating Public Subnets..."

PUBLIC_SUBNET_1_CIDR="10.0.101.0/24"
PUBLIC_SUBNET_2_CIDR="10.0.102.0/24"

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

# Enable auto-assign public IP
aws ec2 modify-subnet-attribute \
  --subnet-id $PUBLIC_SUBNET_1_ID \
  --map-public-ip-on-launch \
  --region $REGION

aws ec2 modify-subnet-attribute \
  --subnet-id $PUBLIC_SUBNET_2_ID \
  --map-public-ip-on-launch \
  --region $REGION

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

# Check for NAT Gateway
echo "🔀 Checking for NAT Gateway..."
NAT_GW_ID=$(aws ec2 describe-nat-gateways \
  --region $REGION \
  --filter "Name=vpc-id,Values=$VPC_ID" "Name=state,Values=available" \
  --query 'NatGateways[0].NatGatewayId' \
  --output text 2>/dev/null || echo "None")

if [ "$NAT_GW_ID" = "None" ]; then
    echo "Creating NAT Gateway..."
    
    # Allocate Elastic IP
    EIP_ALLOC_ID=$(aws ec2 allocate-address \
      --domain vpc \
      --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=$PROJECT_NAME-nat-eip},{Key=Project,Value=steno}]" \
      --region $REGION \
      --query 'AllocationId' \
      --output text)
    
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
else
    echo "✅ NAT Gateway already exists: $NAT_GW_ID"
fi

# Update private subnet route tables
echo "🗺️  Updating Private Route Tables..."
PRIVATE_RT=$(aws ec2 describe-route-tables \
  --region $REGION \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Name,Values=*private*" \
  --query 'RouteTables[0].RouteTableId' \
  --output text 2>/dev/null || echo "None")

if [ "$PRIVATE_RT" != "None" ]; then
    # Add route to NAT Gateway if not exists
    aws ec2 create-route \
      --route-table-id $PRIVATE_RT \
      --destination-cidr-block 0.0.0.0/0 \
      --nat-gateway-id $NAT_GW_ID \
      --region $REGION 2>/dev/null || echo "Route already exists"
    
    echo "✅ Private route table updated"
fi

# Update VPC config with public subnets
PRIVATE_SUBNETS=$(jq -r '[.PrivateSubnet1Id, .PrivateSubnet2Id] | map(select(. != null))' ../config/vpc-config.json)
PRIVATE_SUBNET_1=$(echo $PRIVATE_SUBNETS | jq -r '.[0]')
PRIVATE_SUBNET_2=$(echo $PRIVATE_SUBNETS | jq -r '.[1]')

# Get existing security groups
APP_SG=$(jq -r '.AppSecurityGroupId // ""' ../config/vpc-config.json)
RDS_SG=$(jq -r '.RdsSecurityGroupId // ""' ../config/vpc-config.json)
REDIS_SG=$(jq -r '.RedisSecurityGroupId // ""' ../config/vpc-config.json)

# Create ALB security group if needed
echo "🛡️  Creating ALB Security Group..."
ALB_SG=$(aws ec2 create-security-group \
  --group-name "$PROJECT_NAME-alb-sg" \
  --description "Security group for Application Load Balancer" \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$PROJECT_NAME-alb-sg},{Key=Project,Value=steno}]" \
  --region $REGION \
  --query 'GroupId' \
  --output text 2>/dev/null || echo "exists")

if [ "$ALB_SG" != "exists" ]; then
    aws ec2 authorize-security-group-ingress \
      --group-id $ALB_SG \
      --protocol tcp \
      --port 80 \
      --cidr 0.0.0.0/0 \
      --region $REGION
    
    aws ec2 authorize-security-group-ingress \
      --group-id $ALB_SG \
      --protocol tcp \
      --port 443 \
      --cidr 0.0.0.0/0 \
      --region $REGION
    
    echo "✅ ALB Security Group created: $ALB_SG"
else
    ALB_SG=$(aws ec2 describe-security-groups \
      --region $REGION \
      --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=*alb*" \
      --query 'SecurityGroups[0].GroupId' \
      --output text)
    echo "✅ ALB Security Group exists: $ALB_SG"
fi

# Save updated configuration
cat > ../config/vpc-config.json <<EOF
{
  "VpcId": "$VPC_ID",
  "InternetGatewayId": "$IGW_ID",
  "NatGatewayId": "$NAT_GW_ID",
  "PublicSubnet1Id": "$PUBLIC_SUBNET_1_ID",
  "PublicSubnet2Id": "$PUBLIC_SUBNET_2_ID",
  "PrivateSubnet1Id": "$PRIVATE_SUBNET_1",
  "PrivateSubnet2Id": "$PRIVATE_SUBNET_2",
  "PublicRouteTableId": "$PUBLIC_RT_ID",
  "AlbSecurityGroupId": "$ALB_SG",
  "AppSecurityGroupId": "$APP_SG",
  "RdsSecurityGroupId": "$RDS_SG",
  "RedisSecurityGroupId": "$REDIS_SG",
  "Region": "$REGION"
}
EOF

echo ""
echo "✨ Public subnets and networking setup complete!"
echo ""
echo "Configuration saved to: ../config/vpc-config.json"
echo ""
echo "Next steps:"
echo "  - Setup RDS (option 2)"
echo "  - Setup Redis (option 3)"
echo "  - Deploy backend (option 6)"

