#!/bin/bash

# Steno AI - Main Deployment Script
# This script orchestrates the entire deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGION="us-east-1"
PROJECT_NAME="steno-prod"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Steno AI - AWS Deployment Tool        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}AWS Account:${NC} $ACCOUNT_ID"
echo -e "${GREEN}Region:${NC} $REGION"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install it first.${NC}"
    exit 1
fi

# Check jq
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq not found. Installing...${NC}"
    brew install jq || echo -e "${RED}Failed to install jq. Please install manually.${NC}"
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"
echo ""

# Interactive menu
show_menu() {
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo -e "${BLUE}Deployment Options:${NC}"
    echo ""
    echo "  1) 🌐 Setup VPC and Network"
    echo "  2) 🗄️  Setup RDS PostgreSQL"
    echo "  3) 📦 Setup ElastiCache Redis"
    echo "  4) ☁️  Setup S3 Buckets"
    echo "  5) 🔐 Setup Secrets Manager"
    echo "  6) 🚀 Deploy Backend (App Runner)"
    echo "  7) 🎨 Deploy Frontend (Vercel)"
    echo "  8) 📊 Setup Monitoring"
    echo "  9) 🌍 Configure Domain & SSL"
    echo " 10) 🔄 Run Database Migrations"
    echo " 11) 🎯 Full Deployment (All Steps)"
    echo " 12) 📋 View Current Status"
    echo " 13) 🗑️  Teardown Infrastructure"
    echo "  0) ❌ Exit"
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo -n "Select option: "
}

# Function to check if VPC exists
check_vpc() {
    if [ -f "config/vpc-config.json" ]; then
        return 0
    else
        return 1
    fi
}

# Function to execute a deployment step
execute_step() {
    local step_script=$1
    local step_name=$2
    
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Starting: $step_name${NC}"
    echo -e "${BLUE}════════════════════════════════════════════${NC}"
    echo ""
    
    if [ -f "$step_script" ]; then
        chmod +x "$step_script"
        bash "$step_script"
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✅ $step_name completed successfully${NC}"
            return 0
        else
            echo ""
            echo -e "${RED}❌ $step_name failed${NC}"
            return 1
        fi
    else
        echo -e "${RED}Script not found: $step_script${NC}"
        return 1
    fi
}

# Full deployment
full_deployment() {
    echo -e "${YELLOW}Starting full deployment...${NC}"
    echo -e "${YELLOW}This will take approximately 20-30 minutes.${NC}"
    echo ""
    read -p "Continue? (y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        return
    fi
    
    # Step 1: VPC
    execute_step "scripts/01-setup-vpc.sh" "VPC Setup" || return 1
    
    # Step 2: RDS
    execute_step "scripts/02-setup-rds.sh" "RDS Setup" || return 1
    
    # Step 3: Redis
    execute_step "scripts/03-setup-redis.sh" "Redis Setup" || return 1
    
    # Step 4: S3
    execute_step "scripts/04-setup-s3.sh" "S3 Setup" || return 1
    
    # Step 5: Secrets
    execute_step "scripts/05-setup-secrets.sh" "Secrets Manager Setup" || return 1
    
    # Step 6: Backend
    execute_step "scripts/06-build-backend.sh" "Backend Build" || return 1
    execute_step "scripts/07-deploy-backend.sh" "Backend Deployment" || return 1
    
    # Step 7: Migrations
    execute_step "scripts/09-run-migrations.sh" "Database Migrations" || return 1
    
    # Step 8: Monitoring
    execute_step "scripts/10-setup-monitoring.sh" "Monitoring Setup" || return 1
    
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   🎉 Deployment Completed Successfully!   ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Deploy frontend using: cd ../frontend && vercel --prod"
    echo "  2. Configure domain and SSL (option 9)"
    echo "  3. Test the application"
    echo ""
}

# View current status
view_status() {
    echo -e "${BLUE}Current Deployment Status:${NC}"
    echo ""
    
    if [ -f "config/vpc-config.json" ]; then
        echo -e "${GREEN}✅ VPC configured${NC}"
        VPC_ID=$(jq -r '.VpcId' config/vpc-config.json)
        echo "   VPC ID: $VPC_ID"
    else
        echo -e "${YELLOW}⏳ VPC not configured${NC}"
    fi
    
    if [ -f "config/rds-config.json" ]; then
        echo -e "${GREEN}✅ RDS configured${NC}"
        DB_ENDPOINT=$(jq -r '.Endpoint' config/rds-config.json)
        echo "   Endpoint: $DB_ENDPOINT"
    else
        echo -e "${YELLOW}⏳ RDS not configured${NC}"
    fi
    
    if [ -f "config/redis-config.json" ]; then
        echo -e "${GREEN}✅ Redis configured${NC}"
        REDIS_ENDPOINT=$(jq -r '.Endpoint' config/redis-config.json)
        echo "   Endpoint: $REDIS_ENDPOINT"
    else
        echo -e "${YELLOW}⏳ Redis not configured${NC}"
    fi
    
    if [ -f "config/s3-config.json" ]; then
        echo -e "${GREEN}✅ S3 configured${NC}"
        S3_BUCKET=$(jq -r '.DocsBucket' config/s3-config.json)
        echo "   Bucket: $S3_BUCKET"
    else
        echo -e "${YELLOW}⏳ S3 not configured${NC}"
    fi
    
    if [ -f "config/backend-config.json" ]; then
        echo -e "${GREEN}✅ Backend deployed${NC}"
        BACKEND_URL=$(jq -r '.ServiceUrl' config/backend-config.json)
        echo "   URL: $BACKEND_URL"
    else
        echo -e "${YELLOW}⏳ Backend not deployed${NC}"
    fi
    
    echo ""
}

# Teardown infrastructure
teardown() {
    echo -e "${RED}⚠️  WARNING: This will DELETE all infrastructure!${NC}"
    echo -e "${RED}This action is IRREVERSIBLE!${NC}"
    echo ""
    read -p "Type 'DELETE' to confirm: " confirm
    
    if [ "$confirm" != "DELETE" ]; then
        echo "Teardown cancelled."
        return
    fi
    
    echo -e "${YELLOW}Starting teardown...${NC}"
    
    # Delete in reverse order
    if [ -f "scripts/teardown.sh" ]; then
        bash scripts/teardown.sh
    else
        echo -e "${RED}Teardown script not found${NC}"
    fi
}

# Main menu loop
while true; do
    show_menu
    read choice
    
    case $choice in
        1)
            execute_step "scripts/01-setup-vpc.sh" "VPC Setup"
            ;;
        2)
            if ! check_vpc; then
                echo -e "${RED}❌ Please setup VPC first (option 1)${NC}"
            else
                execute_step "scripts/02-setup-rds.sh" "RDS Setup"
            fi
            ;;
        3)
            if ! check_vpc; then
                echo -e "${RED}❌ Please setup VPC first (option 1)${NC}"
            else
                execute_step "scripts/03-setup-redis.sh" "Redis Setup"
            fi
            ;;
        4)
            execute_step "scripts/04-setup-s3.sh" "S3 Setup"
            ;;
        5)
            execute_step "scripts/05-setup-secrets.sh" "Secrets Manager Setup"
            ;;
        6)
            execute_step "scripts/06-build-backend.sh" "Backend Build"
            execute_step "scripts/07-deploy-backend.sh" "Backend Deployment"
            ;;
        7)
            echo ""
            echo "Deploying frontend to Vercel..."
            echo ""
            cd ../frontend
            vercel --prod
            cd ../deployment
            ;;
        8)
            execute_step "scripts/10-setup-monitoring.sh" "Monitoring Setup"
            ;;
        9)
            echo "Domain and SSL configuration coming soon..."
            ;;
        10)
            execute_step "scripts/09-run-migrations.sh" "Database Migrations"
            ;;
        11)
            full_deployment
            ;;
        12)
            view_status
            ;;
        13)
            teardown
            ;;
        0)
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    clear
done

