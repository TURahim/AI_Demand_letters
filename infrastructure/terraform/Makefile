.PHONY: help init plan apply destroy validate fmt clean

# AWS Configuration
AWS_PROFILE ?= steno-dev
AWS_REGION ?= us-east-1
TF_VAR_FILE ?= terraform.tfvars

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(GREEN)Steno AI - Terraform Commands$(NC)"
	@echo ""
	@echo "$(YELLOW)Prerequisites:$(NC)"
	@echo "  - AWS_PROFILE=$(AWS_PROFILE)"
	@echo "  - AWS_REGION=$(AWS_REGION)"
	@echo ""
	@echo "$(YELLOW)Available commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}'

init: ## Initialize Terraform
	@echo "$(GREEN)Initializing Terraform...$(NC)"
	AWS_PROFILE=$(AWS_PROFILE) terraform init -upgrade

validate: ## Validate Terraform configuration
	@echo "$(GREEN)Validating Terraform configuration...$(NC)"
	AWS_PROFILE=$(AWS_PROFILE) terraform validate

fmt: ## Format Terraform files
	@echo "$(GREEN)Formatting Terraform files...$(NC)"
	terraform fmt -recursive

plan: validate ## Run Terraform plan
	@echo "$(GREEN)Running Terraform plan...$(NC)"
	AWS_PROFILE=$(AWS_PROFILE) terraform plan -var-file=$(TF_VAR_FILE) -out=tfplan
	@echo ""
	@echo "$(YELLOW)Review the plan above.$(NC)"
	@echo "$(YELLOW)To apply these changes, run: make apply$(NC)"

apply: ## Apply Terraform plan
	@echo "$(YELLOW)⚠️  WARNING: This will create real AWS resources and may incur costs!$(NC)"
	@echo "$(YELLOW)Press Ctrl+C to cancel, or Enter to continue...$(NC)"
	@read confirm
	@echo "$(GREEN)Applying Terraform plan...$(NC)"
	AWS_PROFILE=$(AWS_PROFILE) terraform apply tfplan
	@rm -f tfplan
	@echo ""
	@echo "$(GREEN)✅ Infrastructure deployed successfully!$(NC)"

apply-auto: ## Apply Terraform plan without confirmation (dangerous!)
	@echo "$(GREEN)Applying Terraform plan automatically...$(NC)"
	AWS_PROFILE=$(AWS_PROFILE) terraform apply -var-file=$(TF_VAR_FILE) -auto-approve

destroy: ## Destroy all Terraform resources
	@echo "$(RED)⚠️  WARNING: This will destroy all infrastructure!$(NC)"
	@echo "$(RED)Type 'yes' to confirm destruction:$(NC)"
	@read confirm && [ "$$confirm" = "yes" ] || (echo "Aborted" && exit 1)
	@echo "$(RED)Destroying infrastructure...$(NC)"
	AWS_PROFILE=$(AWS_PROFILE) terraform destroy -var-file=$(TF_VAR_FILE)
	@echo "$(GREEN)✅ Infrastructure destroyed$(NC)"

show: ## Show current Terraform state
	@AWS_PROFILE=$(AWS_PROFILE) terraform show

output: ## Show Terraform outputs
	@AWS_PROFILE=$(AWS_PROFILE) terraform output

state-list: ## List all resources in state
	@AWS_PROFILE=$(AWS_PROFILE) terraform state list

refresh: ## Refresh Terraform state
	@echo "$(GREEN)Refreshing Terraform state...$(NC)"
	AWS_PROFILE=$(AWS_PROFILE) terraform refresh -var-file=$(TF_VAR_FILE)

clean: ## Clean up Terraform files
	@echo "$(YELLOW)Cleaning up Terraform files...$(NC)"
	rm -f tfplan
	rm -f .terraform.lock.hcl
	rm -rf .terraform/
	@echo "$(GREEN)✅ Cleaned up$(NC)"

# Development helpers
check: validate fmt ## Run validation and formatting

cost-estimate: plan ## Estimate infrastructure costs (requires infracost)
	@echo "$(GREEN)Estimating costs...$(NC)"
	@if command -v infracost &> /dev/null; then \
		infracost breakdown --path . --terraform-plan-flags "-var-file=$(TF_VAR_FILE)"; \
	else \
		echo "$(RED)Error: infracost not installed$(NC)"; \
		echo "Install from: https://www.infracost.io/docs/"; \
	fi

# Safety checks
safety-check: ## Run safety checks before apply
	@echo "$(YELLOW)Running safety checks...$(NC)"
	@echo "  - AWS Profile: $(AWS_PROFILE)"
	@echo "  - AWS Region: $(AWS_REGION)"
	@echo "  - Environment: $$(grep 'environment' $(TF_VAR_FILE) | cut -d'=' -f2 | tr -d ' \"')"
	@echo ""
	@AWS_PROFILE=$(AWS_PROFILE) aws sts get-caller-identity
	@echo ""
	@echo "$(GREEN)✅ Safety checks passed$(NC)"

