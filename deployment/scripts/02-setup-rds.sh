#!/bin/bash

# Steno AI - RDS PostgreSQL Setup (using existing VPC)
# This script creates RDS PostgreSQL in existing VPC subnets

set -e

REGION="us-east-1"
PROJECT_NAME="steno-prod"

echo "🗄️  Setting up RDS PostgreSQL for Steno AI"
echo "Region: $REGION"
echo ""

# Load VPC configuration
if [ ! -f "../config/vpc-config.json" ]; then
    echo "❌ VPC config not found. Please ensure VPC is configured."
    exit 1
fi

VPC_ID=$(jq -r '.VpcId' ../config/vpc-config.json)
PRIVATE_SUBNET_1=$(jq -r '.PrivateSubnet1Id' ../config/vpc-config.json)
PRIVATE_SUBNET_2=$(jq -r '.PrivateSubnet2Id' ../config/vpc-config.json)

echo "Using VPC: $VPC_ID"
echo "Private Subnets: $PRIVATE_SUBNET_1, $PRIVATE_SUBNET_2"
echo ""

# Create or get RDS Security Group
echo "🛡️  Setting up RDS Security Group..."
RDS_SG=$(aws ec2 describe-security-groups \
  --region $REGION \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=$PROJECT_NAME-rds-sg" \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null || echo "None")

if [ "$RDS_SG" = "None" ]; then
    echo "Creating RDS security group..."
    RDS_SG=$(aws ec2 create-security-group \
      --group-name "$PROJECT_NAME-rds-sg" \
      --description "Security group for RDS PostgreSQL" \
      --vpc-id $VPC_ID \
      --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$PROJECT_NAME-rds-sg},{Key=Project,Value=steno}]" \
      --region $REGION \
      --query 'GroupId' \
      --output text)
    
    # Allow PostgreSQL from VPC CIDR
    aws ec2 authorize-security-group-ingress \
      --group-id $RDS_SG \
      --protocol tcp \
      --port 5432 \
      --cidr 10.0.0.0/16 \
      --region $REGION
    
    echo "✅ RDS Security Group created: $RDS_SG"
else
    echo "✅ RDS Security Group exists: $RDS_SG"
fi

# Create DB Subnet Group
echo "📍 Creating DB Subnet Group..."
DB_SUBNET_GROUP="$PROJECT_NAME-db-subnet-group"

aws rds create-db-subnet-group \
  --db-subnet-group-name $DB_SUBNET_GROUP \
  --db-subnet-group-description "Subnet group for Steno RDS" \
  --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2 \
  --tags "Key=Name,Value=$DB_SUBNET_GROUP" "Key=Project,Value=steno" \
  --region $REGION 2>/dev/null || echo "Subnet group already exists"

echo "✅ DB Subnet Group: $DB_SUBNET_GROUP"

# Generate random password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
DB_USERNAME="steno_admin"
DB_NAME="steno_prod"
DB_INSTANCE_ID="$PROJECT_NAME-db"

# Determine instance class (t3.micro for dev, t3.medium for prod)
read -p "Choose instance class (1=t3.micro [$15/mo], 2=t3.medium [$120/mo]): " instance_choice
if [ "$instance_choice" = "2" ]; then
    DB_INSTANCE_CLASS="db.t3.medium"
    MULTI_AZ="true"
    ALLOCATED_STORAGE="100"
else
    DB_INSTANCE_CLASS="db.t3.micro"
    MULTI_AZ="false"
    ALLOCATED_STORAGE="20"
fi

echo ""
echo "📦 Creating RDS PostgreSQL instance..."
echo "  Instance: $DB_INSTANCE_ID"
echo "  Class: $DB_INSTANCE_CLASS"
echo "  Multi-AZ: $MULTI_AZ"
echo "  Storage: ${ALLOCATED_STORAGE}GB"
echo ""

aws rds create-db-instance \
  --db-instance-identifier $DB_INSTANCE_ID \
  --db-instance-class $DB_INSTANCE_CLASS \
  --engine postgres \
  --engine-version 15.5 \
  --master-username $DB_USERNAME \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage $ALLOCATED_STORAGE \
  --storage-type gp3 \
  --storage-encrypted \
  --db-subnet-group-name $DB_SUBNET_GROUP \
  --vpc-security-group-ids $RDS_SG \
  --db-name $DB_NAME \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --multi-az \
  --publicly-accessible false \
  --enable-cloudwatch-logs-exports '["postgresql"]' \
  --deletion-protection \
  --tags "Key=Name,Value=$DB_INSTANCE_ID" "Key=Project,Value=steno" "Key=Environment,Value=production" \
  --region $REGION

if [ $? -eq 0 ]; then
    echo ""
    echo "⏳ Waiting for RDS instance to become available..."
    echo "This may take 10-15 minutes. You can check status with:"
    echo "aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID --region $REGION"
    echo ""
    
    # Wait for instance to be available
    aws rds wait db-instance-available \
      --db-instance-identifier $DB_INSTANCE_ID \
      --region $REGION
    
    # Get endpoint
    DB_ENDPOINT=$(aws rds describe-db-instances \
      --db-instance-identifier $DB_INSTANCE_ID \
      --region $REGION \
      --query 'DBInstances[0].Endpoint.Address' \
      --output text)
    
    DB_PORT=$(aws rds describe-db-instances \
      --db-instance-identifier $DB_INSTANCE_ID \
      --region $REGION \
      --query 'DBInstances[0].Endpoint.Port' \
      --output text)
    
    echo "✅ RDS instance is now available!"
    echo ""
    echo "📊 Database Details:"
    echo "  Endpoint: $DB_ENDPOINT"
    echo "  Port: $DB_PORT"
    echo "  Database: $DB_NAME"
    echo "  Username: $DB_USERNAME"
    echo ""
    
    # Save configuration
    cat > ../config/rds-config.json <<EOF
{
  "DBInstanceId": "$DB_INSTANCE_ID",
  "Endpoint": "$DB_ENDPOINT",
  "Port": $DB_PORT,
  "Database": "$DB_NAME",
  "Username": "$DB_USERNAME",
  "Password": "$DB_PASSWORD",
  "SecurityGroupId": "$RDS_SG",
  "SubnetGroup": "$DB_SUBNET_GROUP",
  "InstanceClass": "$DB_INSTANCE_CLASS",
  "MultiAZ": $MULTI_AZ,
  "Region": "$REGION"
}
EOF
    
    # Construct DATABASE_URL
    DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_ENDPOINT}:${DB_PORT}/${DB_NAME}?schema=public"
    
    echo "💾 Configuration saved to: ../config/rds-config.json"
    echo ""
    echo "🔐 IMPORTANT: Save these credentials securely!"
    echo ""
    echo "DATABASE_URL=$DATABASE_URL"
    echo ""
    echo "Next steps:"
    echo "  1. Store credentials in AWS Secrets Manager (option 5)"
    echo "  2. Setup Redis (option 3)"
    echo "  3. Continue with deployment"
    
else
    echo "❌ Failed to create RDS instance"
    exit 1
fi

