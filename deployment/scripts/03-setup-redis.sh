#!/bin/bash

# Steno AI - ElastiCache Redis Setup (using existing VPC)
# This script creates Redis cluster in existing VPC subnets

set -e

REGION="us-east-1"
PROJECT_NAME="steno-prod"

echo "📦 Setting up ElastiCache Redis for Steno AI"
echo "Region: $REGION"
echo ""

# Load VPC configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/config"

if [ ! -f "$CONFIG_DIR/vpc-config.json" ]; then
    echo "❌ VPC config not found at: $CONFIG_DIR/vpc-config.json"
    exit 1
fi

VPC_ID=$(jq -r '.VpcId' "$CONFIG_DIR/vpc-config.json")
PRIVATE_SUBNET_1=$(jq -r '.PrivateSubnet1Id' "$CONFIG_DIR/vpc-config.json")
PRIVATE_SUBNET_2=$(jq -r '.PrivateSubnet2Id' "$CONFIG_DIR/vpc-config.json")

echo "Using VPC: $VPC_ID"
echo "Private Subnets: $PRIVATE_SUBNET_1, $PRIVATE_SUBNET_2"
echo ""

# Create or get Redis Security Group
echo "🛡️  Setting up Redis Security Group..."
REDIS_SG=$(aws ec2 describe-security-groups \
  --region $REGION \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=$PROJECT_NAME-redis-sg" \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null || echo "None")

if [ "$REDIS_SG" = "None" ]; then
    echo "Creating Redis security group..."
    REDIS_SG=$(aws ec2 create-security-group \
      --group-name "$PROJECT_NAME-redis-sg" \
      --description "Security group for ElastiCache Redis" \
      --vpc-id $VPC_ID \
      --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$PROJECT_NAME-redis-sg},{Key=Project,Value=steno}]" \
      --region $REGION \
      --query 'GroupId' \
      --output text)
    
    # Allow Redis from VPC CIDR
    aws ec2 authorize-security-group-ingress \
      --group-id $REDIS_SG \
      --protocol tcp \
      --port 6379 \
      --cidr 10.0.0.0/16 \
      --region $REGION
    
    echo "✅ Redis Security Group created: $REDIS_SG"
else
    echo "✅ Redis Security Group exists: $REDIS_SG"
fi

# Create Redis Subnet Group
echo "📍 Creating Redis Subnet Group..."
REDIS_SUBNET_GROUP="$PROJECT_NAME-redis-subnet-group"

aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name $REDIS_SUBNET_GROUP \
  --cache-subnet-group-description "Subnet group for Steno Redis" \
  --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2 \
  --tags "Key=Name,Value=$REDIS_SUBNET_GROUP" "Key=Project,Value=steno" \
  --region $REGION 2>/dev/null || echo "Subnet group already exists"

echo "✅ Redis Subnet Group: $REDIS_SUBNET_GROUP"

# Determine node type (t3.micro for dev, t3.medium for prod)
read -p "Choose node type (1=cache.t3.micro [$12/mo], 2=cache.t3.medium [$50/mo]): " node_choice
if [ "$node_choice" = "2" ]; then
    NODE_TYPE="cache.t3.medium"
    NUM_NODES=2
else
    NODE_TYPE="cache.t3.micro"
    NUM_NODES=1
fi

REDIS_CLUSTER_ID="$PROJECT_NAME-redis"

echo ""
echo "📦 Creating Redis cluster..."
echo "  Cluster: $REDIS_CLUSTER_ID"
echo "  Node Type: $NODE_TYPE"
echo "  Nodes: $NUM_NODES"
echo ""

aws elasticache create-cache-cluster \
  --cache-cluster-id $REDIS_CLUSTER_ID \
  --cache-node-type $NODE_TYPE \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes $NUM_NODES \
  --cache-subnet-group-name $REDIS_SUBNET_GROUP \
  --security-group-ids $REDIS_SG \
  --preferred-maintenance-window "mon:03:00-mon:04:00" \
  --snapshot-retention-limit 5 \
  --snapshot-window "02:00-03:00" \
  --tags "Key=Name,Value=$REDIS_CLUSTER_ID" "Key=Project,Value=steno" "Key=Environment,Value=production" \
  --region $REGION

if [ $? -eq 0 ]; then
    echo ""
    echo "⏳ Waiting for Redis cluster to become available..."
    echo "This may take 5-10 minutes."
    echo ""
    
    # Wait for cluster to be available
    aws elasticache wait cache-cluster-available \
      --cache-cluster-id $REDIS_CLUSTER_ID \
      --region $REGION
    
    # Get endpoint
    REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
      --cache-cluster-id $REDIS_CLUSTER_ID \
      --show-cache-node-info \
      --region $REGION \
      --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
      --output text)
    
    REDIS_PORT=$(aws elasticache describe-cache-clusters \
      --cache-cluster-id $REDIS_CLUSTER_ID \
      --show-cache-node-info \
      --region $REGION \
      --query 'CacheClusters[0].CacheNodes[0].Endpoint.Port' \
      --output text)
    
    echo "✅ Redis cluster is now available!"
    echo ""
    echo "📊 Redis Details:"
    echo "  Endpoint: $REDIS_ENDPOINT"
    echo "  Port: $REDIS_PORT"
    echo ""
    
    # Save configuration
    cat > "$CONFIG_DIR/redis-config.json" <<EOF
{
  "ClusterId": "$REDIS_CLUSTER_ID",
  "Endpoint": "$REDIS_ENDPOINT",
  "Port": $REDIS_PORT,
  "SecurityGroupId": "$REDIS_SG",
  "SubnetGroup": "$REDIS_SUBNET_GROUP",
  "NodeType": "$NODE_TYPE",
  "NumNodes": $NUM_NODES,
  "Region": "$REGION"
}
EOF
    
    echo "💾 Configuration saved to: $CONFIG_DIR/redis-config.json"
    echo ""
    echo "Environment variables for backend:"
    echo "REDIS_HOST=$REDIS_ENDPOINT"
    echo "REDIS_PORT=$REDIS_PORT"
    echo ""
    echo "Next steps:"
    echo "  1. Setup S3 buckets (option 4)"
    echo "  2. Setup Secrets Manager (option 5)"
    echo "  3. Deploy backend (option 6)"
    
else
    echo "❌ Failed to create Redis cluster"
    exit 1
fi

