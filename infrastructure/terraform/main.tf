# Main Terraform configuration for Steno AI

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend configuration for state management
  # Uncomment and configure for production
  # backend "s3" {
  #   bucket         = "steno-terraform-state"
  #   key            = "steno/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "steno-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Steno"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Local variables
locals {
  app_name    = "steno"
  common_tags = {
    Application = local.app_name
    Environment = var.environment
  }
}

# Modules
module "networking" {
  source = "./modules/networking"

  app_name    = local.app_name
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
}

module "security" {
  source = "./modules/security"

  app_name    = local.app_name
  environment = var.environment
  vpc_id      = module.networking.vpc_id
}

module "database" {
  source = "./modules/database"

  app_name           = local.app_name
  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_ids = [module.security.database_security_group_id]
  
  instance_class     = var.db_instance_class
  allocated_storage  = var.db_allocated_storage
  database_name      = var.db_name
  master_username    = var.db_username
}

module "storage" {
  source = "./modules/storage"

  app_name    = local.app_name
  environment = var.environment
}

module "kms" {
  source = "./modules/kms"

  app_name    = local.app_name
  environment = var.environment
}

module "secrets" {
  source = "./modules/secrets"

  app_name         = local.app_name
  environment      = var.environment
  database_url     = module.database.connection_string
  jwt_secret       = var.jwt_secret
  kms_key_id       = module.kms.key_id
}

module "lambda" {
  source = "./modules/lambda"

  app_name                  = local.app_name
  environment               = var.environment
  vpc_id                    = module.networking.vpc_id
  private_subnet_ids        = module.networking.private_subnet_ids
  lambda_security_group_ids = [module.security.lambda_security_group_id]
  
  s3_bucket_name            = module.storage.documents_bucket_name
  database_secret_arn       = module.secrets.database_secret_arn
  kms_key_arn               = module.kms.key_arn
}

module "api_gateway" {
  source = "./modules/api_gateway"

  app_name            = local.app_name
  environment         = var.environment
  lambda_invoke_arns  = module.lambda.function_invoke_arns
}

module "cloudwatch" {
  source = "./modules/cloudwatch"
}

# Outputs
output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = module.api_gateway.api_endpoint
}

output "database_endpoint" {
  description = "RDS database endpoint"
  value       = module.database.endpoint
  sensitive   = true
}

output "documents_bucket" {
  description = "S3 bucket for documents"
  value       = module.storage.documents_bucket_name
}

output "kms_key_id" {
  description = "KMS key ID for encryption"
  value       = module.kms.key_id
}

