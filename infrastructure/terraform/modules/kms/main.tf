# KMS Module - Encryption keys

resource "aws_kms_key" "main" {
  description             = "${var.app_name}-${var.environment} encryption key"
  deletion_window_in_days = var.environment == "prod" ? 30 : 7
  enable_key_rotation     = true

  tags = merge(
    var.common_tags,
    {
      Name = "${var.app_name}-${var.environment}-key"
    }
  )
}

resource "aws_kms_alias" "main" {
  name          = "alias/${var.app_name}-${var.environment}"
  target_key_id = aws_kms_key.main.key_id
}

