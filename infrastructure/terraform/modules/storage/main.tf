# S3 Storage Module

# Documents bucket
resource "aws_s3_bucket" "documents" {
  bucket = "${var.app_name}-documents-${var.environment}"

  tags = merge(
    var.common_tags,
    {
      Name = "${var.app_name}-documents-${var.environment}"
      Type = "Documents"
    }
  )
}

# Enable versioning
resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle policy
resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}

# Letters/exports bucket
resource "aws_s3_bucket" "letters" {
  bucket = "${var.app_name}-letters-${var.environment}"

  tags = merge(
    var.common_tags,
    {
      Name = "${var.app_name}-letters-${var.environment}"
      Type = "Letters"
    }
  )
}

# Enable versioning for letters
resource "aws_s3_bucket_versioning" "letters" {
  bucket = aws_s3_bucket.letters.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable encryption for letters
resource "aws_s3_bucket_server_side_encryption_configuration" "letters" {
  bucket = aws_s3_bucket.letters.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access for letters
resource "aws_s3_bucket_public_access_block" "letters" {
  bucket = aws_s3_bucket.letters.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CORS configuration for documents bucket
resource "aws_s3_bucket_cors_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

